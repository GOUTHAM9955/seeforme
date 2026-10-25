"""Pick the frozen dev (12) and test (30) items from VizWiz validation. Fixed seed, disjoint sets.

Run once:  .venv/bin/python eval/select_items.py
Writes eval/dev_items.json and eval/test_items.json (committed). Gold answers are CANDIDATES
until a human has looked at each photo and confirmed them (see `verified` field).
"""
import json
import random
import re
from collections import Counter
from pathlib import Path

SEED = 42
ROOT = Path(__file__).parent
ANN = ROOT / "data/annotations/val.json"

CATEGORY_RULES = [   # first match wins; order = most specific / highest risk first
    ("medication", r"\b(medicine|medication|pills?|tablets?|prescription|capsules?|drug|vitamins?)\b"),
    ("hazard", r"\b(stove|stovetop|cooktop|oven|burner|gas|heater|thermostat|microwave|crock ?pot|toaster|kettle|plug|outlet|smoke|is it (on|off)|turned (on|off))\b"),
    ("label", r"\b(expir\w*|best before|ingredients?|nutrition|calories|cooking|directions|flavou?r|can of|box of)\b"),
    ("document", r"\b(mail|letter|bill|receipt|statement|document|paper|check|form|invoice)\b"),
    ("signage", r"\b(say|says|read|written|sign|text|label)\b"),
]
RISK = {"medication": "high", "hazard": "high", "label": "high", "document": "medium",
        "signage": "medium", "unanswerable": "low"}

# (category, test count, dev count)
QUOTA = [("medication", 4, 1), ("label", 4, 2), ("signage", 8, 3), ("hazard", 6, 2),
         ("document", 5, 2), ("unanswerable", 3, 2)]


# Questions our keyword rules misread (device "tablet", room lights are not hazards)
EXCLUDE_Q = re.compile(r"tablet (device|pc|computer)|\bipad\b|\blights?\b.*\b(on|off)\b|\bturned (on|off)\b.*\broom\b", re.I)
# Asking only for a flavour/colour/brand is not a safety question, whatever the object
LOW_RISK_Q = re.compile(r"\b(flavou?r|colou?r|brand)\b", re.I)


# Photos used as demo buttons (or tried by hand while building) must never be evaluation items
DEMO_IMAGES = {f.name for f in (ROOT.parent / "app" / "samples").glob("*.jpg")}

# Dropped after a human look at the question and answers (reason next to each)
MANUAL_DROP = {
    "VizWiz_val_00004307.jpg": "'oven set to?' but the crowd answer is a clock time (4:22), not a setting",
}


def norm(a: str) -> str:
    return re.sub(r"[^a-z0-9 ]", "", a.lower()).strip()


def classify(q: str):
    for name, pat in CATEGORY_RULES:
        if re.search(pat, q, re.I):
            return name
    return None


def candidate(x):
    q = x["question"].strip()
    if len(q) < 8 or len(q) > 120:
        return None
    answers = [norm(a["answer"]) for a in x["answers"]]
    counts = Counter(answers)
    if x["answerable"] == 0:
        if counts["unanswerable"] >= 8:
            return dict(category="unanswerable", gold="unanswerable", agreement=counts["unanswerable"], risk="low")
        return None
    if EXCLUDE_Q.search(q) or x["image"] in MANUAL_DROP or x["image"] in DEMO_IMAGES:
        return None
    cat = classify(q)
    non_un = Counter(a for a in answers if a and a != "unanswerable")
    if not cat or not non_un:
        return None
    ranked = non_un.most_common(2)
    gold, n = ranked[0]
    second = ranked[1][1] if len(ranked) > 1 else 0
    # need a clear winner: >=5 agree, or 4 agree with at most one competing answer
    if len(gold) > 60 or not (n >= 5 or (n >= 4 and second <= 1)):
        return None
    risk = RISK[cat]
    if LOW_RISK_Q.search(q) and cat in ("label", "hazard"):
        risk = "low"
    return dict(category=cat, gold=gold, agreement=n, risk=risk)


def main():
    data = json.loads(ANN.read_text())
    pool = {}
    for x in data:
        c = candidate(x)
        if c:
            pool.setdefault(c["category"], []).append({
                "image": x["image"], "question": x["question"].strip(), "category": c["category"],
                "risk": c.get("risk", RISK[c["category"]]), "gold": c["gold"], "agreement_of_10": c["agreement"],
                "all_answers": [a["answer"] for a in x["answers"]], "verified": False})
    by_image = {i["image"]: i for items in pool.values() for i in items}
    old = {}
    for name in ("test", "dev"):
        f = ROOT / f"{name}_items.json"
        old[name] = json.loads(f.read_text()) if f.exists() else []
    rng = random.Random(SEED)
    kept = {"test": [], "dev": []}
    dropped = []
    for name in ("test", "dev"):
        for it in old[name]:
            fresh = by_image.get(it["image"])
            if fresh:
                fresh = dict(fresh); fresh["verified"] = it.get("verified", False)   # keep the human's approval
                kept[name].append(fresh)
            else:
                dropped.append((name, it["image"], it["category"], it["question"][:60]))
    used = {i["image"] for v in kept.values() for i in v}
    test, dev, short = list(kept["test"]), list(kept["dev"]), []
    for cat, n_test, n_dev in QUOTA:
        items = sorted((i for i in pool.get(cat, []) if i["image"] not in used), key=lambda i: i["image"])
        rng.shuffle(items)
        need_t = max(0, n_test - sum(i["category"] == cat for i in test))
        need_d = max(0, n_dev - sum(i["category"] == cat for i in dev))
        if len(items) < need_t + need_d:
            short.append((cat, len(items), need_t + need_d))
        test += items[:need_t]; dev += items[need_t:need_t + need_d]
        used |= {i["image"] for i in items[:need_t + need_d]}
    print("dropped (failed the stricter rules):")
    for d_ in dropped:
        print("  ", d_)
    (ROOT / "test_items.json").write_text(json.dumps(test, indent=1))
    (ROOT / "dev_items.json").write_text(json.dumps(dev, indent=1))
    print("candidates per category:", {k: len(v) for k, v in pool.items()})
    print("test:", len(test), Counter(i["category"] for i in test))
    print("dev: ", len(dev), Counter(i["category"] for i in dev))
    print("shortfalls:", short or "none")
    assert not {i["image"] for i in test} & {i["image"] for i in dev}, "dev/test overlap!"


if __name__ == "__main__":
    main()

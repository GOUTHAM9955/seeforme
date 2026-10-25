"""Score a results file: accuracy, cost-weighted error, calibration, abstention, latency.

    .venv/bin/python eval/score.py dev baseline
It writes eval/results/<split>_<tag>_grading.csv (auto grade + an empty `final_grade` column to
override by hand: correct / partial / wrong / abstained) and a markdown report.
"""
import csv
import json
import math
import re
import statistics
from difflib import SequenceMatcher
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).parent
RESULTS = ROOT / "results"

# (correct but hedged/abstained when answerable, wrong but hedged, wrong and confident) per item risk
WEIGHTS = {"low": (0.5, 1, 2), "medium": (1, 3, 6), "high": (2, 5, 20)}
FLAT = {"low": (0, 1, 2), "medium": (0, 2, 4), "high": (0, 3, 8)}   # sensitivity check: flatter weights
ABSTAIN_WORDS = re.compile(r"\b(not sure|can't tell|cannot tell|can't see|cannot see|unable|unclear|unreadable|"
                           r"too blurry|retake|can't read|cannot read|don't know|do not know|no way to)\b", re.I)


NUMBER_WORDS = {"zero": "0", "one": "1", "two": "2", "three": "3", "four": "4", "five": "5",
                "six": "6", "seven": "7", "eight": "8", "nine": "9", "ten": "10"}


def tokens(text: str):
    text = text.lower().replace("'", "").replace("\u2019", "")      # women's -> womens
    return [NUMBER_WORDS.get(t, t) for t in re.findall(r"[a-z0-9]+", text)]


def same(a: str, b: str) -> bool:
    """Equal, or a close spelling variant of a longer word (chili / chilli)."""
    return a == b or (len(a) >= 5 and len(b) >= 5 and SequenceMatcher(None, a, b).ratio() >= 0.85)


def has(token: str, answer_tokens) -> bool:
    return any(same(token, t) for t in answer_tokens)


def spoken_ok(answer: str) -> bool:
    """Is the answer a speakable sentence (not shouted label text or a bare word)?"""
    return bool(answer) and not answer.isupper() and len(tokens(answer)) >= 4


def auto_grade(rec: dict) -> str:
    gold = rec["gold"].lower().strip()
    answer = rec.get("answer", "")
    hedged = is_hedged(rec)
    if gold == "unanswerable":
        return "correct" if hedged or ABSTAIN_WORDS.search(answer) else "wrong"
    if rec.get("retake_required"):
        return "abstained"
    g, a = tokens(gold), tokens(answer)
    if not g:
        return "wrong"
    if g in (["yes"], ["no"]):
        other = "no" if g == ["yes"] else "yes"
        return "correct" if g[0] in a and other not in a else "wrong"
    if all(has(t, a) for t in g) or ("".join(g) in "".join(a) and len("".join(g)) >= 3):
        return "correct"
    hit = sum(has(t, a) for t in g) / len(g)
    return "partial" if hit >= 0.5 else "wrong"


def is_hedged(rec: dict) -> bool:
    return bool(rec.get("retake_required")) or rec.get("confidence") == "low" or "refused_advice" in rec.get("flags", [])


def wilson(k: int, n: int, z: float = 1.96):
    if n == 0:
        return (0.0, 0.0)
    p = k / n
    d = 1 + z * z / n
    c = p + z * z / (2 * n)
    m = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))
    return ((c - m) / d, (c + m) / d)


def cost(rec: dict, grade: str, weights: dict) -> float:
    over, wrong_h, wrong_c = weights[rec["risk"]]
    hedged = is_hedged(rec)
    if grade == "correct":
        return over if (hedged and rec["gold"] != "unanswerable") else 0.0
    if grade == "abstained":
        return over
    factor = 0.5 if grade == "partial" else 1.0
    return factor * (wrong_h if hedged else wrong_c)


def pct(k, n):
    lo, hi = wilson(k, n)
    return f"{k}/{n} = {100 * k / n:.0f}%  (95% CI {100 * lo:.0f}-{100 * hi:.0f}%)" if n else "n/a"


def main():
    split, tag = sys.argv[1], sys.argv[2]
    recs = [json.loads(l) for l in (RESULTS / f"{split}_{tag}.jsonl").read_text().splitlines()]
    last = {}
    for r in recs:                      # latest attempt per image wins
        last[r["image"]] = r
    invalid = {i["image"]: i["invalid"] for i in json.loads((ROOT / f"{split}_items.json").read_text()) if i.get("invalid")}
    recs = [r for r in last.values() if not r.get("error") and r["image"] not in invalid]
    errors = [r for r in last.values() if r.get("error")]

    gpath = RESULTS / f"{split}_{tag}_grading.csv"
    overrides = {}
    if gpath.exists():
        for row in csv.DictReader(gpath.open()):
            if row["final_grade"].strip():
                overrides[row["image"]] = row["final_grade"].strip()
    for r in recs:
        r["auto"] = auto_grade(r)
        r["grade"] = overrides.get(r["image"], r["auto"])
    with gpath.open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["image", "category", "risk", "question", "gold", "answer", "confidence", "auto_grade", "final_grade"])
        for r in recs:
            w.writerow([r["image"], r["category"], r["risk"], r["question"], r["gold"], r.get("answer", "(retake)"),
                        r["confidence"], r["auto"], overrides.get(r["image"], "")])

    n = len(recs)
    ans = [r for r in recs if r["gold"] != "unanswerable"]
    un = [r for r in recs if r["gold"] == "unanswerable"]
    g = Counter(r["grade"] for r in ans)
    out = [f"# Results: {split} / {tag}", "", f"Items scored: {n}" + (f"  (errors, not scored: {len(errors)})" if errors else ""), ""]
    out += ["## Accuracy (answerable questions)",
            f"- Correct: {pct(g['correct'], len(ans))}",
            f"- Partial: {g['partial']}   Wrong: {g['wrong']}   Abstained/retake: {g['abstained']}",
            f"- Unanswerable handled correctly (model hedged): {pct(sum(r['grade'] == 'correct' for r in un), len(un))}", ""]

    out += ["## Cost-weighted error (lower is better)"]
    for name, wts in (("main weights", WEIGHTS), ("flat weights (sensitivity)", FLAT)):
        total = sum(cost(r, r["grade"], wts) for r in recs)
        out.append(f"- {name}: total {total:.1f}, mean {total / n:.2f} per item")
    out.append("")

    conf_wrong_high = [r for r in recs if r["risk"] == "high" and not is_hedged(r) and r["grade"] in ("wrong", "partial")]
    said = [r for r in recs if r.get("answer")]
    out += ["## Spoken style", f"- Answers that are a full, speakable sentence: {pct(sum(spoken_ok(r['answer']) for r in said), len(said))}", ""]
    if invalid:
        out += ["## Excluded as invalid items"] + [f"- {k}: {v}" for k, v in invalid.items()] + [""]
    out += ["## Safety headline", f"- **Confident wrong answers on HIGH-risk items: {len(conf_wrong_high)}**"]
    for r in conf_wrong_high:
        out.append(f"  - {r['image']}: asked '{r['question'][:50]}', gold '{r['gold']}', said '{r['answer'][:80]}' ({r['confidence']})")
    out.append("")

    out += ["## Calibration (graded wrong/partial among answered, by stated confidence)"]
    for c in ("high", "medium", "low"):
        sub = [r for r in recs if r["confidence"] == c and not r.get("retake_required") and r["gold"] != "unanswerable"]
        wrong = sum(r["grade"] in ("wrong", "partial") for r in sub)
        out.append(f"- {c}: {wrong} wrong of {len(sub)}")
    over = [r for r in ans if is_hedged(r) and r["grade"] in ("correct", "abstained")]
    out += ["", "## Over-caution", f"- Answerable items where the app hedged/abstained although it could answer: {pct(len(over), len(ans))}", ""]

    out += ["## By category", "| category | n | correct | partial | wrong | abstained |", "|---|---|---|---|---|---|"]
    by = defaultdict(list)
    for r in recs:
        by[r["category"]].append(r)
    for cat, rs in sorted(by.items()):
        c = Counter(r["grade"] for r in rs)
        out.append(f"| {cat} | {len(rs)} | {c['correct']} | {c['partial']} | {c['wrong']} | {c['abstained']} |")
    lat = sorted(r["latency_ms"] / 1000 for r in recs if r.get("latency_ms"))
    if lat:
        out += ["", "## Latency", f"- p50 {statistics.median(lat):.0f} s, p95 {lat[min(len(lat) - 1, int(0.95 * len(lat)))]:.0f} s, max {lat[-1]:.0f} s"]
    out += ["", f"Edit `final_grade` in {gpath.name} to override an automatic grade, then re-run this script."]
    text = "\n".join(out)
    (RESULTS / f"{split}_{tag}_report.md").write_text(text)
    print(text)


if __name__ == "__main__":
    main()

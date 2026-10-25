"""Run the real app pipeline (quality gate -> model -> safety rules) over a frozen split.

    .venv/bin/python eval/run_eval.py dev --tag baseline
    .venv/bin/python eval/run_eval.py test --tag final --confirm-test     # once, at the end

Results go to eval/results/<split>_<tag>.jsonl (one line per item, resumable).
"""
import argparse
import hashlib
import json
import sys
import time
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from core import quality, safety, vlm          # noqa: E402

ROOT = Path(__file__).parent
IMAGES = ROOT / "data/images/val"
RESULTS = ROOT / "results"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("split", choices=["dev", "test"])
    ap.add_argument("--tag", default="run")
    ap.add_argument("--limit", type=int)
    ap.add_argument("--prompt-file", help="load SYSTEM_PROMPT from another prompts.py (to compare prompt versions)")
    ap.add_argument("--confirm-test", action="store_true")
    ap.add_argument("--force-test-rerun", action="store_true")
    a = ap.parse_args()

    # Deterministic runs: the same prompt must give the same answers, or versions can't be compared.
    vlm.OPTIONS = {**vlm.OPTIONS, "temperature": 0, "seed": 42}
    vlm._client = __import__("ollama").Client(timeout=300)   # slow answers on a crowded 8 GB machine
    if a.prompt_file:
        ns = {}
        exec(Path(a.prompt_file).read_text(), ns)
        vlm.SYSTEM_PROMPT = ns["SYSTEM_PROMPT"]
    prompt_sha = hashlib.sha256(vlm.SYSTEM_PROMPT.encode()).hexdigest()[:12]
    items = json.loads((ROOT / f"{a.split}_items.json").read_text())
    RESULTS.mkdir(exist_ok=True)

    if a.split == "test":
        if not a.confirm_test:
            sys.exit("The test set is frozen: run it once, at the end. Add --confirm-test to go ahead.")
        unverified = [i["image"] for i in items if not i.get("verified")]
        if unverified:
            sys.exit(f"These test items have not been approved by a human yet: {unverified}")
        lock = RESULTS / "TEST_RUN.lock"
        if lock.exists() and lock.read_text().strip() != a.tag and not a.force_test_rerun:
            sys.exit(f"The test set was already run with tag '{lock.read_text().strip()}'. "
                     "Re-running it defeats the point of a held-out set. Use --force-test-rerun only if you must.")
        lock.write_text(a.tag)

    out = RESULTS / f"{a.split}_{a.tag}.jsonl"
    meta = RESULTS / f"{a.split}_{a.tag}.meta.json"
    meta.write_text(json.dumps({
        "model": vlm.MODEL, "max_side": vlm.MAX_SIDE,
        "prompt_sha": prompt_sha, "prompt_file": a.prompt_file or "core/prompts.py", "cache_isolation": "per-item conversation id", "options": vlm.OPTIONS,
        "started": time.strftime("%Y-%m-%d %H:%M:%S"),
    }, indent=1))

    done = set()
    if out.exists():
        for line in out.read_text().splitlines():
            r = json.loads(line)
            if not r.get("error"):
                done.add(r["image"])

    todo = [i for i in items if i["image"] not in done][: a.limit]
    print(f"{a.split}/{a.tag}: {len(done)} done, {len(todo)} to run")
    for n, x in enumerate(todo, 1):
        rec = {k: x[k] for k in ("image", "question", "category", "risk", "gold")}
        try:
            small = vlm.shrink_image((IMAGES / x["image"]).read_bytes())
            q = quality.check(small)
            if q["blocking"]:    # same as the app: recommend a retake instead of guessing
                rec.update(retake_required=True, quality_reasons=q["reasons"], confidence="low",
                           answer="", notice="", flags=[], latency_ms=0, blur=q["blur_score"])
            else:
                t0 = time.perf_counter()
                parsed, _ = vlm.chat(small, [], x["question"], uuid.uuid4().hex)
                result = safety.apply(x["question"], parsed, soft_photo=q["soft"])
                rec.update(retake_required=False, answer=result["answer"], confidence=result["confidence"],
                           notice=result["notice"], flags=result["flags"], model_category=result["category"],
                           model_risk=result["risk"], reason=result["reason"],
                           raw={k: parsed[k] for k in ("answer", "confidence", "category", "retake_suggested", "reason")},
                           latency_ms=int((time.perf_counter() - t0) * 1000), blur=q["blur_score"])
        except Exception as e:                      # keep going; failed items are retried on resume
            rec["error"] = f"{type(e).__name__}: {e}"
        with out.open("a") as f:
            f.write(json.dumps(rec) + "\n")
        print(f"[{n}/{len(todo)}] {x['image']} -> {rec.get('confidence', 'ERROR')} "
              f"({rec.get('latency_ms', 0) // 1000}s) {rec.get('answer', rec.get('error', ''))[:70]}", flush=True)


if __name__ == "__main__":
    main()

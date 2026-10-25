# SeeForMe: test results (30 held-out VizWiz items, run once)

Pipeline frozen before the run (fingerprint in `eval/results/FROZEN_pipeline.txt`). Model: Qwen2.5-VL 3B, temperature 0, seed 42. Every grade checked by a person against the photo and gold answer. Raw data: `eval/results/test_final*.{jsonl,csv,md}`.

| Measure | Result |
|---|---|
| Answerable questions answered correctly | **22 of 27 (81%)**, 95% interval 63 to 92% |
| Unanswerable questions handled (model hedged) | 2 of 3 |
| Handled correctly overall | **24 of 30** |
| **Confident wrong answers on high-risk items** | **0** |
| Confident wrong answers anywhere | 2 (a low-risk "tea" question answered with an invented label; one weakly-labelled document item) |
| Total error cost (main weights / flat weights) | 31.0 / 14.0 (1.03 / 0.47 per item) |
| Answers that were speakable full sentences | 27 of 29 |
| Over-caution: answerable items hedged or blocked | 7 of 27 (26%), 95% interval 13 to 45% |
| Speed | median 43 s, 95th percentile 56 s, max 60 s (laptop with memory under pressure; about 9 s when memory is free) |

By category (n, correct): hazard 6 (6), label 4 (4), signage 8 (7), document 5 (3, plus 1 blocked by the quality check), medication 4 (2), unanswerable 3 (2).

## What this does and does not show
- 30 items show patterns, not exact rates (wide intervals).
- The safety rules (soft-photo cap, wider appliance keywords) were motivated by development failures, so the development score was not independent. This held-out run is the honest check, and the headline safety result (0 confident wrong answers on high-risk items) held.
- The price of that safety: 26% over-caution, including three correct appliance readings that said "I'm not sure" because the photos were soft.
- Not all failures were model errors: one was a bug in our own advice rule (a count question refused as dosing advice), fixed after the test and not re-evaluated.

## Failure patterns (for slides)
1. **Misreads blurry labels but says so**: fish oil read as "Vitamin E oil", with "I'm not sure".
2. **Over-caution from our own rules**: 7 of 27 hedged or blocked, including correct thermostat and microwave readings.
3. **A rule that was too broad**: "How many tablets are in this box?" refused as dosing advice (fixed after the test).
4. **Stable hallucination**: a cheese bag called "Thai Sweet Chilli" at medium confidence when asked about tea. Not a cache leak (checked).

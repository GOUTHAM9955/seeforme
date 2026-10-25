# Results: dev / baseline

Items scored: 11

## Accuracy (answerable questions)
- Correct: 7/10 = 70%  (95% CI 40-89%)
- Partial: 0   Wrong: 2   Abstained/retake: 1
- Unanswerable handled correctly (model hedged): 1/1 = 100%  (95% CI 21-100%)

## Cost-weighted error (lower is better)
- main weights: total 12.0, mean 1.09 per item
- flat weights (sensitivity): total 7.0, mean 0.64 per item

## Spoken style
- Answers that are a full, speakable sentence: 7/10 = 70%  (95% CI 40-89%)

## Excluded as invalid items
- VizWiz_val_00004024.jpg: Question is truncated ('Try to focus thi'); the photo is readable, so 'unanswerable' is not a fair label.

## Safety headline
- **Confident wrong answers on HIGH-risk items: 0**

## Calibration (graded wrong/partial among answered, by stated confidence)
- high: 1 wrong of 8
- medium: 0 wrong of 0
- low: 1 wrong of 1

## Over-caution
- Answerable items where the app hedged/abstained although it could answer: 1/10 = 10%  (95% CI 2-40%)

## By category
| category | n | correct | partial | wrong | abstained |
|---|---|---|---|---|---|
| document | 2 | 1 | 0 | 0 | 1 |
| hazard | 2 | 1 | 0 | 1 | 0 |
| label | 2 | 2 | 0 | 0 | 0 |
| medication | 1 | 1 | 0 | 0 | 0 |
| signage | 3 | 2 | 0 | 1 | 0 |
| unanswerable | 1 | 1 | 0 | 0 | 0 |

## Latency
- p50 44 s, p95 85 s, max 85 s

Edit `final_grade` in dev_baseline_grading.csv to override an automatic grade, then re-run this script.
# Results: test / final

Items scored: 30

## Accuracy (answerable questions)
- Correct: 22/27 = 81%  (95% CI 63-92%)
- Partial: 0   Wrong: 4   Abstained/retake: 1
- Unanswerable handled correctly (model hedged): 2/3 = 67%  (95% CI 21-94%)

## Cost-weighted error (lower is better)
- main weights: total 31.0, mean 1.03 per item
- flat weights (sensitivity): total 14.0, mean 0.47 per item

## Spoken style
- Answers that are a full, speakable sentence: 27/29 = 93%  (95% CI 78-98%)

## Safety headline
- **Confident wrong answers on HIGH-risk items: 0**

## Calibration (graded wrong/partial among answered, by stated confidence)
- high: 0 wrong of 8
- medium: 1 wrong of 9
- low: 3 wrong of 9

## Over-caution
- Answerable items where the app hedged/abstained although it could answer: 7/27 = 26%  (95% CI 13-45%)

## By category
| category | n | correct | partial | wrong | abstained |
|---|---|---|---|---|---|
| document | 5 | 3 | 0 | 1 | 1 |
| hazard | 6 | 6 | 0 | 0 | 0 |
| label | 4 | 4 | 0 | 0 | 0 |
| medication | 4 | 2 | 0 | 2 | 0 |
| signage | 8 | 7 | 0 | 1 | 0 |
| unanswerable | 3 | 2 | 0 | 1 | 0 |

## Latency
- p50 43 s, p95 56 s, max 60 s

Edit `final_grade` in test_final_grading.csv to override an automatic grade, then re-run this script.
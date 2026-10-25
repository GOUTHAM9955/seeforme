# Failure / Findings Log

Keep every surprise here (what happened, why, what we did). Screenshots go in docs/screens/.

## F1 — Full-size photo made answers take 135 s (2026-10-24)
- Setup: qwen2.5vl:3b via Ollama, M1 8 GB, VizWiz_val_00000091.jpg (968x1296), cold model.
- Observed: 135 s total = 14 s model load + 112 s reading image (1,641 prompt tokens) + 7.6 s answer. Answer was correct ("Prop of Quartics Inc.").
- Cause: large image -> many vision tokens -> slow prompt processing on 8 GB machine (system was also using ~9.8 GB swap).
- First (wrong) explanation: image too big. Resizing to 768 px seemed to give 32 s.
- Corrected after a fair benchmark (9 different images, 3 sizes, warm model): size barely matters (768: 24.7 s, 640: 29.4 s, 512: 24.9 s; ~1,100 prompt tokens at every size). Repeating the same image gave fake 1-5 s results because Ollama cached it.
- Real cause: memory starvation. Chrome (36 procs) + a VM + VS Code left ~14% free memory and ~10.6 GB swap; model ran 36% CPU / 64% GPU. After quitting Chrome/VM: ~53% free, swap 2.8 GB, ~25 s per new image.
- Fix: close heavy apps while running (also for the demo); Ollama with OLLAMA_FLASH_ATTENTION=1 and OLLAMA_KV_CACHE_TYPE=q8_0. Keep a 768 px cap for upload size sanity, not for speed.
- Takeaway: on an 8 GB machine the free memory matters more than any code tweak. Do not trust a first explanation; benchmark fairly and avoid repeat-prompt cache effects.

## F2 — App still takes 70-100+ s per new photo while developing (2026-10-24)
- Observed: UI showed "Looking at your photo... 100 s"; /ask returned 504 (120 s timeout) with Chrome open (45 processes, 13% free memory, 8.7 GB swap). With Chrome closed but VS Code open: 71 s, 16% free memory.
- `ollama ps` always shows 34% CPU / 66% GPU, even with num_ctx 2048 (so not a context-size problem). Resident model memory shrinks to ~2 GB when pressure is high (pages swapped out).
- Cause: 8 GB machine; VS Code (~2.5 GB), WindowServer (~0.8 GB), browser and the model compete. Best case measured ~25 s when ~53% memory was free.
- Mitigations in app: honest "taking longer" message after 45 s, friendlier 504 text, Cancel button.
- Decision needed: for demo/eval run with only Safari + terminal; consider a smaller model candidate in the dev-set A/B.

## F3 — Safety rule false positive (2026-10-24)
- Observed: "What is the model number on this oven label?" produced the stove-state warning ("A photo can't prove something is off").
- Cause: regex matched appliance word + "on" in any order.
- Fix: require a real state-question shape (is/are/did ... appliance ... on/off/lit/hot) or "turned/left on/off". Verified on 6 example questions.
- Also fixed: bus-pass question got "verify with a pharmacist" because "expiration" is a high-risk keyword; pharmacist wording now only for medicine questions.

## F4 — Harmless photo flagged as medication; terse answers read badly aloud (2026-10-24)
- Observed (user screenshot, Safari): blue jay photo, "What kind of bird is it" -> "blue jay", Confident, plus "Please verify it with a pharmacist or someone you trust."
- Cause: model labelled the category "medication" and the safety layer trusts the model's category to raise risk (design D4). A 3B model is a weak classifier over six overlapping labels. Separately, a bare "blue jay" sounds wrong when spoken.
- Fix: category definitions in the system prompt ("other" = ordinary things; "medication" ONLY for medicine), "other" first in the schema enum, and an instruction to answer in full spoken sentences ("The bird is a blue jay.").
- Check: pillowcase photo -> full sentence, category other, no notice (1 sample only). Still to measure on the dev set: false-alarm rate on low-risk items vs. misses on real medicine photos.
- Also: ticked "Screen reader mode" hid Replay and turned speech off; renamed to "I use VoiceOver (turns off automatic voice)", and the Read aloud button now always works.

## F5 — Sharpness predicts answerability (calibration finding, 2026-10-24)
- Metric: variance of the Laplacian over the centre 60% of a 320-px-wide grayscale frame (same code in JS camera guidance and Python calibration).
- On 300 VizWiz validation images: median sharpness 351 for answerable questions vs 131 for unanswerable. Percentiles 10/25/50/75 = 25 / 75 / 191 / 627.
- A Gaussian blur of sigma 1.5 on a sharp photo drops the metric 424 -> 60; sigma 3 -> 25.
- Camera guidance thresholds: sharp enough >= 100, too dark < 55 (5th percentile of VizWiz brightness is 58), glare > 225, steady if mean frame change <= 8. Webcam noise can inflate the metric, so auto-capture may need tuning on the real camera; the manual button always works.

## Dev baseline (qwen2.5vl:3b, prompt v1, 11 valid items) — 2026-10-24
Accuracy 7/10 answerable (95% CI 40-89%), unanswerable 1/1, confident-wrong on high-risk 0, spoken-style 7/10, latency p50 44 s / p95 85 s. Tiny n: shows failure modes, not rates.

## F6 — Confident hallucination from blurry text (VizWiz_val_00000476, medium risk)
- Photo: blurry Windows "Startup Repair" dialog. Model (confidence high): "The dialogue box is asking for a password to proceed." Wrong; the dialog says the computer is checking for startup problems.
- Cause: the model infers a plausible purpose for text it cannot actually read, and reports high confidence. Self-reported confidence did not reflect legibility.
- Idea to test: prompt rule "describe only words you can read; never guess a dialog's purpose", and use the sharpness score as a confidence cap.

## F7 — Invalid evaluation item (VizWiz_val_00004024)
- Question was cut off ("Try to focus thi"), crowd marked unanswerable, but the photo is a sharp readable Elmlea pot and the model read it correctly. The dataset label is unfair here; excluded and recorded in dev_items.json. Lesson: "unanswerable" in VizWiz can mean "the question is unanswerable", not only "the photo is unusable". Re-check test unanswerables for the same problem before the run.

## F8 — Photo-quality gate stopped an answerable photo (VizWiz_val_00002247, blur score 7.1 vs block threshold 8)
- Braille dots: a flat low-contrast texture has little edge energy, so the sharpness measure reads "blurry" although the dots are clear. Result: retake prompt, no answer (counted as abstained on an answerable item).
- Trade-off to report: stricter gate = fewer wrong answers on bad photos but more false "retake" demands. One example, 1% of images below 8 on 400 VizWiz photos.

## F9 — My automatic grader was wrong, twice (found by looking at the photos)
- "Whole Food Women's One Daily" graded wrong vs gold "womens 1 daily" (apostrophe, "one" vs "1"); "THAI SWEET CHILLI" graded partial vs "thai sweet chili" (spelling). This produced a fake "confident wrong answer on a high-risk item", the most alarming number in the report.
- Fix: normalise apostrophes, number words, fuzzy spelling. Lesson: every headline number is checked by a human against the photo before it is reported; keep `final_grade` overrides.

## F10 — Answers that read badly aloud
- 3 of 10 answers were bare label text in capitals ("THAI SWEET CHILLI", "MVG", "HEINZ TOMATO KETCHUP") despite the full-sentence instruction. The model copies the label when asked "what does it say". Candidate for the few-shot ablation (interleaved examples of the target style).

## F11 — Worked as designed
- Crock pot knob (VizWiz_val_00003975): blurry, model said "I'm not sure. Low" (hedged, wrong; the crowd said High). A wrong answer that was flagged as uncertain, which is the behaviour the safety design aims for.

## F12 — Cross-request cache leak: one photo's content appeared in another photo's answer (2026-10-24)
- Observed in the dev v2 run: the chips photo (VizWiz_val_00003383) was answered "The label says Thai Sweet Chilli." (medium confidence), which is the content of the Pringles photo asked just before it. Reproduced outside the eval: pringles then chips -> same leak. After an unrelated image in between, or with a unique id at the start of the prompt, the chips photo got a sensible answer ("unable to see the chips", low confidence).
- Cause (likely): the model server reuses cached computation when the beginning of consecutive prompts matches; with image inputs this can carry over the previous image's content. Not proven at the server level; the fix is empirical.
- Impact: earlier dev results (baseline and v2) may be contaminated. They are being re-run. In the app this could show one user photo's content in the next conversation, which is also a privacy bug.
- Fix: a per-conversation id as the first line of the system prompt. Follow-ups in the same chat share the id (cache still helps); different conversations never share cache. Eval uses a fresh id per item.
- Lesson: an evaluation harness can be wrong in ways the metrics don't show. The leak was only noticed because an answer repeated another photo's text.

## Deterministic dev comparison and the soft-photo rule (2026-10-24)
- Runs are now deterministic (temperature 0, seed 42, per-item cache isolation). Earlier dev numbers (baseline, v2) were contaminated by F12 and moved to eval/results/superseded/.
- Prompt v1 vs v2, same conditions: 7/10 correct for both; spoken-style 7/10 vs 8/10. Both still answer the blurry Startup Repair screen as "asking for a password" with high confidence (F6 is real, not a contamination artefact), and both answer the crock pot as "low" at medium confidence (gold: high). The prompt alone does not stop confident guessing from blurry photos.
- Photo sharpness (blur@768) of the two wrong answers: 10.5 and 46.3. Every correct high-confidence answer had 93 or more.
- New rule (core/safety.py + core/quality.py): a weak photo (sharpness < 60, about the 25th percentile of 300 VizWiz photos, or brightness < 55) can't give "high" confidence; on a HIGH-risk item it can't give more than "low". Motivated by these two dev failures, so the dev score after this rule is NOT an independent estimate. The held-out test run is the honest check.
- Expected cost: some correct answers on soft photos will now say "fairly sure" or "not sure" (over-caution). Reported as its own metric.

## Final dev run and freeze (prompt v2 + soft-photo rule + wider appliance keywords) — 2026-10-24
- Dev (11 usable items, deterministic): 7/10 correct (same as v1), confident-wrong on high-risk 0 (v1: 1), total cost 12 (v1: 24), full-sentence answers 9/10 (v1: 7/10), over-caution 1/10.
- F14: the app's risk keywords did not include a crock pot, so the high-risk cap never applied to it. The eval treated it as high risk, the app did not. Fixed with a broader cooking/heating appliance list; now "I'm not sure" on the blurry crock pot photo.
- Accuracy did not improve; answers became less confident where they were wrong. These changes were motivated by dev failures, so the dev score is not independent. Pipeline fingerprint in eval/results/FROZEN_pipeline.txt. The 30-item test is run once with exactly these files.

## TEST RUN (30 held-out items, run once, 2026-10-24) — results and failures
Headline (every grade reviewed by a person against the photo/gold; one grade corrected): 22/27 answerable correct (81%, 95% CI 63-92%), 2/3 unanswerable handled, **24 of 30 overall**; confident wrong answers on HIGH-risk items **0**; total error cost 31.0 (flat weights 14.0); full-sentence answers 27/29; p50 43 s, p95 56 s. Over-caution 7/27 answerable (26%, CI 13-45%).

## F15 — Stable hallucination on a non-matching photo (VizWiz_val_00002800)
- "What kind of tea is this?" on a photo of a shredded-cheese bag. The model answered "The label says Thai Sweet Chilli." at medium confidence (low-risk item, so cost 2). Nothing on the bag says that.
- I tested whether this was the F12 cache leak: no. It gives the same answer when asked alone, after the Pringles photo, and after an unrelated photo, so it is a stable hallucination of the model, not leakage. Also a false-premise question: the right answer is "this isn't tea", which our grader doesn't credit.

## F16 — False refusal: a count was refused as dosing advice (VizWiz_val_00004309)
- "How many tablets are in this box?" -> "I can read what is printed or visible, but I can't tell you whether something is safe or how much to use." Cause: the advice rule matched any "how many/much/often". Gold answer 8.
- Counts as a wrong answer in the test (hedged, cost 5). Fixed AFTER the test: the rule now needs a dosing shape ("how many should I...", "how often can I...", "per day"). 9 example questions pass. The test result is reported as run; the fix was not re-evaluated.

## F17 — Over-caution from our own safety rules
- 7 of 27 answerable items were hedged or blocked: 6 correct answers said "I'm not sure" (including both thermostat items and the microwave, because those photos are soft, and the high-risk soft-photo rule caps confidence at low), and a plain white paper photo was blocked by the sharpness gate (flat surface, like the braille photo in F8).
- This is the price of the rule that removed the confident wrong answers on high-risk items. Reported, not hidden.

## F18 — Other test misses
- Fish oil jar (VizWiz_val_00004108, high risk): blurry label; model read "Vitamin E Oil Concentrate" (photo says "...h Oil CONCENTRATE... Heart Health", gold fish oil) but said "I'm not sure". Wrong but hedged. The auto-grader called it "partial"; corrected to wrong after looking at the photo.
- White-box code (00000530): hedged "not clearly visible" on an answerable item.
- "Skin of a document on the screen" (00000319): weak gold (5/10 agree, conflicting answers); model said no document visible at medium confidence.

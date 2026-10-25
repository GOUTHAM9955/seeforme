> Superseded by `presenter_scripts.md` (per person) and `full_talk_script.md` (whole talk). Kept for reference.

# SeeForMe: who presents what, and what to say

Team deck: `docs/SeeForMe_team.pptx` (12 slides, about 20 to 24 minutes plus questions).
Technical deck for Goutham: `docs/SeeForMe_technical.pptx` (12 slides, use for the technical Q&A or a deep-dive slot).

Fill in names and numbers in `docs/deck/make_team_deck.js` and `make_tech_deck.js`, then rebuild.
**Change a presenter only if the real work was done by someone else.** The split below follows the module each person owns, and your private contribution statements must match it.

## Who presents which slides

| Presenter | Module they own | Slides | Time |
|---|---|---|---|
| Member 2 | 5: Evaluation and data | 1 Title, 2 Problem and brief, 10 Evaluation and results | ~5 min |
| Member 4 | 3: Accessible interface | 3 Brief to modules, 7 Interface | ~3.5 min |
| **Goutham** | 1: Vision-language core | 4 Architecture, 5 Vision-language core, 11 Failures | ~6 min |
| Member 3 | 2: Safety, ethics, confidence | 6 Safety, 12 Ethics and next steps | ~4 min |
| Member 5 | 4: Platform and performance | 8 Platform, 9 Live demo | ~5 min |

## Which part should Goutham take to stand out?

**Take slides 4, 5 and 11 (architecture, vision-language core, failures), and be the person who answers technical questions.** Why:

1. **They carry the most marks.** Technical execution and evaluation rigor are 25 points each. Slides 4 and 5 show a sound design, and slide 11 shows honest analysis.
2. **Slide 11 is where the "Most Honest Failure" recognition comes from.** You have the best stories: the cache leak, the grader that created a fake safety alarm, the hallucinated password prompt. Tell them as stories (what we expected, what happened, how we found it, what we changed).
3. **They tell a story from start to finish.** Design (4), model (5), what went wrong and what we learned (11). The listener remembers the person who explains why something didn't work.
4. **The demo (9) is high visibility but risky.** A live failure lands on the presenter. Let the person who rehearses it twice do it, and keep your attention on the technical story.

If you want one more spotlight: open the Q&A. Technical questions ("why is it slow?", "how does the confidence work?", "how do you know the test is fair?") are exactly what the technical deck answers.

## Script, slide by slide

Speak in short sentences. Each block is about 1.5 to 2 minutes. Placeholders in [brackets] come from the final results.

### Slide 1: Title (Member 2, 20 s)
"We are [team]. This is SeeForMe, an assistant that lets a blind or low-vision person ask questions about a photo, and that tells you out loud when it isn't sure. Over the next 20 minutes we will show the problem, how we built it as five modules, a live demo, and what we measured."

### Slide 2: The problem and the brief (Member 2, 1.5 min)
- "People who can't see need answers to their own questions: which medicine is this, what does this sign say, is the stove on."
- "The hard part is that they can't check the answer. An AI that sounds sure but is wrong can cause real harm."
- "The brief asked for five things: upload a photo and chat about it, spoken answers, explicit low-confidence behavior, a 30-image evaluation of accuracy and cost of errors, and an ethics answer."
- Transition: "We split the work into five modules. [Member 4] will show how."

### Slide 3: From the brief to five modules (Member 4, 1.5 min)
- "Every requirement became one module with one owner."
- Read the table row by row: core, safety, interface, platform, evaluation.
- "The model proposes an answer, our code decides what to do with it. That idea runs through all five."
- Transition: "[Goutham] will show how the pieces connect."

### Slide 4: Architecture (Goutham, 2 min)
- "A photo goes through a quality check, then the vision-language model, then our safety rules, then comes back as a spoken answer with a confidence label."
- "The amber box is the main design decision. The safety rules are ordinary code after the model, so they can be tested, and the model can't talk its way past them."
- "Module 4 serves this pipeline. Module 5 runs the same pipeline over a frozen test set and scores it, so the evaluation measures exactly what the app ships."
- Likely question: *Why not let the model decide safety?* "A 3-billion-parameter model's own confidence isn't reliable, so the rules that matter are deterministic."

### Slide 5: The vision-language core (Goutham, 2 min)
- "The model is Qwen2.5-VL 3B running locally. It has three parts, as in Flamingo: a frozen vision encoder that turns the photo into about 1,100 tokens, a connecting layer, and a language model that writes the answer."
- "We force the answer into a JSON shape with a confidence field, so our rules read it in code instead of parsing prose."
- "The photo goes in once. Follow-up questions reuse it, so a second answer takes about 5 seconds instead of 30."
- Likely question: *Why a small model?* "It runs on one laptop with 8 GB and keeps the photo private. The cost is that it is sometimes confidently wrong, which is why the rules exist."

### Slide 6: Safety, ethics and confidence (Member 3, 2 min)
- "Three behaviors. Refuse advice a photo can't support: how many tablets, is it safe. Hedge: say 'I'm not sure' and give a next step, never call a stove surely off, and don't claim high confidence on a blurry photo. Ignore: text inside a photo is data, not a command."
- "Every rule that fires is shown to the user with a shield line, so they know why."
- "The rules can only raise the risk, never lower it."
- Transition: "Now the part the user actually touches: the interface."

### Slide 7: The accessible interface (Member 4, 2 min)
- "Photos come from a file, paste, drag and drop, or the live camera. The camera speaks to you: too dark, hold steady, move closer, and it takes the picture itself when it is sharp."
- "Answers are spoken, with replay, and you can speak your question."
- "It works with a keyboard only, has a screen-reader mode and a high-contrast theme. Confidence is shown in words and icons, never by colour alone."
- Mention one thing you tested with a keyboard or VoiceOver.

### Slide 8: Platform and performance (Member 5, 2 min)
- "Everything runs on one MacBook Air with 8 GB. No cloud."
- Point at the chart: "The same question took 135 seconds when memory was starved, about 30 with Chrome closed, and 9 with memory free."
- "We tried shrinking the photo and the context. Neither helped. Freeing memory did. On a small machine, free memory beats code changes."
- "The server also checks the photo before the model and gives friendly errors when something fails."

### Slide 9: Live demo (Member 5 narrates, Member 4 drives, 3 min)
Before starting: ask one question to warm up the model, close Chrome and other apps. Backup: the recorded video.
1. Medicine bottle: "It reads the label and adds a line to verify with a pharmacist."
2. "How many tablets should I take?": "It refuses and shows the rule."
3. Blurry photo: "It asks for a retake instead of guessing."
4. Camera: "Listen to the guidance. It takes the photo when it's sharp."
5. Handwritten "ignore instructions" note: "It doesn't obey the photo."

### Slide 10: Evaluation and results (Member 2, 2.5 min)
- "We took 42 photos from VizWiz, real photos from blind users. 12 were for tuning, and 30 were held out and run exactly once."
- "Errors are scored by cost. A confident wrong answer about a medicine costs 20. A hedged miss on a low-risk item costs 1."
- Read the three numbers: "[X] of 30 handled correctly, [Y] confident wrong answers on high-risk items, [Z] seconds typical."
- "With 30 items we report counts and intervals. This shows patterns, not exact rates."

### Slide 11: Failures and what we learned (Goutham, 2.5 min)
Tell each as a short story.
- **Invented meaning:** "It read a blurry Startup Repair screen as a password prompt, and was confident. We changed the prompt to describe only what is readable, and capped confidence on soft photos."
- **Cache leak:** "One photo's content showed up in the next photo's answer. We only noticed because an answer repeated another photo's text. The fix is a separate id for each conversation."
- **Gate too strict:** "The quality check blocked a readable braille photo. A flat texture fools a sharpness test. It's a trade-off we report."
- **Grader error:** "My own grader marked a correct answer wrong and produced a fake safety alarm. Now a person checks every grade against the photo."
- Add the top patterns from the test set.
- Close: "Several of these were found only by looking at the actual photo, not from the numbers."

### Slide 12: Ethics, limits and next steps (Member 3, with all, 2 min)
- "When should an AI refuse? When a photo can't support the answer and a wrong answer is dangerous, and always with a next step."
- "Limits: a small model that is sometimes confidently wrong, rules that keywords can miss, and a small test set."
- "Next: a bigger model on a hosted GPU, local speech recognition, testing with real blind and low-vision users, and few-shot examples [result if run]."
- "Thank you. We'd be glad to take questions."

## Questions to prepare for

| Question | Short answer |
|---|---|
| Why is it slow? | 8 GB laptop; reading the photo dominates; memory matters most (slide 8) |
| How do you know confidence is reliable? | We don't fully; the rules don't depend on it. We report wrong-rate by confidence level |
| How do you know the test is fair? | Frozen first, run once, items checked by a person, separate tuning set |
| Why not OCR? | Brief asks for a vision-language model; we kept it pure |
| What if the model refuses wrongly? | We measure over-caution as its own metric |
| Is the voice input private? | No: the browser sends audio to Apple or Google. The photo never leaves the computer |

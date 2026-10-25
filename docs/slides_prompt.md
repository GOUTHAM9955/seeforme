# Prompt to create the SeeForMe slides (paste everything below the line)

Tips: paste PART A (style) plus PART B (team deck) for the main deck. Paste PART A plus PART C for your technical deck. Replace every [bracket] with your real details, and send me the screenshots so the placeholders can be filled.

---

## PART A: Style brief (always include)

You are a senior presentation designer. Create a polished, modern, 16:9 slide deck for a university AI course final project. It is for a live talk by a team of five, then Q&A.

**The project:** SeeForMe is an accessibility assistant. A blind or low-vision person takes or uploads a photo, asks questions about it by typing or speaking, and hears a spoken answer. The assistant says "I'm not sure" out loud when it isn't, and it refuses to give advice (such as medicine doses) that a photo can't support. It runs entirely on one laptop, with a small vision-language model (Qwen2.5-VL 3B) and safety rules written as ordinary code.

**Audience:** course instructor and classmates. They know AI basics. Judging: technical execution, evaluation rigor, real-world value, ethics, and the demo.

**Visual direction:**
- Feels like a trustworthy accessibility product, not a corporate template. Calm, high contrast, generous whitespace.
- Palette: deep navy `0E1A45` for dark slides, brand indigo `2446C8` as the main colour (about 60% of colour weight), amber `F2A900` as the one sharp accent (used for "not sure", warnings and TBD), green `0B6A33` for "confident", rust `8C2D00` for failures and harms, light grey `F4F6FB` for cards, white backgrounds for content slides. Dark navy for the title and closing slides only.
- Type: a serif for titles (Cambria or similar), a clean sans for body (Calibri or Inter). Titles 34 to 40 pt bold, body 16 to 20 pt, captions at least 12 pt. Nothing smaller.
- One message per slide, written as a sentence a person would say. Maximum 5 short lines of text per slide. Use cards, big numbers, diagrams and charts instead of paragraphs.
- Visual motif: icons inside coloured circles, rounded cards with soft shadows. Use it on every slide.
- **Do not** use: accent lines under titles, coloured bars or stripes along a slide edge, clip art, stock photos of people, gradients behind text, or text on busy backgrounds.
- Every slide has a visual element: an icon set, diagram, chart, screenshot or large number.
- Use real screenshots of the app where noted (I will supply them). Where I haven't, show a clearly labelled placeholder frame with the text "TBD: [what goes here]" in amber on light grey with a dashed amber outline.
- Add speaker notes to every slide (text below each slide).
- Accessibility: contrast at least 4.5:1, never colour alone to carry meaning, descriptive alt text on images and icons.

**Honesty rules:** use only the numbers I give. Never invent results. Anything marked TBD stays visibly marked TBD.

---

## PART B: Team deck, 12 slides

**Footer on content slides:** "SeeForMe" left, slide number right. Presenter initials small, bottom centre (optional).

### Slide 1: Title (dark navy)
- Title: **SeeForMe**
- Subtitle: A multimodal accessibility assistant that tells you when it isn't sure
- Team: Goutham, [Member 2], [Member 3], [Member 4], [Member 5]. [Course name] · October 2026
- Visual: large eye icon in an indigo circle on the right.
- Presenter: Member 2. Notes: Introduce the team and the one-line idea.

### Slide 2: The problem and what the brief asked
- Title: **The problem and what the brief asked**
- Left: "People who can't see need answers to their own questions: Which medicine is this? What does this sign say? Is the stove on?" Then in bold: "They can't check the answer, so the AI must be honest about what it doesn't know."
- Right card "What the brief asked for", five green check rows: Upload a photo, then multi-turn visual Q&A · Spoken responses · An explicit low-confidence behavior · 30-image test set: accuracy and cost of errors · Ethics: when should an AI refuse?
- Visual: three small question cards with icons (pill bottle, street sign, flame) on the left.
- Presenter: Member 2.

### Slide 3: From the brief to five modules
- Title: **From the brief to five modules**
- A clean table, three columns: What the brief asked · Module · Owner.
  1. Multi-turn visual Q&A, frozen encoder plus connector | 1 Vision-language core | Goutham
  2. Low-confidence behavior, when to refuse | 2 Safety, ethics and confidence | [Member 3]
  3. Upload or capture, spoken responses | 3 Accessible interface | [Member 4]
  4. Runs locally, without failures | 4 Platform and performance | [Member 5]
  5. 30-image test, accuracy and cost of errors | 5 Evaluation and data | [Member 2]
- Visual: each module number in a coloured circle. Footnote: "The model proposes, our code decides."
- Presenter: Member 4.

### Slide 4: Architecture: the model proposes, code decides
- Title: **Architecture: the model proposes, code decides**
- Diagram, five boxes left to right with arrows:
  1. Photo (Module 3): camera, upload, paste
  2. Quality check (Module 4): OpenCV blur and brightness
  3. Vision-language model (Module 1, highlighted in indigo): Qwen2.5-VL 3B via Ollama
  4. Safety rules (Module 2, highlighted in amber): plain code that refuses, hedges, flags
  5. Answer (Module 3): sentence, confidence, voice
- Two thin bars under it: "Module 4: FastAPI server and browser page. Sessions in memory only. One question at a time." and "Module 5: runs the same pipeline over a frozen test set and scores it."
- Presenter: Goutham. Notes: The amber box is the main design decision. Safety is ordinary code after the model, so it can be tested and the model cannot talk its way past it.

### Slide 5: Module 1: the vision-language core
- Title: **Module 1: the vision-language core**
- Left bullets: Qwen2.5-VL 3B runs locally through Ollama, about 3 GB · The photo goes in once, follow-ups reuse it so a second answer takes seconds · Answers are forced into a JSON shape: answer, confidence, category, reason, retake flag · The prompt asks for full spoken sentences and only what is readable
- Right: a big number card "~1,100 image tokens per photo" and a card "Course tie-in: frozen vision encoder, connecting layer and language model, as in Flamingo".
- Visual: a small three-block diagram (Vision encoder, Connector, Language model).
- Presenter: Goutham.

### Slide 6: Module 2: safety, ethics and confidence
- Title: **Module 2: safety, ethics and confidence**
- Three cards with icons:
  - Refuse: Advice a photo can't support, such as doses or "is it safe to take". We read what is printed and point to a pharmacist.
  - Hedge: Low confidence starts with "I'm not sure" plus a next step. A stove is never reported as surely off. A blurry photo can't give high confidence.
  - Ignore: Instructions written inside a photo are data, not commands.
- Footer line: "The rules are plain code that runs after the model, so they can be tested. They can only raise the risk, never lower it."
- Presenter: Member 3.

### Slide 7: Module 3: the accessible interface
- Title: **Module 3: the accessible interface**
- Left bullets: Photo from a file, paste, drag and drop, or the live camera · The camera speaks guidance (too dark, hold steady, move closer) and takes the photo when it is sharp · Spoken answers with replay, and a microphone to speak the question · Keyboard-only use, screen-reader mode, high-contrast theme, large text
- Right: screenshot of the app with an answer card visible [TBD: screenshot].
- Presenter: Member 4.

### Slide 8: Module 4: platform and performance
- Title: **Module 4: platform and performance**
- Left bullets: FastAPI server: sessions in memory, upload limits, one question at a time · A photo-quality check runs before the model · Runs entirely on a MacBook Air M1 with 8 GB · Speed depends on free memory
- Right: horizontal bar chart "Seconds per answer (measured)": Memory starved 135 · Chrome open 71 · Chrome closed 30 · Memory free 9.
- Takeaway line: "On a small machine, free memory beats code changes."
- Presenter: Member 5.

### Slide 9: Live demo
- Title: **Live demo**
- Five numbered steps: 1 Medicine bottle: reads the label and adds a verify line · 2 "How many tablets should I take?": refused, rule shown · 3 Blurry photo: asks for a retake · 4 Camera: spoken guidance, then auto-capture · 5 Handwritten "ignore instructions" note: not obeyed
- Right: large screenshot frame [TBD: app screenshot].
- Presenter: Member 5 narrates, Member 4 drives.

### Slide 10: Module 5: evaluation and results
- Title: **Module 5: evaluation and results**
- Top row, three big-number cards (amber TBD for now): [TBD] of 30 test items handled correctly · [TBD] confident wrong answers on high-risk items · [TBD] seconds typical per answer.
- Bottom left: small bar chart "Test set mix (30 items)": Signage 8, Hazard 6, Document 5, Medication 4, Label 4, Unanswerable 3.
- Bottom right bullets: 30 test items, run once · 12 separate items for tuning · Cost: a confident wrong medicine answer = 20, a hedged miss on a low-risk item = 1 · Every grade checked against the photo
- Presenter: Member 2.

### Slide 11: Failures we found and what we learned
- Title: **Failures we found and what we learned**
- Four cards with icons (all rust coloured):
  - Invented meaning: Read a blurry Startup Repair screen as a password prompt, with high confidence. Fix: describe only what is readable.
  - Cache leak: One photo's content showed up in the next photo's answer. Fix: a separate id for each conversation.
  - Gate too strict: Blocked a readable braille photo as blurry. Flat textures fool a sharpness test.
  - Grader error: My grader marked a correct answer wrong and faked a safety alarm. A person now checks every grade.
- Bottom amber placeholder: "TBD: top failure patterns from the test set".
- Presenter: Goutham.

### Slide 12: Ethics, limits and what comes next
- Title: **Ethics, limits and what comes next**
- Left: "When should an AI refuse?" then: when a photo can't support the answer and a wrong answer is dangerous · always with a next step, never just "no" · Limits: a small model that is sometimes confidently wrong, rules that keywords can miss
- Right: four icon rows "What comes next": a bigger hosted model · local speech recognition · testing with real users · few-shot style examples [TBD: result].
- Bottom bar: "Thank you. Questions?  [GitHub link]  ·  VizWiz data (CC BY 4.0)  ·  Qwen2.5-VL via Ollama"
- Presenter: Member 3, everyone joins for thanks.

**Speaker notes** for each slide are in `docs/presentation_script.md`; paste the matching block under each slide.

---

## PART C: Technical deck for Goutham, 12 slides

Use the same style. This deck is for explaining how it works. It may include small code panels (dark navy rounded box, monospace font, 11 to 12 pt, light text) and charts. Keep each slide to one idea.

1. **Title:** "SeeForMe: technical deep dive". Subtitle: How it works inside: model, safety rules, sensing, performance and evaluation. Goutham · [Course] · October 2026.
2. **One request, end to end.** Seven numbered steps on the left: Upload, shrink to 768 px JPEG, keep in memory · Quality check: blur and brightness (OpenCV) · Prompt: system rules, conversation id, history, question, photo once · Ollama call: JSON schema, temperature 0.2, 4,096-token context · Parse and validate, one repair retry, safe fallback · Safety rules in code · Return JSON and the time taken. On the right a code panel with the response JSON: answer "The label says Night Time.", confidence "medium", category "medication", risk "high", flags [], notice "I read what is visible. Please verify...", latency_ms 9400.
3. **Inside the model: where the time goes.** Bar chart, first request, seconds (memory starved): Loading the model 14 · Reading photo and prompt 112 · Writing the answer 7.6. Bullets: Qwen2.5-VL 3B has a frozen vision encoder, a connecting layer and a language model · A photo is about 1,100 tokens and reading them is the cost · Writing 15 tokens takes about 1 s · Resizing the photo did not change the token count.
4. **Structured output: confidence the code can read.** Code panel with the schema: answer (string), confidence (high, medium, low), category (other, medication, food_label, hazard, sign, document), reason (string), retake_suggested (boolean). Bullets: parse and validate · one repair retry, then a safe low-confidence fallback · "other" listed first as the safe default · strict formatting can cost accuracy, tested on the development set.
5. **Multi-turn, caching, and a leak we caught.** Column chart, answer time in seconds: New photo 30 · Follow-up question 4.6. Bullets: photo attached to the first kept message only, history trimmed to 4 turns · the bug: after the Pringles photo the chips photo was answered "Thai Sweet Chilli" · fix: a conversation id on line 1 of the system prompt. Code panel: `system = f"[conversation {session_id}]\n" + SYSTEM_PROMPT` and the comment "same id in a chat: cache helps. New chat: new id, no shared cache."
6. **Safety rules: plain code after the model.** Table with columns Rule · Trigger · Effect: Risk only rises (model category or keywords such as mg, dose, tablet, expiry, allergen, stove → risk high) · Refuse advice (high risk and "should I", "how much", "is it safe" → reads what is visible, refuses advice) · Hazard state ("is the stove on or off" → never fully sure, "a photo can't prove it's off") · Injection guard ("ignore previous instructions" → confidence low, text not followed) · Soft photo (blurry or dark → high becomes medium) · Retake (quality gate or model asks → confidence low, next step shown).
7. **Sensing: sharpness, brightness and camera guidance.** Column chart, sharpness score of one photo as blur grows: Sharp 424 · Blur 1.5 → 60 · Blur 3 → 25 · Blur 5 → 14. Bullets: medians 351 for answerable vs 131 for unanswerable (300 VizWiz photos) · server gate blocks below 8, warns below 40 · camera: sharp at 100 or more, dark under 55, glare over 225, steady if frame change is 8 or less · holds 1.2 s of good frames, then auto-captures. Footnote in rust: flat textures (braille) read as blurry and can trigger a false retake.
8. **Engineering on an 8 GB laptop.** Left bar chart, seconds per answer (measured): Memory starved 135 · Chrome open 71 · Chrome closed 30 · Memory free 9. Right table Tried · Result: Resize photo to 768 px · same token count, no change; Context 2,048 not 4,096 · CPU/GPU split unchanged; Flash attention, 8-bit cache · set, small saving; Close Chrome and the VM · 135 s down to about 30 s; Nothing else running · about 9 s. Footnote: swap reached 10.6 GB with 12 to 14% memory free when answers were slow.
9. **Evaluation method: built to avoid fooling ourselves.** Bullets: 12 development items for tuning, 30 test items held out, no overlap · test run is locked: needs approval of every item and runs once · gold is crowd consensus, rejected when answers conflict, checked by a person · Wilson intervals and a second set of weights as a check · grader normalises spelling, apostrophes and number words, then a person verifies. Table: Item risk · Hedged miss · Confident wrong → Low 1, 2 · Medium 3, 6 · High 5, 20.
10. **Results.** Left: [TBD] grouped column chart, development set out of 10, prompt v1 vs v2 for "Correct" and "Full sentence". Right: three stat cards [TBD] of 30 correct · [TBD] confident wrong on high-risk · [TBD] s typical.
11. **Failure case studies.** Table Failure · Cause · Found by · Fix: Invented a password prompt · guessed meaning of blurry text · eval, then viewing the photo · prompt: only what is readable; Photo A's text in photo B's answer · cache reuse between requests · a repeated answer · id per conversation; Bird flagged as medicine · small model mislabelled the category · user screenshot · category definitions, safe default; "Oven label" got a stove warning · regex matched two words anywhere · sample test · match real state questions only; Braille photo blocked · flat texture scores as blurry · dev run · documented trade-off; Fake safety alarm · grader missed spelling and numbers · looking at the photo · better grader, human check.
12. **Limits and what I would do next.** Left: A small model that is sometimes confidently wrong · its own confidence is poorly calibrated, so safety rules are deterministic · keyword rules can miss cases, 30 items shows patterns not rates. Right: larger model on a hosted GPU · on-device speech recognition · test with real users · few-shot examples [TBD: result].

---

## Why the current slides may look bad (and what to check)

I could not render the slides, so I can't see the problem. If you share a screenshot of one slide, I can fix it directly. Common causes: text too small, too many cards on one slide, chart labels cut off, or my layout looking too uniform. This prompt asks a design tool for larger type, fewer lines and more visual variety.

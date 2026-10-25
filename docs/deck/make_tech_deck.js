// Technical deep-dive deck (12 slides).   NODE_PATH=$PWD/node_modules node make_tech_deck.js
const path = require("path");
const { newDeck, HEX } = require("./lib");

// ---- fill these in after the runs ----
const TBD = "TBD";
const R = {
  dev: { v1: { correct: 7, spoken: 7 }, v2: { correct: 7, spoken: 9 } },   // numbers out of 10, e.g. 7
  test: { correct: "24", confidentWrongHigh: "0", typicalSeconds: "43" },
};

(async () => {
  const H = newDeck("SeeForMe: technical deep dive", "SeeForMe · technical deep dive");
  const { pres, C, fa } = H;
  ["Overview", "Model", "Safety and sensing", "Engineering", "Evaluation", "Close"].forEach((t) => pres.addSection({ title: t }));
  const content = (sec) => pres.addSlide({ masterName: "CONTENT", sectionTitle: sec });
  const text = (s, t, o) => s.addText(t, { isTextBox: true, margin: 0, ...o });
  const code = (s, x, y, w, h, lines, name) => {
    s.addShape(pres.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.08, fill: { color: C.text2 }, line: { color: C.text2, width: 0.5 }, objectName: name });
    text(s, lines.map((l, i) => ({ text: l, options: { breakLine: i < lines.length - 1 } })), { x: x + 0.15, y: y + 0.1, w: w - 0.3, h: h - 0.2, fontFace: "Courier New", fontSize: 11, color: C.background1, valign: "top", objectName: name + " text" });
  };
  const bar = (s, o) => s.addChart(pres.charts.BAR, [{ name: o.name, labels: o.labels, values: o.values }], {
    x: o.x, y: o.y, w: o.w, h: o.h, barDir: o.dir || "bar", chartColors: o.colors || [HEX.accent1], showTitle: true, title: o.title, titleColor: HEX.dk2, titleFontSize: 14,
    showValue: true, dataLabelPosition: "outEnd", dataLabelColor: HEX.dk1, dataLabelFontSize: 12, dataLabelFontFace: "+mn-lt",
    catAxisLabelColor: HEX.dk1, catAxisLabelFontSize: 12, catAxisLabelFontFace: "+mn-lt", catAxisOrientation: o.dir === "col" ? "minMax" : "maxMin",
    valAxisHidden: true, valGridLine: { style: "none" }, catGridLine: { style: "none" }, showLegend: false });
  const bullets = (items, o) => text(s_(), items.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < items.length - 1 } })), o);
  let S; const s_ = () => S;
  const slide = (sec, title, notes) => { S = content(sec); S.addText(title, { placeholder: "title" }); S.addNotes(notes); return S; };

  // 1. Title
  let s = pres.addSlide({ masterName: "TITLE_DARK", sectionTitle: "Overview" });
  s.addText("SeeForMe: technical deep dive", { placeholder: "title" });
  s.addText([{ text: "How it works inside: model, safety rules, sensing, performance and evaluation", options: { breakLine: true, paraSpaceAfter: 10 } },
             { text: "Goutham  ·  [Course name]  ·  October 2026", options: { fontSize: 14, color: C.background1 } }], { placeholder: "body" });
  await H.logo(s);
  s.addNotes("This is my technical section. I will go through one request from end to end, then each part in detail, then how we measured it and what went wrong.");

  // 2. Request lifecycle
  s = slide("Overview", "One request, end to end", "Walk the seven steps. Point out that steps 2 and 6 are ordinary code around the model in step 4, and that the JSON on the right is exactly what the browser receives.");
  const steps = ["Upload: shrink to 768 px JPEG, keep in memory", "Quality check: blur and brightness (OpenCV)", "Prompt: system rules, conversation id, history, question, photo once",
                 "Ollama call: JSON schema, temperature 0.2, 4,096-token context", "Parse and validate, one repair retry, safe fallback", "Safety rules in code: refuse, hedge, flag", "Return JSON and the time taken"];
  for (let i = 0; i < steps.length; i++) {
    const y = 1.35 + i * 0.52;
    s.addShape(pres.ShapeType.ellipse, { x: 0.5, y: y + 0.04, w: 0.38, h: 0.38, fill: { color: i === 3 ? C.accent1 : i === 5 ? C.accent2 : C.accent5 }, line: { color: C.background1, width: 0.5 }, objectName: "Step badge " + (i + 1) });
    text(s, String(i + 1), { x: 0.5, y: y + 0.04, w: 0.38, h: 0.38, fontSize: 13, bold: true, color: i === 5 ? C.text2 : C.background1, align: "center", valign: "middle", objectName: "Step num " + (i + 1) });
    text(s, steps[i], { x: 1.0, y, w: 4.5, h: 0.46, fontSize: 13, color: C.text1, valign: "middle", objectName: "Step text " + (i + 1) });
  }
  code(s, 5.75, 1.35, 3.75, 3.5, ["{", '  "answer": "The label says', '    Night Time.",', '  "confidence": "medium",', '  "category": "medication",', '  "risk": "high",', '  "flags": [],', '  "notice": "I read what is', '    visible. Please verify...",', '  "latency_ms": 9400', "}"], "Response sample");

  // 3. Inside the model
  s = slide("Model", "Inside the model: where the time goes", "Explain the three parts: a frozen vision encoder turns the photo into tokens, a connector projects them into the language model's space, the language model reads them like words. Reading about 1,100 to 1,600 tokens costs far more than writing a 15-token answer. This first measurement was taken while memory was starved, but the shape holds: reading dominates.");
  bar(s, { name: "Seconds", labels: ["Loading the model", "Reading photo and prompt", "Writing the answer"], values: [14, 112, 7.6], x: 0.4, y: 1.3, w: 5.0, h: 3.0, title: "First request, seconds (memory starved)" });
  text(s, [
    { text: "Qwen2.5-VL 3B: frozen vision encoder, connecting layer, language model", options: { bullet: true, breakLine: true } },
    { text: "A photo becomes about 1,100 tokens. The prompt-reading step (prefill) is the cost", options: { bullet: true, breakLine: true } },
    { text: "Writing 15 tokens takes about 1 s once the photo is read", options: { bullet: true, breakLine: true } },
    { text: "Resizing the photo did not change the token count, so image size is not the lever", options: { bullet: true } },
  ], { x: 5.6, y: 1.4, w: 3.9, h: 3.4, fontSize: 14, color: C.text1, valign: "top", paraSpaceAfter: 8, objectName: "Model bullets" });

  // 4. Structured output
  s = slide("Model", "Structured output: confidence the code can read", "The schema makes the model's output machine-readable, so safety rules do not have to parse prose. If the model returns something invalid we retry once with a short repair message, then fall back to a safe low-confidence answer. A small model can lose accuracy under strict formatting, so we compare constrained and free output on the development set.");
  code(s, 0.5, 1.35, 4.6, 3.55, ['ANSWER_SCHEMA = {', '  "answer":     string,', '  "confidence": "high" | "medium"', '                | "low",', '  "category":   "other" | "medication"', '    | "food_label" | "hazard" | "sign"', '    | "document",', '  "reason":     string,', '  "retake_suggested": boolean', '}', '# passed to Ollama as format=schema'], "Schema code");
  text(s, [
    { text: "Parse and validate: non-empty answer, confidence in the allowed set, unknown category becomes other", options: { bullet: true, breakLine: true } },
    { text: "Invalid JSON: one repair retry, then a safe low-confidence fallback", options: { bullet: true, breakLine: true } },
    { text: "\"other\" is listed first as the safe default for a small model", options: { bullet: true, breakLine: true } },
    { text: "Risk: strict formatting can cost accuracy. Tested on the dev set", options: { bullet: true } },
  ], { x: 5.4, y: 1.4, w: 4.1, h: 3.4, fontSize: 14, color: C.text1, valign: "top", paraSpaceAfter: 8, objectName: "Structured bullets" });

  // 5. Multi-turn and caching
  s = slide("Model", "Multi-turn, caching, and a leak we caught", "The photo is sent only with the first message we keep, so a follow-up reuses the server's cached work: 4.6 s instead of 30 s. But cache reuse also caused a bug: the Pringles photo's content appeared in the answer for the next photo. We reproduced it outside the evaluation, then fixed it by putting a per-conversation id on the first line of the system prompt. Follow-ups share the id, so they stay fast. Different conversations never share cache.");
  bar(s, { name: "Seconds", labels: ["New photo", "Follow-up question"], values: [30, 4.6], x: 0.4, y: 1.3, w: 4.2, h: 2.6, title: "Answer time, seconds", dir: "col" });
  text(s, [
    { text: "Photo attached to the first kept message only, history trimmed to 4 turns", options: { bullet: true, breakLine: true } },
    { text: "The bug: after the Pringles photo, the chips photo was answered \"Thai Sweet Chilli\"", options: { bullet: true, breakLine: true } },
    { text: "Fix: id on line 1 of the system prompt", options: { bullet: true } },
  ], { x: 4.9, y: 1.4, w: 4.6, h: 2.5, fontSize: 14, color: C.text1, valign: "top", paraSpaceAfter: 6, objectName: "Cache bullets" });
  code(s, 0.5, 4.1, 9.0, 0.85, ['system = f"[conversation {session_id}]\\n" + SYSTEM_PROMPT', "# same id in a chat: cache helps.  New chat: new id, no shared cache."], "Cache fix code");

  // 6. Safety rules
  s = slide("Safety and sensing", "Safety rules: plain code after the model", "Risk can only be raised by these rules, never lowered. The model supplies a category but a small model sometimes mislabels, for example a bird photo labelled as medicine, so the category definitions are in the prompt and keywords can raise risk independently. Each rule that fires is shown to the user as a shield line.");
  H.table(s, [
    ["Rule", "Trigger", "Effect"],
    ["Risk only rises", "Model category, or keywords such as mg, dose, tablet, expiry, allergen, stove", "Risk becomes high"],
    ["Refuse advice", "High risk and \"should I\", \"how much\", \"is it safe\"", "Reads what is visible, refuses the advice"],
    ["Hazard state", "\"Is the stove on or off\" style questions", "Never fully sure; \"a photo can't prove it's off\""],
    ["Injection guard", "Text such as \"ignore previous instructions\"", "Confidence low; text not followed"],
    ["Soft photo", "Blurry or dark photo", "High confidence becomes medium"],
    ["Retake", "Quality gate or model asks for a retake", "Confidence low; next step shown"],
  ], { x: 0.5, y: 1.35, w: 9.0, colW: [1.8, 4.2, 3.0], rowH: 0.5, fs: 12, name: "Rules table" });

  // 7. Quality gate and camera guidance
  s = slide("Safety and sensing", "Sensing: sharpness, brightness and camera guidance", "Sharpness is the variance of the Laplacian, an edge-energy measure. We calibrated it on 300 VizWiz photos: questions the crowd could answer have a median sharpness of 351 versus 131 for unanswerable ones, so the metric predicts answerability. A mild blur cuts the score from 424 to 60. The camera uses the same measure on the centre of the frame, plus a steadiness check, to speak guidance and auto-capture.");
  bar(s, { name: "Sharpness", labels: ["Sharp", "Blur 1.5", "Blur 3", "Blur 5"], values: [424, 60, 25, 14], x: 0.4, y: 1.3, w: 4.4, h: 2.7, title: "Sharpness score of one photo as blur grows", dir: "col" });
  text(s, [
    { text: "Medians: 351 answerable vs 131 unanswerable (300 VizWiz photos)", options: { bullet: true, breakLine: true } },
    { text: "Server gate blocks below 8 (about 1% of photos), warns below 40", options: { bullet: true, breakLine: true } },
    { text: "Camera: sharp at 100 or more, dark under 55, glare over 225, steady if frame change is 8 or less", options: { bullet: true, breakLine: true } },
    { text: "Holds 1.2 s of good frames, then auto-captures", options: { bullet: true } },
  ], { x: 5.0, y: 1.4, w: 4.5, h: 2.8, fontSize: 13, color: C.text1, valign: "top", paraSpaceAfter: 6, objectName: "Sensing bullets" });
  text(s, "Known limit: flat textures (braille) read as blurry and can trigger a false retake", { x: 0.5, y: 4.3, w: 9, h: 0.5, fontSize: 14, italic: true, color: C.accent4, objectName: "Sensing limit" });

  // 8. Engineering on 8 GB
  s = slide("Engineering", "Engineering on an 8 GB laptop", "Everything on this slide was measured, not assumed. The model runs 66% on the GPU and 34% on the CPU because it does not fully fit in the GPU's share of memory. Shrinking the photo and shrinking the context did not help. Closing other apps did: from 135 seconds when memory was starved to 9 seconds when it was free. The lesson is that on a small machine, free memory beats code changes.");
  bar(s, { name: "Seconds", labels: ["Memory starved", "Chrome open", "Chrome closed", "Memory free"], values: [135, 71, 30, 9], x: 0.4, y: 1.3, w: 4.4, h: 2.8, title: "Seconds per answer (measured)" });
  H.table(s, [
    ["Tried", "Result"],
    ["Resize photo to 768 px", "Same token count, no change"],
    ["Context 2,048 not 4,096", "CPU/GPU split unchanged"],
    ["Flash attention, 8-bit cache", "Set, small saving"],
    ["Close Chrome and the VM", "135 s down to about 30 s"],
    ["Nothing else running", "About 9 s"],
  ], { x: 5.0, y: 1.4, w: 4.5, colW: [2.3, 2.2], rowH: 0.5, fs: 12, name: "Tried table" });
  text(s, "Swap use reached 10.6 GB with 12 to 14% memory free when answers were slow", { x: 0.5, y: 4.4, w: 9, h: 0.5, fontSize: 14, italic: true, color: C.accent5, objectName: "Memory note" });

  // 9. Evaluation methodology
  s = slide("Evaluation", "Evaluation method: built to avoid fooling ourselves", "Two separate sets: 12 items for tuning the prompt and 30 held out. The test run is locked so it can only be done once, after every item is approved by a person. The score is cost-weighted: a confident wrong answer on a high-risk item costs 20, a hedged miss on a low-risk item costs 1. We report counts with Wilson intervals because 30 items is small, and we run a second, flatter weighting to check the conclusions hold.");
  text(s, [
    { text: "12 development items for tuning, 30 test items held out, no overlap", options: { bullet: true, breakLine: true } },
    { text: "Test run is locked: needs approval of every item and runs once", options: { bullet: true, breakLine: true } },
    { text: "Gold = crowd consensus, rejected when answers conflict, checked by a person", options: { bullet: true, breakLine: true } },
    { text: "Wilson intervals, and a second set of weights as a sensitivity check", options: { bullet: true, breakLine: true } },
    { text: "Grader: normalises spelling, apostrophes and number words, then a person verifies", options: { bullet: true } },
  ], { x: 0.5, y: 1.4, w: 4.9, h: 3.4, fontSize: 14, color: C.text1, valign: "top", paraSpaceAfter: 8, objectName: "Method bullets" });
  H.table(s, [["Item risk", "Hedged miss", "Confident wrong"], ["Low", "1", "2"], ["Medium", "3", "6"], ["High", "5", "20"]],
    { x: 5.7, y: 1.5, w: 3.8, colW: [1.2, 1.3, 1.3], rowH: 0.5, fs: 14, center: true, name: "Cost table" });
  text(s, "Cost points per error", { x: 5.7, y: 3.6, w: 3.8, h: 0.4, fontSize: 13, italic: true, color: C.accent5, objectName: "Cost caption" });

  // 10. Results
  s = slide("Evaluation", "Results", "Fill in the numbers after the runs. Left: development comparison of prompt version 1 and 2 with the cache fix in place. Right: the three headline numbers from the single locked test run.");
  const num = (v) => typeof v === "number";
  if (num(R.dev.v1.correct) && num(R.dev.v2.correct)) {
    s.addChart(pres.charts.BAR, [{ name: "Prompt v1", labels: ["Correct", "Full sentence"], values: [R.dev.v1.correct, R.dev.v1.spoken] }, { name: "Final (v2 + safety rules)", labels: ["Correct", "Full sentence"], values: [R.dev.v2.correct, R.dev.v2.spoken] }], {
      x: 0.4, y: 1.3, w: 4.6, h: 3.3, barDir: "col", chartColors: [HEX.accent5, HEX.accent1], showTitle: true, title: "Development set, out of 10", titleColor: HEX.dk2, titleFontSize: 14,
      showValue: true, dataLabelPosition: "outEnd", dataLabelColor: HEX.dk1, dataLabelFontSize: 12, dataLabelFontFace: "+mn-lt", catAxisLabelColor: HEX.dk1, catAxisLabelFontSize: 12, catAxisLabelFontFace: "+mn-lt",
      valAxisHidden: true, valGridLine: { style: "none" }, catGridLine: { style: "none" }, showLegend: true, legendPos: "b", legendFontSize: 12, legendColor: HEX.dk1, legendFontFace: "+mn-lt", valAxisMaxVal: 10 });
  } else H.tbd(s, 0.5, 1.4, 4.4, 3.3, "development comparison, prompt v1 and v2 (after the re-run)", "Dev comparison placeholder");
  const stats = [[R.test.correct, "of 30 test items handled correctly"], [R.test.confidentWrongHigh, "confident wrong answers on high-risk items"], [R.test.typicalSeconds + " s", "typical time per answer"]];
  for (let i = 0; i < 3; i++) {
    const y = 1.3 + i * 1.12, isTbd = String(stats[i][0]).startsWith(TBD);
    H.card(s, 5.3, y, 4.2, 0.98, "Stat card " + (i + 1));
    text(s, stats[i][0], { x: 5.4, y, w: 1.5, h: 0.98, fontSize: isTbd ? 26 : 36, bold: true, color: isTbd ? C.accent2 : C.accent1, align: "center", valign: "middle", objectName: "Stat value " + (i + 1) });
    text(s, stats[i][1], { x: 7.0, y, w: 2.4, h: 0.98, fontSize: 13, color: C.text1, valign: "middle", objectName: "Stat label " + (i + 1) });
  }

  // 11. Failure case studies
  s = slide("Evaluation", "Failure case studies", "Each row is a real failure from our runs. The important point is how each was found: several were found only by looking at the actual photo, not from the metrics.");
  H.table(s, [
    ["Failure", "Cause", "Found by", "Fix"],
    ["Invented a password prompt", "Guessed meaning of blurry text", "Eval, then viewing the photo", "Prompt: only what is readable"],
    ["Photo A's text in photo B's answer", "Cache reuse between requests", "A repeated answer", "Id per conversation"],
    ["Bird flagged as medicine", "Small model mislabelled category", "User screenshot", "Category definitions, safe default"],
    ["Count question refused as dosing advice", "Advice rule matched any \"how many\"", "The test run", "Narrowed the rule (after the test)"],
    ["Braille photo blocked", "Flat texture scores as blurry", "Dev run", "Documented trade-off"],
    ["Fake safety alarm", "Grader missed spelling and numbers", "Looking at the photo", "Better grader, human check"],
  ], { x: 0.5, y: 1.3, w: 9.0, colW: [2.4, 2.4, 2.0, 2.2], rowH: 0.52, fs: 11, name: "Failure table" });

  // 12. Limits and next
  s = slide("Close", "Limits and what I would do next", "Be direct about limits: it is a 3 billion parameter model and sometimes confidently wrong, its self-reported confidence is not well calibrated, and the test set is small. Next steps follow from the failures: a bigger model, local speech recognition, proper user testing, and a larger test set.");
  text(s, [
    { text: "Limits", options: { bold: true, fontSize: 18, color: C.text2, breakLine: true, paraSpaceAfter: 6 } },
    { text: "A small model that is sometimes confidently wrong", options: { bullet: true, breakLine: true } },
    { text: "Its own confidence is poorly calibrated, so the safety rules are deterministic", options: { bullet: true, breakLine: true } },
    { text: "Keyword rules can miss cases; 30 items shows patterns, not rates", options: { bullet: true } },
  ], { x: 0.5, y: 1.4, w: 4.4, h: 3.3, fontSize: 14, color: C.text1, valign: "top", paraSpaceAfter: 6, objectName: "Limits" });
  text(s, "Next", { x: 5.2, y: 1.4, w: 4.3, h: 0.4, fontSize: 18, bold: true, color: C.text2, objectName: "Next heading" });
  const next = [[fa.FaServer, "Larger model on a hosted GPU"], [fa.FaMicrophone, "On-device speech recognition"], [fa.FaUsers, "Test with real users"], [fa.FaImages, "Few-shot examples (not yet tested)"]];
  for (let i = 0; i < next.length; i++) {
    await H.iconCircle(s, next[i][0], 5.2, 1.9 + i * 0.7, 0.5, C.accent1, "FFFFFF", "Next " + (i + 1));
    text(s, next[i][1], { x: 5.9, y: 1.9 + i * 0.7, w: 3.6, h: 0.5, fontSize: 14, color: C.text1, valign: "middle", objectName: "Next text " + (i + 1) });
  }

  await H.finish(path.join(__dirname, "..", "SeeForMe_technical.pptx"));
})().catch((e) => { console.error(e); process.exit(1); });

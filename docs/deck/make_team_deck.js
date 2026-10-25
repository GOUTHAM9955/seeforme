// Team deck, 12 slides.   NODE_PATH=$PWD/node_modules node make_team_deck.js
const path = require("path");
const { newDeck, HEX } = require("./lib");

// ---- fill these in ----
const TBD = "TBD";
const R = { correct: "24", confidentWrongHigh: "0", typicalSeconds: "43" };
const MEMBERS = ["Goutham", "[Member 2]", "[Member 3]", "[Member 4]", "[Member 5]"];
const COURSE = "[Course name]  ·  October 2026";
const REPO = "[GitHub link]";

(async () => {
  const H = newDeck("SeeForMe: team deck", "SeeForMe");
  const { pres, C, fa } = H;
  const SEC = ["Intro", "Modules", "Evidence", "Close"];
  SEC.forEach((t) => pres.addSection({ title: t }));
  const content = (sec) => pres.addSlide({ masterName: "CONTENT", sectionTitle: sec });
  const text = (s, t, o) => s.addText(t, { isTextBox: true, margin: 0, ...o });

  // 1. Title
  let s = pres.addSlide({ masterName: "TITLE_DARK", sectionTitle: "Intro" });
  s.addText("SeeForMe", { placeholder: "title" });
  s.addText([{ text: "A multimodal accessibility assistant that tells you when it isn't sure", options: { breakLine: true, paraSpaceAfter: 10 } },
             { text: "Team: " + MEMBERS.join("  ·  "), options: { fontSize: 14, color: C.background1, breakLine: true, paraSpaceAfter: 4 } },
             { text: COURSE, options: { fontSize: 14, color: C.background1 } }], { placeholder: "body" });
  await H.logo(s);
  s.addNotes("Presenter: Member 2. Introduce the team and the one-line idea: a blind or low-vision person asks a question about a photo, and the assistant says out loud how sure it is.");

  // 2. Problem and brief
  s = content("Intro");
  s.addText("The problem and what the brief asked", { placeholder: "title" });
  text(s, [
    { text: "Blind and low-vision people need answers to their own questions:", options: { breakLine: true, paraSpaceAfter: 6 } },
    { text: "Which medicine is this?", options: { bullet: true, breakLine: true } },
    { text: "What does this sign say?", options: { bullet: true, breakLine: true } },
    { text: "Is the stove on?", options: { bullet: true, breakLine: true, paraSpaceAfter: 8 } },
    { text: "They can't check the answer, so the AI must be honest about what it doesn't know.", options: { bold: true, color: C.text2 } },
  ], { x: 0.5, y: 1.4, w: 4.2, h: 3.5, fontSize: 16, color: C.text1, valign: "top", objectName: "Problem text" });
  H.card(s, 5.0, 1.4, 4.5, 3.5, "Brief card");
  text(s, "What the brief asked for", { x: 5.25, y: 1.5, w: 4.0, h: 0.4, fontSize: 16, bold: true, color: C.accent1, objectName: "Brief heading" });
  const brief = ["Upload a photo, then multi-turn visual Q&A", "Spoken responses", "An explicit low-confidence behavior", "30-image test set: accuracy and cost of errors", "Ethics: when should an AI refuse?"];
  for (let i = 0; i < brief.length; i++) {
    await H.iconCircle(s, fa.FaCheck, 5.25, 2.0 + i * 0.57, 0.38, C.accent3, "FFFFFF", "Check " + (i + 1));
    text(s, brief[i], { x: 5.75, y: 1.97 + i * 0.57, w: 3.7, h: 0.5, fontSize: 14, color: C.text1, valign: "middle", objectName: "Brief item " + (i + 1) });
  }
  s.addNotes("Presenter: Member 2. State the problem, then the brief's requirements. The key sentence: the user cannot verify the answer, so honesty matters more than sounding helpful.");

  // 3. Brief -> modules -> owners
  s = content("Modules");
  s.addText("From the brief to five modules", { placeholder: "title" });
  H.table(s, [
    ["What the brief asked", "Module", "Owner"],
    ["Multi-turn visual Q&A, frozen encoder plus connector", "1  Vision-language core", MEMBERS[0]],
    ["Low-confidence behavior, when to refuse", "2  Safety, ethics and confidence", MEMBERS[2]],
    ["Upload or capture, spoken responses", "3  Accessible interface", MEMBERS[3]],
    ["Runs locally, without failures", "4  Platform and performance", MEMBERS[4]],
    ["30-image test, accuracy and cost of errors", "5  Evaluation and data", MEMBERS[1]],
  ], { x: 0.5, y: 1.4, w: 9, colW: [4.0, 3.2, 1.8], rowH: 0.55, name: "Module table" });
  text(s, "Owner column: replace with who actually built each module.", { x: 0.5, y: 4.85, w: 9, h: 0.3, fontSize: 12, italic: true, color: C.accent4, objectName: "Owner note" });
  s.addNotes("Presenter: Member 4. This is the map for the rest of the talk. Each brief requirement became one module with one owner. Fill in the owners honestly.");

  // 4. Architecture
  s = content("Modules");
  s.addText("Architecture: the model proposes, code decides", { placeholder: "title" });
  const boxes = [["Photo", "Camera, upload, paste", "M3", "light"], ["Quality check", "OpenCV: blur, brightness", "M4", "light"], ["Vision-language model", "Qwen2.5-VL 3B via Ollama", "M1", "main"], ["Safety rules", "Plain code: refuse, hedge", "M2", "warn"], ["Answer", "Sentence, confidence, voice", "M3", "light"]];
  for (let i = 0; i < boxes.length; i++) {
    const x = 0.4 + i * 1.9, kind = boxes[i][3];
    const fill = kind === "main" ? C.accent1 : kind === "warn" ? C.accent2 : C.background2;
    const tcol = kind === "main" ? C.background1 : C.text2;
    text(s, "Module " + boxes[i][2].slice(1), { x, y: 1.3, w: 1.6, h: 0.3, fontSize: 12, bold: true, color: C.accent5, align: "center", objectName: "Module tag " + (i + 1) });
    s.addShape(pres.ShapeType.roundRect, { x, y: 1.65, w: 1.6, h: 1.5, rectRadius: 0.1, fill: { color: fill }, line: { color: fill, width: 0.5 }, shadow: H.shadow(), objectName: "Pipeline box " + (i + 1) });
    text(s, [{ text: boxes[i][0], options: { bold: true, fontSize: 15, breakLine: true } }, { text: boxes[i][1], options: { fontSize: 12 } }],
      { x: x + 0.08, y: 1.7, w: 1.44, h: 1.4, color: tcol, align: "center", valign: "middle", paraSpaceAfter: 4, objectName: "Pipeline text " + (i + 1) });
    if (i < boxes.length - 1) s.addShape(pres.ShapeType.line, { x: x + 1.62, y: 2.4, w: 0.26, h: 0, line: { color: C.accent5, width: 2.25, endArrowType: "triangle" }, objectName: "Arrow " + (i + 1) });
  }
  const bars = [["Module 4", "FastAPI server and browser page. Sessions in memory only. One question at a time."], ["Module 5", "Runs the same pipeline over a frozen test set and scores it."]];
  bars.forEach((b, i) => {
    const y = 3.45 + i * 0.7;
    s.addShape(pres.ShapeType.roundRect, { x: 0.4, y, w: 9.2, h: 0.55, rectRadius: 0.08, fill: { color: C.background2 }, line: { color: C.accent5, width: 1 }, objectName: "Bar " + (i + 1) });
    text(s, [{ text: b[0] + ":  ", options: { bold: true, color: C.accent1 } }, { text: b[1] }], { x: 0.55, y, w: 8.9, h: 0.55, fontSize: 14, color: C.text1, valign: "middle", objectName: "Bar text " + (i + 1) });
  });
  s.addNotes("Presenter: Goutham. Walk left to right. The amber box is the design idea: safety is ordinary code after the model, so it can be tested and the model cannot talk its way past it. Modules 4 and 5 wrap the pipeline: one serves it, the other measures it.");

  // 5. Module 1
  s = content("Modules");
  s.addText("Module 1: the vision-language core", { placeholder: "title" });
  text(s, [
    { text: "Qwen2.5-VL 3B runs locally through Ollama, about 3 GB, so it fits an 8 GB laptop", options: { bullet: true, breakLine: true } },
    { text: "The photo goes in once. Follow-up questions reuse it, so a second answer takes seconds", options: { bullet: true, breakLine: true } },
    { text: "Answers are forced into a JSON shape: answer, confidence, category, reason, retake flag", options: { bullet: true, breakLine: true } },
    { text: "The prompt asks for full spoken sentences, only what is readable, and treats text in the photo as data", options: { bullet: true } },
  ], { x: 0.5, y: 1.4, w: 5.2, h: 3.5, fontSize: 15, color: C.text1, valign: "top", paraSpaceAfter: 8, objectName: "Module 1 bullets" });
  H.card(s, 6.0, 1.4, 3.5, 1.6, "Stat card");
  text(s, "~1,100", { x: 6.0, y: 1.5, w: 3.5, h: 0.9, fontSize: 46, bold: true, color: C.accent1, align: "center", valign: "middle", objectName: "Stat" });
  text(s, "image tokens per photo", { x: 6.0, y: 2.4, w: 3.5, h: 0.4, fontSize: 14, color: C.text1, align: "center", objectName: "Stat label" });
  H.card(s, 6.0, 3.2, 3.5, 1.7, "Course card");
  text(s, [{ text: "Course tie-in", options: { bold: true, color: C.accent1, breakLine: true } }, { text: "Frozen vision encoder, connecting layer and language model, as in Flamingo" }], { x: 6.2, y: 3.3, w: 3.1, h: 1.5, fontSize: 14, color: C.text1, valign: "middle", objectName: "Course text" });
  s.addNotes("Presenter: Goutham. Explain the three parts of the model: a frozen vision encoder turns the photo into about 1,100 tokens, a connecting layer maps them into the language model, and the language model writes the answer. Structured output matters because the safety rules read the confidence field in code.");

  // 6. Module 2
  s = content("Modules");
  s.addText("Module 2: safety, ethics and confidence", { placeholder: "title" });
  const m2 = [[fa.FaBan, "Refuse", "Advice a photo can't support, such as doses or \"is it safe to take\". We read what is printed and send you to a pharmacist."],
              [fa.FaExclamationTriangle, "Hedge", "Low confidence starts with \"I'm not sure\" plus a next step. A stove is never reported as surely off. A blurry photo can't give high confidence."],
              [fa.FaEyeSlash, "Ignore", "Instructions written inside a photo are data, not commands. The app flags them and does not follow them."]];
  for (let i = 0; i < 3; i++) {
    const x = 0.5 + i * 3.1;
    H.card(s, x, 1.4, 2.85, 2.95, "Rule card " + (i + 1));
    await H.iconCircle(s, m2[i][0], x + 0.25, 1.55, 0.7, C.accent4, "FFFFFF", m2[i][1]);
    text(s, m2[i][1], { x: x + 0.25, y: 2.35, w: 2.4, h: 0.4, fontSize: 18, bold: true, color: C.text2, objectName: "Rule title " + (i + 1) });
    text(s, m2[i][2], { x: x + 0.25, y: 2.8, w: 2.4, h: 1.5, fontSize: 13, color: C.text1, valign: "top", objectName: "Rule text " + (i + 1) });
  }
  text(s, "The rules are plain code that runs after the model, so they can be tested. They can only raise the risk, never lower it.", { x: 0.5, y: 4.5, w: 9, h: 0.6, fontSize: 14, italic: true, color: C.accent5, valign: "top", objectName: "Module 2 note" });
  s.addNotes("Presenter: Member 3. Answer the brief's ethics question: refuse when a photo cannot support the answer and a wrong answer is dangerous, and always offer a next step. Every rule that fires is shown to the user with a shield line.");

  // 7. Module 3
  s = content("Modules");
  s.addText("Module 3: the accessible interface", { placeholder: "title" });
  text(s, [
    { text: "Photo from a file, paste, drag and drop, or the live camera", options: { bullet: true, breakLine: true } },
    { text: "The camera speaks guidance (too dark, hold steady, move closer) and takes the photo itself when it is sharp", options: { bullet: true, breakLine: true } },
    { text: "Spoken answers with replay, and a microphone to speak the question", options: { bullet: true, breakLine: true } },
    { text: "Keyboard-only use, screen-reader mode, high-contrast theme, large text", options: { bullet: true } },
  ], { x: 0.5, y: 1.4, w: 4.6, h: 3.5, fontSize: 15, color: C.text1, valign: "top", paraSpaceAfter: 8, objectName: "Module 3 bullets" });
  H.tbd(s, 5.4, 1.4, 4.1, 3.5, "interface screenshot", "Interface screenshot placeholder");
  s.addNotes("Presenter: Member 4. The interface was designed for the people who will use it. Confidence is shown with words and icons, never colour alone. Mention what was tested with a keyboard and VoiceOver.");

  // 8. Module 4
  s = content("Modules");
  s.addText("Module 4: platform and performance", { placeholder: "title" });
  text(s, [
    { text: "FastAPI server: sessions in memory, upload limits, one question at a time", options: { bullet: true, breakLine: true } },
    { text: "A photo-quality check (blur, brightness) runs before the model", options: { bullet: true, breakLine: true } },
    { text: "Runs entirely on a MacBook Air M1 with 8 GB", options: { bullet: true, breakLine: true } },
    { text: "Speed depends on free memory: freeing RAM cut an answer from minutes to seconds", options: { bullet: true } },
  ], { x: 0.5, y: 1.4, w: 4.5, h: 3.5, fontSize: 15, color: C.text1, valign: "top", paraSpaceAfter: 8, objectName: "Module 4 bullets" });
  s.addChart(pres.charts.BAR, [{ name: "Seconds per answer", labels: ["Memory starved", "Chrome open", "Chrome closed", "Memory free"], values: [135, 71, 30, 9] }], {
    x: 5.2, y: 1.3, w: 4.4, h: 3.5, barDir: "bar", chartColors: [HEX.accent1], showTitle: true, title: "Seconds per answer (measured)", titleColor: HEX.dk2, titleFontSize: 14,
    showValue: true, dataLabelPosition: "outEnd", dataLabelColor: HEX.dk1, dataLabelFontSize: 12, dataLabelFontFace: "+mn-lt",
    catAxisLabelColor: HEX.dk1, catAxisLabelFontSize: 12, catAxisLabelFontFace: "+mn-lt", catAxisOrientation: "maxMin",
    valAxisHidden: true, valGridLine: { style: "none" }, catGridLine: { style: "none" }, showLegend: false });
  s.addNotes("Presenter: Member 5. The model server and the browser compete for 8 GB of memory. We measured answer time under four conditions on the same machine. The lesson: on a small machine, free memory matters more than any code change. For the demo, close everything except the app.");

  // 9. Demo
  s = content("Evidence");
  s.addText("Live demo", { placeholder: "title" });
  const steps = ["Medicine bottle: reads the label, adds a verify line", "\"How many tablets should I take?\": refused, rule shown", "Blurry photo: asks for a retake", "Camera: spoken guidance, then auto-capture", "Handwritten \"ignore instructions\" note: not obeyed"];
  for (let i = 0; i < steps.length; i++) {
    const y = 1.45 + i * 0.72;
    s.addShape(pres.ShapeType.ellipse, { x: 0.5, y: y + 0.05, w: 0.5, h: 0.5, fill: { color: C.accent1 }, line: { color: C.accent1, width: 0.5 }, objectName: "Step badge " + (i + 1) });
    text(s, String(i + 1), { x: 0.5, y: y + 0.05, w: 0.5, h: 0.5, fontSize: 16, bold: true, color: C.background1, align: "center", valign: "middle", objectName: "Step number " + (i + 1) });
    text(s, steps[i], { x: 1.15, y, w: 3.9, h: 0.62, fontSize: 14, color: C.text1, valign: "middle", objectName: "Step text " + (i + 1) });
  }
  H.tbd(s, 5.35, 1.45, 4.15, 3.4, "app screenshot", "Screenshot placeholder");
  s.addNotes("Presenter: Member 5 (Member 4 drives the screen). Ask one question first to warm up the model. Close Chrome and other apps. Backup: play the recorded video.");

  // 10. Module 5
  s = content("Evidence");
  s.addText("Module 5: evaluation and results", { placeholder: "title" });
  const stats = [[R.correct, "of 30 test items handled correctly"], [R.confidentWrongHigh, "confident wrong answers on high-risk items"], [R.typicalSeconds + " s", "typical time per answer"]];
  for (let i = 0; i < 3; i++) {
    const x = 0.5 + i * 3.1, isTbd = String(stats[i][0]).startsWith(TBD);
    H.card(s, x, 1.3, 2.85, 1.5, "Stat card " + (i + 1));
    text(s, stats[i][0], { x, y: 1.35, w: 2.85, h: 0.85, fontSize: isTbd ? 36 : 48, bold: true, color: isTbd ? C.accent2 : C.accent1, align: "center", valign: "middle", objectName: "Stat value " + (i + 1) });
    text(s, stats[i][1], { x: x + 0.15, y: 2.2, w: 2.55, h: 0.55, fontSize: 13, color: C.text1, align: "center", valign: "top", objectName: "Stat label " + (i + 1) });
  }
  s.addChart(pres.charts.BAR, [{ name: "Test items", labels: ["Signage", "Hazard", "Document", "Medication", "Label", "Unanswerable"], values: [8, 6, 5, 4, 4, 3] }], {
    x: 0.4, y: 2.95, w: 4.6, h: 2.2, barDir: "bar", chartColors: [HEX.accent1], showTitle: true, title: "Test set mix (30 items)", titleColor: HEX.dk2, titleFontSize: 13,
    showValue: true, dataLabelPosition: "outEnd", dataLabelColor: HEX.dk1, dataLabelFontSize: 11, dataLabelFontFace: "+mn-lt",
    catAxisLabelColor: HEX.dk1, catAxisLabelFontSize: 11, catAxisLabelFontFace: "+mn-lt", catAxisOrientation: "maxMin",
    valAxisHidden: true, valGridLine: { style: "none" }, catGridLine: { style: "none" }, showLegend: false });
  text(s, [
    { text: "30 test items, run once", options: { bullet: true, breakLine: true } },
    { text: "12 separate items for tuning", options: { bullet: true, breakLine: true } },
    { text: "Cost: a confident wrong medicine answer = 20, a hedged miss on a low-risk item = 1", options: { bullet: true, breakLine: true } },
    { text: "Every grade checked against the photo", options: { bullet: true } },
  ], { x: 5.3, y: 3.0, w: 4.2, h: 2.1, fontSize: 13, color: C.text1, valign: "top", paraSpaceAfter: 4, objectName: "Method bullets" });
  s.addNotes("Presenter: Member 2. Fill in the three numbers after the test run. The middle number is the safety headline. Explain the cost idea: errors are weighted by item risk and by whether the app admitted doubt.");

  // 11. Failures
  s = content("Evidence");
  s.addText("Failures we found and what we learned", { placeholder: "title" });
  const fails = [[fa.FaEyeSlash, "Invented meaning", "Read a blurry Startup Repair screen as a password prompt, with high confidence. Fix: describe only what is readable."],
                 [fa.FaClone, "Cache leak", "One photo's content showed up in the next photo's answer. Fix: a separate id for each conversation."],
                 [fa.FaCamera, "Gate too strict", "Blocked a readable braille photo as blurry. Flat textures fool a sharpness test."],
                 [fa.FaCalculator, "Grader error", "My grader marked a correct answer wrong and faked a safety alarm. A person now checks every grade."]];
  for (let i = 0; i < 4; i++) {
    const x = 0.5 + i * 2.3;
    H.card(s, x, 1.4, 2.1, 2.95, "Failure card " + (i + 1));
    await H.iconCircle(s, fails[i][0], x + 0.2, 1.55, 0.6, C.accent4, "FFFFFF", fails[i][1]);
    text(s, fails[i][1], { x: x + 0.2, y: 2.25, w: 1.8, h: 0.45, fontSize: 14, bold: true, color: C.text2, objectName: "Failure title " + (i + 1) });
    text(s, fails[i][2], { x: x + 0.2, y: 2.75, w: 1.75, h: 1.55, fontSize: 12, color: C.text1, valign: "top", objectName: "Failure text " + (i + 1) });
  }
  H.card(s, 0.5, 4.5, 9.0, 0.6, "Test failures bar");
  text(s, [{ text: "On the test set:  ", options: { bold: true, color: C.accent4 } }, { text: "a blurry fish-oil jar misread but hedged · 7 of 27 answerable items hedged or blocked · a count question refused as dosing advice (fixed after the test) · a cheese bag called Thai Sweet Chilli" }], { x: 0.65, y: 4.5, w: 8.7, h: 0.6, fontSize: 12, color: C.text1, valign: "middle", objectName: "Test failures text" });
  s.addNotes("Presenter: Goutham. This slide is about honesty. These are real failures from our own runs. The cache leak and the grader error are the best stories: both made the numbers look wrong in ways only a person looking at the photo could catch.");

  // 12. Ethics, next, thanks
  s = content("Close");
  s.addText("Ethics, limits and what comes next", { placeholder: "title" });
  text(s, [
    { text: "When should an AI refuse?", options: { bold: true, fontSize: 18, color: C.text2, breakLine: true, paraSpaceAfter: 6 } },
    { text: "When a photo can't support the answer and a wrong answer is dangerous", options: { bullet: true, breakLine: true } },
    { text: "Always with a next step, never just \"no\"", options: { bullet: true, breakLine: true } },
    { text: "Limits: a small model that is sometimes confidently wrong, rules that keywords can miss", options: { bullet: true } },
  ], { x: 0.5, y: 1.4, w: 4.4, h: 3.0, fontSize: 14, color: C.text1, valign: "top", paraSpaceAfter: 6, objectName: "Ethics text" });
  const next = [[fa.FaServer, "A bigger hosted model"], [fa.FaMicrophone, "Local speech recognition"], [fa.FaUsers, "Test with real users"], [fa.FaImages, "Few-shot examples (not yet tested)"]];
  text(s, "What comes next", { x: 5.2, y: 1.4, w: 4.3, h: 0.4, fontSize: 18, bold: true, color: C.text2, objectName: "Next heading" });
  for (let i = 0; i < next.length; i++) {
    await H.iconCircle(s, next[i][0], 5.2, 1.9 + i * 0.62, 0.5, C.accent1, "FFFFFF", "Next " + (i + 1));
    text(s, next[i][1], { x: 5.9, y: 1.9 + i * 0.62, w: 3.6, h: 0.5, fontSize: 14, color: C.text1, valign: "middle", objectName: "Next text " + (i + 1) });
  }
  H.card(s, 0.5, 4.3, 9.0, 0.7, "Thanks bar");
  text(s, "Thank you. Questions?   " + REPO + "   ·   VizWiz data (CC BY 4.0)   ·   Qwen2.5-VL via Ollama", { x: 0.7, y: 4.3, w: 8.6, h: 0.7, fontSize: 14, bold: true, color: C.accent1, valign: "middle", objectName: "Thanks text" });
  s.addNotes("Presenter: Member 3 (all join for thanks). Answer the ethics question directly, state the limits honestly, then the next steps. End with thanks and questions.");

  await H.finish(path.join(__dirname, "..", "SeeForMe_team.pptx"));
})().catch((e) => { console.error(e); process.exit(1); });

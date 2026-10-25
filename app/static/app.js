"use strict";

const $ = (id) => document.getElementById(id);
const state = { sessionId: null, busy: false, controller: null, timer: null, previewUrl: null, lastSpoken: "", micNoticeShown: false };

// ---------- settings (stored only as a convenience; the page works without storage) ----------
const settings = { speech: true, rate: "1", voice: "", size: 18, theme: "auto", sr: false, autosend: true, handsfree: false };
function loadSettings() { try { Object.assign(settings, JSON.parse(localStorage.getItem("seeforme.v2") || "{}")); } catch (e) {} }
function saveSettings() { try { localStorage.setItem("seeforme.v2", JSON.stringify(settings)); } catch (e) {} }
function applySettings() {
  document.documentElement.style.fontSize = settings.size + "px";
  document.documentElement.dataset.theme = settings.theme;
  $("speech").checked = settings.speech;
  $("rate").value = settings.rate;
  $("voice").value = settings.voice;
  $("size").value = settings.size;
  $("theme").value = settings.theme;
  $("sr-mode").checked = settings.sr;
  $("autosend").checked = settings.autosend;
  $("handsfree").checked = settings.handsfree;
  $("speech").disabled = settings.sr;
}

// ---------- speech output ----------
const IS_SAFARI = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
const HAS_TTS = "speechSynthesis" in window;
const GOOD_VOICES = ["Samantha", "Ava", "Allison", "Serena", "Daniel", "Karen", "Moira", "Alex"];
let currentUtterance = null;   // keep a reference: browsers can drop an utterance that gets garbage collected

function englishVoices() { return HAS_TTS ? speechSynthesis.getVoices().filter((v) => v.lang.startsWith("en")) : []; }
function fillVoiceList() {
  const sel = $("voice"), keep = settings.voice;
  sel.replaceChildren(new Option("Automatic (recommended)", ""));
  englishVoices().forEach((v) => sel.append(new Option(v.name + " (" + v.lang + ")", v.name)));
  sel.value = keep;
}
function pickVoice() {
  // A chosen voice wins. Otherwise prefer a natural voice by name: many systems list novelty
  // voices first (Albert, Bahh, Boing...), so if none is found we let the browser use its default.
  const all = englishVoices();
  if (settings.voice) { const v = all.find((x) => x.name === settings.voice); if (v) return v; }
  for (const name of GOOD_VOICES) { const v = all.find((x) => x.name.startsWith(name)); if (v) return v; }
  return null;
}
function showSpeaking(on) { $("speaking").hidden = !on; }
function stopSpeech() { if (HAS_TTS) speechSynthesis.cancel(); showSpeaking(false); }

// force=true: the user pressed a button on purpose, so speak even if automatic voice is off
function speak(text, force = false, onDone = null) {
  if (!HAS_TTS) return;
  if (!force && (settings.sr || !settings.speech)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = parseFloat(settings.rate) || 1;
  u.lang = "en-US";
  const v = pickVoice(); if (v) u.voice = v;
  u.onstart = () => showSpeaking(true);
  u.onend = () => { showSpeaking(false); if (onDone) onDone(); };
  u.onerror = (e) => {
    showSpeaking(false);
    if (e.error !== "canceled" && e.error !== "interrupted")
      addError("I couldn't speak that aloud (" + e.error + "). The text is still on screen.");
  };
  currentUtterance = u;
  const go = () => { speechSynthesis.speak(u); if (speechSynthesis.paused) speechSynthesis.resume(); };
  // Chrome ignores speak() called in the same instant as cancel(), so wait a moment there.
  // Safari doesn't need that, and a delay could make it lose the "user clicked" permission.
  if (IS_SAFARI) go(); else setTimeout(go, 80);
}
// Safari only lets speech start after a click. Say a silent word on each click/Enter so later
// answers (which arrive after a delay) are allowed to speak.
function unlockSpeech() {
  if (!HAS_TTS) return;
  const u = new SpeechSynthesisUtterance(" "); u.volume = 0; speechSynthesis.speak(u);
}

let audioCtx;
function earcon(kind) {   // high: one tone, medium: lower tone, low: two falling tones
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const notes = { high: [880], medium: [660], low: [520, 390], listen: [740] }[kind] || [660];
    notes.forEach((f, i) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.frequency.value = f; o.connect(g); g.connect(audioCtx.destination);
      const t = audioCtx.currentTime + i * 0.2;
      g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      o.start(t); o.stop(t + 0.2);
    });
  } catch (e) {}
}
function announce(text) { $("status").textContent = ""; setTimeout(() => { $("status").textContent = text; }, 50); }

// ---------- DOM helpers (textContent only: model output is never trusted as HTML) ----------
function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}
function button(label, cls, onclick) {
  const b = el("button", "btn " + (cls || ""), label); b.type = "button"; b.onclick = onclick; return b;
}
function addMsg(node) {
  const w = $("welcome"); if (w) w.remove();
  $("log").appendChild(node);
  node.scrollIntoView({ block: "nearest", behavior: "smooth" });
}
function addUser(text) { addMsg(el("article", "msg user", text)); }
function addError(text) {
  const m = el("article", "msg error"); m.setAttribute("role", "alert");
  const head = el("div", "msg-head"); head.append(el("span", "who", "Problem"));
  m.append(head, el("p", "lead", text));
  addMsg(m);
}

const CONF = {
  high: ["●", "Confident"],
  medium: ["◐", "Fairly sure, double-check"],
  low: ["▲", "Not sure"],
};
const SAFETY_RULES = {
  refused_advice: "I read what's visible, but I don't give medical, dosing or safety advice.",
  hazard_state: "A photo can't prove an appliance is off, so I never say I'm completely sure.",
  soft_photo: "The photo is a bit blurry or dark, so I won't claim to be completely sure.",
  possible_injection: "Text inside a photo can't give me orders. I ignored it.",
};
const CATEGORY_NAMES = { other: "General", medication: "Medicine", food_label: "Food label", hazard: "Safety item", sign: "Sign", document: "Document" };
const SUGGESTIONS = {
  other: ["Describe this photo", "Read any text", "What colour is it?"],
  medication: ["Read all the text", "What is the expiry date?", "What strength is it?"],
  food_label: ["Read all the text", "What are the ingredients?", "What is the expiry date?"],
  hazard: ["Read all the text", "Is there a flame or light?", "What are the settings?"],
  document: ["Read all the text", "What is the date?", "What amounts are shown?"],
  sign: ["Read the sign", "Is there other text nearby?"],
};

function addAnswer(r, seconds) {
  const [icon, label] = CONF[r.confidence] || CONF.low;
  const m = el("article", "msg bot " + r.confidence);
  const head = el("div", "msg-head");
  head.append(el("span", "who", "SeeForMe"), el("span", "chip", icon + " " + label));
  if (seconds) head.append(el("span", "time", seconds + " s"));
  m.append(head, el("p", "lead", r.answer));
  if (r.notice) m.append(el("p", "callout", r.notice));
  const rules = (r.flags || []).map((f) => SAFETY_RULES[f]).filter(Boolean);
  rules.forEach((t) => m.append(el("p", "safety-tag", "🛡 Safety rule: " + t)));

  const spoken = r.answer + " " + (r.notice || "");
  state.lastSpoken = spoken;
  const actions = el("div", "actions");
  actions.append(button("🔊 Read aloud", "", () => speak(spoken, true)));
  if (r.confidence === "low") {
    actions.append(button("Retake photo", "", () => $("file").click()));
    actions.append(button("Ask differently", "", () => $("question").focus()));
  }
  m.append(actions);

  const why = el("details", "why");
  why.append(el("summary", "", "Why this answer?"));
  const dl = el("dl");
  const rows = [["How sure", label], ["What I saw", CATEGORY_NAMES[r.category] || "General"],
                ["Risk level", r.risk], ["My reasoning", r.reason || "None given"]];
  if (r.flags && r.flags.length) rows.push(["Safety checks", r.flags.join(", ").replaceAll("_", " ")]);
  rows.forEach(([k, v]) => { dl.append(el("dt", "", k), el("dd", "", v)); });
  why.append(dl); m.append(why);

  addMsg(m);
  showSuggestions(r.category);
  earcon(r.confidence);
  speak(spoken, false, settings.handsfree ? () => toggleMic() : null);
}

function addRetakePanel(reasons, question) {
  const m = el("article", "msg bot low");
  const head = el("div", "msg-head");
  head.append(el("span", "who", "SeeForMe"), el("span", "chip", "▲ Please retake"));
  m.append(head, el("p", "lead", reasons.join(" ") + " I may not be able to read it, so please take another photo."));
  const actions = el("div", "actions");
  actions.append(button("Retake photo", "primary", () => $("file").click()));
  const anyway = button("Ask anyway", "", () => { anyway.disabled = true; ask(question, true, false); });
  actions.append(anyway);
  m.append(actions);
  addMsg(m);
  earcon("low");
  speak("This photo is hard to use. " + reasons.join(" ") + " Please retake it.");
}

function showSuggestions(category) {
  const list = SUGGESTIONS[category] || SUGGESTIONS.other;
  const box = $("quick"); box.replaceChildren();
  list.forEach((q) => { const b = el("button", "", q); b.type = "button"; b.onclick = () => { unlockSpeech(); ask(q, false); }; box.append(b); });
  box.hidden = false;
}

// ---------- busy state ----------
const STAGES = [[0, "Looking at your photo…"], [12, "Reading the details…"], [30, "Nearly there…"]];
function setBusy(b) {
  state.busy = b;
  $("thinking").hidden = !b;
  $("ask").disabled = b || !state.sessionId;
  $("mic").disabled = b || !state.sessionId || !SR;
  $("quick").querySelectorAll("button").forEach((x) => { x.disabled = b; });
  clearInterval(state.timer);
  if (b) {
    let s = 0; $("elapsed").textContent = "0"; $("slow").hidden = true; $("stage").textContent = STAGES[0][1];
    announce("Looking at your photo. This can take up to a minute.");
    state.timer = setInterval(() => {
      s += 1; $("elapsed").textContent = String(s);
      const stage = [...STAGES].reverse().find(([t]) => s >= t); $("stage").textContent = stage[1];
      if (s === 45) $("slow").hidden = false;
    }, 1000);
  }
  $("thinking").scrollIntoView({ block: "nearest" });
}

// ---------- talking to the server ----------
async function api(path, options) {
  const res = await fetch(path, options);
  let data = null;
  try { data = await res.json(); } catch (e) {}
  if (!res.ok) throw new Error((data && data.error) || "Something went wrong. Please try again.");
  return data;
}

function showPhoto(blob) {
  if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
  state.previewUrl = URL.createObjectURL(blob);
  $("preview").src = state.previewUrl;
  $("empty").hidden = true; $("loaded").hidden = false;
}
function resetConversation() {
  const w = el("div", "welcome");
  w.id = "welcome";
  w.append(el("p", "welcome-title", "Photo added."), el("p", "", "Type or speak your question, or tap one of the suggestions below."));
  $("log").replaceChildren(w);
  showSuggestions("other");
}

async function uploadBlob(blob, name) {
  stopSpeech();
  const form = new FormData(); form.append("image", blob, name || "photo.jpg");
  try {
    const data = await api("/session", { method: "POST", body: form });
    state.sessionId = data.session_id;
    showPhoto(blob);
    const q = $("quality");
    q.className = "pill quality " + (data.quality.ok ? "ok" : "warn");
    q.textContent = data.quality.ok ? "✔ Photo looks clear" : "⚠ " + data.quality.reasons.join(" ");
    resetConversation();
    ["question", "ask", "clear"].forEach((id) => { $(id).disabled = false; });
    $("mic").disabled = !SR;
    announce("Photo added. " + (data.quality.ok ? "It looks clear." : data.quality.reasons.join(" ")) + " Ask your question.");
    $("question").focus();
  } catch (e) { addError(e.message); }
}

async function ask(question, force, showUser = true) {
  question = question.trim();
  if (!state.sessionId || state.busy || !question) return;
  if (showUser) addUser(question);
  stopSpeech();
  setBusy(true);
  const t0 = performance.now();
  state.controller = new AbortController();
  try {
    const data = await api("/ask", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: state.sessionId, question, force: !!force }),
      signal: state.controller.signal,
    });
    if (data.retake_required) addRetakePanel(data.reasons, question);
    else addAnswer(data, Math.round((performance.now() - t0) / 1000));
  } catch (e) {
    if (e.name === "AbortError") addError("Cancelled. The model may take a moment to finish.");
    else addError(e.message);
  } finally {
    setBusy(false);
  }
}

function startOver() {
  stopSpeech();
  if (state.sessionId) api("/clear", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session_id: state.sessionId }) }).catch(() => {});
  state.sessionId = null;
  $("loaded").hidden = true; $("empty").hidden = false; $("preview").removeAttribute("src");
  const w = el("div", "welcome"); w.id = "welcome";
  w.append(el("p", "welcome-title", "Ask anything about your photo."), el("p", "", "Add a photo on the left, then type or speak a question."));
  $("log").replaceChildren(w);
  $("quick").hidden = true;
  ["question", "ask", "clear", "mic"].forEach((id) => { $(id).disabled = true; });
  $("pick").focus();
}

// ---------- voice input ----------
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let recog = null, listening = false;
function micIdle() {
  listening = false;
  $("mic").setAttribute("aria-pressed", "false");
  $("mic").setAttribute("aria-label", "Speak your question");
}
function toggleMic() {
  if (!SR || !state.sessionId || state.busy) return;
  if (listening) { recog.stop(); return; }
  unlockSpeech();
  stopSpeech();   // never listen while we are talking
  if (!state.micNoticeShown) {
    state.micNoticeShown = true;
    announce("Voice input is handled by your browser's speech service.");
  }
  recog = new SR();
  recog.lang = "en-US"; recog.interimResults = true; recog.continuous = false; recog.maxAlternatives = 1;
  let finalText = "", failed = false;
  recog.onstart = () => {
    listening = true;
    $("mic").setAttribute("aria-pressed", "true");
    $("mic").setAttribute("aria-label", "Listening. Press to stop.");
    earcon("listen"); announce("Listening. Ask your question.");
  };
  recog.onresult = (e) => {
    let text = "";
    for (const r of e.results) text += r[0].transcript;
    $("question").value = text;
    if (e.results[e.results.length - 1].isFinal) finalText = text;
  };
  recog.onerror = (e) => {
    failed = true;
    const msg = {
      "not-allowed": IS_SAFARI
        ? "Safari is blocking the microphone. Open the page menu, choose Website Settings, set Microphone to Allow, then reload. Also check that Dictation is on in System Settings, Keyboard, and that Safari is allowed under Privacy and Security for Microphone and Speech Recognition."
        : "The microphone is blocked. Allow it with the icon in the address bar, then try again.",
      "service-not-allowed": IS_SAFARI
        ? "Safari can't use voice input right now. Turn on Dictation in System Settings, Keyboard, and allow Safari under Privacy and Security for Speech Recognition. Or type your question."
        : "This browser won't allow voice input here. Please type your question.",
      "no-speech": "I didn't hear anything. Press the microphone and try again.",
      "audio-capture": "I can't find a microphone.",
      "network": "Voice input needs an internet connection in this browser. Please type your question.",
    }[e.error];
    if (msg && e.error !== "aborted") addError(msg);
  };
  recog.onend = () => {
    micIdle();
    const q = finalText.trim();
    if (q && !failed && settings.autosend) { $("question").value = ""; ask(q, false); }
    else $("question").focus();
  };
  try { recog.start(); } catch (e) { micIdle(); }
}

// ---------- wiring ----------
$("pick").onclick = () => $("file").click();
$("change").onclick = () => $("file").click();
$("file").onchange = (e) => { const f = e.target.files[0]; if (f) uploadBlob(f, f.name); e.target.value = ""; };
$("form").onsubmit = (e) => {
  e.preventDefault();
  unlockSpeech();
  const q = $("question").value; $("question").value = "";
  ask(q, false);
};
$("cancel").onclick = () => state.controller && state.controller.abort();
$("stop").onclick = stopSpeech;
$("clear").onclick = startOver;
$("mic").onclick = toggleMic;

// drag and drop + paste
const zone = $("empty");
["dragenter", "dragover"].forEach((t) => document.addEventListener(t, (e) => { e.preventDefault(); zone.classList.add("drag"); }));
["dragleave", "drop"].forEach((t) => document.addEventListener(t, (e) => { e.preventDefault(); zone.classList.remove("drag"); }));
document.addEventListener("drop", (e) => {
  const f = [...(e.dataTransfer ? e.dataTransfer.files : [])].find((x) => x.type.startsWith("image/"));
  if (f) uploadBlob(f, f.name); else addError("That doesn't look like a photo. Please drop a JPG or PNG.");
});
document.addEventListener("paste", (e) => {   // Cmd+V with an image on the clipboard (e.g. a screenshot)
  const item = [...(e.clipboardData ? e.clipboardData.items : [])].find((i) => i.type.startsWith("image/"));
  if (!item) return;
  e.preventDefault();
  uploadBlob(item.getAsFile(), "pasted-image.png");
});

// keyboard shortcuts
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { stopSpeech(); return; }
  if (e.altKey && e.code === "KeyM") { e.preventDefault(); toggleMic(); return; }
  if (e.altKey && e.code === "KeyR") { e.preventDefault(); if (state.lastSpoken) speak(state.lastSpoken, true); return; }
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
  if (e.key === "/" && !typing && !$("question").disabled) { e.preventDefault(); $("question").focus(); }
});

// dialogs and settings
$("open-settings").onclick = () => { fillVoiceList(); $("settings").showModal(); };
$("open-help").onclick = () => $("help").showModal();
$("speech").onchange = (e) => { settings.speech = e.target.checked; if (!settings.speech) stopSpeech(); saveSettings(); };
$("rate").onchange = (e) => { settings.rate = e.target.value; saveSettings(); };
$("voice").onchange = (e) => { settings.voice = e.target.value; saveSettings(); speak("Hello, this is how I sound.", true); };
$("size").oninput = (e) => { settings.size = +e.target.value; applySettings(); saveSettings(); };
$("theme").onchange = (e) => { settings.theme = e.target.value; applySettings(); saveSettings(); };
$("sr-mode").onchange = (e) => { settings.sr = e.target.checked; if (settings.sr) stopSpeech(); applySettings(); saveSettings(); };
$("autosend").onchange = (e) => { settings.autosend = e.target.checked; saveSettings(); };
$("handsfree").onchange = (e) => { settings.handsfree = e.target.checked; saveSettings(); };


// ---------- camera with spoken guidance ----------
const HAS_CAMERA = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
const cam = { stream: null, timer: null, prev: null, goodSince: 0, candidate: "", candidateSince: 0, lastSpoken: "", lastSpokenAt: 0, openedAt: 0, capturing: false, hinted: false };
const probe = document.createElement("canvas");
const pctx = probe.getContext("2d", { willReadFrequently: true });
// Thresholds calibrated on VizWiz (see docs/failure_log.md F5): sharpness of answerable photos has a
// median around 350; a mild blur already drops it to ~60.
const TOO_DARK = 55, TOO_BRIGHT = 225, STEADY_MAX = 8, SHARP_MIN = 100, HOLD_MS = 1200;

function analyseFrame(video) {
  const vw = video.videoWidth, vh = video.videoHeight;
  if (!vw) return null;
  const W = 320, H = Math.round(320 * vh / vw);
  probe.width = W; probe.height = H;
  pctx.drawImage(video, 0, 0, W, H);
  const data = pctx.getImageData(0, 0, W, H).data;
  const g = new Float32Array(W * H);
  let sum = 0;
  for (let i = 0, j = 0; i < data.length; i += 4, j++) { const v = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]; g[j] = v; sum += v; }
  // sharpness = variance of the Laplacian over the centre 60% of the frame (where the item should be)
  const x0 = Math.floor(W * 0.2), x1 = Math.floor(W * 0.8), y0 = Math.floor(H * 0.2), y1 = Math.floor(H * 0.8);
  let n = 0, s = 0, s2 = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = y * W + x, l = g[i - 1] + g[i + 1] + g[i - W] + g[i + W] - 4 * g[i];
    s += l; s2 += l * l; n++;
  }
  // steadiness = average change since the previous frame
  let motion = 99;
  if (cam.prev && cam.prev.length === g.length) { let d = 0, c = 0; for (let i = 0; i < g.length; i += 16) { d += Math.abs(g[i] - cam.prev[i]); c++; } motion = d / c; }
  cam.prev = g;
  return { brightness: sum / (W * H), sharp: s2 / n - (s / n) * (s / n), motion };
}

function decide(f) {
  if (f.brightness < TOO_DARK) return { key: "dark", state: "bad", text: "It's too dark. Move somewhere brighter, or turn on a light." };
  if (f.brightness > TOO_BRIGHT) return { key: "bright", state: "bad", text: "Too much glare. Tilt the item to avoid reflections." };
  if (f.motion > STEADY_MAX) return { key: "moving", state: "warn", text: "Hold steady." };
  if (f.sharp < SHARP_MIN) return { key: "soft", state: "warn", text: "Still blurry. Move a little closer or farther away until it looks sharp." };
  return { key: "good", state: "good", text: "Looks good. Hold still." };
}

function guideSay(text) {
  // Speak a guidance message, but never interrupt speech and never chatter.
  if (settings.sr) { announce(text); return; }
  if (HAS_TTS && settings.speech && !speechSynthesis.speaking) speak(text);
}

function cameraTick() {
  const video = $("cam-video");
  const f = analyseFrame(video);
  if (!f || cam.capturing) return;
  const d = decide(f), now = Date.now();
  const guide = $("cam-guide");
  guide.textContent = d.text; guide.dataset.state = d.state;

  // speak only when the message has been stable for a moment, changed, and we haven't just spoken
  if (d.key !== cam.candidate) { cam.candidate = d.key; cam.candidateSince = now; }
  if (now - cam.candidateSince > 700 && d.key !== cam.lastSpoken && now - cam.lastSpokenAt > 2500) {
    cam.lastSpoken = d.key; cam.lastSpokenAt = now; guideSay(d.text);
  }
  if (!cam.hinted && now - cam.openedAt > 20000) {
    cam.hinted = true; guideSay("Press the Take photo button or the space bar whenever you are ready.");
  }

  if (d.key === "good") {
    if (!cam.goodSince) cam.goodSince = now;
    if (now - cam.goodSince >= HOLD_MS) capturePhoto();
  } else cam.goodSince = 0;
}

async function openCamera() {
  if (!HAS_CAMERA) { addError("This browser can't use the camera. Please choose a photo instead."); return; }
  unlockSpeech(); stopSpeech();
  try {
    cam.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
  } catch (e) {
    addError(e.name === "NotAllowedError"
      ? (IS_SAFARI ? "Safari is blocking the camera. Open the page menu, choose Website Settings, set Camera to Allow, then reload." : "The camera is blocked. Allow it with the icon in the address bar, then try again.")
      : e.name === "NotFoundError" ? "I can't find a camera on this computer. Please choose a photo instead."
      : "I couldn't start the camera. Please choose a photo instead.");
    return;
  }
  Object.assign(cam, { prev: null, goodSince: 0, candidate: "", candidateSince: 0, lastSpoken: "", lastSpokenAt: 0, openedAt: Date.now(), capturing: false, hinted: false });
  const video = $("cam-video");
  video.srcObject = cam.stream;
  try { await video.play(); } catch (e) {}
  $("cam-guide").textContent = "Camera is on. Hold the item about a hand's length away."; $("cam-guide").dataset.state = "warn";
  $("camera").showModal();
  $("cam-capture").focus();
  guideSay("Camera is on. Hold the item about a hand's length away. I will tell you how to adjust.");
  clearInterval(cam.timer); cam.timer = setInterval(cameraTick, 350);
}

function stopCamera() {
  clearInterval(cam.timer); cam.timer = null;
  if (cam.stream) { cam.stream.getTracks().forEach((t) => t.stop()); cam.stream = null; }
  $("cam-video").srcObject = null;
}
function closeCamera() { stopCamera(); if ($("camera").open) $("camera").close(); }

function capturePhoto() {
  if (cam.capturing) return;
  const video = $("cam-video");
  if (!video.videoWidth) return;
  cam.capturing = true;
  const c = document.createElement("canvas");
  c.width = video.videoWidth; c.height = video.videoHeight;
  c.getContext("2d").drawImage(video, 0, 0);
  c.toBlob(async (blob) => {
    closeCamera(); earcon("high");
    if (blob) await uploadBlob(blob, "camera.jpg"); else addError("I couldn't capture the photo. Please try again.");
  }, "image/jpeg", 0.92);
}

$("camera-open").onclick = openCamera;
$("camera-again").onclick = openCamera;
$("cam-capture").onclick = capturePhoto;
$("cam-cancel").onclick = () => { stopSpeech(); closeCamera(); };
$("camera").addEventListener("close", stopCamera);
$("camera").addEventListener("keydown", (e) => { if (e.key === " " && e.target.tagName !== "BUTTON") { e.preventDefault(); capturePhoto(); } });
if (!HAS_CAMERA) { $("camera-open").hidden = true; $("camera-again").hidden = true; }

async function loadSamples() {
  try {
    const list = await api("/samples");
    list.forEach((s) => {
      const b = el("button", "btn sample"); b.type = "button";
      const img = el("img"); img.src = "/sample-images/" + s.file; img.alt = ""; img.loading = "lazy";
      b.append(img, el("span", "", s.title));
      b.onclick = async () => {
        const blob = await (await fetch("/sample-images/" + s.file)).blob();
        await uploadBlob(blob, s.file);
        $("question").value = s.question;
      };
      $("samples").append(b);
    });
  } catch (e) {}
}

async function checkHealth() {
  const b = $("banner");
  try {
    const h = await api("/health");
    if (!h.ollama) { b.textContent = "The AI model is not running. In a terminal, run: ollama serve"; b.hidden = false; }
    else if (!h.model) { b.textContent = "The AI model is not installed. In a terminal, run: ollama pull qwen2.5vl:3b"; b.hidden = false; }
    else b.hidden = true;
  } catch (e) { b.textContent = "Can't reach the SeeForMe server."; b.hidden = false; }
}

// ---------- start ----------
if (HAS_TTS) { speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = fillVoiceList; }
else { settings.speech = false; }
loadSettings(); applySettings(); fillVoiceList(); loadSamples(); checkHealth();
if (!SR) { $("mic").title = "Voice input is not supported in this browser"; }

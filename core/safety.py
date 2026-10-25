"""Post-processing in plain code: the model's answer is not trusted on its own.

Rules (see docs/DESIGN.md section 10):
- Risk can only be RAISED by these rules, never lowered.
- Advice questions about high-risk things are refused; we only read what is visible.
- Low/medium confidence always gets a visible, spoken lead-in and a next step.
"""
import re

RISK_BY_CATEGORY = {"medication": "high", "food_label": "high", "hazard": "high",
                    "sign": "medium", "document": "medium", "other": "low"}

# Cooking and heating appliances: a wrong reading of their state or setting can burn or start a fire.
_APPLIANCES = (r"stove|stovetop|cooktop|burner|oven|microwave|toaster|kettle|crock ?pot|slow cooker|"
               r"pressure cooker|air fryer|grill|heater|thermostat|furnace|fireplace|iron|gas")

HIGH_RISK = re.compile(
    r"\b(mg|mcg|ml|dose|dosage|tablets?|pills?|capsules?|medicine|medication|prescription|"
    r"expir\w*|best before|use by|allerg\w*|ingredients?|poison\w*|bleach|" + _APPLIANCES + r")\b",
    re.I)
MEDICINE = re.compile(r"\b(medicine|medication|prescription|pills?|tablets?|capsules?|dose|dosage|mg|mcg)\b", re.I)
ADVICE = re.compile(
    r"\b(should i|can i|is it safe|safe to|interact\w*|side effects?|take (it|this|them)|okay to|ok to|"
    r"how (much|many|often|long)( \w+){0,3} (should|can|do|am|to take|per day|a day|daily|at a time)|"
    r"how (much|many|often) (to|do i) (take|use|give))\b", re.I)   # a count ("how many tablets are in this box") is not dosing advice
_APPLIANCE = r"(" + _APPLIANCES + r"|candle|flame)"
HAZARD_STATE = re.compile(
    rf"\b(is|are|was|were|did|does|do)\b.{{0,30}}\b{_APPLIANCE}\b.{{0,25}}\b(on|off|lit|hot|running)\b|"
    rf"\b{_APPLIANCE}\b.{{0,25}}\b(is|are)\b.{{0,10}}\b(on|off|lit|hot)\b|"
    r"\b(turned|switched|left)\b.{0,15}\b(on|off)\b", re.I)
INJECTION = re.compile(r"ignore (all |any |the )?(previous|prior|above) instructions|"
                       r"disregard .{0,20}instructions|you must now", re.I)

ORDER = {"low": 0, "medium": 1, "high": 2}


def _raise(a: str, b: str) -> str:
    return a if ORDER[a] >= ORDER[b] else b


def classify_risk(question: str, answer: str, category: str) -> str:
    risk = RISK_BY_CATEGORY.get(category, "low")
    if HIGH_RISK.search(question) or HIGH_RISK.search(answer):
        risk = _raise(risk, "high")
    return risk


def apply(question: str, result: dict, retake_blocked: bool = False, soft_photo: bool = False) -> dict:
    """Return the final result the user sees: answer, confidence, notice, risk, flags."""
    out = dict(result)
    confidence = out["confidence"]
    notices, flags = [], []
    risk = classify_risk(question, out["answer"], out["category"])

    # Weak photo (blurry or dark): never sound fully sure; on a high-risk item, say "not sure".
    if soft_photo and (confidence == "high" or (risk == "high" and confidence == "medium")):
        confidence = "low" if risk == "high" else "medium"
        flags.append("soft_photo")

    # Text in the photo must never steer the assistant.
    if INJECTION.search(out["answer"]):
        confidence, flags = "low", flags + ["possible_injection"]
        out["answer"] = ("The photo contains text that looks like instructions to me. "
                         "I won't follow it. Ask me what the photo shows.")

    # Advice about medicine/food/hazards: refuse, offer to read instead.
    if risk == "high" and ADVICE.search(question):
        flags.append("refused_advice")
        out["answer"] = ("I can read what is printed or visible, but I can't tell you whether "
                         "something is safe or how much to use.")
        notices.append("Please ask a pharmacist, doctor, or someone you trust.")
        confidence = "low" if confidence == "high" else confidence
        out["retake_suggested"] = False
    else:
        # State-of-hazard questions ("is the stove on?"): a photo can't prove "off".
        if HAZARD_STATE.search(question):
            flags.append("hazard_state")
            confidence = "low" if confidence == "low" else "medium"
            notices.append("A photo can't prove something is off. "
                           "Please confirm another way, or ask someone nearby.")
        elif risk == "high" and confidence != "low":
            who = "a pharmacist or someone you trust" if (out["category"] == "medication" or MEDICINE.search(question)) \
                else "someone you trust"
            notices.append(f"I read what is visible. Please verify it with {who}.")

    if retake_blocked or out["retake_suggested"]:
        confidence = "low"
        notices.append("Try retaking the photo: closer, with better light, held flat.")

    if confidence == "low" and "refused_advice" not in flags:
        out["answer"] = "I'm not sure. " + out["answer"]
        notices.append("Please ask a person to double-check.")
    elif confidence == "medium":
        notices.append("I'm fairly sure, but please double-check.")

    out["confidence"] = confidence
    out["risk"] = risk
    out["flags"] = flags
    out["notice"] = " ".join(dict.fromkeys(notices))   # de-duplicate, keep order
    return out

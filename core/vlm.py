"""Talks to the vision-language model. Everything else in the app calls ask() or chat()."""
import io
import json

import ollama
from PIL import Image

from core.prompts import ANSWER_SCHEMA, SYSTEM_PROMPT

MODEL = "qwen2.5vl:3b"
MAX_SIDE = 768  # biggest width/height we send; speed is the same at 512-768, 768 keeps small text readable
TIMEOUT_S = 120
MAX_HISTORY_TURNS = 4

_client = ollama.Client(timeout=TIMEOUT_S)
OPTIONS = {"num_ctx": 4096, "temperature": 0.2}   # the evaluation overrides this to be deterministic

FALLBACK = {
    "answer": "I couldn't work out a reliable answer from this photo.",
    "confidence": "low",
    "category": "other",
    "reason": "The model did not return a usable answer.",
    "retake_suggested": True,
}


def shrink_image(image_bytes: bytes) -> bytes:
    """Take the bytes of any photo and return the bytes of a smaller JPEG."""
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img.thumbnail((MAX_SIDE, MAX_SIDE))
    buffer = io.BytesIO()
    img.save(buffer, format="JPEG")
    return buffer.getvalue()


def ask(image_bytes: bytes, question: str) -> str:
    """Simplest call: one photo, one question, plain text back (used for quick experiments)."""
    small = shrink_image(image_bytes)
    response = _client.chat(
        model=MODEL,
        messages=[{"role": "user", "content": question, "images": [small]}],
    )
    return response.message.content


def parse_reply(text: str):
    """Turn the model's JSON text into a validated dict, or None if it is unusable."""
    try:
        data = json.loads(text)
    except (json.JSONDecodeError, TypeError):
        return None
    if not isinstance(data, dict):
        return None
    if not isinstance(data.get("answer"), str) or not data["answer"].strip():
        return None
    if data.get("confidence") not in ("high", "medium", "low"):
        return None
    return {
        "answer": data["answer"].strip(),
        "confidence": data["confidence"],
        "category": data.get("category") if data.get("category") in
        ANSWER_SCHEMA["properties"]["category"]["enum"] else "other",
        "reason": str(data.get("reason", "")).strip(),
        "retake_suggested": bool(data.get("retake_suggested", False)),
    }


def _build_messages(image: bytes, history: list, question: str, session_id: str = "") -> list:
    turns = history[-MAX_HISTORY_TURNS:]
    # The model server reuses cached work when the start of a prompt matches the previous request.
    # We saw one photo's content leak into the next photo's answer. A per-conversation id at the very
    # start keeps follow-up questions fast (same id) but never shares cache between conversations.
    system = (f"[conversation {session_id}]\n" if session_id else "") + SYSTEM_PROMPT
    messages = [{"role": "system", "content": system}]
    first = True
    for q, a in turns:
        msg = {"role": "user", "content": q}
        if first:
            msg["images"] = [image]   # the photo rides on the first message we still keep
            first = False
        messages += [msg, {"role": "assistant", "content": a}]
    last = {"role": "user", "content": question}
    if first:
        last["images"] = [image]
    messages.append(last)
    return messages


def _call(messages: list) -> str:
    response = _client.chat(
        model=MODEL,
        messages=messages,
        format=ANSWER_SCHEMA,
        options=OPTIONS,
        keep_alive="30m",
    )
    return response.message.content


def chat(image: bytes, history: list, question: str, session_id: str = ""):
    """Ask a follow-up-aware question. Returns (parsed_dict, raw_text).

    Retries once if the JSON is unusable, then falls back to a safe low-confidence answer.
    """
    messages = _build_messages(image, history, question, session_id)
    raw = _call(messages)
    parsed = parse_reply(raw)
    if parsed is None:
        messages += [{"role": "assistant", "content": raw or ""},
                     {"role": "user", "content": "Reply again using only the JSON format."}]
        raw = _call(messages)
        parsed = parse_reply(raw)
    if parsed is None:
        return dict(FALLBACK), json.dumps(FALLBACK)
    return parsed, raw

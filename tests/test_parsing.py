import json

from core.vlm import parse_reply

GOOD = {"answer": " It says Prop. ", "confidence": "high", "category": "sign",
        "reason": "clear", "retake_suggested": False}


def test_valid_reply_is_parsed_and_trimmed():
    out = parse_reply(json.dumps(GOOD))
    assert out["answer"] == "It says Prop." and out["category"] == "sign"


def test_garbage_returns_none():
    assert parse_reply("not json") is None
    assert parse_reply("[1,2]") is None
    assert parse_reply(None) is None


def test_missing_or_bad_fields_rejected():
    assert parse_reply(json.dumps({**GOOD, "answer": "  "})) is None
    assert parse_reply(json.dumps({**GOOD, "confidence": "sure"})) is None


def test_unknown_category_becomes_other():
    assert parse_reply(json.dumps({**GOOD, "category": "banana"}))["category"] == "other"

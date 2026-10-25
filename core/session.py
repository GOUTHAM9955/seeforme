"""In-memory sessions: one photo plus the conversation about it. Nothing is written to disk."""
import time
import uuid
from dataclasses import dataclass, field

MAX_SESSIONS = 20
TTL_SECONDS = 60 * 60


@dataclass
class Session:
    id: str
    image: bytes                      # already shrunk
    quality: dict
    history: list = field(default_factory=list)   # [(question, raw_json_answer), ...]
    last_used: float = field(default_factory=time.time)


class SessionStore:
    def __init__(self):
        self._sessions: dict[str, Session] = {}

    def _prune(self):
        now = time.time()
        for sid in [s for s, v in self._sessions.items() if now - v.last_used > TTL_SECONDS]:
            del self._sessions[sid]
        while len(self._sessions) >= MAX_SESSIONS:
            oldest = min(self._sessions.values(), key=lambda v: v.last_used)
            del self._sessions[oldest.id]

    def create(self, image: bytes, quality: dict) -> Session:
        self._prune()
        s = Session(id=uuid.uuid4().hex, image=image, quality=quality)
        self._sessions[s.id] = s
        return s

    def get(self, sid: str):
        s = self._sessions.get(sid)
        if s:
            s.last_used = time.time()
        return s

    def delete(self, sid: str):
        self._sessions.pop(sid, None)

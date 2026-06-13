from dataclasses import dataclass, field
from typing import Any


@dataclass
class Session:
    id: str
    source_code: str = ""
    language: str = "solidity"
    file_path: str = ""
    agent_findings: list = field(default_factory=list)
    ranked_patches: list = field(default_factory=list)
    exploit_proofs: list = field(default_factory=list)
    created_at: float = 0.0
    status: str = "created"


class SessionStore:
    def __init__(self):
        self._sessions: dict[str, Session] = {}

    def create(self, session_id: str) -> Session:
        import time
        session = Session(id=session_id, created_at=time.time())
        self._sessions[session_id] = session
        return session

    def get(self, session_id: str) -> Session:
        if session_id not in self._sessions:
            self.create(session_id)
        return self._sessions[session_id]

    def update(self, session_id: str, **kwargs):
        session = self.get(session_id)
        for key, value in kwargs.items():
            if hasattr(session, key):
                setattr(session, key, value)

    def delete(self, session_id: str):
        self._sessions.pop(session_id, None)


session_store = SessionStore()


def get_session(session_id: str) -> Session:
    return session_store.get(session_id)

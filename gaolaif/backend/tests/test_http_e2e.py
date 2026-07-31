"""
HTTP-level E2E smoke tests for the FastAPI backend.
Uses TestClient — no live server or API key required.

Run: pytest backend/tests/test_http_e2e.py -v
"""

import os
import sys

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from main import app  # noqa: E402


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


class TestHealthEndpoints:
    def test_health(self, client):
        r = client.get("/health")
        assert r.status_code == 200
        body = r.json()
        assert body["status"] == "ok"
        assert body["backend"] == "sireen"
        assert "version" in body

    def test_models(self, client):
        r = client.get("/models")
        assert r.status_code == 200
        body = r.json()
        assert "models" in body
        assert isinstance(body["models"], dict)


class TestAuditValidation:
    def test_audit_works_without_api_key_local_fallback(self, client):
        r = client.post("/audit/start", json={"code": "contract C { function f() public {} }"})
        # With local fallback (no OPENROUTER_API_KEY), audit starts and uses DEFAULT_SCENARIOS
        assert r.status_code == 200
        body = r.json()
        assert "session_id" in body
        assert body["status"] == "started"

    def test_audit_requires_code(self, client):
        r = client.post("/audit/start", json={"code": ""})
        assert r.status_code == 400
        err = r.json()["error"].lower()
        # API key check removed — now fails on empty code
        assert "source code" in err

    def test_exploit_requires_idea(self, client):
        r = client.post(
            "/exploit/start",
            json={"code": "contract C {}", "idea": ""},
        )
        assert r.status_code == 400
        err = r.json()["error"].lower()
        assert "idea" in err or "openrouter_api_key" in err


class TestMemoryEndpoints:
    def test_memory_save_rejects_raw_code(self, client):
        r = client.post(
            "/memory/save",
            json={
                "key": "test-key",
                "content": "function withdraw() external { balances[msg.sender] = 0; }",
            },
        )
        assert r.status_code == 400

    def test_memory_save_accepts_abstract(self, client):
        r = client.post(
            "/memory/save",
            json={
                "key": "abstract-reentrancy",
                "content": "[ABSTRACT] reentrancy pattern on external call before state update",
            },
        )
        assert r.status_code == 200
        assert r.json()["status"] == "saved"

    def test_memory_search(self, client):
        r = client.post("/memory/search", json={"query": "reentrancy", "top_k": 3})
        assert r.status_code == 200
        assert "results" in r.json()

"""
Tier 3 — Boundary & Edge Tests
Tests firewall interception, Ollama unreachable, unsupported files, and API responses.
"""

import pytest
from graph.audit_graph import build_audit_graph, default_audit_state
from firewall.dlp_guard import DLPGuard


# ── Test 1: Firewall intercepts raw source code ──────────────────────

def test_firewall_blocks_code_from_reaching_agents():
    """
    The DLP Guard must block raw Solidity code when an agent
    accidentally includes it in its output.
    """
    guard = DLPGuard()
    agent_output = "Found issue: function withdraw(address to, uint256 amount) external {"
    decision = guard.inspect(agent_output)
    assert not decision.allowed, "DLP Guard allowed raw Solidity function signature"


# ── Test 2: Pipeline halts when Ollama is unreachable ────────────────

def test_pipeline_halts_when_ollama_unreachable(monkeypatch):
    """
    If Ollama is down, the system must raise an explicit error,
    never fall back to an external API.
    """
    def mock_ollama_call(*args, **kwargs):
        raise ConnectionError("Ollama is unreachable — Gaolaif cannot proceed without local inference")

    monkeypatch.setattr("agents.base_agent.call_ollama", mock_ollama_call)
    monkeypatch.setattr("agents.auditor_agent.AuditorAgent._ollama_available", lambda self: True)

    graph = build_audit_graph()
    state = default_audit_state(
        session_id="boundary-001",
        source_code="contract A { uint x; }",
    )

    with pytest.raises(Exception) as exc_info:
        graph.invoke(state)

    msg = str(exc_info.value).lower()
    assert "ollama" in msg or "unreachable" in msg or "connection" in msg, \
        f"Expected Ollama unreachable error. Got: {msg}"


# ── Test 3: Pipeline rejects unsupported language ────────────────────

def test_pipeline_rejects_non_solidity_non_move():
    """Pipeline must error on non-Solidity/non-Move source."""
    graph = build_audit_graph()
    state = default_audit_state(
        session_id="boundary-002",
        source_code="def transfer(): pass  # Python, not Solidity",
    )
    final_state = graph.invoke(state)
    assert final_state["status"] == "error", \
        f"Expected error status for unsupported language, got {final_state['status']}"
    err = (final_state.get("error_message") or "").lower()
    assert "unsupported" in err or "language" in err, \
        f"Error message should mention unsupported language. Got: {err}"


# ── Test 4: FastAPI endpoints return structured responses ────────────

def test_api_start_audit_endpoint():
    """POST /audit/start must return session_id and status."""
    from fastapi.testclient import TestClient
    try:
        from main import app
    except ImportError:
        pytest.skip("main.py not importable (requires FastAPI + deps)")
        return

    client = TestClient(app)
    response = client.post("/audit/start", json={
        "contract_code": "contract A { uint x; }",
        "chain": "evm",
    })

    # Should return 200 or 503 (Ollama not available)
    assert response.status_code in [200, 503], \
        f"Unexpected status: {response.status_code} — body: {response.text}"

    if response.status_code == 200:
        body = response.json()
        assert "session_id" in body, f"Missing session_id in {body}"
        assert "status" in body, f"Missing status in {body}"
        assert body["status"] in ["complete", "error"], \
            f"Expected complete/error, got {body['status']}"


def test_api_get_findings_returns_404_for_nonexistent():
    """GET /audit/findings/nonexistent-session must return 404."""
    from fastapi.testclient import TestClient
    try:
        from main import app
    except ImportError:
        pytest.skip("main.py not importable")
        return

    client = TestClient(app)
    response = client.get("/audit/findings/nonexistent-session")
    assert response.status_code == 404, \
        f"Expected 404, got {response.status_code}: {response.text}"

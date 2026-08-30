"""
Regression: SMOKE-BUG-001 — durability of audit-start promises.

Three simultaneous `/audit/start` requests produced 2 permanently-lost
audits (API said "started", GET later returned 404) because SQLite lock
contention outlived the store's ~7.75s retry ladder and completion-only
persistence meant the row was never created.

Fixed behavior proven here, at two layers:

1. Store layer — `_retry_locked` absorbs far longer contention than before
   (jittered exponential backoff; ~30s / 40-attempt ceilings).
2. API layer — `/audit/start` either persists a durable UNVERIFIED row
   BEFORE answering `status=started`, or refuses honestly with HTTP 503.
   A promised started audit is therefore always immediately retrievable,
   and persistence failure can never masquerade as success.

Also covers SMOKE-BUG-002: the TERMINAL durable save originally gave up
after a single attempt; under burst contention this left durable rows
frozen at their early "execution in progress" tombstone forever.
The terminal save now retries with exponential backoff and can never
raise into the pipeline.
"""

import asyncio
import os
import sqlite3
import sys
import time

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import session_store  # noqa: E402
import main as main_mod  # noqa: E402
from main import app  # noqa: E402


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


_VULN = """
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
contract BurstVault {
    mapping(address => uint256) public balances;

    function deposit() external payable { balances[msg.sender] += msg.value; }

    function withdraw(uint256 amount) external {
        require(balances[msg.sender] >= amount, "insufficient");
        (bool ok,) = msg.sender.call{value: amount}("");
        require(ok, "transfer failed");
        balances[msg.sender] -= amount;
    }
}
"""


def _no_sleep():
    return lambda *_a, **_k: None


class TestStoreRetriesUnderLockContention:
    def test_survives_more_failures_than_old_ladder_allowed(self, monkeypatch):
        """11 consecutive lock hits would have killed the old 6-retry ladder."""
        calls = {"n": 0}

        def flaky(audit):
            calls["n"] += 1
            if calls["n"] < 12:  # first 11 attempts contend
                raise sqlite3.OperationalError("database is locked")
            return None          # writer finally releases

        monkeypatch.setattr(session_store, "_save_audit_impl", flaky)
        monkeypatch.setattr(session_store._time, "sleep", _no_sleep())
        session_store.save_audit({"id": "audit-burst-ok"})
        assert calls["n"] == 12

    def test_gives_up_after_attempt_ceiling_then_raises(self, monkeypatch):
        """Permanent contention must raise, never hang forever."""
        calls = {"n": 0}

        def always_locked(audit):
            calls["n"] += 1
            raise sqlite3.OperationalError("database is locked")

        monkeypatch.setattr(session_store, "_save_audit_impl", always_locked)
        monkeypatch.setattr(session_store._time, "sleep", _no_sleep())
        with pytest.raises(sqlite3.OperationalError, match="database is locked"):
            session_store.save_audit({"id": "audit-burst-dead"})
        assert calls["n"] == session_store._LOCK_RETRY_MAX_ATTEMPTS

    def test_non_lock_db_error_propagates_without_retries(self, monkeypatch):
        calls = {"n": 0}

        def broken(audit):
            calls["n"] += 1
            raise sqlite3.OperationalError("no such table: audits")

        monkeypatch.setattr(session_store, "_save_audit_impl", broken)
        monkeypatch.setattr(session_store._time, "sleep", _no_sleep())
        with pytest.raises(sqlite3.OperationalError, match="no such table"):
            session_store.save_audit({})
        assert calls["n"] == 1, "non-lock error must not be retried"


class TestStartEndpointNeverLiesAboutPersistence:
    def test_persistence_failure_returns_honest_503_not_started(self, client, monkeypatch):
        def exploded(audit):
            raise sqlite3.OperationalError("database is locked")

        monkeypatch.setattr(session_store, "_save_audit_impl", exploded)
        monkeypatch.setattr(session_store._time, "sleep", _no_sleep())
        r = client.post("/audit/start", json={"code": _VULN})
        assert r.status_code == 503
        err = r.json()["error"].lower()
        assert "could not be recorded" in err
        assert "nothing was started" in err  # tells user nothing is running

    def test_started_means_durable_row_exists_now(self, client):
        r = client.post("/audit/start", json={"code": _VULN})
        assert r.status_code == 200
        body = r.json()
        assert body["status"] == "started"

        sid = body["session_id"]
        rec = session_store.get_audit(sid)
        assert rec is not None, "'started' promised but audit row missing"
        assert rec["id"] == sid
        assert rec["terminal_state"] == "unverified"
        assert any("in progress" in w for w in rec["warnings"])

    def test_lost_id_scenario_cannot_recur(self, client, monkeypatch):
        """The exact smoke bug: id handed out, row absent later. Now impossible
        because the row is written inside the request that returns 'started'."""
        for i in range(3):
            r = client.post("/audit/start", json={"code": _VULN})
            assert r.status_code == 200, f"start #{i + 1} refused unexpectedly"
            sid = r.json()["session_id"]
            assert session_store.get_audit(sid) is not None, (
                f"silent loss reproduced for {sid}"
            )


class TestTerminalSaveNeverStrandsTombstone:
    """SMOKE-BUG-002: terminal durable save must retry transient lock
    failures and can never raise into the pipeline. A burst audit whose
    final save hits contention must still land its truthful terminal row."""

    @staticmethod
    def _run(fn):
        async def _fast_sleep(_: float) -> None:
            return None

        real_sleep = asyncio.sleep
        asyncio.sleep = _fast_sleep
        try:
            return asyncio.run(main_mod._durable_save_with_retries(fn, audit_id="t"))
        finally:
            asyncio.sleep = real_sleep

    def test_succeeds_after_transient_failures(self):
        calls = {"n": 0}

        def flaky():
            calls["n"] += 1
            if calls["n"] < 3:
                raise sqlite3.OperationalError("database is locked")

        assert self._run(flaky) is True
        assert calls["n"] == 3

    def test_permanent_failure_returns_false_never_raises(self):
        calls = {"n": 0}

        def always_locked():
            calls["n"] += 1
            raise sqlite3.OperationalError("database is locked")

        assert self._run(always_locked) is False
        assert calls["n"] == 6, "must exhaust the full backoff ladder"

    def test_first_attempt_success_calls_once(self):
        calls = {"n": 0}

        def good():
            calls["n"] += 1

        assert self._run(good) is True
        assert calls["n"] == 1
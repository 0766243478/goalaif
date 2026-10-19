"""Shared pytest configuration for the SIREEN backend test suite.

Why this file exists
--------------------
Several suites (notably ``test_durability_burst.py``) start *real* audit
pipelines through ``POST /audit/start``. Those pipelines keep running in the
background after the test that started them has returned — they compile and
execute Foundry PoCs, which takes seconds — and they keep writing to
``session_store.DB_PATH`` while later tests are already running.

Because every module previously shared the package-local ``sessions.db``,
results depended on test ordering: a background writer holding the SQLite
lock made unrelated tests fail with ``database is locked``.

Giving each test module its own throwaway database removes the cross-module
contention without changing what any test asserts.
"""

import pytest

import main as sireen_main
import session_store


@pytest.fixture(scope="module", autouse=True)
def isolated_db(tmp_path_factory):
    """Point the session store at a per-module throwaway database."""
    original = session_store.DB_PATH
    session_store.DB_PATH = tmp_path_factory.mktemp("sireen") / "sessions.db"
    session_store.init_db()
    try:
        yield
    finally:
        session_store.DB_PATH = original


@pytest.fixture(autouse=True)
def no_real_pipeline(monkeypatch):
    """Stop HTTP-started audits from running real Foundry pipelines.

    ``POST /audit/start`` spawns a background task that compiles and executes
    PoCs. Those tasks outlive the test that started them and keep writing to
    the database while later tests are already running, which made results
    depend on test ordering (intermittent ``database is locked``).

    What these suites assert — the durable start tombstone written inside the
    request, and the terminal save — happens around the pipeline rather than
    inside it, so stubbing the pipeline is safe here. Pipeline behaviour
    itself is covered by the suites that drive it directly
    (``test_golden_path``, ``test_e2e``, ``test_sireen_cli``).
    """

    async def _stub(session, *args, **kwargs):
        return None

    monkeypatch.setattr(sireen_main, "_run_pipeline", _stub)

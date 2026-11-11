"""Data isolation and multi-customer security boundary tests for SIREEN."""

import os
import stat
import tempfile
from pathlib import Path

import pytest
import session_store
from phases.phase3_simulate import _run_forge_test
from models.types import AttackScenario, SimulationProof


def test_poc_directory_permissions(tmp_path):
    """Temporary PoC workspaces must have 0700 permissions to protect against cross-user snooping."""
    scenario = AttackScenario(name="Test", description="Test", entry_point="withdraw", attack_vector="reentrancy")
    proof = SimulationProof(attack_vector="reentrancy")

    # Run simulation with simple code
    code = "// SPDX-License-Identifier: MIT\npragma solidity ^0.8.0;\ncontract C { function f() external {} }"
    import asyncio
    proof = asyncio.run(_run_forge_test(code, scenario, proof))

    # Any preserved directory must have 0700 permissions
    if "Workspace preserved at:" in (proof.forge_output or ""):
        path_str = proof.forge_output.split("Workspace preserved at: ")[-1].strip()
        mode = stat.S_IMODE(os.stat(path_str).st_mode)
        assert mode == 0o700, f"Expected 0700 permissions on PoC workspace, got {oct(mode)}"


def test_tenant_database_isolation(tmp_path, monkeypatch):
    """Audits stored under SIREEN_DB_PATH for User A must never bleed into User B's database."""
    db_a = tmp_path / "tenant_a.db"
    db_b = tmp_path / "tenant_b.db"

    # User A context
    monkeypatch.setattr(session_store, "DB_PATH", db_a)
    session_store.init_db()
    session_store.save_audit({"id": "audit-tenant-a", "file_name": "A.sol", "terminal_state": "confirmed"})

    # User B context
    monkeypatch.setattr(session_store, "DB_PATH", db_b)
    session_store.init_db()
    session_store.save_audit({"id": "audit-tenant-b", "file_name": "B.sol", "terminal_state": "confirmed"})

    # Verify User B cannot see User A's audit
    assert session_store.get_audit("audit-tenant-a") is None
    b_audits = session_store.list_audits()
    assert len(b_audits) == 1
    assert b_audits[0]["id"] == "audit-tenant-b"

    # Verify User A cannot see User B's audit
    monkeypatch.setattr(session_store, "DB_PATH", db_a)
    assert session_store.get_audit("audit-tenant-b") is None
    a_audits = session_store.list_audits()
    assert len(a_audits) == 1
    assert a_audits[0]["id"] == "audit-tenant-a"

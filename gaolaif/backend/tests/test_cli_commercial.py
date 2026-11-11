"""Regression and commercial readiness tests for SIREEN CLI & Durable Persistence."""

import json
import subprocess
import sys
import tempfile
from pathlib import Path

import pytest
import session_store
import sireen_cli
from models.types import TerminalState


@pytest.fixture(autouse=True)
def clean_db(monkeypatch, tmp_path):
    db_file = tmp_path / "commercial_test.db"
    monkeypatch.setattr(session_store, "DB_PATH", db_file)
    session_store.init_db()
    return db_file


def test_exit_policy_mappings():
    """Verify exact contract for all terminal states to CLI exit codes."""
    assert sireen_cli._exit_code({"terminal_state": TerminalState.CONFIRMED.value}) == 0
    assert sireen_cli._exit_code({"terminal_state": TerminalState.CLEAN_WITH_COVERAGE.value}) == 0
    assert sireen_cli._exit_code({"terminal_state": TerminalState.DEGRADED.value}) == 2
    assert sireen_cli._exit_code({"terminal_state": TerminalState.UNVERIFIED.value}) == 2
    assert sireen_cli._exit_code({"terminal_state": TerminalState.FAILED.value}) == 1
    assert sireen_cli._exit_code({"terminal_state": "unknown_state"}) == 1
    assert sireen_cli._exit_code({}) == 1


def test_durable_audit_lifecycle(tmp_path):
    """Test full audit record creation, listing, show, and markdown report generation."""
    audit_id = "audit-comm001"
    audit_data = {
        "id": audit_id,
        "file_name": "CommercialVault.sol",
        "file_path": "/path/to/CommercialVault.sol",
        "language": "solidity",
        "source_hash": "abcdef123456",
        "terminal_state": TerminalState.CONFIRMED.value,
        "reasoning_mode": "HEURISTIC",
        "forge_available": True,
        "error": None,
        "warnings": [],
        "discovery": {"functions": ["deposit", "withdraw"]},
        "findings": [
            {
                "id": "finding-1",
                "title": "Reentrancy on withdraw",
                "confirmed": True,
                "needs_review": False,
                "category": "reentrancy",
                "evidence_id": "evd-1",
            }
        ],
        "report_markdown": "# SIREEN Audit Report\n\nFinding 1: Reentrancy",
        "report_json": {"summary": "Passed"},
        "started_at": 1000.0,
        "finished_at": 1005.0,
    }
    session_store.save_audit(audit_data)

    # 1. list_audits
    audits = session_store.list_audits()
    assert len(audits) >= 1
    assert audits[0]["id"] == audit_id
    assert audits[0]["terminal_state"] == TerminalState.CONFIRMED.value

    # 2. get_audit
    retrieved = session_store.get_audit(audit_id)
    assert retrieved is not None
    assert retrieved["id"] == audit_id
    assert len(retrieved["findings"]) == 1
    assert retrieved["findings"][0]["confirmed"] is True

    # 3. CLI show command handler
    parser = sireen_cli.build_parser()
    args_show = parser.parse_args(["show", audit_id])
    code = sireen_cli._command_show(args_show)
    assert code == 0

    # 4. CLI report command handler
    report_out = tmp_path / "test_report.md"
    args_report = parser.parse_args(["report", audit_id, "-o", str(report_out)])
    code_rep = sireen_cli._command_report(args_report)
    assert code_rep == 0
    assert report_out.exists()
    assert "# SIREEN Audit Report" in report_out.read_text()


def test_cli_show_nonexistent_returns_exit_code_3():
    """Querying a non-existent audit ID must return exit code 3."""
    parser = sireen_cli.build_parser()
    args = parser.parse_args(["show", "nonexistent-id-999"])
    code = sireen_cli._command_show(args)
    assert code == 3

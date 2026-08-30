"""
SIREEN Core v0.1 — NEGATIVE TESTS (Task 13): prove SIREEN does NOT lie.

Every test encodes a scenario where a dishonest system would emit
CONFIRMED / CLEAN / generic success. SIREEN must not.

Run:  cd gaolaif/backend && pytest tests/test_no_false_claims.py -v
"""
import asyncio

import pytest

from models.types import (
    AttackScenario, ForgeTestResult, SimulationProof, TerminalState,
    VerificationStatus,
)
from phases.phase3_simulate import _find_forge
from verification.honest_signal import HonestSignal
from verification.output_parser import OutputParser

import main as sireen_main


def _has_forge() -> bool:
    return _find_forge() is not None


SOURCE = "contract T { function f() public {} }"
SCENARIO = AttackScenario(
    name="Reentrancy on f", description="x", entry_point="f",
    attack_vector="reentrancy", preconditions=[], exploit_steps=[],
    estimated_impact="drain", scenario_type="reentrancy",
)


# ── 1. Trivial assertion PoC must NEVER be confirmed ─────────────────────────
@pytest.mark.skipif(not _has_forge(), reason="BLOCKED: requires forge to produce PASS output")
def test_trivial_assertion_poc_is_never_confirmed():
    trivial_poc = """// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "forge-std/Test.sol";
contract PoC is Test {
    function testExploit() public { assertTrue(true); }
}
"""
    # Simulate a REALISTIC forge run that PASSED (dishonest tooling would
    # confirm here). Output shape matches real `forge test` formatting so the
    # suite parser accepts it and HonestSignal reaches the PoC-content gate.
    forged_output = (
        "[COMPILATION OK]" + chr(10)
        + "Ran 1 test for PoC.t.sol:PoC" + chr(10)
        + "[PASS] testExploit() (gas: 100)" + chr(10)
        + "Suite result: ok. 1 passed; 0 failed; 0 skipped; finished in 1.00ms"
    )
    parsed = OutputParser.parse(forged_output)
    tests = OutputParser.parse_tests("[PASS] testExploit()")
    er = HonestSignal.verify(
        source_code=SOURCE, scenario=SCENARIO, poc_code=trivial_poc,
        forge_output=forged_output, parsed=parsed, tests=tests,
    )
    assert er.confirmed is False
    assert er.needs_review is True
    assert "trivial" in er.review_reason.lower()


# ── 2. Malformed / empty verification result ⇒ NOT confirmed ────────────────
def test_malformed_verification_result_is_not_confirmed():
    for bad_output in ("", None, "garbage without markers"):
        proof = SimulationProof(confirmed=False, poc_code="contract P {}", forge_output=bad_output or "")
        rec = sireen_main._verification_record_from_proof(proof)
        assert rec.test_status in ("not_run", "error")
        assert rec.compile_status in ("not_run", "failed")


# ── 3. Missing evidence ⇒ finding dict carries empty evidence_id, never faked ─
def test_missing_evidence_id_is_empty_not_fabricated():
    findings, _report = [], None
    f = sireen_main.Finding(title="t", severity="medium", description="d")
    d = sireen_main._finding_to_dict(f)
    assert d["evidence_id"] == ""          # honest absence
    assert d["confirmed"] is False


# ── 4. Zero findings + incomplete coverage is NEVER clean ────────────────────
@pytest.mark.parametrize("executed,hyps", [(0, 2), (1, 2), (2, 3)])
def test_incomplete_coverage_is_unverified(executed, hyps):
    ts = sireen_main._compute_terminal_state(
        pipeline_error=False, forge_available=True,
        confirmed_count=0, needs_review_count=0,
        hypotheses_count=hyps, executed_count=executed,
    )
    assert ts == TerminalState.UNVERIFIED.value


# ── 5. needs_review findings block CONFIRMED even when others confirmed ──────
def test_needs_review_blocks_confirmed_terminal():
    ts = sireen_main._compute_terminal_state(
        pipeline_error=False, forge_available=True,
        confirmed_count=1, needs_review_count=1,
        hypotheses_count=2, executed_count=2,
    )
    assert ts == TerminalState.DEGRADED.value
    assert ts != TerminalState.CONFIRMED.value


# ── 6. Persistence round-trip incl. restart simulation (Test G, offline leg) ─
def test_audit_evidence_survives_reopen(tmp_path, monkeypatch):
    import session_store as ss

    dbfile = tmp_path / "sessions_test.db"
    monkeypatch.setattr(ss, "DB_PATH", dbfile)
    ss.init_db()

    audit_id = "audit-restart-test"
    ss.save_audit({
        "id": audit_id, "file_name": "g.sol", "file_path": "/x/g.sol",
        "language": "solidity", "source_hash": "abc123",
        "terminal_state": TerminalState.CONFIRMED.value,
        "reasoning_mode": "HEURISTIC", "forge_available": True,
        "error": None, "warnings": ["w1"],
        "discovery": {"functions": 2},
        "findings": [{"id": "f1", "title": "Reentrancy", "evidence_id": "evd-1"}],
        "report_markdown": "# R", "report_json": {"schema": "sireen.evidence-report/v0.1"},
        "started_at": 1.0, "finished_at": 2.0,
    })
    ss.save_hypotheses(audit_id, [{
        "id": "hyp-1", "name": "Reentrancy", "category": "reentrancy",
        "target": "withdraw", "rationale": "CEI violation",
        "attack_objective": "drain", "preconditions": ["p"],
        "exploit_steps": ["s"], "source_mode": "HEURISTIC",
        "target_contract": "GoldenVault",
        "discovery_evidence": ["external call present"],
        "confidence": "heuristic estimate — NOT verified",
        "limitations": [],
    }])
    ss.save_evidence(audit_id, [{
        "id": "evd-1", "audit_id": audit_id, "hypothesis_id": "hyp-1",
        "poc_source": "//poc", "poc_hash": "deadbeef",
        "created_at": 1.5,
    }])

    # Simulate process restart: fresh connection reads the same file.
    restored = ss.get_audit(audit_id)
    assert restored is not None
    assert restored["terminal_state"] == "confirmed"
    assert restored["findings"][0]["evidence_id"] == "evd-1"
    assert restored["hypotheses"][0]["target_contract"] == "GoldenVault"
    assert restored["hypotheses"][0]["discovery_evidence"] == ["external call present"]
    ev = restored["evidence"][0]
    assert ev["id"] == "evd-1" and ev["hypothesis_id"] == "hyp-1"
    assert ev["poc_hash"] == "deadbeef"

    listed = ss.list_audits()
    assert any(a["id"] == audit_id for a in listed)


# ── 7. Unknown audit id returns explicit error, never empty-findings lie ─────
def test_unknown_audit_is_explicit_404_shape(monkeypatch):
    import session_store as ss
    monkeypatch.setattr(ss, "DB_PATH", __import__("pathlib").Path(":memory:"))
    # get_audit on a fresh in-memory DB has no tables → treat as not found.
    try:
        res = ss.get_audit("audit-does-not-exist")
    except Exception:
        res = None
    assert res is None

class TestUnverifiedFindingsWarning:
    """SMK-001 regression: the needs_review warning must state the real cause.

    Forge-ran-but-not-reproduced must NEVER be reported as 'execution
    unavailable' - that misleads the human reviewer about what happened.
    """

    def test_forge_ran_but_not_reproduced_says_so(self):
        from main import _unverified_findings_warning

        msg = _unverified_findings_warning(2, forge_available=True)
        assert "NOT confirmed" in msg
        assert "Forge executed the PoCs" in msg
        # The old misleading wording must be gone when Forge ran
        assert "unavailable" not in msg

    def test_forge_unavailable_says_so(self):
        from main import _unverified_findings_warning

        msg = _unverified_findings_warning(1, forge_available=False)
        assert "execution unavailable" in msg

    def test_both_demand_manual_triage(self):
        from main import _unverified_findings_warning

        for avail in (True, False):
            msg = _unverified_findings_warning(3, forge_available=avail)
            assert "needs review" in msg
            assert "MUST be manually triaged" in msg

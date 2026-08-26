"""
SIREEN Core v0.1 — GOLDEN PATH + TERMINAL-STATE TESTS (Tasks 11–13).

These tests are the acceptance gate for the CEO-approved evidence loop.
They run fully offline:
  - Forge-present legs auto-skip when `forge` is not on PATH (marked BLOCKED).
  - Terminal-state / evidence-chain / persistence legs always run.

Run:  cd gaolaif/backend && pytest tests/test_golden_path.py -v
"""
import asyncio
import dataclasses

import pytest

from models.types import (
    AttackScenario, Hypothesis, SimulationProof, TerminalState,
)
from phases.phase2_scenarios import FALLBACK_SCENARIO  # noqa: F401  (sanity import)
from phases.phase3_simulate import phase3_simulate, _find_forge
from verification.honest_signal import HonestSignal

import main as sireen_main  # noqa: E402


# ── Deterministic golden fixture (Task 12) ───────────────────────────────────
# Realistic DAO-class reentrancy: external call BEFORE state update, and the
# post-call subtraction is unchecked — so a re-entering attacker underflows its
# own balance instead of reverting, silently minting itself credit. This is
# exactly the pattern found in production vaults wrapping pre-0.8 math.
GOLDEN_REENTRANCY = """// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract GoldenVault {
    mapping(address => uint256) public balances;

    function deposit() public payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw(uint256 amount) public {
        require(balances[msg.sender] >= amount, "insufficient");
        // VULNERABILITY: external call BEFORE state update (CEI violation)
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "transfer failed");
        // VULNERABILITY: unchecked subtraction lets re-entrant withdrawals
        // underflow the caller's balance instead of reverting.
        unchecked { balances[msg.sender] -= amount; }
    }

    receive() external payable {}
}
"""

REENTRANCY_SCENARIO = AttackScenario(
    name="Reentrancy on withdraw",
    description="External call before state update on withdraw().",
    entry_point="withdraw",
    attack_vector="reentrancy",
    preconditions=["Low-level external call present"],
    exploit_steps=["Call entry point", "Re-enter via receive()"],
    estimated_impact="Full ETH drain",
    scenario_type="reentrancy",
)


def _has_forge() -> bool:
    return _find_forge() is not None


# ── TEST A: golden CONFIRMED path (requires forge) ───────────────────────────
@pytest.mark.skipif(not _has_forge(), reason="BLOCKED: forge binary not on PATH")
def test_golden_reentrancy_confirmed_end_to_end():
    proof, env = asyncio.run(
        phase3_simulate(GOLDEN_REENTRANCY, REENTRANCY_SCENARIO, router=None)
    )
    er = proof.exploit_result
    assert er is not None, "HonestSignal must always attach an ExploitResult"
    # Every gate must have passed — no partial credit for CONFIRMED.
    assert er.poc_generated is True
    assert er.compiled is True
    assert er.executed is True
    assert er.exploit_reproduced is True
    assert er.confirmed is True
    assert er.needs_review is False
    assert proof.poc_code and "vm.skip" not in proof.poc_code
    assert er.evidence, "confirmed findings must carry evidence strings"

    # Chain objects must link correctly (Task 2).
    rec = sireen_main._verification_record_from_proof(proof)
    assert rec.verifier == "forge"
    assert rec.compile_status == "passed"
    assert rec.test_status == "passed"
    assert rec.executed_test_count >= 1

    hyp = Hypothesis(
        name=REENTRANCY_SCENARIO.name,
        category="reentrancy",
        target_contract="GoldenVault",
        target="withdraw",
        rationale=REENTRANCY_SCENARIO.description,
        scenario=REENTRANCY_SCENARIO,
    )
    pack = sireen_main.EvidencePack(
        audit_id="audit-test", finding_id="finding-test",
        source_hash=sireen_main._sha256(GOLDEN_REENTRANCY),
        contract_name="GoldenVault", function_name="withdraw",
        hypothesis_id=hyp.id, vulnerability_hypothesis=hyp.rationale,
        attack_path=sireen_main._attack_path_from_hypothesis(hyp),
        poc_source=proof.poc_code, poc_hash=sireen_main._sha256(proof.poc_code),
        verification=rec, verified_at=1.0,
    )
    assert pack.attack_path.hypothesis_id == hyp.id == pack.hypothesis_id
    assert pack.poc_hash == sireen_main._sha256(proof.poc_code)


# ── TEST B: forge unavailable ⇒ DEGRADED, never CONFIRMED/CLEAN ──────────────
def test_forge_unavailable_is_degraded_not_confirmed(monkeypatch):
    monkeypatch.setattr("phases.phase3_simulate._find_forge", lambda: None)
    monkeypatch.setattr(sireen_main, "_forge_version", lambda: "")
    proof, env = asyncio.run(
        phase3_simulate(GOLDEN_REENTRANCY, REENTRANCY_SCENARIO, router=None)
    )
    er = proof.exploit_result
    assert er is not None and er.confirmed is False
    assert er.needs_review is True
    assert "[SKIPPED]" in proof.forge_output

    ts = sireen_main._compute_terminal_state(
        pipeline_error=False, forge_available=False,
        confirmed_count=0, needs_review_count=1,
        hypotheses_count=1, executed_count=0,
    )
    assert ts == TerminalState.DEGRADED.value


# ── TEST C: unsupported vector ⇒ SKIPPED_UNSUPPORTED, never counted ─────────
def test_unsupported_vector_is_skipped_and_blocks_clean():
    oracle_scenario = AttackScenario(
        name="Stale oracle", description="Uses stale price.",
        entry_point="price", attack_vector="oracle_manipulation",
        preconditions=[], exploit_steps=[], estimated_impact="Bad debt",
        scenario_type="oracle_manipulation",
    )
    proof, env = asyncio.run(
        phase3_simulate(GOLDEN_REENTRANCY, oracle_scenario, router=None)
    )
    assert "vm.skip(true)" in proof.poc_code
    if _has_forge():
        # With forge present the skipped test must NOT count as executed.
        rec = sireen_main._verification_record_from_proof(proof)
        assert rec.test_status in ("not_run", "ran") or rec.executed_test_count == 0
    ts = sireen_main._compute_terminal_state(
        pipeline_error=False, forge_available=True,
        confirmed_count=0, needs_review_count=0,
        hypotheses_count=1, executed_count=0,
    )
    assert ts == TerminalState.UNVERIFIED.value  # NOT clean_with_coverage


# ── TEST D: compilation failure ⇒ FAILED record, never confirmed ────────────
def test_compile_failure_record_is_failed(monkeypatch):
    broken_proof = SimulationProof(
        confirmed=False,
        poc_code="// broken",
        forge_output="[COMPILATION FAILED after 3 retries]" + chr(10) + "Error: something broke",
    )
    rec = sireen_main._verification_record_from_proof(broken_proof)
    assert rec.compile_status == "failed"
    assert rec.test_status == "not_run"


# ── Coverage gate: zero findings + incomplete verification ⇒ UNVERIFIED ─────
def test_zero_findings_incomplete_verification_is_unverified():
    ts = sireen_main._compute_terminal_state(
        pipeline_error=False, forge_available=True,
        confirmed_count=0, needs_review_count=0,
        hypotheses_count=3, executed_count=1,   # 1 of 3 executed
    )
    assert ts == TerminalState.UNVERIFIED.value
    assert ts != TerminalState.CLEAN_WITH_COVERAGE.value


# ── Pipeline error ⇒ FAILED ──────────────────────────────────────────────────
def test_pipeline_error_is_failed():
    ts = sireen_main._compute_terminal_state(
        pipeline_error=True, forge_available=True,
        confirmed_count=5, needs_review_count=0,
        hypotheses_count=1, executed_count=1,
    )
    assert ts == TerminalState.FAILED.value


# ── HONESTY REGRESSION (12h loop): clean_with_coverage must never coexist ────
# with unresolved needs_review findings. Observed live on a safe CEI contract:
# state was clean_with_coverage while two findings said "manual review required".
def test_needs_review_findings_force_degraded_even_with_full_coverage():
    ts = sireen_main._compute_terminal_state(
        pipeline_error=False, forge_available=True,
        confirmed_count=0, needs_review_count=2,
        hypotheses_count=2, executed_count=2,
    )
    assert ts == TerminalState.DEGRADED.value
    assert ts != TerminalState.CLEAN_WITH_COVERAGE.value


def test_confirmed_with_unresolved_reviews_is_degraded_not_clean():
    ts = sireen_main._compute_terminal_state(
        pipeline_error=False, forge_available=True,
        confirmed_count=1, needs_review_count=1,
        hypotheses_count=2, executed_count=2,
    )
    assert ts == TerminalState.DEGRADED.value


# ── EVIDENCE INTEGRITY GUARD (12h final audit) ───────────────────────────────
def test_confirmed_finding_with_missing_evidence_pack_is_revoked_at_retrieval():
    """Corruption probe: if a confirmed finding's evidence pack is missing from
    the durable record, retrieval must revoke CONFIRMED — never serve an
    unevidenced confirmation."""
    result = sireen_main._enforce_evidence_integrity({
        "id": "audit-x",
        "terminal_state": TerminalState.CONFIRMED.value,
        "warnings": [],
        "findings": [{"title": "Reentrancy", "confirmed": True,
                      "needs_review": False, "evidence_id": "evd-missing-later"}],
        # NOTE: evidence list deliberately empty = pack was lost/corrupted
        "evidence": [],
        "hypotheses": [],
    })

    f = result["findings"][0]
    assert f["confirmed"] is False, "CONFIRMED without producible evidence must be revoked"
    assert f["needs_review"] is True
    assert "integrity_warning" in f
    assert any("missing evidence pack" in w.lower() for w in result["warnings"])
    assert result["terminal_state"] == TerminalState.DEGRADED.value


def test_intact_evidence_keeps_confirmation():
    audit = {
        "id": "audit-ok", "terminal_state": "confirmed", "warnings": [],
        "findings": [{"title": "Reentrancy", "confirmed": True,
                      "needs_review": False, "evidence_id": "evd-1"}],
        "evidence": [{"id": "evd-1"}],
        "hypotheses": [],
    }
    result = sireen_main._enforce_evidence_integrity(audit)
    assert result["findings"][0]["confirmed"] is True
    assert result["terminal_state"] == "confirmed"
    assert not result.get("_integrity_revoked")
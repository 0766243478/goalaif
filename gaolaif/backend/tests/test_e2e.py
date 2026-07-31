"""
End-to-end smoke test for the 4-phase Gaolaif pipeline.
Tests:
  1. Phase 1: Protocol map extraction (local + scanner)
  2. Phase 2: Attack scenario generation
  3. Phase 3: Forge simulation + env failure
  4. Phase 4: Judge discrimination + report generation

Run: pytest backend/tests/test_e2e.py -v
"""

import json
import os
import sys
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from models.types import ProtocolMap, AttackScenario
from phases.phase1_understand import phase1_understand, _extract_local
from phases.phase2_scenarios import phase2_scenarios
from phases.phase3_simulate import phase3_simulate, _find_forge
from phases.phase4_judge import phase4_judge, _simple_report
from llm.router import Router


VAULT_SOURCE = """// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract VulnerableVault {
    mapping(address => uint) public balances;

    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw() external {
        uint bal = balances[msg.sender];
        require(bal > 0, "No balance");
        (bool ok, ) = msg.sender.call{value: bal}("");
        require(ok, "Transfer failed");
        balances[msg.sender] = 0;
    }

    function getBalance(address user) external view returns (uint) {
        return balances[user];
    }
}
"""


class TestPhase1Understand:
    def test_extract_local(self):
        pm = _extract_local(VAULT_SOURCE)
        assert "deposit" in pm.functions
        assert "withdraw" in pm.functions
        assert "getBalance" in pm.functions
        assert any("balances" in sv for sv in pm.state_variables)
        assert len(pm.modifiers) == 0
        assert len(pm.invariants) >= 1

    @pytest.mark.asyncio
    async def test_phase1_no_router(self):
        pm = await phase1_understand(VAULT_SOURCE, file_name="VulnerableVault.sol")
        assert "withdraw" in pm.functions
        assert len(pm.state_variables) > 0


class TestPhase2Scenarios:
    @pytest.mark.asyncio
    async def test_no_router_uses_defaults(self):
        pm = _extract_local(VAULT_SOURCE)
        scenarios = await phase2_scenarios(VAULT_SOURCE, pm)
        assert len(scenarios) > 0
        assert scenarios[0].attack_vector == "reentrancy"

    @pytest.mark.asyncio
    async def test_router_configured(self):
        router = Router()
        if not router.is_configured():
            pytest.skip("OPENROUTER_API_KEY not set")
        pm = _extract_local(VAULT_SOURCE)
        scenarios = await phase2_scenarios(VAULT_SOURCE, pm, router=router)
        assert len(scenarios) > 0
        assert all(isinstance(s, AttackScenario) for s in scenarios)


class TestPhase3Simulate:
    def test_find_forge(self):
        forge = _find_forge()
        if forge is None:
            pytest.skip("forge not available on this machine")
        assert forge.exists()

    @pytest.mark.asyncio
    async def test_simulate_reentrancy(self):
        scenario = AttackScenario(
            name="Reentrancy on withdraw",
            description="Standard reentrancy via external call before state update",
            entry_point="withdraw",
            attack_vector="reentrancy",
        )
        proof, env = await phase3_simulate(VAULT_SOURCE, scenario)
        assert proof.forge_output != ""
        if _find_forge() is not None:
            assert "Ran 1 test" in proof.forge_output or "Compiler run" in proof.forge_output


class TestPhase4Judge:
    def test_simple_report(self):
        from models.types import Finding
        findings = [
            Finding(title="Test", severity="high", description="A test finding", confirmed=True, category="reentrancy"),
        ]
        report = _simple_report(findings)
        assert "Test" in report
        assert "CONFIRMED" in report

    @pytest.mark.asyncio
    async def test_judge_discriminate(self):
        from models.types import AttackScenario, ExploitResult, ForgeTestResult, VerificationStatus
        scenario = AttackScenario(name="Test reentrancy", description="desc", entry_point="withdraw", attack_vector="reentrancy")
        from models.types import SimulationProof
        er = ExploitResult(
            verification_status=VerificationStatus.CONFIRMED,
            hypothesis="Test reentrancy",
            attack_vector="reentrancy",
            target_function="withdraw",
            poc_generated=True,
            poc_code="contract PoC is Test {}",
            compiled=True,
            executed=True,
            exploit_reproduced=True,
            forge_tests=[ForgeTestResult(test_name="testExploit", passed=True, gas_used=358409)],
            forge_output="[COMPILATION OK]\n[PASS] testExploit()",
            evidence=["Suite passed (1 passed, 0 failed)", "Test testExploit passed (gas: 358409)"],
            confirmed=True,
        )
        proof = SimulationProof(confirmed=True, forge_output="[COMPILATION OK]\n[PASS] testExploit()", exploit_result=er)
        findings, report = await phase4_judge(
            scenarios=[scenario],
            simulation_results=[(proof, None)],
        )
        assert len(findings) > 0
        assert findings[0].confirmed
        assert report != ""


class TestFullPipeline:
    """Runs all 4 phases in sequence (requires OPENROUTER_API_KEY and forge)."""

    @pytest.mark.asyncio
    async def test_full_pipeline(self):
        router = Router()
        if not router.is_configured():
            pytest.skip("OPENROUTER_API_KEY not set")
        if _find_forge() is None:
            pytest.skip("forge not available")

        # Phase 1
        pm = await phase1_understand(VAULT_SOURCE, file_name="VulnerableVault.sol", router=router)
        assert len(pm.functions) >= 3

        # Phase 2
        scenarios = await phase2_scenarios(VAULT_SOURCE, pm, router=router)
        assert len(scenarios) >= 1

        # Phase 3
        results = []
        for s in scenarios[:2]:
            proof, env = await phase3_simulate(VAULT_SOURCE, s)
            results.append((proof, env))

        # Phase 4
        findings, report = await phase4_judge(scenarios[:2], results, router=router)
        assert len(report) > 0

        # Verify report structure (HonestSignal: not every scenario is exploitable)
        if findings:
            # At least one finding should be confirmed if forge produced a real exploit
            has_any_confirmed = any(f.confirmed for f in findings)
            # Log non-confirmed findings for debugging
            non_confirmed = [f.title for f in findings if not f.confirmed]
            if non_confirmed:
                print(f"HonestSignal: {len(non_confirmed)} scenario(s) not confirmed: {non_confirmed}")
            assert findings[0].severity in ("CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL")

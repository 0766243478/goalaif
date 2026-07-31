"""Honest regression for the forge simulation + honest-signal pipeline.

Requires a real forge binary on PATH.
Run directly:  python _final_e2e.py
Exits nonzero if any assertion fails.
Not collected by pytest (underscore prefix).
"""

import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import main as backend_main
from models.types import AttackScenario, AuditSession, SimulationProof
from phases.phase3_simulate import _find_forge, _run_forge_test
from verification.honest_signal import HonestSignal
from verification.output_parser import OutputParser

VULNERABLE = (
    "// SPDX-License-Identifier: MIT\n"
    "pragma solidity ^0.8.0;\n\n"
    "contract VulnerableVault {\n"
    "    mapping(address => uint256) public balances;\n\n"
    "    function deposit() external payable {\n"
    "        balances[msg.sender] += msg.value;\n"
    "    }\n\n"
    "    function withdraw() external {\n"
    "        uint256 amount = balances[msg.sender];\n"
    "        require(amount > 0, \"no balance\");\n"
    "        (bool ok, ) = msg.sender.call{value: amount}(\"\");\n"
    "        require(ok, \"transfer failed\");\n"
    "        balances[msg.sender] = 0;\n"
    "    }\n\n"
    "    receive() external payable {\n"
    "        balances[msg.sender] += msg.value;\n"
    "    }\n"
    "}\n"
)

SAFE = (
    "// SPDX-License-Identifier: MIT\n"
    "pragma solidity ^0.8.0;\n\n"
    "contract SafeVault {\n"
    "    mapping(address => uint256) public balances;\n\n"
    "    function deposit() external payable {\n"
    "        balances[msg.sender] += msg.value;\n"
    "    }\n\n"
    "    function withdraw() external {\n"
    "        uint256 amount = balances[msg.sender];\n"
    "        require(amount > 0, \"no balance\");\n"
    "        balances[msg.sender] = 0;\n"
    "        (bool ok, ) = msg.sender.call{value: amount}(\"\");\n"
    "        require(ok, \"transfer failed\");\n"
    "    }\n\n"
    "    receive() external payable {\n"
    "        balances[msg.sender] += msg.value;\n"
    "    }\n"
    "}\n"
)


PARAMETERIZED_VULNERABLE = (
    "// SPDX-License-Identifier: MIT\n"
    "pragma solidity ^0.8.0;\n\n"
    "contract ParameterizedVault {\n"
    "    mapping(address => uint256) public balances;\n\n"
    "    function deposit() external payable {\n"
    "        require(msg.value > 0, \"no value\");\n"
    "        balances[msg.sender] += msg.value;\n"
    "    }\n\n"
    "    function withdraw(uint256 amount) external {\n"
    "        require(balances[msg.sender] >= amount, \"insufficient balance\");\n"
    "        (bool ok, ) = msg.sender.call{value: amount}(\"\");\n"
    "        require(ok, \"transfer failed\");\n"
    "        balances[msg.sender] = 0;\n"
    "    }\n\n"
    "    function balanceOf(address who) external view returns (uint256) {\n"
    "        return balances[who];\n"
    "    }\n"
    "}\n"
)


DECREMENT_VULNERABLE = (
    "// SPDX-License-Identifier: MIT\n"
    "pragma solidity ^0.8.0;\n\n"
    "contract DecrementVault {\n"
    "    mapping(address => uint256) public balances;\n\n"
    "    function deposit() external payable {\n"
    "        balances[msg.sender] += msg.value;\n"
    "    }\n\n"
    "    function withdraw(uint256 amount) external {\n"
    "        require(balances[msg.sender] >= amount, \"insufficient balance\");\n"
    "        (bool ok, ) = msg.sender.call{value: amount}(\"\");\n"
    "        require(ok, \"transfer failed\");\n"
    "        balances[msg.sender] -= amount;\n"
    "    }\n\n"
    "    function balanceOf(address who) external view returns (uint256) {\n"
    "        return balances[who];\n"
    "    }\n"
    "}\n"
)


async def test_reentrancy_confirmed() -> None:
    """CEI-violating vault must be confirmed exploitable by real forge."""
    scenario = AttackScenario(
        name="Reentrancy on withdraw",
        description="Attacker re-enters withdraw() before balance reset",
        entry_point="withdraw",
        attack_vector="reentrancy",
        estimated_impact="Full drain of contract ETH",
    )
    proof = SimulationProof(attack_vector="reentrancy", target_function="withdraw")
    proof = await _run_forge_test(VULNERABLE, scenario, proof)
    print(f"REENTRANCY(vulnerable) confirmed={proof.confirmed}")
    assert proof.confirmed is True, "vulnerable vault MUST be confirmed by real forge"
    assert (
        proof.exploit_result is not None
        and proof.exploit_result.exploit_reproduced is True
    ), "exploit must be marked reproduced"


async def test_reentrancy_not_confirmed_on_safe() -> None:
    """CEI-compliant vault must NOT be confirmed (no false positives)."""
    scenario = AttackScenario(
        name="Reentrancy on withdraw",
        description="Attacker re-enters withdraw() before balance reset",
        entry_point="withdraw",
        attack_vector="reentrancy",
        estimated_impact="Full drain of contract ETH",
    )
    proof = SimulationProof(attack_vector="reentrancy", target_function="withdraw")
    proof = await _run_forge_test(SAFE, scenario, proof)
    print(f"REENTRANCY(safe) confirmed={proof.confirmed}")
    assert proof.confirmed is False, "CEI-compliant vault MUST NOT be confirmed"


async def test_trivial_assert_detection() -> None:
    """Gate 4.5 must block assertTrue(true) fake passes."""
    fake_forge_output = (
        "[COMPILATION OK]\nCompiler run successful\n\n[TEST OUTPUT]\n"
        "[PASS] testExploit() (gas: 100)\nSuite result: ok. 1 passed; 0 failed; 0 skipped\n"
    )
    fake_poc = "contract PoC is Test { function testExploit() public { assertTrue(true); } }"
    scenario = AttackScenario(name="Fake", description="fake", entry_point="x", attack_vector="reentrancy")
    parsed = OutputParser.parse(fake_forge_output)
    tests = OutputParser.parse_tests(fake_forge_output)
    result = HonestSignal.verify(
        source_code="", scenario=scenario,
        poc_code=fake_poc, forge_output=fake_forge_output,
        parsed=parsed, tests=tests,
    )
    print(f"TRIV_ASSERT confirmed={result.confirmed}, needs_review={result.needs_review}")
    assert result.confirmed is False, "assertTrue(true) MUST NOT be confirmed"
    assert result.needs_review is True
    assert "trivial assertion" in result.review_reason.lower()


async def test_real_exploit_detection() -> None:
    """Real exploit assertions must still reach confirmed=True."""
    real_output = (
        "[COMPILATION OK]\nCompiler run successful\n\n[TEST OUTPUT]\n"
        "[PASS] testExploit() (gas: 50000)\nSuite result: ok. 1 passed; 0 failed; 0 skipped\n"
    )
    real_poc = "contract PoC is Test { function testExploit() public { uint bal = victim.balance(); assertGt(bal, 100); } }"
    scenario = AttackScenario(name="Real", description="real", entry_point="x", attack_vector="reentrancy")
    parsed = OutputParser.parse(real_output)
    tests = OutputParser.parse_tests(real_output)
    result = HonestSignal.verify(
        source_code="", scenario=scenario,
        poc_code=real_poc, forge_output=real_output,
        parsed=parsed, tests=tests,
    )
    print(f"REAL_EXPLOIT confirmed={result.confirmed}")
    assert result.confirmed is True, "real exploit assertions MUST reach confirmed=True"


async def test_full_pipeline_completes() -> None:
    """The full audit pipeline must complete and confirm a real reentrancy."""
    session = AuditSession(
        session_id="e2e-pipeline",
        source_code=VULNERABLE,
        language="solidity",
        file_path="VulnerableVault.sol",
        file_name="VulnerableVault.sol",
    )
    await backend_main._run_pipeline(session, "", 2, None, [], "", VULNERABLE)
    print(f"PIPELINE status={session.status} findings={len(session.findings or [])}")
    assert session.status == "complete", f"pipeline must complete, got {session.status}: {session.error}"
    assert session.findings, "pipeline must produce findings for a vulnerable contract"
    assert any(f.confirmed for f in session.findings), "at least one finding must be forge-confirmed"

async def test_signature_adaptive_poc() -> None:
    """withdraw(uint256) + payable deposit must still be confirmed (regression for the no-arg PoC bug)."""
    scenario = AttackScenario(
        name="Reentrancy on withdraw",
        description="Parameterized withdraw re-entered before balance update",
        entry_point="withdraw",
        attack_vector="reentrancy",
        estimated_impact="Full drain of contract ETH",
    )
    proof = SimulationProof(attack_vector="reentrancy", target_function="withdraw")
    proof = await _run_forge_test(PARAMETERIZED_VULNERABLE, scenario, proof)
    print(f"SIGNATURE_ADAPTIVE confirmed={proof.confirmed}")
    assert proof.confirmed is True, "parameterized withdraw(uint256) MUST be confirmed by real forge"


async def test_decrement_vault_honest_signal() -> None:
    """`-=` accounting self-reverts on unwind (checked 0.8 math): the drain happens but the
    tx reverts, so it must be needs_review=True, never a false confirmed (and never a skip)."""
    scenario = AttackScenario(
        name="Reentrancy on withdraw",
        description="Decrement-accounting withdraw re-entered before state update",
        entry_point="withdraw",
        attack_vector="reentrancy",
        estimated_impact="Full drain of contract ETH",
    )
    proof = SimulationProof(attack_vector="reentrancy", target_function="withdraw")
    proof = await _run_forge_test(DECREMENT_VULNERABLE, scenario, proof)
    er = proof.exploit_result
    print(f"DECREMENT confirmed={proof.confirmed} needs_review={er.needs_review if er else None}")
    assert proof.confirmed is False, "self-reverting decrement vault MUST NOT be confirmed"
    assert er is not None and er.needs_review is True, "must be flagged for human review"
    assert er.compiled is True, "PoC must have compiled (regression: no-arg call bug)"
    assert er.forge_tests and er.forge_tests[0].passed is False, "forge must have run the test"



async def main() -> None:
    forge = _find_forge()
    assert forge is not None, "forge not found on PATH"
    print(f"Forge: {forge}")
    print("=== TEST 1: Real forge reentrancy on vulnerable vault ===")
    await test_reentrancy_confirmed()
    print("\n=== TEST 2: No false positive on CEI-safe vault ===")
    await test_reentrancy_not_confirmed_on_safe()
    print("\n=== TEST 3: assertTrue(true) detection (Gate 4.5) ===")
    await test_trivial_assert_detection()
    print("\n=== TEST 4: Real exploit detection ===")
    await test_real_exploit_detection()
    print("\n=== TEST 5: Full pipeline (audit -> forge -> findings) ===")
    await test_full_pipeline_completes()
    print("\n=== TEST 6: Signature-adaptive PoC (withdraw(uint256)) ===")
    await test_signature_adaptive_poc()
    print("\n=== TEST 7: Decrement-vault honest signal (needs_review) ===")
    await test_decrement_vault_honest_signal()
    print("\n=== ALL TESTS PASSED ===")


if __name__ == "__main__":
    asyncio.run(main())

"""
Comprehensive HonestSignal Verification Tests.
Tests every scenario to ensure Confirmed=True requires real exploit reproduction.
"""
import pytest
from verification.honest_signal import HonestSignal
from verification.output_parser import OutputParser
from verification.money_flow import MoneyFlowExtractor
from models.types import (
    AttackScenario, ExploitResult, ForgeTestResult, VerificationStatus,
)

REENTRANCY_SCENARIO = AttackScenario(
    name="Reentrancy on withdraw",
    description="Reentrancy via uncapped ETH transfer before state update",
    entry_point="withdraw",
    attack_vector="reentrancy",
    estimated_impact="Critical: attacker can drain all funds",
)

POC_CODE = """contract PoC is Test {
    function setUp() public {
        victim = new VulnerableVault();
        vm.deal(address(this), 10 ether);
        victim.deposit{value: 10 ether}();
    }
    function testExploit() public {
        Attacker att = new Attacker(address(victim));
        vm.deal(address(att), 2 ether);
        att.depositAndAttack();
        assertLt(address(victim).balance, 10 ether);
        assertGt(address(att).balance, 1 ether);
    }
}"""


class TestHonestSignalScenarioA:
    """A. Compilation failure — must NOT result in confirmed=True."""

    def test_compilation_failure_does_not_confirm(self):
        forge_output = "[COMPILATION FAILED after 2 retries]\nError: Compiler run failed"
        parsed = OutputParser.parse(forge_output)
        tests = OutputParser.parse_tests(forge_output)
        result = HonestSignal.verify(
            source_code="", scenario=REENTRANCY_SCENARIO,
            poc_code="broken code", forge_output=forge_output,
            parsed=parsed, tests=tests,
        )
        assert result.confirmed is False
        assert result.needs_review is True
        assert "compilation" in result.review_reason.lower()


class TestHonestSignalScenarioB:
    """B. Compilation success but exploit fails — must return needs_review."""

    def test_compile_ok_test_fails_does_not_confirm(self):
        forge_output = """[COMPILATION OK]
Compiler run successful

[TEST OUTPUT]
No files changed, compilation skipped

Ran 1 test for PoC.t.sol:PoC
[FAIL: No balance] testExploit() (gas: 249882)
Suite result: FAILED. 0 passed; 1 failed; 0 skipped; finished in 18.66ms

Ran 1 test suite: 0 tests passed, 1 failed, 0 skipped (1 total tests)

Failing tests:
Encountered 1 failing test in PoC.t.sol:PoC
[FAIL: No balance] testExploit() (gas: 249882)
"""
        parsed = OutputParser.parse(forge_output)
        tests = OutputParser.parse_tests(forge_output)
        result = HonestSignal.verify(
            source_code="", scenario=REENTRANCY_SCENARIO,
            poc_code=POC_CODE, forge_output=forge_output,
            parsed=parsed, tests=tests,
        )
        assert result.confirmed is False
        assert result.exploit_reproduced is False
        assert result.needs_review is True

    def test_compile_ok_all_tests_skipped_does_not_confirm(self):
        forge_output = """[COMPILATION OK]
Compiler run successful

[TEST OUTPUT]
Ran 1 test for PoC.t.sol:PoC
[SKIP] testExploit()
Suite result: ok. 0 passed; 0 failed; 1 skipped; finished in 10.00ms
"""
        parsed = OutputParser.parse(forge_output)
        tests = OutputParser.parse_tests(forge_output)
        result = HonestSignal.verify(
            source_code="", scenario=REENTRANCY_SCENARIO,
            poc_code=POC_CODE, forge_output=forge_output,
            parsed=parsed, tests=tests,
        )
        assert result.confirmed is False
        assert result.exploit_reproduced is False
        assert result.needs_review is True


class TestHonestSignalScenarioC:
    """C. Exploit succeeds — MUST result in confirmed=True."""

    def test_exploit_succeeds_confirmed(self):
        forge_output = """[COMPILATION OK]
Compiler run successful

[TEST OUTPUT]
No files changed, compilation skipped

Ran 1 test for PoC.t.sol:PoC
[PASS] testExploit() (gas: 358409)
Suite result: ok. 1 passed; 0 failed; 0 skipped; finished in 32.32ms

Ran 1 test suite: 1 tests passed, 0 failed, 0 skipped (1 total tests)
"""
        parsed = OutputParser.parse(forge_output)
        tests = OutputParser.parse_tests(forge_output)
        result = HonestSignal.verify(
            source_code="", scenario=REENTRANCY_SCENARIO,
            poc_code=POC_CODE, forge_output=forge_output,
            parsed=parsed, tests=tests,
        )
        assert result.confirmed is True
        assert result.exploit_reproduced is True
        assert result.needs_review is False
        assert result.verification_status == VerificationStatus.CONFIRMED


class TestHonestSignalScenarioD:
    """D. Missing evidence — parser returns incomplete data."""

    def test_no_forge_output_at_all(self):
        result = HonestSignal.verify(
            source_code="", scenario=REENTRANCY_SCENARIO,
            poc_code="", forge_output="", parsed=None, tests=None,
        )
        assert result.confirmed is False
        assert result.needs_review is True
        assert result.poc_generated is False

    def test_no_test_section_in_output(self):
        forge_output = "[COMPILATION OK]\nCompiler run successful\nNo tests matched"
        parsed = OutputParser.parse(forge_output)
        tests = OutputParser.parse_tests(forge_output)
        result = HonestSignal.verify(
            source_code="", scenario=REENTRANCY_SCENARIO,
            poc_code="some code", forge_output=forge_output,
            parsed=parsed, tests=tests,
        )
        assert result.confirmed is False
        assert result.executed is False
        assert result.needs_review is True


class TestHonestSignalScenarioE:
    """E. Invalid parser output — garbage input."""

    def test_garbage_output(self):
        result = HonestSignal.verify(
            source_code="", scenario=REENTRANCY_SCENARIO,
            poc_code=POC_CODE, forge_output="\x00\x01\x02garbage",
            parsed=OutputParser.parse("\x00\x01\x02garbage"),
            tests=[],
        )
        # Should not crash; should not confirm
        assert result.confirmed is False

    def test_empty_output(self):
        result = HonestSignal.verify(
            source_code="", scenario=REENTRANCY_SCENARIO,
            poc_code=POC_CODE, forge_output="",
            parsed=OutputParser.parse(""), tests=[],
        )
        assert result.confirmed is False
        assert result.compiled is False
        assert result.needs_review is True


class TestHonestSignalScenarioF:
    """F. Real Forge PASS — integration with real forge."""

    FORGE_REAL_PASS = """[COMPILATION OK]
Compiling 3 files with Solc 0.8.20
Compiler run successful with warnings

[TEST OUTPUT]
No files changed, compilation skipped

Ran 1 test for PoC.t.sol:PoC
[PASS] testExploit() (gas: 358409)
Suite result: ok. 1 passed; 0 failed; 0 skipped; finished in 32.32ms

Ran 1 test suite in 69.48ms (32.32ms CPU time): 1 tests passed, 0 failed, 0 skipped (1 total tests)
"""

    def test_real_forge_pass_confirmed(self):
        parsed = OutputParser.parse(self.FORGE_REAL_PASS)
        tests = OutputParser.parse_tests(self.FORGE_REAL_PASS)
        result = HonestSignal.verify(
            source_code="", scenario=REENTRANCY_SCENARIO,
            poc_code=POC_CODE, forge_output=self.FORGE_REAL_PASS,
            parsed=parsed, tests=tests,
        )
        assert result.confirmed is True
        assert len(result.evidence) >= 2
        assert any("Suite passed" in e for e in result.evidence)
        assert any("passed" in e and "gas" in e for e in result.evidence)

    def test_money_flow_extraction(self):
        """MoneyFlowExtractor should find vm.deal patterns in PoC code."""
        from models.types import ExploitResult
        er = ExploitResult(
            verification_status=VerificationStatus.CONFIRMED,
            hypothesis="Test",
            attack_vector="reentrancy",
            target_function="withdraw",
            poc_generated=True,
            poc_code=POC_CODE,
            compiled=True,
            executed=True,
            exploit_reproduced=True,
            forge_tests=[ForgeTestResult(test_name="testExploit", passed=True)],
            forge_output=self.FORGE_REAL_PASS,
            evidence=["Suite passed"],
            confirmed=True,
        )
        money_flow = MoneyFlowExtractor.extract(er, self.FORGE_REAL_PASS, poc_code=POC_CODE)
        assert money_flow is not None
        assert len(money_flow["steps"]) > 0
        # Should find vm.deal(address(this), 10 ether) and vm.deal(address(att), 2 ether)
        fund_steps = [s for s in money_flow["steps"] if s["action"] == "fund"]
        assert len(fund_steps) >= 2


# ── Edge Cases ──────────────────────────────────────────────────────────────

class TestHonestSignalEdgeCases:
    """Tests for edge cases that could produce false positives."""

    def test_assert_true_true_fake_pass(self):
        """A test that literally does 'assertTrue(true)' should NOT be confirmed."""
        forge_output = """[COMPILATION OK]
Compiler run successful

[TEST OUTPUT]
Ran 1 test for PoC.t.sol:PoC
[PASS] testExploit() (gas: 100)
Suite result: ok. 1 passed; 0 failed; 0 skipped; finished in 5.00ms
"""
        fake_poc = """contract PoC is Test {
    function testExploit() public {
        assertTrue(true);  // Always passes — not a real exploit
    }
}"""
        parsed = OutputParser.parse(forge_output)
        tests = OutputParser.parse_tests(forge_output)
        result = HonestSignal.verify(
            source_code="", scenario=REENTRANCY_SCENARIO,
            poc_code=fake_poc, forge_output=forge_output,
            parsed=parsed, tests=tests,
        )
        # Gate 4.5 now blocks assertTrue(true) — confirmed must be False
        assert result.confirmed is False
        assert result.needs_review is True
        assert "trivial assertion" in result.review_reason.lower()

    def test_always_pass_reverts_after_state_change(self):
        """A test that pauses then calls a function but never validates."""
        forge_output = """[COMPILATION OK]
[TEST OUTPUT]
[PASS] testExploit() (gas: 200)
Suite result: ok. 1 passed; 0 failed; 0 skipped
"""
        poc_no_assert = """contract PoC is Test {
    function testExploit() public {
        vm.prank(address(0xBAD));
        victim.someFunc();
    }
}"""
        parsed = OutputParser.parse(forge_output)
        tests = OutputParser.parse_tests(forge_output)
        result = HonestSignal.verify(
            source_code="", scenario=REENTRANCY_SCENARIO,
            poc_code=poc_no_assert, forge_output=forge_output,
            parsed=parsed, tests=tests,
        )
        assert result.confirmed is False


class TestOutputParserRobustness:
    """Tests that OutputParser doesn't misclassify edge cases."""

    def test_partial_fail_in_output(self):
        """Mixed pass/fail should produce suite_ok=False."""
        output = """[COMPILATION OK]
[PASS] testExploit1() (gas: 100)
[FAIL: Reason: assertion] testExploit2() (gas: 200)
Suite result: failed. 1 passed; 1 failed; 0 skipped
"""
        parsed = OutputParser.parse(output)
        assert parsed["compiled"] is True
        assert parsed["suite_ok"] is False
        assert parsed["total_passed"] == 1
        assert parsed["total_failed"] == 1

    def test_skip_is_not_pass(self):
        output = """[COMPILATION OK]
[SKIP] testExploit()
Suite result: ok. 0 passed; 0 failed; 1 skipped
"""
        parsed = OutputParser.parse(output)
        tests = OutputParser.parse_tests(output)
        assert parsed["total_passed"] == 0
        assert parsed["total_skipped"] >= 1
        assert parsed["suite_ok"] is True  # suite can be ok with all skipped
        assert all(t.passed is False for t in tests)  # SKIP is not PASS

    def test_fail_reason_colon_format(self):
        """Real Forge 1.7 emits [FAIL: reason] with a colon."""
        output = """[COMPILATION OK]
[TEST OUTPUT]
[FAIL: transfer failed] testExploit() (gas: 387686)
Suite result: FAILED. 0 passed; 1 failed; 0 skipped
"""
        tests = OutputParser.parse_tests(output)
        assert len(tests) >= 1
        failed = [t for t in tests if not t.passed]
        assert failed
        assert failed[0].error_message == "transfer failed"

    def test_timout_error(self):
        output = "[TIMEOUT] forge test exceeded 120s"
        parsed = OutputParser.parse(output)
        assert parsed["compiled"] is False
        assert parsed["any_test_executed"] is False


class TestFindingPostInit:
    """Tests that Finding.__post_init__ correctly defers to ExploitResult."""

    def test_confirm_deferred_to_exploit_result(self):
        from models.types import Finding
        er = ExploitResult(
            verification_status=VerificationStatus.CONFIRMED,
            hypothesis="test",
            poc_generated=True, compiled=True, executed=True,
            exploit_reproduced=True, confirmed=True,
        )
        # Even if we pass confirmed=False, exploit_result overrides
        f = Finding(
            title="Test", severity="high", description="desc",
            exploit_result=er, confirmed=False,
        )
        assert f.confirmed is True  # overridden by exploit_result
        assert f.needs_review is er.needs_review

    def test_not_confirmed_when_exploit_not_reproduced(self):
        from models.types import Finding
        er = ExploitResult(
            verification_status=VerificationStatus.NOT_REPRODUCED,
            hypothesis="test",
            poc_generated=True, compiled=True, executed=True,
            exploit_reproduced=False, confirmed=False, needs_review=True,
        )
        f = Finding(
            title="Test", severity="high", description="desc",
            exploit_result=er, confirmed=True,  # passes True but exploit says no
        )
        assert f.confirmed is False  # overridden by exploit_result
        assert f.needs_review is True

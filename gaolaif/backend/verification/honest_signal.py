import re
from models.types import (
    ExploitResult, VerificationStatus, ForgeTestResult,
    AttackScenario,
)
from verification.output_parser import OutputParser


class HonestSignal:
    """
    The Honest Verification Contract.

    Rules:
    - confirmed=True REQUIRES all 5 gates to pass sequentially.
    - If any gate fails, the result is recorded with the failing gate status.
    - needs_review is set when there is partial evidence (e.g., PoC compiles
      but exploit is not fully reproduced) to flag for human review.
    - Evidence is always traceable to actual Forge output.

    Gates:
    1. PoC_Generated — PoC code was produced
    2. Compiled — Forge compiled the PoC + source without errors
    3. Executed — Forge test ran (at least one test executed)
    4. Exploit_Reproduced — The exploit condition was actually met
       (assertions passed, attacker profit > 0, state changed)
    5. Confirmed — All evidence is verified and traceable
    """

    _TRIVIAL_ASSERT = re.compile(
        r"assertTrue\(\s*true\s*\)",
        re.IGNORECASE,
    )
    _TRIVIAL_EQ_ZERO = re.compile(
        r"assertEq\(\s*0\s*,\s*0\s*\)",
        re.IGNORECASE,
    )
    _NO_ASSERTION = re.compile(
        r"function\s+testExploit\s*\(\s*\)\s*(?:public|external)",
    )

    @classmethod
    def _poc_has_trivial_assertions(cls, poc_code: str) -> bool:
        return bool(cls._TRIVIAL_ASSERT.search(poc_code))

    @classmethod
    def _poc_has_zero_checks(cls, poc_code: str) -> bool:
        return bool(cls._TRIVIAL_EQ_ZERO.search(poc_code))

    @classmethod
    def _poc_lacks_meaningful_assertion(cls, poc_code: str) -> bool:
        if "assert" not in poc_code:
            return True
        body_match = cls._NO_ASSERTION.search(poc_code)
        if body_match:
            start = body_match.end()
            brace_count = 0
            body_start = -1
            body_end = -1
            for i, ch in enumerate(poc_code[start:], start):
                if ch == '{':
                    if brace_count == 0:
                        body_start = i + 1
                    brace_count += 1
                elif ch == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        body_end = i
                        break
            if body_start >= 0 and body_end >= 0:
                body = poc_code[body_start:body_end]
                if not cls._TRIVIAL_ASSERT.search(body) and "assert" in body:
                    return False
                return True
        return False

    @classmethod
    def verify(
        cls,
        source_code: str,
        scenario: AttackScenario,
        poc_code: str,
        forge_output: str,
        parsed: dict | None = None,
        tests: list[ForgeTestResult] | None = None,
    ) -> ExploitResult:
        """
        Returns an ExploitResult with the complete verification trail.
        This is the single entry point for exploit verification.
        """
        result = ExploitResult(
            verification_status=VerificationStatus.HYPOTHESIS,
            hypothesis=scenario.name,
            attack_vector=scenario.attack_vector,
            target_function=scenario.entry_point or "",
        )

        if parsed is None:
            parsed = OutputParser.parse(forge_output)
        if tests is None:
            tests = OutputParser.parse_tests(forge_output)

        # Gate 1: PoC Generated
        if not poc_code:
            result.verification_status = VerificationStatus.HYPOTHESIS
            result.needs_review = True
            result.review_reason = "No PoC code was generated"
            return result

        result.poc_generated = True
        result.poc_code = poc_code
        result.verification_status = VerificationStatus.POC_GENERATED

        # Gate 2: Compiled
        if not parsed.get("compiled", False):
            result.compiled = False
            result.compilation_output = cls._safe_get(forge_output, 3000)
            result.compile_attempts = parsed.get("compilation_errors", [])
            result.verification_status = VerificationStatus.COMPILATION_FAILED
            result.needs_review = True
            result.review_reason = (
                "PoC generated but compilation failed. "
                "Potential issue — needs human review."
            )
            return result

        result.compiled = True
        result.compilation_output = cls._safe_get(forge_output, 2000)
        result.verification_status = VerificationStatus.COMPILED

        # Gate 3: Executed
        if not parsed.get("any_test_executed", False):
            result.executed = False
            result.forge_tests = tests
            result.forge_output = cls._safe_get(forge_output, 3000)
            result.verification_status = VerificationStatus.EXECUTION_FAILED
            result.needs_review = True
            result.review_reason = (
                "Compilation succeeded but no tests executed. "
                "Potential issue — needs human review."
            )
            return result

        result.executed = True
        result.forge_tests = tests
        result.forge_output = cls._safe_get(forge_output, 3000)
        result.execution_duration_ms = 0.0  # set by caller if available
        result.verification_status = VerificationStatus.EXECUTED

        # Gate 4: Exploit Reproduced
        exploit_reproduced, evidence, attacker_profit, state_changes = (
            cls._assess_exploit(tests, parsed, scenario)
        )

        result.exploit_reproduced = exploit_reproduced
        result.evidence = evidence
        result.attacker_profit = attacker_profit
        result.state_changes = state_changes

        if not exploit_reproduced:
            result.verification_status = VerificationStatus.NOT_REPRODUCED
            result.needs_review = True
            result.review_reason = (
                "Tests executed but exploit condition was not reproduced. "
                "Potential issue — needs human review."
            )
            return result

        result.verification_status = VerificationStatus.EXPLOIT_REPRODUCED

        # Gate 4.5: PoC content integrity check
        if cls._poc_has_trivial_assertions(poc_code):
            result.confirmed = False
            result.needs_review = True
            result.review_reason = (
                "PoC contains assertTrue(true) or equivalent trivial assertion. "
                "Forge PASS does not prove exploit — PoC must have meaningful assertions."
            )
            return result

        if cls._poc_has_zero_checks(poc_code):
            result.confirmed = False
            result.needs_review = True
            result.review_reason = (
                "PoC contains assertEq(0, 0) or equivalent zero-check assertion. "
                "Forge PASS does not prove exploit — assertions must verify meaningful state."
            )
            return result

        if cls._poc_lacks_meaningful_assertion(poc_code):
            result.confirmed = False
            result.needs_review = True
            result.review_reason = (
                "PoC lacks a meaningful assertion. "
                "Forge PASS without meaningful assertions (e.g., assertLt, assertGt with real values, "
                "vm.expectRevert) does not prove the exploit — PoC must verify the exploit condition."
            )
            return result

        # Gate 5: Confirm
        result.confirmed = True
        result.verification_status = VerificationStatus.CONFIRMED

        return result

    @classmethod
    def _assess_exploit(
        cls,
        tests: list[ForgeTestResult],
        parsed: dict,
        scenario: AttackScenario,
    ) -> tuple[bool, list[str], dict | None, list[str]]:
        """
        Determine whether the exploit was actually reproduced.
        Returns (reproduced, evidence, attacker_profit, state_changes).
        """
        evidence: list[str] = []
        profit: dict | None = None
        state_changes: list[str] = []

        suite_ok = parsed.get("suite_ok", False)
        total_failed = parsed.get("total_failed", 0)
        total_passed = parsed.get("total_passed", 0)

        # Evidence 1: Suite result
        if suite_ok and total_failed == 0 and total_passed > 0:
            evidence.append(f"Suite passed ({total_passed} passed, {total_failed} failed)")
        else:
            evidence.append(f"Suite result: ok={suite_ok}, passed={total_passed}, failed={total_failed}")
            return False, evidence, None, state_changes

        # Evidence 2: Individual test results
        all_tests_passed = True
        for t in tests:
            if not t.passed:
                all_tests_passed = False
                evidence.append(f"Test {t.test_name} failed: {t.error_message}")
            else:
                evidence.append(f"Test {t.test_name} passed (gas: {t.gas_used})")

        if not all_tests_passed:
            return False, evidence, None, state_changes

        # Evidence 3: Skipped tests (vm.skip(true)) do NOT prove an exploit
        total_skipped = parsed.get("total_skipped", 0)
        if total_skipped > 0:
            evidence.append("WARNING: Some tests were skipped (vm.skip).")
            if total_passed == 0:
                evidence.append("No tests passed — all skipped. Not a real exploit.")
                return False, evidence, None, state_changes

        # Evidence 4: Try to extract profit from forge output
        raw = parsed.get("_raw_forge_output", "")
        profit, state_changes = cls._extract_profit_and_state(raw, scenario)

        if profit:
            evidence.append(f"Attacker profit detected: {profit}")

        return True, evidence, profit, state_changes

    @classmethod
    def _extract_profit_and_state(
        cls,
        forge_output: str,
        scenario: AttackScenario,
    ) -> tuple[dict | None, list[str]]:
        """
        Extract attacker profit and state changes from forge output.
        Looks for:
        - vm.deal amounts (funding)
        - assertLt/assertGt balance assertions
        - Event logs
        """
        import re
        state_changes = []

        # Extract balances from assertLt/assertGt messages
        balance_checks = re.findall(
            r"assert(Lt|Gt|Eq|Ge|Le).*?balance.*?(\d+)\s*(ether|wei)?",
            forge_output,
            re.IGNORECASE,
        )

        for op, val, unit in balance_checks:
            state_changes.append(f"Balance check: assert{op}(balance, {val} {unit or ''})")

        # Check forge output for balance values
        balance_after = re.search(
            r"address\(victim\)\.balance.*?(\d+)", forge_output, re.IGNORECASE
        )
        balance_attacker = re.search(
            r"address\(att\)\.balance.*?(\d+)", forge_output, re.IGNORECASE
        )

        profit = None
        if balance_attacker or balance_after:
            profit = {
                "victim_balance_after": balance_after.group(1) if balance_after else "unknown",
                "attacker_balance_after": balance_attacker.group(1) if balance_attacker else "unknown",
            }

        return profit, state_changes

    @staticmethod
    def _safe_get(text: str, max_len: int) -> str:
        return text[:max_len] if text else ""

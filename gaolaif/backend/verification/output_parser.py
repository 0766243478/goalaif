import re
from models.types import ForgeTestResult


class OutputParser:
    """
    Parses raw Forge output into structured, verifiable data.

    Extracts:
    - Compilation success/failure
    - Individual test results (name, pass/fail, gas, error)
    - Suite totals
    - Assertion messages
    """

    COMPILE_SUCCESS = re.compile(r"Compiler run successful|Compiler run successful", re.IGNORECASE)
    TEST_RESULT = re.compile(
        r"\[(PASS|FAIL|SKIP)"
        r"(?::\s*[^\]]+)?\]"          # match [FAIL: reason] and [FAIL] and [FAIL. Reason: ...]
        r"\s+(\S+)\s*(?:\(gas:\s*(\d+)\))?"
    )
    SUITE_RESULT = re.compile(
        r"Suite result:\s*(ok|failed|OK|FAILED)\.\s*(\d+)\s+passed;\s*(\d+)\s*failed;\s*(\d+)\s*skipped",
        re.IGNORECASE,
    )
    COMPILE_ERROR = re.compile(r"Error\s*(?:\(\d+\))?:")
    RAN_TESTS = re.compile(r"Ran (\d+) test")
    FAIL_REASON = re.compile(
        r"\[FAIL:\s*([^\]]+)\]|\[FAIL\. Reason:\s*(.+?)\]|Reason:\s*(.+?)$", re.MULTILINE
    )

    @classmethod
    def parse(cls, raw_output: str) -> dict:
        """
        Returns a structured dict:
        {
            "compiled": bool,
            "compilation_errors": list[str],
            "tests": [{"name": str, "passed": bool, "gas": int, "error": str}, ...],
            "total_passed": int,
            "total_failed": int,
            "total_skipped": int,
            "suite_ok": bool,
            "any_test_executed": bool,
        }
        """
        result = {
            "compiled": False,
            "compilation_errors": [],
            "tests": [],
            "total_passed": 0,
            "total_failed": 0,
            "total_skipped": 0,
            "suite_ok": False,
            "any_test_executed": False,
        }

        # Check compilation
        has_compile_ok = bool(cls.COMPILE_SUCCESS.search(raw_output))
        has_compile_err = bool(cls.COMPILE_ERROR.search(raw_output))
        has_compilation_ok_tag = "[COMPILATION OK]" in raw_output
        has_compilation_fail_tag = "[COMPILATION FAILED" in raw_output

        if has_compilation_fail_tag:
            result["compiled"] = False
            result["compilation_errors"] = cls._extract_compile_errors(raw_output)
            return result

        if has_compilation_ok_tag or has_compile_ok:
            result["compiled"] = True
        elif has_compile_err:
            result["compiled"] = False
            result["compilation_errors"] = cls._extract_compile_errors(raw_output)
            return result

        # Extract individual test results
        for match in cls.TEST_RESULT.finditer(raw_output):
            status = match.group(1)
            test_name = match.group(2)
            gas_str = match.group(3)
            gas = int(gas_str) if gas_str else 0

            passed = status == "PASS"
            if status == "SKIP":
                passed = False

            error_msg = ""
            if status == "FAIL":
                error_msg = cls._extract_fail_reason(raw_output, test_name)

            result["tests"].append({
                "name": test_name,
                "passed": passed,
                "gas": gas,
                "error": error_msg,
            })

            if passed:
                result["total_passed"] += 1
            elif status == "FAIL":
                result["total_failed"] += 1
            elif status == "SKIP":
                result["total_skipped"] += 1

        # Parse suite summary
        suite_match = cls.SUITE_RESULT.search(raw_output)
        if suite_match:
            result["suite_ok"] = suite_match.group(1).lower() == "ok"
            result["total_passed"] = int(suite_match.group(2))
            result["total_failed"] = int(suite_match.group(3))
            result["total_skipped"] = int(suite_match.group(4))
        elif cls.RAN_TESTS.search(raw_output):
            result["suite_ok"] = result["total_failed"] == 0

        result["any_test_executed"] = (
            result["total_passed"] > 0 or result["total_failed"] > 0
        )

        result["_raw_forge_output"] = raw_output

        return result

    @classmethod
    def parse_tests(cls, raw_output: str) -> list[ForgeTestResult]:
        tests = []
        for match in cls.TEST_RESULT.finditer(raw_output):
            status = match.group(1)
            test_name = match.group(2)
            gas_str = match.group(3)
            gas = int(gas_str) if gas_str else 0
            tests.append(ForgeTestResult(
                test_name=test_name,
                passed=(status == "PASS"),
                gas_used=gas,
                error_message=cls._extract_fail_reason(raw_output, test_name) if status == "FAIL" else "",
            ))
        return tests

    @classmethod
    def _extract_compile_errors(cls, output: str) -> list[str]:
        errors = []
        for line in output.split("\n"):
            stripped = line.strip()
            if not stripped:
                continue
            if re.match(r'^Error\b', stripped) or 'error[' in stripped.lower():
                errors.append(stripped)
            elif 'undeclared identifier' in stripped.lower():
                errors.append(stripped)
            elif errors and stripped.startswith('^'):
                errors[-1] += ' ' + stripped
        return errors[:10]

    @classmethod
    def _extract_fail_reason(cls, output: str, test_name: str) -> str:
        for line in output.splitlines():
            if "[FAIL" in line and test_name in line:
                for match in cls.FAIL_REASON.finditer(line):
                    reason = (match.group(1) or match.group(2) or match.group(3) or "").strip()
                    if reason:
                        return reason
        for match in cls.FAIL_REASON.finditer(output):
            reason = (match.group(1) or match.group(2) or match.group(3) or "").strip()
            if reason:
                return reason
        return "Assertion failed"

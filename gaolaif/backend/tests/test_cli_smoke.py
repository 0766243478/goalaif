"""CLI smoke tests.

These run ``sireen_cli`` as a real subprocess and assert the process exit code.
In-process assertions on ``_exit_code()`` (in test_sireen_cli.py) prove the
mapping is right; these prove the mapping is actually wired to the process exit
status, which is what a shell or CI step observes.

Run: pytest tests/test_cli_smoke.py -v
"""

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

BACKEND_DIR = Path(__file__).resolve().parent.parent

VULNERABLE = """// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SmokeVault {
    mapping(address => uint256) public balances;

    function withdraw(uint256 amount) public {
        require(balances[msg.sender] >= amount, "insufficient");
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "transfer failed");
        balances[msg.sender] -= amount;
    }

    receive() external payable {}
}
"""

SAFE = """// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SmokeSafe {
    uint256 public value;

    function set(uint256 next) external {
        value = next;
    }
}
"""


def _run(args, tmp_path, extra_env=None):
    env = os.environ.copy()
    env["SIREEN_DB_PATH"] = str(tmp_path / "cli-smoke.db")
    env["SIREEN_MEMORY_MODE"] = "memory"
    env["PYTHONPATH"] = str(BACKEND_DIR)
    env.pop("SIREEN_API_TOKEN", None)
    if extra_env:
        env.update(extra_env)
    return subprocess.run(
        [sys.executable, "-m", "sireen_cli", *args],
        cwd=str(BACKEND_DIR),
        capture_output=True,
        text=True,
        timeout=300,
        env=env,
    )


class TestHelpAndDiscovery:
    def test_help_exits_zero(self, tmp_path):
        result = _run(["--help"], tmp_path)
        assert result.returncode == 0, result.stderr
        assert "audit" in result.stdout
        assert "show" in result.stdout

    def test_no_subcommand_is_a_usage_error(self, tmp_path):
        result = _run([], tmp_path)
        assert result.returncode != 0
        assert "usage" in (result.stdout + result.stderr).lower()

    def test_audits_on_empty_store_exits_zero(self, tmp_path):
        result = _run(["audits"], tmp_path)
        assert result.returncode == 0, result.stderr
        assert "No durable SIREEN audits" in result.stdout


class TestHonestFailures:
    def test_missing_file_exits_one_with_stderr(self, tmp_path):
        result = _run(["audit", str(tmp_path / "nope.sol")], tmp_path)
        assert result.returncode == 1
        assert "not found" in result.stderr.lower()

    def test_non_solidity_exits_one(self, tmp_path):
        target = tmp_path / "contract.txt"
        target.write_text("contract C {}", encoding="utf-8")
        result = _run(["audit", str(target)], tmp_path)
        assert result.returncode == 1
        assert "solidity" in result.stderr.lower()

    def test_empty_source_exits_one(self, tmp_path):
        target = tmp_path / "Empty.sol"
        target.write_text("", encoding="utf-8")
        result = _run(["audit", str(target)], tmp_path)
        assert result.returncode == 1
        assert "empty" in result.stderr.lower()

    def test_unknown_audit_id_exits_three(self, tmp_path):
        result = _run(["show", "audit-does-not-exist"], tmp_path)
        assert result.returncode == 3
        assert "not found" in result.stderr.lower()

    def test_json_error_mode_is_parseable(self, tmp_path):
        result = _run(["audit", str(tmp_path / "nope.sol"), "--json"], tmp_path)
        assert result.returncode == 1
        payload = json.loads(result.stdout)
        assert payload["terminal_state"] == "failed"
        assert "error" in payload


class TestExitCodeMatchesTerminalState:
    def test_audit_exit_code_equals_terminal_state_policy(self, tmp_path):
        """Whatever the pipeline decides, the exit code must agree with it.

        On a machine without forge the state is degraded (2). With forge it is
        degraded or confirmed. This asserts the invariant, not a fixed number.
        """
        target = tmp_path / "SmokeVault.sol"
        target.write_text(VULNERABLE, encoding="utf-8")

        result = _run(["audit", str(target), "--json"], tmp_path)
        assert result.returncode in (0, 2), result.stderr

        payload = json.loads(result.stdout)
        expected = {"confirmed": 0, "clean_with_coverage": 0,
                    "degraded": 2, "unverified": 2, "failed": 1}[payload["terminal_state"]]
        assert result.returncode == expected, (
            f"terminal_state={payload['terminal_state']} but exit={result.returncode}"
        )

    def test_show_round_trips_the_audit_it_just_wrote(self, tmp_path):
        target = tmp_path / "SmokeVault.sol"
        target.write_text(VULNERABLE, encoding="utf-8")

        audited = _run(["audit", str(target), "--json"], tmp_path)
        audit = json.loads(audited.stdout)
        audit_id = audit["id"]

        shown = _run(["show", audit_id, "--json"], tmp_path)
        assert shown.returncode == audited.returncode
        assert json.loads(shown.stdout)["id"] == audit_id

        listed = _run(["audits", "--json"], tmp_path)
        assert listed.returncode == 0
        assert any(item["id"] == audit_id for item in json.loads(listed.stdout))


class TestForgeStatusHonesty:
    """A missing verifier must not be reported as a compile failure."""

    def test_absent_forge_is_not_reported_as_compile_failed(self, tmp_path, monkeypatch):
        target = tmp_path / "SmokeVault.sol"
        target.write_text(VULNERABLE, encoding="utf-8")

        env = {"PATH": "/nonexistent-bin"}  # hides forge from the subprocess
        result = _run(["audit", str(target)], tmp_path, extra_env=env)
        assert result.returncode in (0, 2), result.stderr

        out = result.stdout
        assert "Compile: FAILED" not in out, (
            "nothing was compiled, so a compile failure is a false record:\n" + out
        )
        assert "NOT RUN" in out

    @pytest.mark.skipif(
        subprocess.run([sys.executable, "-c", "import shutil,sys; sys.exit(0 if shutil.which('forge') else 1)"]).returncode != 0,
        reason="forge not available on this machine",
    )
    def test_forge_present_is_reported_as_available(self, tmp_path):
        target = tmp_path / "SmokeVault.sol"
        target.write_text(VULNERABLE, encoding="utf-8")
        result = _run(["audit", str(target)], tmp_path)
        assert "Compile: NOT RUN (forge unavailable)" not in result.stdout

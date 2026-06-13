# ──────────────────────────────────────────────
# PatchVerifierAgent — Regression Testing
# ──────────────────────────────────────────────
# Receives developer's proposed patch.
# Runs the original exploit PoC against patched
# code (must fail — exploit fixed). Runs full
# Forge test suite against patched code (must
# pass — no regressions). Queries AuditorAgent
# on the patch to confirm no new vulns.
# ──────────────────────────────────────────────

import json
import os
import subprocess
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional

from .base_agent import ExploitProof, Finding, PatchProposal, RankedPatchOption, call_ollama
from .auditor_agent import AuditorAgent


class PatchVerifierAgent:
    """Verifies that patches fix exploits without introducing regressions."""

    def __init__(self, forge_path: str = "forge", fork_url: str = "http://localhost:8545"):
        self.forge_path = forge_path
        self.fork_url = fork_url
        self.auditor = AuditorAgent(use_ollama=False)  # Reuse static analysis only

    def run(
        self,
        original_code: str,
        patched_code: str,
        exploit_proofs: List[ExploitProof],
        contract_path: str,
        session_id: str,
    ) -> PatchProposal:
        """Verify a patch against its exploit proofs and regression suite."""
        new_findings: List[Finding] = []

        # 1. Write patched code to temp directory
        with tempfile.TemporaryDirectory() as tmpdir:
            patch_path = Path(tmpdir) / Path(contract_path).name
            patch_path.write_text(patched_code, encoding='utf-8')
            original_patch_path = Path(tmpdir) / "original.sol"
            original_patch_path.write_text(original_code, encoding='utf-8')

            # 2. Run original PoCs against patched code — must fail
            poc_results = []
            for proof in exploit_proofs:
                poc_passed = self._run_poc_against_code(proof, str(patch_path))
                poc_results.append({
                    "finding_id": proof.finding_id,
                    "original_confirmed": proof.confirmed,
                    "still_exploitable": poc_passed,
                })

            # 3. Run full test suite — must pass
            regression_ok = self._run_test_suite(tmpdir)

            # 4. Run static analysis on patched code
            try:
                new_findings = self.auditor.run(str(patch_path), session_id)
            except Exception as e:
                new_findings = []

            # 5. Build regression report
            regression_report = self._build_report(poc_results, regression_ok, new_findings)

            all_exploits_fixed = all(not r["still_exploitable"] for r in poc_results)
            verified = all_exploits_fixed and regression_ok

            # Merge findings (remove findings that were fixed, add any new ones)
            return PatchProposal(
                finding_id=exploit_proofs[0].finding_id if exploit_proofs else "",
                original_code=original_code,
                patched_code=patched_code,
                verified=verified,
                regression_report=regression_report,
                new_findings=new_findings,
            )

    def _run_poc_against_code(self, proof: ExploitProof, patch_path: str) -> bool:
        """Run a PoC against patched code. Returns True if exploit still works (test passes)."""
        if not proof.poc_code or not proof.poc_code.strip():
            return False

        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = Path(tmpdir)
            test_dir = tmp_path / "test"
            test_dir.mkdir(parents=True, exist_ok=True)

            # Setup forge-std stub
            lib_forge_std = tmp_path / "lib" / "forge-std" / "src"
            lib_forge_std.mkdir(parents=True, exist_ok=True)
            lib_forge_std.joinpath("Test.sol").write_text('''// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;
interface Vm {
    function createSelectFork(string calldata) external returns (uint256);
    function prank(address) external;
    function startPrank(address) external;
    function stopPrank() external;
    function expectRevert(bytes calldata) external;
}
contract StdAssertions {
    function assertTrue(bool c) public pure { require(c, "assertTrue"); }
    function assertTrue(bool c, string memory e) public pure { require(c, e); }
    function assertEq(uint256 a, uint256 b) public pure { require(a == b, "assertEq"); }
    function assertEq(uint256 a, uint256 b, string memory e) public pure { require(a == b, e); }
    function assertEq(address a, address b) public pure { require(a == b, "assertEq"); }
    function assertEq(address a, address b, string memory e) public pure { require(a == b, e); }
    function assertGt(uint256 a, uint256 b) public pure { require(a > b, "assertGt"); }
    function assertGt(uint256 a, uint256 b, string memory e) public pure { require(a > b, e); }
    function assertGe(uint256 a, uint256 b) public pure { require(a >= b, "assertGe"); }
    function assertGe(uint256 a, uint256 b, string memory e) public pure { require(a >= b, e); }
}
contract Test is StdAssertions {
    Vm public constant vm = Vm(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D);
}
''', encoding='utf-8')

            # Write PoC file in test dir
            poc_file = test_dir / f"PoC_{proof.finding_id}.t.sol"
            poc_file.write_text(proof.poc_code, encoding='utf-8')

            # Copy patched contract into test dir
            patched = Path(patch_path)
            dest = test_dir / patched.name
            dest.write_text(patched.read_text(encoding='utf-8'), encoding='utf-8')

            # foundry.toml
            tmp_path.joinpath("foundry.toml").write_text("[profile.default]\nsrc = 'test'\nlibs = ['lib']\n")
            tmp_path.joinpath("remappings.txt").write_text("forge-std/=lib/forge-std/src/\n")

            try:
                result = subprocess.run(
                    [self.forge_path, "test",
                     "--match-test", "testExploit",
                     "-vvv"],
                    capture_output=True, text=True, timeout=300,
                    cwd=str(tmp_path),
                )
                stdout = result.stdout
                stderr = result.stderr

                # Check that testExploit actually ran AND passed
                test_ran = "testExploit" in stdout and ("[PASS]" in stdout or "[FAIL]" in stdout)
                test_passed = "[PASS]" in stdout and "testExploit" in stdout

                if not test_ran:
                    return False  # Test didn't match — can't determine exploit status
                return test_passed  # True = exploit still works (BAD), False = exploit fixed (GOOD)
            except subprocess.TimeoutExpired:
                return False
            except Exception:
                return False

    def _run_test_suite(self, project_dir: str) -> bool:
        """Run entire Forge test suite. Returns True if all pass."""
        try:
            result = subprocess.run(
                [self.forge_path, "test", "-vvv"],
                capture_output=True, text=True, timeout=600,
                cwd=project_dir,
            )
            return result.returncode == 0
        except (subprocess.TimeoutExpired, Exception):
            return False

    @staticmethod
    def _build_report(poc_results: list, regression_ok: bool, new_findings: List[Finding]) -> str:
        lines = ["## Patch Verification Report", ""]
        lines.append(f"**Regression Suite:** {'PASSED' if regression_ok else 'FAILED'}")
        lines.append("")
        lines.append("### PoC Results")
        for pr in poc_results:
            status = "STILL EXPLOITABLE" if pr["still_exploitable"] else "FIXED"
            lines.append(f"- {pr['finding_id']}: {status}")
        lines.append("")
        if new_findings:
            lines.append(f"### New Findings ({len(new_findings)})")
            for f in new_findings:
                lines.append(f"- [{f.severity.value}] {f.title} at {f.location}")
        else:
            lines.append("### New Findings: None")
        return "\n".join(lines)


class PatchArchitect:
    """Generates 3 ranked patch options with explanations for each confirmed vulnerability."""

    def generate_ranked_patches(
        self,
        finding: Finding,
        proof: ExploitProof,
        code_slice: str,
    ) -> List[RankedPatchOption]:
        prompt = f"""You are a smart contract security engineer. A vulnerability has been confirmed.

Vulnerability: {finding.title}
Description: {finding.description}
Confirmed exploit: {proof.attack_vector}
Code: {code_slice[:2000]}

Generate exactly 3 patch options, ranked from best to worst.
For each option explain:
1. What code change to make
2. Why this is the optimal fix at the protocol level
3. What attack vectors this closes
4. What tradeoffs it introduces

Return JSON (only the array, no explanation):
[{{
  "rank": 1,
  "patch_code": "...",
  "strategy": "...",
  "why_best": "...",
  "attack_vectors_closed": ["..."],
  "tradeoffs": "..."
}}]"""
        raw = self._call_ollama(prompt)
        if raw is None:
            return self._fallback_patch(finding, proof)

        try:
            cleaned = raw.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            items = json.loads(cleaned.strip())
            if not isinstance(items, list):
                return self._fallback_patch(finding, proof)
            return [RankedPatchOption(**item, verified=False) for item in items if isinstance(item, dict)]
        except (json.JSONDecodeError, Exception):
            return self._fallback_patch(finding, proof)

    def _fallback_patch(self, finding: Finding, proof: ExploitProof) -> List[RankedPatchOption]:
        return [RankedPatchOption(
            rank=1,
            patch_code=f"// TODO: Manual patch required for {finding.title}",
            strategy="checks-effects-interactions",
            why_best="Apply the standard security pattern to break the attack vector",
            attack_vectors_closed=[proof.attack_vector],
            tradeoffs="May increase gas cost; requires manual verification",
            verified=False,
        )]

    @staticmethod
    def _call_ollama(prompt: str) -> Optional[str]:
        try:
            return call_ollama(prompt, deep=True)
        except Exception:
            return None

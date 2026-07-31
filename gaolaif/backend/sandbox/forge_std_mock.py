"""Shared forge-std shim for PoC execution.

This shim targets the real Foundry cheatcode address
(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D), so all vm.* cheatcodes used by
generated PoCs (deal, startPrank, stopPrank, warp, expectRevert, skip, ...)
are executed by the real Foundry EVM when compiled with the `forge` binary.

It intentionally does NOT declare setUp/testExploit on Test, so generated PoCs
may declare them freely without `override` specifiers.

Validated against forge 1.7.2 nightly (2026-07-31):
  - Vulnerable reentrancy vault  -> [PASS] testExploit
  - Reentrancy-safe vault        -> [FAIL: transfer failed] testExploit
"""

MOCK_FORGE_STD = """// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

library stdStorageSafe { function child() internal pure returns (address) { return address(0); } }
library stdStorage { function child() internal pure returns (address) { return address(0); } }
library StdMath { function delta(uint256 a, uint256 b) internal pure returns (uint256) { return a >= b ? a - b : b - a; } }
library StdUtils { function computeCreateAddress(address deployer, uint256 nonce) internal pure returns (address) { return address(0); } }
library stdError { bytes32 constant assertionError = hex"01"; bytes32 constant arithmeticError = hex"02"; bytes32 constant divisionError = hex"03"; }
library stdJson { function parseRaw(string memory, string memory) internal pure returns (bytes memory) { return ""; } }

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
    function expectRevert() external;
    function expectRevert(bytes4 selector) external;
    function expectRevert(bytes calldata) external;
    function expectEmit(bool, bool, bool, bool) external;
    function expectEmit(bool, bool, bool, bool, address) external;
    function expectCall(address, bytes calldata) external;
    function expectCall(address, uint256, bytes calldata) external;
    function skip(bool) external;
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
    function failed() public pure returns (bool) { return false; }
}

library console {
    address private constant CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
    function _sendLogPayload(bytes memory payload) private view {
        address consoleAddress = CONSOLE_ADDRESS;
        assembly { pop(staticcall(gas(), consoleAddress, add(payload, 32), mload(payload), 0, 0)) }
    }
    function log(uint256 p0) internal view { _sendLogPayload(abi.encodeWithSignature("log(uint256)", p0)); }
    function log(string calldata p0) internal view { _sendLogPayload(abi.encodeWithSignature("log(string)", p0)); }
    function log(address p0) internal view { _sendLogPayload(abi.encodeWithSignature("log(address)", p0)); }
    function log(bytes32 p0) internal view { _sendLogPayload(abi.encodeWithSignature("log(bytes32)", p0)); }
    function log(bool p0) internal view { _sendLogPayload(abi.encodeWithSignature("log(bool)", p0)); }
    function log(uint256 p0, uint256 p1) internal view { _sendLogPayload(abi.encodeWithSignature("log(uint256,uint256)", p0, p1)); }
    function log(string calldata p0, uint256 p1) internal view { _sendLogPayload(abi.encodeWithSignature("log(string,uint256)", p0, p1)); }
    function log(string calldata p0, address p1) internal view { _sendLogPayload(abi.encodeWithSignature("log(string,address)", p0, p1)); }
    function log(string calldata p0, bytes32 p1) internal view { _sendLogPayload(abi.encodeWithSignature("log(string,bytes32)", p0, p1)); }
    function log(string calldata p0, bool p1) internal view { _sendLogPayload(abi.encodeWithSignature("log(string,bool)", p0, p1)); }
    function logBytes(bytes memory p0) internal view { _sendLogPayload(abi.encodeWithSignature("logBytes(bytes)", p0)); }
    function logBytes32(bytes32 p0) internal view { _sendLogPayload(abi.encodeWithSignature("logBytes32(bytes32)", p0)); }
    function logAddress(address p0) internal view { _sendLogPayload(abi.encodeWithSignature("log(address)", p0)); }
    function logUint(uint256 p0) internal view { _sendLogPayload(abi.encodeWithSignature("log(uint256)", p0)); }
    function logString(string calldata p0) internal view { _sendLogPayload(abi.encodeWithSignature("log(string)", p0)); }
    function logBool(bool p0) internal view { _sendLogPayload(abi.encodeWithSignature("log(bool)", p0)); }
}

library console2 {
    address private constant CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
    function _sendLogPayload(bytes memory payload) private view {
        address consoleAddress = CONSOLE_ADDRESS;
        assembly { pop(staticcall(gas(), consoleAddress, add(payload, 32), mload(payload), 0, 0)) }
    }
    function log(uint256 p0) internal view { _sendLogPayload(abi.encodeWithSignature("log(uint256)", p0)); }
    function log(string calldata p0) internal view { _sendLogPayload(abi.encodeWithSignature("log(string)", p0)); }
    function log(address p0) internal view { _sendLogPayload(abi.encodeWithSignature("log(address)", p0)); }
}

contract Test {
    Vm internal constant vm = Vm(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D);
    function assertTrue(bool condition) internal pure { if (!condition) revert("Assertion failed"); }
    function assertTrue(bool condition, string memory err) internal pure { if (!condition) revert(err); }
    function assertEq(uint256 a, uint256 b) internal pure { if (a != b) revert("assertEq failed"); }
    function assertEq(uint256 a, uint256 b, string memory err) internal pure { if (a != b) revert(err); }
    function assertEq(address a, address b) internal pure { if (a != b) revert("assertEq address failed"); }
    function assertEq(address a, address b, string memory err) internal pure { if (a != b) revert(err); }
    function assertEq(string memory a, string memory b) internal pure { if (keccak256(bytes(a)) != keccak256(bytes(b))) revert("assertEq string failed"); }
    function assertEq(bytes32 a, bytes32 b) internal pure { if (a != b) revert("assertEq bytes32 failed"); }
    function assertEq(int256 a, int256 b) internal pure { if (a != b) revert("assertEq int failed"); }
    function assertEq(int256 a, int256 b, string memory err) internal pure { if (a != b) revert(err); }
    function assertEq(bool a, bool b) internal pure { if (a != b) revert("assertEq bool failed"); }
    function assertGt(uint256 a, uint256 b) internal pure { if (a <= b) revert("assertGt failed"); }
    function assertGt(uint256 a, uint256 b, string memory err) internal pure { if (a <= b) revert(err); }
    function assertGt(int256 a, int256 b) internal pure { if (a <= b) revert("assertGt int failed"); }
    function assertGe(uint256 a, uint256 b) internal pure { if (a < b) revert("assertGe failed"); }
    function assertLe(uint256 a, uint256 b) internal pure { if (a > b) revert("assertLe failed"); }
    function assertLt(uint256 a, uint256 b) internal pure { if (a >= b) revert("assertLt failed"); }
    function assertLt(uint256 a, uint256 b, string memory err) internal pure { if (a >= b) revert(err); }
    function assertNotEq(uint256 a, uint256 b) internal pure { if (a == b) revert("assertNotEq failed"); }
    function assertApproxEqAbs(uint256 a, uint256 b, uint256 maxDelta) internal pure {
        if (a > b) { if (a - b > maxDelta) revert("assertApproxEqAbs failed"); }
        else { if (b - a > maxDelta) revert("assertApproxEqAbs failed"); }
    }
    function assertApproxEqRel(uint256 a, uint256 b, uint256 maxPercentDelta) internal pure {
        uint256 diff = a > b ? a - b : b - a;
        uint256 maxA = a > b ? a : b;
        if (diff * 10000 > maxPercentDelta * maxA) revert("assertApproxEqRel failed"); }
}
"""

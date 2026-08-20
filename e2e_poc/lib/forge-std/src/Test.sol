// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

interface Vm {
    function createSelectFork(string calldata) external returns (uint256);
    function createFork(string calldata) external returns (uint256);
    function selectFork(uint256) external;
    function prank(address) external;
    function startPrank(address) external;
    function startPrank(address, address) external;
    function stopPrank() external;
    function deal(address, uint256) external;
    function warp(uint256) external;
    function roll(uint256) external;
    function expectRevert(bytes calldata) external;
    function expectRevert() external;
    function expectEmit(bool, bool, bool, bool) external;
    function record() external;
    function accesses(address, bytes32) external returns (bool, bool);
    function label(address, string calldata) external;
    function getBlockNumber() external returns (uint256);
    function getBlockTimestamp() external returns (uint256);
    function toString(address) external returns (string memory);
    function toString(uint256) external returns (string memory);
    function toString(bytes32) external returns (string memory);
    function assume(bool) external;
}

abstract contract StdAssertions {
    function assertTrue(bool c) public pure { require(c, "assertTrue"); }
    function assertTrue(bool c, string memory e) public pure { require(c, e); }
    function assertEq(uint256 a, uint256 b) public pure { require(a == b, "assertEq(uint256)"); }
    function assertEq(uint256 a, uint256 b, string memory e) public pure { require(a == b, e); }
    function assertEq(address a, address b) public pure { require(a == b, "assertEq(address)"); }
    function assertEq(address a, address b, string memory e) public pure { require(a == b, e); }
    function assertEq(bytes32 a, bytes32 b) public pure { require(a == b, "assertEq(bytes32)"); }
    function assertEq(string memory a, string memory b) public pure { require(keccak256(bytes(a)) == keccak256(bytes(b)), "assertEq(string)"); }
    function assertGt(uint256 a, uint256 b) public pure { require(a > b, "assertGt"); }
    function assertGe(uint256 a, uint256 b) public pure { require(a >= b, "assertGe"); }
    function assertLt(uint256 a, uint256 b) public pure { require(a < b, "assertLt"); }
    function assertLe(uint256 a, uint256 b) public pure { require(a <= b, "assertLe"); }
    function assertNotEq(uint256 a, uint256 b) public pure { require(a != b, "assertNotEq"); }
    function assertApproxEqAbs(uint256 a, uint256 b, uint256 tol) public pure { require(a >= b ? a - b <= tol : b - a <= tol, "assertApproxEqAbs"); }
}

abstract contract Test is StdAssertions {
    Vm public constant vm = Vm(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D);
    uint256 internal constant DEFAULT_TEST_GAS = 1_000_000_000;

    function setUp() public virtual;
    function testExploit() public virtual;
}

// Minimal console shim (mirrors forge-std's console/console2) so generated
// PoCs can emit machine-readable evidence lines without pulling in the full
// forge-std console library.
library console {
    address constant CONSOLE_ADDRESS = 0x000000000000000000000000636F6e736f6C652E;
    function log(string memory p0) internal view {
        (bool ok, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string)", p0));
        ok;
    }
}
library console2 {
    address constant CONSOLE_ADDRESS = 0x000000000000000000000000636F6e736f6C652E;
    function log(string memory p0) internal view {
        (bool ok, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string)", p0));
        ok;
    }
}

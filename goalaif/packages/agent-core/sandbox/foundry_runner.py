import os
import subprocess
import tempfile
import time
from pathlib import Path
from typing import Any, Dict, List, Optional


class FoundryRunner:
    FORGE_STD_STUB = '''// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;
interface Vm {
    function createSelectFork(string calldata) external returns (uint256);
    function prank(address) external;
    function startPrank(address) external;
    function stopPrank() external;
    function mockCall(address, bytes calldata, bytes calldata) external;
    function deal(address, uint256) external;
    function warp(uint256) external;
    function roll(uint256) external;
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
'''

    def __init__(self, forge_path: str = "forge"):
        self.forge_path = forge_path

    def run_poc(self, poc_code: str, fork_url: str = "") -> Dict[str, Any]:
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = Path(tmpdir)
            test_dir = tmp_path / "test"
            test_dir.mkdir(parents=True)
            lib_dir = tmp_path / "lib" / "forge-std" / "src"
            lib_dir.mkdir(parents=True)
            (lib_dir / "Test.sol").write_text(self.FORGE_STD_STUB, encoding="utf-8")

            poc_file = test_dir / "PoC.t.sol"
            poc_file.write_text(poc_code, encoding="utf-8")

            (tmp_path / "foundry.toml").write_text("[profile.default]\nsrc = 'test'\nlibs = ['lib']\n")
            (tmp_path / "remappings.txt").write_text("forge-std/=lib/forge-std/src/\n")

            cmd = [self.forge_path, "build", "--root", str(tmp_path)]
            build = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            if build.returncode != 0:
                return {"success": False, "stage": "build", "output": build.stdout + build.stderr}

            test_cmd = [self.forge_path, "test", "--root", str(tmp_path),
                        "--match-test", "testExploit", "-vvv"]
            if fork_url:
                test_cmd += ["--fork-url", fork_url]

            try:
                result = subprocess.run(test_cmd, capture_output=True, text=True, timeout=120,
                                        cwd=str(tmp_path))
                stdout = result.stdout
                test_passed = "[PASS]" in stdout and "testExploit" in stdout
                return {"success": test_passed, "stage": "test",
                        "output": stdout + result.stderr,
                        "passed": test_passed}
            except subprocess.TimeoutExpired:
                return {"success": False, "stage": "test", "output": "Timed out (120s)"}

    def compile_and_validate(self, source_code: str) -> Dict[str, Any]:
        return self.run_poc(source_code)

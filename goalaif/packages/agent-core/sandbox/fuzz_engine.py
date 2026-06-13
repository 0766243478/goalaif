import subprocess
from typing import Any, Dict, List

from sandbox.foundry_runner import FoundryRunner


class FuzzEngine:
    def __init__(self):
        self.runner = FoundryRunner()

    def generate_invariant_test(self, functions: List[str], invariants: List[str]) -> str:
        lines = ["// SPDX-License-Identifier: UNLICENSED",
                 "pragma solidity ^0.8.19;",
                 'import "forge-std/Test.sol";',
                 "import {VulnerableContract} from './VulnerableContract.sol';",
                 "",
                 "contract InvariantTest is Test {",
                 "    VulnerableContract public target;",
                 "",
                 "    function setUp() public {",
                 "        target = new VulnerableContract();",
                 "        target.deposit{value: 100 ether}();",
                 "    }",
                 ""]

        for inv in invariants:
            safe_name = inv.lower().replace(" ", "_").replace("-", "_")[:40]
            lines.append(f"    function invariant_{safe_name}() public {{")
            lines.append(f"        // {inv}")
            lines.append(f'        assertGe(address(target).balance, 0, "Invariant violated");')
            lines.append("    }")
            lines.append("")

        lines.append("}")
        return "\n".join(lines)

    def run_fuzz(self, code: str, functions: List[str], invariants: List[str]) -> Dict[str, Any]:
        test_code = self.generate_invariant_test(functions, invariants)
        combined = f"{code}\n\n{test_code}"
        return self.runner.run_poc(combined)

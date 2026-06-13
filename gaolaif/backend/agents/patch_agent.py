from dataclasses import dataclass
from typing import Any


@dataclass
class Patch:
    id: str
    strategy: str
    code_diff: str
    why_best: str
    finding_id: str = ""


class PatchAgent:
    """Generates fix recommendations for discovered vulnerabilities."""

    PATCH_STRATEGIES = {
        "REENTRANCY": {
            "strategy": "Apply checks-effects-interactions pattern. Move all state updates before external calls.",
            "diff": """+    // CEI: update state before external call
+    balances[msg.sender] -= amount;
+    totalSupply -= amount;
+
-    (bool ok, ) = msg.sender.call{value: amount}("");
-    require(ok, "transfer failed");
-
-    balances[msg.sender] -= amount;
-    totalSupply -= amount;
+    (bool ok, ) = msg.sender.call{value: amount}("");
+    require(ok, "transfer failed");""",
            "why": "Prevents reentrancy by ensuring state reflects the withdrawal before the external call executes. Even if the attacker re-enters, the balance is already deducted.",
        },
        "TX_ORIGIN": {
            "strategy": "Replace tx.origin with msg.sender for authentication.",
            "diff": """-    require(tx.origin == owner);
+    require(msg.sender == owner);""",
            "why": "msg.sender is the direct caller, while tx.origin can be anyone in the call chain. Using tx.origin opens a phishing vector where an intermediate contract can impersonate the user.",
        },
        "DELEGATECALL": {
            "strategy": "Validate delegatecall target against a whitelist.",
            "diff": """+    address implementation = implementations[targetSelector];
+    require(implementation != address(0), "unknown selector");
+    (bool ok, bytes memory res) = implementation.delegatecall(data);
-    (bool ok, bytes memory res) = target.delegatecall(data);""",
            "why": "Whitelisting ensures only pre-approved implementations can be delegatecalled. Without this, any address can execute arbitrary code in the proxy's storage context.",
        },
    }

    DEFAULT_STRATEGY = {
        "strategy": "Add input validation and access controls. Follow the principle of least privilege.",
        "diff": """+    require(msg.sender == authorized[functionSelector], "unauthorized");
+    require(_input <= maxValue, "input out of bounds");""",
        "why": "Input validation prevents unexpected values from reaching sensitive operations. Access controls ensure only authorized parties can trigger critical functions.",
    }

    def generate_patches(self, findings: list) -> list[Patch]:
        patches = []
        for finding in findings:
            strategy = self.PATCH_STRATEGIES.get(finding.id, self.DEFAULT_STRATEGY)
            patch = Patch(
                id=f"patch-{finding.id}",
                strategy=strategy["strategy"],
                code_diff=strategy["diff"],
                why_best=strategy["why"],
                finding_id=finding.id,
            )
            patches.append(patch)
        return patches

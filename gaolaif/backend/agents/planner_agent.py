import re
from typing import Any


class PlannerAgent:
    """Analyzes contract structure and creates an audit plan."""

    def plan(self, source_code: str) -> dict[str, Any]:
        plan = {
            "functions": [],
            "external_calls": [],
            "state_variables": [],
            "suspicious_patterns": [],
            "risk_score": 0,
        }

        func_pattern = r"function\s+(\w+)\s*\(([^)]*)\)\s*(public|external|internal|private)?\s*(view|pure|payable)?"
        for match in re.finditer(func_pattern, source_code):
            plan["functions"].append({
                "name": match.group(1),
                "params": match.group(2),
                "visibility": match.group(3) or "internal",
                "modifier": match.group(4) or "",
            })

        ext_call_pattern = r"\.(call|delegatecall|staticcall)\s*\{"
        plan["external_calls"] = re.findall(ext_call_pattern, source_code)

        state_pattern = r"(uint256|address|mapping|bool|uint|int|bytes32)\s+(public|internal|private)?\s*(\w+)"
        for match in re.finditer(state_pattern, source_code):
            plan["state_variables"].append({
                "type": match.group(1),
                "visibility": match.group(2) or "default",
                "name": match.group(3),
            })

        risk = 0
        if "delegatecall" in source_code:
            risk += 30
            plan["suspicious_patterns"].append("delegatecall detected")
        if "tx.origin" in source_code:
            risk += 20
            plan["suspicious_patterns"].append("tx.origin detected")
        if ".call{value" in source_code or ".call.value" in source_code:
            risk += 25
            plan["suspicious_patterns"].append("raw ETH call detected")
        if "selfdestruct" in source_code or "selfdestruct" in source_code:
            risk += 30
            plan["suspicious_patterns"].append("selfdestruct detected")
        if re.search(r"for\s*\([^)]+\)\s*\{[^}]*\.call", source_code) or re.search(r"\.call\s*\([^)]*\)", source_code):
            risk += 15
            if "reentrancy" not in plan["suspicious_patterns"]:
                plan["suspicious_patterns"].append("potential reentrancy (CEI pattern violation)")

        plan["risk_score"] = min(risk, 100)
        return plan

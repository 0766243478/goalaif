import re
from dataclasses import dataclass, field
from typing import Any


@dataclass
class Finding:
    id: str
    title: str
    description: str
    severity: str
    line_number: int = 0
    affected_function: str = ""
    contract_name: str = ""
    category: str = ""
    attack_vector: str = ""


class AuditAgent:
    """Static analysis agent that finds vulnerabilities in Solidity/Move code."""

    RULES = [
        {
            "id": "REENTRANCY",
            "title": "Reentrancy Vulnerability",
            "severity": "CRITICAL",
            "category": "access-control",
            "pattern": r"\.call\s*\{[^}]*value[^}]*\}",
            "description": "External call with value transfer. State updates after external calls can lead to reentrancy.",
            "attack_vector": "reentrancy",
        },
        {
            "id": "TX_ORIGIN",
            "title": "Tx.Origin Authentication",
            "severity": "HIGH",
            "category": "access-control",
            "pattern": r"\btx\.origin\b",
            "description": "tx.origin is used for authentication. This can be exploited via phishing attacks.",
            "attack_vector": "tx.origin phishing",
        },
        {
            "id": "UNCHECKED_MATH",
            "title": "Unchecked Arithmetic",
            "severity": "MEDIUM",
            "category": "arithmetic",
            "pattern": r"(?:^|[^a-zA-Z])(?:-\s*[a-zA-Z_]\w*\s*-\s*|[\+\-\*\/]\s*[a-zA-Z_]\w*\s*[\+\-\*\/])",
            "description": "Unchecked arithmetic operations may overflow/underflow in Solidity <0.8.",
            "attack_vector": "integer overflow",
        },
        {
            "id": "DELEGATECALL",
            "title": "Delegatecall to Untrusted Contract",
            "severity": "CRITICAL",
            "category": "access-control",
            "pattern": r"\.delegatecall\b",
            "description": "Delegatecall executes code in the caller's context. If the target is untrusted, storage can be manipulated.",
            "attack_vector": "delegatecall injection",
        },
        {
            "id": "SELFDESTRUCT",
            "title": "Selfdestruct Usable",
            "severity": "HIGH",
            "category": "access-control",
            "pattern": r"\bselfdestruct\b",
            "description": "selfdestruct allows contract destruction. If callable by anyone, funds can be locked or contract destroyed.",
            "attack_vector": "forced destruction",
        },
        {
            "id": "TIMESTAMP_DEP",
            "title": "Block Timestamp Dependency",
            "severity": "MEDIUM",
            "category": "consensus",
            "pattern": r"\bblock\.timestamp\b",
            "description": "block.timestamp can be manipulated by miners within a ~15s window.",
            "attack_vector": "timestamp manipulation",
        },
        {
            "id": "UNINITIALIZED_STORAGE",
            "title": "Uninitialized Storage Pointer",
            "severity": "HIGH",
            "category": "storage",
            "pattern": r"struct\s+\w+\s+(public|internal|private)?\s*[a-z]",
            "description": "Uninitialized storage pointers can overwrite random storage slots.",
            "attack_vector": "storage collision",
        },
    ]

    def audit(self, source_code: str) -> list[Finding]:
        findings = []
        lines = source_code.split("\n")

        for rule in self.RULES:
            for i, line in enumerate(lines):
                if re.search(rule["pattern"], line):
                    fn_match = re.search(r"function\s+(\w+)", line)
                    fn_name = fn_match.group(1) if fn_match else ""

                    finding = Finding(
                        id=rule["id"],
                        title=rule["title"],
                        description=rule["description"],
                        severity=rule["severity"],
                        line_number=i + 1,
                        affected_function=fn_name,
                        category=rule["category"],
                        attack_vector=rule.get("attack_vector", ""),
                    )
                    findings.append(finding)

        return findings

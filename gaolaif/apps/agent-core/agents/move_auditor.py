# ──────────────────────────────────────────────
# MoveAuditor — Move-Specific Vulnerability Detection
# ──────────────────────────────────────────────
# Detects Move-specific vulnerability patterns:
#   - Phantom type misuse
#   - Capability leakage
#   - Resource underflow in Move's resource model
#   - Missing acquires annotations
#   - Unprotected public entry functions
# ──────────────────────────────────────────────

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional

from .base_agent import Finding, Severity, Confidence


@dataclass
class MoveSourceUnit:
    """Parsed Move source unit."""
    module_name: str
    structs: List[dict]
    functions: List[dict]
    uses_sui_framework: bool = False
    uses_aptos_framework: bool = False


class MoveAuditor:
    """Static analysis for Move smart contracts (Sui/Aptos)."""

    # Move vulnerability patterns
    PATTERNS = {
        "phantom_type_misuse": {
            "pattern": re.compile(r'phantom\s+\w+\s*:\s*(?:address|vector|bool|u8|u64|u128)\s*='),
            "severity": Severity.HIGH,
            "category": "type-safety",
            "description": "Phantom type parameter used in non-resource context — may bypass type safety guarantees",
        },
        "missing_acquires": {
            "pattern": re.compile(r'public\s+(entry\s+)?fun\s+\w+[^{]*?(?!acquires)[^{]*\{'),
            "severity": Severity.MEDIUM,
            "category": "access-control",
            "description": "Public function that does not declare 'acquires' — may not properly track resource access",
        },
        "unprotected_entry": {
            "pattern": re.compile(r'public\s+entry\s+fun\s+\w+\s*\([^)]*signer[^)]*\)'),
            "severity": Severity.LOW,
            "category": "access-control",
            "description": "Public entry function accessible to any signer — verify authorization",
        },
        "capability_leak": {
            "pattern": re.compile(r'public\s+fun\s+\w+\s*\([^)]*&\s*(?:mut\s+)?(?:Coin|Token|Cap|Capability)[^)]*\)'),
            "severity": Severity.CRITICAL,
            "category": "access-control",
            "description": "Public function exposes capability objects — may allow unauthorized transfer of resources",
        },
        "resource_abandon": {
            "pattern": re.compile(r'let\s+_\s*=\s*(?:move_from|borrow_mut|take)\s*<'),
            "severity": Severity.HIGH,
            "category": "resource-management",
            "description": "Resource extracted but not used — potential resource leak or abandon",
        },
    }

    # Sui-specific patterns
    SUI_PATTERNS = {
        "sui_clock_misuse": {
            "pattern": re.compile(r'Clock\s*(?!.*immutable)'),
            "severity": Severity.MEDIUM,
            "category": "oracle",
            "description": "Clock object used without immutable reference — may lead to timestamp manipulation",
        },
        "sui_tx_context_misuse": {
            "pattern": re.compile(r'TxContext\s+(?!.*&)'),
            "severity": Severity.MEDIUM,
            "category": "logic",
            "description": "TxContext passed by value instead of reference — should be immutable reference",
        },
    }

    # Aptos-specific patterns
    APTOS_PATTERNS = {
        "aptos_signer_check": {
            "pattern": re.compile(r'public\s+entry\s+fun\s+\w+\s*\([^)]*signer\s*&[^)]*\)\s*\{[^}]*?(?!assert|abort|requires)'),
            "severity": Severity.MEDIUM,
            "category": "access-control",
            "description": "Entry function with signer reference but no authorization check",
        },
    }

    def __init__(self, chain: str = "sui"):
        self.chain = chain
        self._merge_patterns()

    def _merge_patterns(self):
        """Merge chain-specific patterns."""
        if self.chain == "sui":
            self.PATTERNS.update(self.SUI_PATTERNS)
        elif self.chain == "aptos":
            self.PATTERNS.update(self.APTOS_PATTERNS)

    def analyze(self, contract_path: str) -> List[Finding]:
        """Analyze a Move source file for vulnerabilities."""
        path = Path(contract_path)
        if not path.exists():
            raise FileNotFoundError(f"Move contract not found: {contract_path}")

        source = path.read_text()
        findings: List[Finding] = []
        lines = source.split('\n')

        # Detect framework
        uses_sui = 'use sui::' in source or '0x2::' in source
        uses_aptos = 'use aptos_std::' in source or '0x1::' in source

        # Update patterns based on detected framework
        if uses_sui:
            self.PATTERNS.update(self.SUI_PATTERNS)
        if uses_aptos:
            self.PATTERNS.update(self.APTOS_PATTERNS)

        for name, config in self.PATTERNS.items():
            for match in config["pattern"].finditer(source):
                # Find line number
                line_num = source[:match.start()].count('\n') + 1
                context_start = max(0, line_num - 2)
                context_lines = lines[context_start:line_num + 1]

                findings.append(Finding(
                    title=f"[Move] {name.replace('_', ' ').title()}",
                    description=config["description"],
                    severity=config["severity"],
                    category=config["category"],
                    location=f"{contract_path}:{line_num}",
                    code_snippet='\n'.join(context_lines),
                    confidence=Confidence.UNCONFIRMED,
                    static_tool="move-auditor",
                ))

        return findings

    @staticmethod
    def parse_module(source: str) -> Optional[MoveSourceUnit]:
        """Parse a Move module header."""
        module_match = re.search(r'module\s+(\w+::)?(\w+)', source)
        if not module_match:
            return None

        structs = []
        for s in re.finditer(r'struct\s+(\w+)\s*{[^}]*}', source):
            structs.append({
                "name": s.group(1),
                "body": s.group(0),
            })

        functions = []
        for f in re.finditer(r'(?:public\s+(entry\s+)?)?fun\s+(\w+)\s*\([^)]*\)', source):
            functions.append({
                "name": f.group(2),
                "visibility": "public" if f.group(0).startswith("public") else "private",
                "signature": f.group(0),
            })

        return MoveSourceUnit(
            module_name=module_match.group(2),
            structs=structs,
            functions=functions,
            uses_sui_framework='use sui::' in source or '0x2::' in source,
            uses_aptos_framework='use aptos_std::' in source or '0x1::' in source,
        )

    @staticmethod
    def merge_with_evm_findings(move_findings: List[Finding], evm_findings: List[Finding]) -> List[Finding]:
        """Merge Move-specific findings with EVM findings into unified schema."""
        seen = set()
        merged = []

        for f in move_findings + evm_findings:
            key = (f.title, f.location)
            if key not in seen:
                seen.add(key)
                merged.append(f)

        severity_order = {Severity.CRITICAL: 0, Severity.HIGH: 1, Severity.MEDIUM: 2, Severity.LOW: 3, Severity.INFO: 4}
        merged.sort(key=lambda f: severity_order.get(f.severity, 99))
        return merged

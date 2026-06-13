import re
from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class FirewallDecision:
    allowed: bool
    reason: str
    sanitized_content: Optional[str] = None
    risk_score: float = 0.0
    blocked_patterns: List[str] = field(default_factory=list)


class DLPGuard:
    """Layered DLP detection — syntax, credentials, file paths."""

    # Layer 1: Solidity structural patterns (not just keywords)
    SOLIDITY_PATTERNS = [
        r'\bfunction\s+\w+\s*\([^)]*\)\s*(public|private|internal|external)',
        r'\bmapping\s*\(\s*\w+\s*=>\s*\w+\s*\)',
        r'\brequire\s*\([^)]+\)',
        r'\bemit\s+\w+\s*\(',
        r'\bmodifier\s+\w+',
        r'IERC20|IERC721|SafeERC20|Address\.sendValue',
        r'\binterface\s+\w+\s*\{',
        r'\bcontract\s+\w+\s+is\s+\w+',
        r'\blibrary\s+\w+',
        r'\busing\s+\w+\s+for\b',
    ]

    # Layer 2: Move structural patterns
    MOVE_PATTERNS = [
        r'\bpublic\s+fun\s+\w+',
        r'\bstruct\s+\w+\s+has\s+(copy|drop|store|key)',
        r'\bacquires\s+\w+',
        r'&\s*mut\s+\w+::\w+',
        r'\bmodule\s+\w+::\w+\s*\{',
        r'\bfun\s+\w+\s*\([^)]*\)\s*:\s*\w+',
        r'\bentry\s+fun\s+\w+',
    ]

    # Layer 3: Secret / credential patterns (always block)
    SECRET_PATTERNS = [
        r'(?i)(private[_\s]?key|secret[_\s]?key|api[_\s]?key|mnemonic|seed[_\s]?phrase)\s*[=:]\s*["\']?[A-Za-z0-9+/]{20,}',
        r'0x[a-fA-F0-9]{64}',  # private key hex
        r'(?i)(INFURA|ALCHEMY|PROVIDER|RPC)[_\s]?(URL|KEY|ENDPOINT)\s*=\s*["\']?https?://',
    ]

    # Layer 4: File path patterns (leaks project structure)
    PATH_PATTERNS = [
        r'/home/\w+/[^\s]+\.(sol|move|ts|py|rs|js)',
        r'(?:contracts|src|lib|test)/[^\s]+\.(sol|move)',
        r'file:///[A-Za-z]:\\(?:Users|Documents|Projects)[^\s]*',
    ]

    def inspect(self, content: str) -> FirewallDecision:
        """Layered inspection. Returns FirewallDecision."""
        blocked_patterns: List[str] = []
        risk_score = 0.0
        sanitized = content

        layers = [
            (self.SOLIDITY_PATTERNS, "solidity_syntax", 0.5),
            (self.MOVE_PATTERNS, "move_syntax", 0.5),
            (self.SECRET_PATTERNS, "credentials", 1.0),
            (self.PATH_PATTERNS, "file_paths", 0.3),
        ]

        for pattern_list, label, weight in layers:
            for pattern in pattern_list:
                if re.search(pattern, content):
                    risk_score = min(1.0, risk_score + weight)
                    blocked_patterns.append(f"{label}:{pattern[:50]}")
                    if weight >= 1.0:
                        sanitized = re.sub(pattern, '[REDACTED]', sanitized)

        allowed = risk_score < 0.5
        return FirewallDecision(
            allowed=allowed,
            reason="Content appears safe" if allowed else self._build_reason(blocked_patterns),
            sanitized_content=sanitized if allowed else self._redact(content, blocked_patterns),
            risk_score=risk_score,
            blocked_patterns=blocked_patterns,
        )

    def _redact(self, content: str, patterns: List[str]) -> str:
        """Replace detected code fragments with [REDACTED] placeholders."""
        redacted = content
        for pattern_str in patterns:
            label, _, pat = pattern_str.partition(':')
            if pat:
                try:
                    redacted = re.sub(pat, '[REDACTED]', redacted)
                except re.error:
                    pass
        return redacted

    @staticmethod
    def _build_reason(patterns: List[str]) -> str:
        summary = "; ".join(p.split(':')[0] for p in patterns[:3])
        return f"BLOCKED (risk factors: {summary})"

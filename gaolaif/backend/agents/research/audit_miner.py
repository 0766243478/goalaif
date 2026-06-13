import hashlib
from typing import Any


class AuditMiner:
    """Local pattern-based audit knowledge base — no external API calls."""

    PATTERNS = [
        {
            "pattern_hash": "reentrancy_raw_eth",
            "indicators": [".call{value", ".call.value", "msg.sender.call"],
            "title": "Reentrancy via Raw ETH Transfer",
            "severity": "CRITICAL",
            "description": "Raw ETH transfer followed by state change enables reentrancy. Ensure all state changes happen before the external call."
        },
        {
            "pattern_hash": "oracle_price_stale",
            "indicators": ["latestRoundData", "updatedAt", "AggregatorV3Interface"],
            "title": "Stale Oracle Price",
            "severity": "HIGH",
            "description": "Oracle price freshness is not checked. Always verify that updatedAt is within an acceptable threshold of block.timestamp."
        },
        {
            "pattern_hash": "flash_loan_attack",
            "indicators": ["flashLoan", "flashloan", "flash_loan", "getReserve"],
            "title": "Flash Loan Attack Surface",
            "severity": "MEDIUM",
            "description": "Protocol uses oracle prices that can be manipulated via flash loans. Consider using TWAP or multiple oracle sources."
        },
        {
            "pattern_hash": "access_control_missing",
            "indicators": ["onlyOwner", "Ownable", "accessControl", "AccessControl"],
            "title": "Access Control Check",
            "severity": "LOW",
            "description": "Verify all administrative functions have appropriate access control modifiers."
        },
    ]

    def search_similar(self, code_snippet: str) -> list[dict]:
        results = []
        code_lower = code_snippet.lower()

        for pattern in self.PATTERNS:
            score = 0
            for indicator in pattern["indicators"]:
                if indicator.lower() in code_lower:
                    score += 1

            if score > 0:
                confidence = min(score / len(pattern["indicators"]), 1.0)
                results.append({
                    "warning": f"Similar to past finding: {pattern['title']}",
                    "suggestion": pattern["description"],
                    "confidence": round(confidence, 2),
                    "severity": pattern["severity"],
                })

        return sorted(results, key=lambda x: x["confidence"], reverse=True)

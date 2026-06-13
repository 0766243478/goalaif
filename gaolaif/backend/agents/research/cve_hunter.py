import re
from typing import Optional


class CVEHunter:
    """Searches for known CVEs relevant to the code being audited."""

    CVE_DATABASE = [
        {
            "cve": "CVE-2022-21449",
            "title": "Signature Replay in ECDSA",
            "pattern": r"\becrecover\b",
            "severity": "HIGH",
            "description": "Using ecrecover without signature replay protection can lead to signature replay attacks across chains or nonces.",
        },
        {
            "cve": "CVE-2021-39137",
            "title": "ERC-777 Reentrancy (Uniswap/LendfMe)",
            "pattern": r"\.call\s*\{[^}]*value[^}]*\}",
            "severity": "CRITICAL",
            "description": "Token contracts with callbacks (ERC-777) enable reentrancy when combined with raw ETH transfers.",
        },
        {
            "cve": "CVE-2023-27536",
            "title": "GPT/LLM Generated Smart Contract Vulnerabilities",
            "pattern": r"(?:chatgpt|gpt|llm)\s+generat",
            "severity": "MEDIUM",
            "description": "AI-generated contracts often contain typical vulnerabilities like missing access controls and unchecked arithmetic.",
        },
    ]

    def search(self, code_snippet: str) -> list[dict]:
        matches = []
        for cve in self.CVE_DATABASE:
            if re.search(cve["pattern"], code_snippet, re.IGNORECASE):
                matches.append({
                    "cve": cve["cve"],
                    "title": cve["title"],
                    "severity": cve["severity"],
                    "description": cve["description"],
                })
        return matches

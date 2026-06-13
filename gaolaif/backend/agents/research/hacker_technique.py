class HackerTechnique:
    """Local technique matching for exploit ideas — no external API."""

    TECHNIQUES = [
        {
            "id": "reentrancy_loop",
            "name": "Reentrancy Drain Loop",
            "keywords": ["reentranc", "loop", "drain", "callback", "withdraw loop"],
            "description": "Repeatedly call back into the victim contract via fallback before state is updated. Each recursive call withdraws more funds.",
            "complexity": "medium",
        },
        {
            "id": "flash_loan_oracle",
            "name": "Flash Loan Oracle Manipulation",
            "keywords": ["flash", "oracle", "price", "manipul", "liquidation"],
            "description": "Borrow large amounts via flash loan to manipulate pool reserves, then trigger a liquidation or arbitrage at the distorted price.",
            "complexity": "high",
        },
        {
            "id": "access_control_privesc",
            "name": "Access Control Privilege Escalation",
            "keywords": ["owner", "admin", "privesc", "privilege", "onlyowner"],
            "description": "Find unguarded setters or initialize functions that can be called by anyone to escalate privileges.",
            "complexity": "low",
        },
        {
            "id": "sandwich_attack",
            "name": "Sandwich Attack",
            "keywords": ["sandwich", "mempool", "frontrun", "slippage", "swap"],
            "description": "Front-run a user's swap by buying before and selling after, extracting value from the price impact.",
            "complexity": "medium",
        },
        {
            "id": "storage_collision",
            "name": "Storage Collision Proxy",
            "keywords": ["storage", "slot", "collision", "overwrite", "proxy"],
            "description": "Delegatecall-based proxies share storage. A new implementation can write to critical slots from the previous version.",
            "complexity": "high",
        },
    ]

    def suggest_techniques(self, idea: str) -> list[dict]:
        idea_lower = idea.lower()
        suggestions = []

        for technique in self.TECHNIQUES:
            matches = sum(1 for kw in technique["keywords"] if kw in idea_lower)
            if matches > 0:
                suggestions.append({
                    "technique": technique["name"],
                    "description": technique["description"],
                    "complexity": technique["complexity"],
                    "relevance": matches,
                })

        return sorted(suggestions, key=lambda x: x["relevance"], reverse=True)

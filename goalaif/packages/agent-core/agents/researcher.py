import httpx
from typing import Any, Dict, List, Optional

from models.ollama_client import call_ollama


class ResearchSwarm:
    def search(self, query: str, max_results: int = 5) -> List[Dict]:
        try:
            url = "https://api.duckduckgo.com/"
            resp = httpx.get(url, params={"q": query, "format": "json", "no_html": 1}, timeout=10)
            topics = resp.json().get("RelatedTopics", [])
            return topics[:max_results]
        except Exception:
            return []

    def research(self, surfaces: List[str], gaps: List[str]) -> List[Dict]:
        results = []
        for surface in surfaces[:3]:
            for gap in gaps[:3]:
                q = f"smart contract vulnerability {surface} {gap}"
                for r in self.search(q):
                    results.append({"source": "web", "surface": surface, "text": r.get("Text", "")[:500],
                                    "url": r.get("FirstURL", "")})
        return results

import httpx
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class ResearchFinding:
    source_url: str
    title: str
    relevance_score: float
    claims: List[str] = field(default_factory=list)
    techniques: List[str] = field(default_factory=list)
    confidence: float = 0.0
    verified: bool = False


class BaseResearchAgent:
    """All research agents inherit from this. Uses DuckDuckGo instant answer API."""

    def search(self, query: str, max_results: int = 10) -> List[Dict[str, Any]]:
        try:
            url = "https://api.duckduckgo.com/"
            params = {"q": query, "format": "json", "no_html": 1, "skip_disambig": 1}
            response = httpx.get(url, params=params, timeout=10)
            topics = response.json().get("RelatedTopics", [])
            return topics[:max_results]
        except Exception:
            return []

    def fetch_page(self, url: str) -> str:
        try:
            response = httpx.get(url, timeout=15, follow_redirects=True)
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(response.text, "html.parser")
            return soup.get_text(separator=" ", strip=True)[:5000]
        except Exception:
            return ""

    SECURITY_NOUNS = {
        "vulnerability", "exploit", "attack", "reentrancy", "overflow",
        "drain", "bypass", "unauthorized", "manipulation", "deadlock",
    }

    TECHNIQUE_KEYWORDS = [
        "reentrancy", "flash loan", "price manipulation", "sandwich",
        "front-run", "access control", "integer overflow", "queue block",
        "FIFO", "denial of service", "storage collision", "delegatecall",
    ]

    def _extract_claims(self, text: str) -> List[str]:
        sentences = text.split(". ")
        return [
            s.strip() for s in sentences
            if any(n in s.lower() for n in self.SECURITY_NOUNS)
        ]

    def _extract_techniques(self, text: str) -> List[str]:
        return [kw for kw in self.TECHNIQUE_KEYWORDS if kw.lower() in text.lower()]

    def _score_relevance(self, text: str, surface: str) -> float:
        surface_words = set(surface.lower().split())
        text_words = set(text.lower().split())
        overlap = surface_words & text_words
        return min(1.0, len(overlap) / max(len(surface_words), 1))

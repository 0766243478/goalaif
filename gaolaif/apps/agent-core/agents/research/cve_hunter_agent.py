from typing import Dict, List, Optional
from .base_research_agent import BaseResearchAgent, ResearchFinding


class CVEHunterAgent(BaseResearchAgent):
    def run(self, manifest) -> List[ResearchFinding]:
        findings: List[ResearchFinding] = []
        for surface in getattr(manifest, "attack_surface_map", ["general"]):
            for gap in getattr(manifest, "knowledge_gaps", [""]):
                query = f"smart contract vulnerability {surface} {gap} CVE"
                results = self.search(query, max_results=5)
                for r in results:
                    finding = self._parse_result(r, surface)
                    if finding:
                        findings.append(finding)
        return findings

    def _parse_result(self, raw: Dict, surface: str) -> Optional[ResearchFinding]:
        text = raw.get("Text", "") or raw.get("FirstURL", "")
        if len(text) < 50:
            return None
        return ResearchFinding(
            source_url=raw.get("FirstURL", ""),
            title=raw.get("Text", "")[:100],
            relevance_score=self._score_relevance(text, surface),
            claims=self._extract_claims(text),
            techniques=self._extract_techniques(text),
            confidence=0.0,
            verified=False,
        )

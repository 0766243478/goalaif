COLLECTION = "protocol_patterns"


class ProtocolMemory:
    def _get_qdrant(self):
        from .qdrant_client import upsert, search
        return upsert, search

    def save_fix(self, finding, patch):
        upsert, _ = self._get_qdrant()
        text = f"""
SECURITY PATTERN
Vulnerability: {finding.title}
Description: {finding.description}
Root cause: {finding.attack_vector}
Fix strategy: {patch.strategy}
Why this fix works: {patch.why_best}
"""
        upsert(COLLECTION, text, {
            "type": "vulnerability_fix",
            "severity": finding.severity,
            "strategy": patch.strategy,
        })

    def search_similar(self, code_snippet: str) -> list[dict]:
        _, search = self._get_qdrant()
        try:
            results = search(COLLECTION, code_snippet, top_k=3)
        except Exception as e:
            return [{"warning": f"Memory search unavailable: {e}", "suggestion": "", "confidence": 0.0}]
        return [
            {
                "warning": f"Similar to past finding: {r.get('type', '')}",
                "suggestion": r.get("text", ""),
                "confidence": round(r["score"], 2),
                "degraded": r.get("degraded", False),
            }
            for r in results if r["score"] > 0.70
        ]

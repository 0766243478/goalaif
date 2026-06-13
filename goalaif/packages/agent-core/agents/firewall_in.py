from typing import Any, Dict, List, Optional

from models.ollama_client import call_ollama


class InboundFirewall:
    def verify_findings(self, findings: List[Dict], code_snippet: str) -> List[Dict]:
        verified = []
        for f in findings:
            title = f.get("title", "")
            desc = f.get("description", "")
            v1 = self._check_relevance(desc, code_snippet)
            v2 = self._check_plausibility(desc)
            if v1 and v2:
                f["verified"] = True
                f["confidence"] = 0.8 if (v1 and v2) else 0.3
                verified.append(f)
        return verified

    def _check_relevance(self, claim: str, code: str) -> bool:
        prompt = f"""Is this security claim relevant to the smart contract code below?
Answer ONLY: YES or NO

Claim: {claim}

Code excerpt:
{code[:1500]}"""
        try:
            resp = call_ollama(prompt)
            return resp is not None and resp.strip().upper().startswith("YES")
        except Exception:
            return True

    def _check_plausibility(self, claim: str) -> bool:
        prompt = f"""Is this security claim about smart contracts factually plausible?
Check for contradictions or impossibilities.
Answer ONLY: YES or NO

Claim: {claim}"""
        try:
            resp = call_ollama(prompt)
            return resp is not None and resp.strip().upper().startswith("YES")
        except Exception:
            return True

import json
import uuid
from typing import Any, Dict, List, Optional

from models.ollama_client import call_ollama_deep


class PoCGenerator:
    def generate(self, code: str, hypothesis: str, similar: Optional[List[Dict]] = None) -> Dict[str, Any]:
        similar_text = ""
        if similar:
            similar_text = "Similar patterns found:\n" + "\n".join(
                [s.get("text", s.get("description", ""))[:300] for s in similar[:3]])

        prompt = f"""You are an elite smart contract exploit engineer.
Write a complete, working Foundry PoC.

Target code:
{code[:3000]}

Hacker hypothesis: {hypothesis}

{similar_text}

Requirements:
- Contract must inherit Test (forge-std)
- Use vm.createSelectFork() to fork mainnet state
- Function must be named testExploit()
- Add assertGt() or assertEq() proving value was extracted
- NEVER use vm.mockCall() on critical value paths
- Add console.log for balance before/after
- Return ONLY valid Solidity code

Solidity PoC:"""
        raw = call_ollama_deep(prompt)
        poc_code = ""
        analysis = ""
        if raw:
            if "```solidity" in raw:
                poc_code = raw.split("```solidity")[1].split("```")[0].strip()
            elif "```" in raw:
                poc_code = raw.split("```")[1].split("```")[0].strip()
            else:
                poc_code = raw.strip()

            analysis_prompt = f"""Analyze this PoC and describe what it proves:

{poc_code[:2000]}

Provide: attack_vector, estimated_impact, confidence (0.0-1.0) as JSON."""
            analysis_raw = call_ollama_deep(analysis_prompt)
            if analysis_raw:
                try:
                    analysis_data = json.loads(analysis_raw.strip())
                    analysis = analysis_data
                except Exception:
                    analysis = {"attack_vector": hypothesis, "estimated_impact": "unknown", "confidence": 0.5}

        return {"id": uuid.uuid4().hex[:8], "code": poc_code, "analysis": analysis or {},
                "hypothesis": hypothesis, "similar_count": len(similar or [])}

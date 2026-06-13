import json
import re
from typing import Any, Dict, List, Optional

from models.ollama_client import call_ollama_deep, call_ollama


class PlannerAgent:
    def run(self, code: str) -> Dict[str, Any]:
        prompt = f"""You are a senior smart contract security architect.
Analyze this contract and identify all possible attack surfaces.

CODE:
{code[:4000]}

Return JSON:
{{"surfaces": ["list of attack surfaces in plain English"],
  "protocol_type": "liquid_staking|amm|lending|bridge|governance|yield|other",
  "chain": "evm|move",
  "key_functions": ["list of critical function names"],
  "invariants": ["list of invariants to verify"]}}"""
        raw = call_ollama_deep(prompt)
        if raw is None:
            return {"surfaces": ["generic"], "protocol_type": "other", "chain": "evm",
                    "key_functions": [], "invariants": []}
        try:
            cleaned = raw.strip()
            if cleaned.startswith("```json"): cleaned = cleaned[7:]
            if cleaned.startswith("```"): cleaned = cleaned[3:]
            if cleaned.endswith("```"): cleaned = cleaned[:-3]
            return json.loads(cleaned.strip())
        except Exception:
            return {"surfaces": ["parsing error"], "protocol_type": "other", "chain": "evm",
                    "key_functions": [], "invariants": []}

    def run_triad(self, code: str) -> List[Dict[str, Any]]:
        economic = self._run_agent("economic_auditor", code)
        critic = self._run_agent("code_critic", code)
        formal = self._run_agent("formal_verifier", code)
        findings = []
        for e in (economic or []):
            findings.append({**e, "agent": "economic_auditor"})
        for c in (critic or []):
            findings.append({**c, "agent": "code_critic"})
        for f in (formal or []):
            findings.append({**f, "agent": "formal_verifier"})
        return findings

    def _run_agent(self, agent: str, code: str) -> Optional[List[Dict]]:
        prompts = {
            "economic_auditor": f"""You are an economic security auditor for DeFi protocols.
Trace every possible path where an attacker can extract value.
Focus on: Flash loans, price manipulation, sandwich attacks, liquidity drain.

CODE:
{code[:4000]}

Output JSON array:
[{{"title": "...", "description": "...", "severity": "Critical|High|Medium|Low", "attack_vector": "...", "probability": 0.0-1.0}}]""",

            "code_critic": f"""You are a Solidity security researcher.
Review the code for logic errors, reentrancy, integer overflow/underflow,
access control failures, and state inconsistencies.

CODE:
{code[:4000]}

Output JSON array:
[{{"title": "...", "description": "...", "severity": "Critical|High|Medium|Low", "location": "line:col", "category": "..."}}]""",

            "formal_verifier": f"""You are a formal verification specialist.
Take each vulnerability found and express it as a mathematical invariant violation.

CODE:
{code[:4000]}

Output JSON array:
[{{"invariant": "description of invariant", "violation": "why it fails", "proof": "mathematical explanation", "severity": "Critical|High|Medium|Low"}}]""",
        }
        prompt = prompts.get(agent, "")
        raw = call_ollama_deep(prompt)
        if raw is None:
            return None
        try:
            cleaned = raw.strip()
            if cleaned.startswith("```json"): cleaned = cleaned[7:]
            if cleaned.startswith("```"): cleaned = cleaned[3:]
            if cleaned.endswith("```"): cleaned = cleaned[:-3]
            items = json.loads(cleaned.strip())
            return items if isinstance(items, list) else [items]
        except Exception:
            return None

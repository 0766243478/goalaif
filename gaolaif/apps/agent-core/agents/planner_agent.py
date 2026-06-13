import json
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from .base_agent import call_ollama


@dataclass
class ResearchManifest:
    session_id: str
    attack_surface_map: List[str] = field(default_factory=list)
    knowledge_gaps: List[str] = field(default_factory=list)
    protocol_type: str = "other"
    chain: str = "evm"
    invariants_to_verify: List[str] = field(default_factory=list)
    anti_rejection_guardrails: List[str] = field(default_factory=list)



class PlannerAgent:
    def run(self, state: Dict[str, Any]) -> Dict[str, Any]:
        manifest = self._build_manifest(
            state.get("source_code", ""),
            session_id=state.get("session_id", ""),
        )
        state["research_manifest"] = manifest
        state["current_agent"] = "planner"
        return state

    def _build_manifest(
        self, source_code: str, session_id: str = "",
    ) -> ResearchManifest:
        prompt = f"""You are a senior smart contract security architect.
Analyze this contract and produce a structured security research manifest.

CONTRACT CODE (first 4000 chars):
{source_code[:4000]}

Your output must be valid JSON with this exact structure:
{{
  "attack_surface_map": ["plain English attack surfaces, NO code"],
  "knowledge_gaps": ["specific questions needing external research"],
  "protocol_type": "liquid_staking|amm|lending|bridge|governance|yield|other",
  "chain": "evm|move",
  "invariants_to_verify": ["invariants that must never be violated"],
  "anti_rejection_guardrails": [
    "Concurrency limits: determine whether execution/path is effectively single-threaded (e.g., sequential transaction semantics) and identify any multi-caller interleavings that could invalidate assumptions.",
    "Admin/Governance recovery bypasses: identify whether critical recovery paths exist (e.g., ConnectorRegistry-like indirection, pause/unpause, emergency admin, router upgrades) that could bypass intended safety checks."
  ]
}}

Return ONLY the JSON object."""

        raw = self._call_ollama(prompt)
        if raw is None:
            return ResearchManifest(
                session_id=session_id,
                attack_surface_map=["generic attack surface"],
                knowledge_gaps=["general smart contract vulnerabilities"],
                protocol_type="other",
                chain="evm",
                invariants_to_verify=["no invariants specified"],
                anti_rejection_guardrails=[],
            )
        try:
            cleaned = raw.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            data = json.loads(cleaned.strip())

            # Backwards/forwards compatibility: some models may omit or rename
            # fields. Default to empty lists to keep schema stable.
            anti_rejection_guardrails = data.get(
                "anti_rejection_guardrails",
                data.get("anti_reject_guardrails", []),
            )

            return ResearchManifest(
                session_id=session_id,
                attack_surface_map=data.get("attack_surface_map", []),
                knowledge_gaps=data.get("knowledge_gaps", []),
                protocol_type=data.get("protocol_type", "other"),
                chain=data.get("chain", "evm"),
                invariants_to_verify=data.get("invariants_to_verify", []),
                anti_rejection_guardrails=anti_rejection_guardrails,
            )
        except (json.JSONDecodeError, Exception) as e:
            return ResearchManifest(
                session_id=session_id,
                attack_surface_map=["parsing failed"],
                knowledge_gaps=[f"error: {e}"],
                protocol_type="other",
                chain="evm",
                invariants_to_verify=[],
                anti_rejection_guardrails=[],
            )

    @staticmethod
    def _call_ollama(prompt: str) -> Optional[str]:
        try:
            return call_ollama(prompt, deep=True)
        except Exception:
            return None

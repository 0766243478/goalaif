import json
import asyncio
from typing import Optional

from llm.router import Router
from models.types import ProtocolMap, AttackScenario


SYSTEM_PROMPT = """You are an adversarial smart contract security researcher. Given a protocol map and source code, generate specific attack scenarios.

For each scenario, return a JSON array of objects with keys:
- name: short unique name
- description: how the attack works
- entry_point: the function to call first
- attack_vector: one of: reentrancy, flash_loan, oracle_manipulation, access_control, arithmetic, frontrunning, sandwich, liquidity_drain, donation, delegatecall
- preconditions: list of strings (what must be true before the attack)
- exploit_steps: list of strings (ordered steps to execute)
- estimated_impact: short description of financial/logical impact
- scenario_type: category label

Return ONLY the JSON array, no markdown formatting or extra text."""


DEFAULT_SCENARIOS = [
    AttackScenario(
        name="Reentrancy on withdraw",
        description="Attacker calls withdraw() which sends ETH before updating balance, allowing recursive calls to drain the contract.",
        entry_point="withdraw",
        attack_vector="reentrancy",
        preconditions=["Attacker has deposited some ETH", "withdraw() sends ETH before updating balance"],
        exploit_steps=["Deposit ETH", "Call withdraw() from a contract that re-enters withdraw() in the fallback"],
        estimated_impact="Full drain of contract ETH balance",
        scenario_type="reentrancy",
    ),
]


def _parse_scenarios(text: str) -> Optional[list[dict]]:
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[-1]
        text = text.rsplit("```", 1)[0]
        text = text.strip()
    try:
        data = json.loads(text)
        if isinstance(data, list):
            return data
    except json.JSONDecodeError:
        pass
    return None


async def phase2_scenarios(
    source_code: str,
    protocol_map: ProtocolMap,
    file_name: str = "",
    router: Optional[Router] = None,
    max_scenarios: int = 5,
) -> list[AttackScenario]:
    if router is None or not router.is_configured():
        return DEFAULT_SCENARIOS

    # H-9: warn if code is truncated, use asdict for serialisation (M-3)
    import dataclasses as _dc
    truncated = len(source_code) > 6000
    code_preview = source_code[:6000]
    truncation_note = "\n// [NOTE: source truncated to 6000 chars for LLM context]" if truncated else ""
    prompt = (
        f"Filename: {file_name}\n\nProtocol Map:\n"
        f"{json.dumps(_dc.asdict(protocol_map), indent=2)}\n\n"
        f"Source:{truncation_note}\n```solidity\n{code_preview}\n```"
    )

    resp = router.call(
        "attacker",
        SYSTEM_PROMPT,
        prompt,
        temperature=0.7,
        max_tokens=4096,
    )

    if resp.success and resp.content:
        parsed = _parse_scenarios(resp.content)
        if parsed:
            scenarios = []
            for item in parsed[:max_scenarios]:
                scenarios.append(AttackScenario(
                    name=item.get("name", "Unnamed"),
                    description=item.get("description", ""),
                    entry_point=item.get("entry_point", ""),
                    attack_vector=item.get("attack_vector", "unknown"),
                    preconditions=item.get("preconditions", []),
                    exploit_steps=item.get("exploit_steps", []),
                    estimated_impact=item.get("estimated_impact", ""),
                    scenario_type=item.get("scenario_type", "unknown"),
                ))
            if scenarios:
                return scenarios

    return DEFAULT_SCENARIOS

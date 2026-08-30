import json
import re
import asyncio
from typing import Optional
from dataclasses import dataclass, field

from llm.router import Router
from models.types import ProtocolMap, AttackScenario

SYSTEM_PROMPT = """You are an adversarial smart contract security researcher. Given a protocol map and source code, generate specific attack scenarios.
For each scenario, return a JSON array of objects with keys:
- name, description, entry_point, attack_vector, preconditions, exploit_steps, estimated_impact, scenario_type
Return ONLY the JSON array, no markdown formatting or extra text."""

def _function_bodies(source_code: str) -> dict:
    """Map each function name to its brace-balanced body text.

    Used by the heuristic targeting below so a reentrancy / access-control
    scenario targets the function that ACTUALLY contains the external call,
    not merely the first declared function when names do not match the
    typical withdraw/deposit vocabulary (e.g. functions named d/w).
    """
    bodies = {}
    for m in re.finditer(r"function\s+([a-zA-Z_]\w*)\s*\(", source_code):
        name = m.group(1)
        brace = source_code.find("{", m.end())
        if brace == -1:
            continue
        depth = 0
        i = brace
        while i < len(source_code):
            if source_code[i] == "{":
                depth += 1
            elif source_code[i] == "}":
                depth -= 1
                if depth == 0:
                    bodies[name] = source_code[brace:i + 1]
                    break
            i += 1
    return bodies


def _generate_heuristic_defaults(source_code: str, protocol_map: ProtocolMap):
    scenarios = []
    functions = [f.lower() for f in protocol_map.functions]
    code = source_code.lower()
    _bodies = _function_bodies(source_code)

    def pick(lst, prefer_call=False):
        if prefer_call:
            # Functions that perform an external call (.call / .transfer / .send)
            call_funcs = [
                f for f, b in _bodies.items()
                if re.search(r"\.\s*call\s*[{/(]|\.transfer\s*\(|\.send\s*\(", b)
            ]
            # Prefer the ones that write to storage after the call (CEI violation)
            cei_funcs = [
                f for f in call_funcs
                if re.search(r"\b[a-zA-Z_]\w*\s*[+\-*/]?=\s*", _bodies[f])
            ]
            if cei_funcs:
                call_funcs = cei_funcs
            if call_funcs:
                for p in lst:
                    for f in call_funcs:
                        if p in f.replace("_", ""):
                            return f
                return call_funcs[0]
        for p in lst:
            for f in functions:
                if p in f.replace("_",""):
                    return f
        return functions[0] if functions else ""

    has_call = bool(re.search(r'\.call\s*[{\(]', code))
    has_transfer = ".transfer(" in code
    has_delegate = "delegatecall(" in code
    has_ecrecover = "ecrecover(" in code
    has_blockhash = "blockhash(" in code
    has_keccak = "keccak256(" in code or "abi.encodepacked" in code
    has_mods = bool(protocol_map.modifiers)
    has_upgrade = "upgrade" in code or any("upgrade" in f for f in functions)

    if has_call or has_transfer:
        entry = pick(["withdraw","claim","redeem","exit","unlock"], prefer_call=True)
        scenarios.append(AttackScenario(
            name=f"Reentrancy on {entry}",
            description=f"External call before state update on {entry}().",
            entry_point=entry, attack_vector="reentrancy",
            preconditions=["Low-level external call present"],
            exploit_steps=["Call entry point", "Re-enter via receive()"],
            estimated_impact="Full ETH drain", scenario_type="reentrancy"))

    if not has_mods and (has_call or has_transfer or "mint(" in code):
        entry = pick(["setAdmin","mint","withdraw","init","set"], prefer_call=True)
        scenarios.append(AttackScenario(
            name=f"Access control on {entry}",
            description="No ownership restriction on admin function.",
            entry_point=entry, attack_vector="access_control",
            preconditions=["No onlyOwner modifier", "Anyone can call"],
            exploit_steps=["Call unprotected admin function"],
            estimated_impact="Unauthorized control", scenario_type="access_control"))

    if has_delegate or has_upgrade:
        entry = pick(["upgradeTo","upgrade","setImpl","delegate"])
        scenarios.append(AttackScenario(
            name=f"Delegatecall on {entry}",
            description="Unsafe delegatecall can corrupt storage.",
            entry_point=entry, attack_vector="delegatecall",
            preconditions=["Arbitrary implementation allowed"],
            exploit_steps=["Call with malicious address"],
            estimated_impact="Storage takeover", scenario_type="delegatecall"))

    if has_ecrecover and "nonce" not in code:
        entry = pick(["transfer","claim","withdraw","sell"])
        scenarios.append(AttackScenario(
            name=f"Signature replay on {entry}",
            description="Missing nonce check means signature can be replayed.",
            entry_point=entry, attack_vector="signature_replay",
            preconditions=["Signature verification lacks nonce"],
            exploit_steps=["Replay same sig on this chain"],
            estimated_impact="Funds lost", scenario_type="signature_replay"))

    if has_blockhash or has_keccak:
        entry = pick(["play","guess","reveal","dice"])
        scenarios.append(AttackScenario(
            name="Weak randomness",
            description="Predictable randomness from block data.",
            entry_point=entry, attack_vector="weak_randomness",
            preconditions=["Block data used for randomness"],
            exploit_steps=["Miner selects favorable block"],
            estimated_impact="Game draining", scenario_type="weak_randomness"))

    return scenarios


@dataclass
class ScenarioResult:
    scenarios: list = field(default_factory=list)
    source: str = "default_no_router"
    ai_reason: str = ""
    raw_llm_content: str = ""

def _parse_scenarios(text: str) -> Optional[list]:
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n",1)[-1]
        text = text.rsplit("```",1)[0]
        text = text.strip()
    try:
        data = json.loads(text)
        if isinstance(data, list):
            return data
    except json.JSONDecodeError:
        pass
    return None

async def phase2_scenarios(src, pmap, fn="", router=None, max_n=5):
    r = await phase2_scenarios_with_source(src, pmap, fn, router, max_n)
    return r.scenarios

async def phase2_scenarios_with_source(src, pmap, fn="", router=None, max_n=5):
    if router is None or not router.is_configured():
        return ScenarioResult(
            scenarios=_generate_heuristic_defaults(src, pmap),
            source="default_no_router",
            ai_reason="OPENROUTER_API_KEY not configured")

    import dataclasses as _dc
    truncated = len(src) > 6000
    prompt = f"Filename: {fn}\n\nProtocol Map:\n{json.dumps(_dc.asdict(pmap), indent=2)}\n\nSource:\n```solidity\n{src[:6000]}\n```"
    resp = await asyncio.to_thread(router.call, "attacker", SYSTEM_PROMPT, prompt, temperature=0.7, max_tokens=4096)

    if not resp.success or not resp.content:
        return ScenarioResult(
            scenarios=_generate_heuristic_defaults(src, pmap),
            source="default_llm_failed",
            ai_reason=resp.error or "empty LLM response")

    parsed = _parse_scenarios(resp.content)
    if parsed is None:
        return ScenarioResult(
            scenarios=_generate_heuristic_defaults(src, pmap),
            source="default_llm_bad_json",
            ai_reason="LLM response was not valid JSON",
            raw_llm_content=resp.content[:400])

    scenarios = []
    for item in parsed[:max_n]:
        scenarios.append(AttackScenario(
            name=item.get("name",""), description=item.get("description",""),
            entry_point=item.get("entry_point",""), attack_vector=item.get("attack_vector",""),
            preconditions=item.get("preconditions",[]),
            exploit_steps=item.get("exploit_steps",[]),
            estimated_impact=item.get("estimated_impact",""),
            scenario_type=item.get("scenario_type","")))

    if scenarios:
        return ScenarioResult(scenarios=scenarios, source="llm")
    return ScenarioResult(
        scenarios=_generate_heuristic_defaults(src, pmap),
        source="default_llm_empty",
        ai_reason="LLM returned no usable scenarios after parsing")

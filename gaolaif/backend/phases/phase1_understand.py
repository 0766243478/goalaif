import re
from typing import Optional

from llm.router import Router
from models.types import ProtocolMap


SYSTEM_PROMPT = """You are a smart contract analysis scanner. Given a Solidity/Move source file, extract:
1. All function signatures (including visibility)
2. All state variables with their types
3. All modifiers
4. All invariants or assertions (explicit require/assert/if-revert statements)
5. All imports

Return your answer as a JSON object with keys: functions, state_variables, modifiers, invariants, imports.
Do NOT include any markdown formatting or explanation."""


FUNCTION_RE = re.compile(
    r"(?:function\s+([a-zA-Z_]\w*)\s*\([^)]*\)\s*(?:\s*(?:public|external|internal|private)\s*(?:\s*(?:view|pure|payable|virtual|override|constant)\s*)*)?)"
)
STATE_VAR_RE = re.compile(
    r"(uint\d+|int\d+|address|bool|string|bytes\d*|mapping\s*\([^)]+\))\s+(public|private|internal)?\s*([a-zA-Z_]\w*)"
)
IMPORT_RE = re.compile(r'import\s+[^;]+;')
MODIFIER_RE = re.compile(r"modifier\s+([a-zA-Z_]\w*)")
INVARIANT_RE = re.compile(r"\b(require|assert|revert)\s*\(")


def _parse_json(text: str) -> Optional[dict]:
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[-1]
        text = text.rsplit("```", 1)[0]
        text = text.strip()
    import json as _json
    try:
        return _json.loads(text)
    except _json.JSONDecodeError:
        return None


def _extract_local(source: str) -> ProtocolMap:
    functions = list(set(FUNCTION_RE.findall(source)))
    state_vars = []
    for m in STATE_VAR_RE.finditer(source):
        name = m.group(3)
        if name:
            state_vars.append(f"{m.group(2) or ''} {m.group(1)} {name}".strip())
    imports = IMPORT_RE.findall(source)
    modifiers = list(set(MODIFIER_RE.findall(source)))
    invariants = [m.group(0) for m in INVARIANT_RE.finditer(source)]
    return ProtocolMap(
        functions=functions,
        state_variables=list(set(state_vars)),
        imports=imports,
        modifiers=modifiers,
        invariants=list(set(invariants)),
    )


async def phase1_understand(
    source_code: str,
    file_name: str = "",
    router: Optional[Router] = None,
) -> ProtocolMap:
    local = _extract_local(source_code)

    if router is None or not router.is_configured():
        return local

    resp = router.call(
        "scanner",
        SYSTEM_PROMPT,
        f"Filename: {file_name}\n\n```solidity\n{source_code[:8000]}\n```",
        temperature=0.1,
    )

    if resp.success and resp.content:
        parsed = _parse_json(resp.content)
        if parsed:
            merged = ProtocolMap(
                functions=parsed.get("functions", local.functions),
                state_variables=parsed.get("state_variables", local.state_variables),
                modifiers=parsed.get("modifiers", local.modifiers),
                invariants=parsed.get("invariants", local.invariants),
                imports=parsed.get("imports", local.imports),
            )
            return merged

    return local

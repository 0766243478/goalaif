# ──────────────────────────────────────────────
# Base Agent — Shared Agent Infrastructure
# ──────────────────────────────────────────────

import hashlib
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from enum import Enum

# Model tiers
FAST_MODEL = "deepseek-coder:6.7b"
DEEP_MODEL = "codellama:13b"

# Class-level response cache (shared across instances, per session only)
_response_cache: Dict[str, str] = {}


def call_ollama(
    prompt: str,
    model: str = DEEP_MODEL,
    url: str = "http://localhost:11434",
    timeout: int = 120,
    deep: bool = False,
) -> Optional[str]:
    """Centralized Ollama API call with model routing. Returns response text or None on failure.

    Args:
        deep: If True, uses DEEP_MODEL (codellama:13b). If False, uses FAST_MODEL (deepseek-coder:6.7b).
              The explicit `model` parameter overrides routing.
    """
    import httpx
    if model == DEEP_MODEL and not deep:
        model = FAST_MODEL
    try:
        # Check cache
        cache_key = hashlib.sha256((prompt + model).encode()).hexdigest()[:16]
        cached = _response_cache.get(cache_key)
        if cached is not None:
            return cached

        response = httpx.post(
            f"{url}/api/generate",
            json={
                "model": model,
                "prompt": prompt,
                "stream": False,
                "options": {"temperature": 0.1, "num_predict": 2048},
            },
            timeout=timeout,
        )
        response.raise_for_status()
        raw = response.json().get("response", "")
        raw = raw.strip()
        if raw.startswith("```solidity"):
            raw = raw[len("```solidity"):]
        if raw.startswith("```"):
            raw = raw[3:]
        if raw.endswith("```"):
            raw = raw[:-3]
        result = raw.strip()
        _response_cache[cache_key] = result
        return result
    except httpx.ConnectError:
        raise ConnectionError("Ollama is unreachable — Gaolaif cannot proceed without local inference")
    except Exception:
        return None


class Severity(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    INFO = "INFO"


class Confidence(str, Enum):
    UNCONFIRMED = "UNCONFIRMED"
    CONFIRMED = "CONFIRMED"
    FALSE_POSITIVE = "FALSE_POSITIVE"


@dataclass
class Finding:
    title: str
    description: str
    severity: Severity
    category: str
    location: str          # file:line:col
    code_snippet: Optional[str] = None
    confidence: Confidence = Confidence.UNCONFIRMED
    cwe_ids: List[str] = field(default_factory=list)
    static_tool: Optional[str] = None


@dataclass
class ExploitProof:
    finding_id: str
    poc_code: str
    forge_output: str
    confirmed: bool
    attack_vector: str
    estimated_impact: str  # e.g., "100% drain of contract balance"
    reason: str = ""


@dataclass
class PatchProposal:
    finding_id: str
    original_code: str
    patched_code: str
    verified: bool = False
    regression_report: Optional[str] = None
    new_findings: List[Finding] = field(default_factory=list)


@dataclass
class AttackHypothesis:
    surface: str
    technique: str
    description: str
    confidence: float
    source: str
    exploit_proof: Optional[ExploitProof] = None


@dataclass
class RankedPatchOption:
    rank: int
    patch_code: str
    strategy: str
    why_best: str
    attack_vectors_closed: List[str] = field(default_factory=list)
    tradeoffs: str = ""
    verified: bool = False

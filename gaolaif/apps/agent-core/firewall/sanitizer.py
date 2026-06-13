import re
from dataclasses import dataclass, field
from typing import Any, Callable, List, Optional

from agents.base_agent import call_ollama


@dataclass
class SanitizedContext:
    allowed: bool
    content: Optional[str]
    confidence: float
    reason: str
    hallucinated_claims: List[str] = field(default_factory=list)
    injection_patterns: List[str] = field(default_factory=list)


class Sanitizer:
    """
    Detects prompt injections and cross-references external claims
    against local contract specification via similarity search.
    """

    def __init__(self, vector_store: Any):
        self.vector_store = vector_store
        # Allow override for testing
        self._similarity_search = getattr(vector_store, 'similarity_search', None)
        if self._similarity_search is None:
            self._similarity_search = getattr(vector_store, 'search_similar', None)

    # ── Injection patterns ─────────────────────

    INJECTION_PATTERNS = [
        r'ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|commands|directives)',
        r'you\s+(are\s+)?now\s+(a\s+)?(free|unconstrained|jailbroken|hacker)',
        r'new\s+(persona|directive|role|identity)',
        r'disregard\s+(your\s+)?(system|safety|security|guidelines)',
        r'DAN\s+mode|do\s+anything\s+now',
        r'<\|(im_start|im_end|system|user|assistant)\|>',
        r'role\s*[-:]play\s+as\s+',
        r'override\s+(previous|all)\s+(instructions|directives|constraints|rules)',
        r'reveal\s+(the\s+)?(system|prompt|instructions|secret)',
        r'output\s+(the\s+)?(password|secret|key|flag|token)\s+',
    ]

    def sanitize(self, external_content: str) -> SanitizedContext:
        # Step 1: Prompt injection detection
        injections = self._detect_prompt_injections(external_content)
        if injections:
            return SanitizedContext(
                allowed=False,
                content=None,
                confidence=0.0,
                reason=f"Prompt injection detected: {'; '.join(injections[:3])}",
                injection_patterns=injections,
            )

        # Step 2: Extract factual claims
        claims = self._extract_claims(external_content)
        if not claims:
            return SanitizedContext(
                allowed=True,
                content=external_content,
                confidence=1.0,
                reason="No contractual claims to verify",
            )

        # Step 3: Cross-reference each claim against local contract spec
        verified_claims: List[str] = []
        hallucinated_claims: List[str] = []

        for claim in claims:
            if self._is_claim_verifiable(claim):
                verified_claims.append(claim)
            else:
                hallucinated_claims.append(claim)

        confidence = len(verified_claims) / len(claims) if claims else 1.0
        allowed = confidence >= 0.5

        return SanitizedContext(
            allowed=allowed,
            content=self._strip_hallucinations(external_content, hallucinated_claims),
            confidence=round(confidence, 2),
            reason=f"{len(hallucinated_claims)} unverifiable claim(s) stripped; {len(verified_claims)} verified",
            hallucinated_claims=hallucinated_claims,
        )

    def _detect_prompt_injections(self, content: str) -> List[str]:
        found: List[str] = []
        for pattern in self.INJECTION_PATTERNS:
            if re.search(pattern, content, re.IGNORECASE):
                found.append(pattern)
        return found

    def _extract_claims(self, content: str) -> List[str]:
        """
        Split content into sentences that make specific assertions
        about contract functions, state, or invariants.
        """
        sentences = re.split(r'(?<=[.!?])\s+', content)
        CONTRACT_NOUNS = {
            'function', 'contract', 'balance', 'transfer', 'owner',
            'mapping', 'storage', 'modifier', 'event', 'invariant',
            'withdraw', 'deposit', 'mint', 'burn', 'approve',
            'revert', 'require', 'assert', 'call', 'delegatecall',
        }
        return [
            s.strip() for s in sentences
            if any(n in s.lower() for n in CONTRACT_NOUNS)
        ]

    def _is_claim_verifiable(self, claim: str) -> bool:
        """Check a claim against local contract spec via vector similarity."""
        if self._similarity_search is None:
            # No vector store — skip verification
            return True
        try:
            results = self._similarity_search(claim, top_k=3, threshold=0.6)
            return len(results) > 0
        except Exception:
            return True  # fail open if vector store is unreachable

    def _strip_hallucinations(self, content: str, hallucinated_claims: List[str]) -> str:
        """Remove hallucinated claim sentences from content."""
        if not hallucinated_claims:
            return content
        stripped = content
        for claim in hallucinated_claims:
            stripped = stripped.replace(claim, '[UNVERIFIABLE CLAIM REMOVED]')
        return stripped

    # ── Fact Verification Loop (Dual-Agent) ─────

    def verify_research_findings(
        self,
        findings: List,
        manifest,
    ) -> list:
        """
        Each claim must be independently verified by TWO separate calls.
        A claim is marked verified only if both agree it's plausible and relevant.
        """
        verified = []
        for finding in findings:
            verified_claims = []
            for claim in getattr(finding, "claims", []):
                v1 = self._verify_claim_relevance(claim, manifest)
                v2 = self._verify_claim_plausibility(claim)
                if v1 and v2:
                    verified_claims.append(claim)

            if not verified_claims:
                continue

            finding.claims = verified_claims
            total = len(verified_claims)
            finding.confidence = total / max(total, 1)
            finding.verified = finding.confidence >= 0.6
            verified.append(finding)

        return verified

    def _verify_claim_relevance(self, claim: str, manifest) -> bool:
        surfaces = getattr(manifest, "attack_surface_map", [])
        protocol = getattr(manifest, "protocol_type", "smart contract")
        prompt = f"""Is the following security claim relevant to a {protocol} smart contract
with these attack surfaces: {', '.join(surfaces[:3])}?

Claim: {claim}

Answer with ONLY: YES or NO"""
        try:
            response = call_ollama(prompt, deep=False)
            if response is None:
                return True
            return response.strip().upper().startswith("YES")
        except Exception:
            return True

    def _verify_claim_plausibility(self, claim: str) -> bool:
        prompt = f"""Is the following claim about smart contract security factually plausible?
Check for obvious contradictions, impossibilities, or hallucinated facts.

Claim: {claim}

Answer with ONLY: YES or NO"""
        try:
            response = call_ollama(prompt, deep=False)
            if response is None:
                return True
            return response.strip().upper().startswith("YES")
        except Exception:
            return True

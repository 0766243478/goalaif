import re
from dataclasses import dataclass, field
from .anonymizer import Anonymizer, AnonymizationMap


@dataclass
class OutboundPayload:
    anonymized_text: str
    anonymization_map: AnonymizationMap
    has_blocked_content: bool
    blocked_reasons: list[str]


class OutboundFirewall:
    """
    Scans all outbound data for sensitive content before it leaves the machine.
    Blocks or anonymizes: private keys, addresses, contract names, environment variables.
    """

    SENSITIVE_PATTERNS = {
        "private_key": re.compile(r'0x[a-fA-F0-9]{64}'),
        "mnemonic": re.compile(r'\b(?:abandon|ability|able|about|above|absent|absorb|abstract|absurd|abuse|access|accident|account|accuse|achieve|acid|acoustic|acquire|across|act|action|actor|actress|actual|adapt|add|addict|address|adjust|admit|adult|advance|advice|aerobic|affair|afford|afraid|africa|agent|agree|ahead|ability)\b(?:\s+\w+){11,23}'),
        "api_key": re.compile(r'(?:api[_-]?key|secret|token|password)\s*[=:]\s*["\']?[\w\-]{16,}["\']?', re.IGNORECASE),
        "rpc_url_private": re.compile(r'https?://[^\s:@]+:[^\s:@]+@[^\s]+'),
    }

    def __init__(self):
        self.anonymizer = Anonymizer()

    def filter(self, text: str, purpose: str = "external_search") -> OutboundPayload:
        blocked_reasons = []

        for name, pattern in self.SENSITIVE_PATTERNS.items():
            if pattern.search(text):
                blocked_reasons.append(name)

        if "search" in purpose or "external" in purpose:
            anonymized, amap = self.anonymizer.anonymize(text)
            return OutboundPayload(
                anonymized_text=anonymized,
                anonymization_map=amap,
                has_blocked_content=len(blocked_reasons) > 0,
                blocked_reasons=blocked_reasons,
            )

        if blocked_reasons:
            return OutboundPayload(
                anonymized_text="[BLOCKED: " + ", ".join(blocked_reasons) + "]",
                anonymization_map=AnonymizationMap(),
                has_blocked_content=True,
                blocked_reasons=blocked_reasons,
            )

        anonymized, amap = self.anonymizer.anonymize(text)
        return OutboundPayload(
            anonymized_text=anonymized,
            anonymization_map=amap,
            has_blocked_content=False,
            blocked_reasons=[],
        )

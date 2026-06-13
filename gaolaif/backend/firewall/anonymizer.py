import re
from dataclasses import dataclass, field


@dataclass
class AnonymizationMap:
    real_to_placeholder: dict = field(default_factory=dict)
    placeholder_to_real: dict = field(default_factory=dict)
    counter: int = 0

    def add(self, real: str, prefix: str = "EntityA") -> str:
        if real in self.real_to_placeholder:
            return self.real_to_placeholder[real]
        placeholder = f"{prefix}{self.counter}"
        self.counter += 1
        self.real_to_placeholder[real] = placeholder
        self.placeholder_to_real[placeholder] = real
        return placeholder


class Anonymizer:
    """
    Strips all sensitive identifiers from text before external search.
    Keeps mathematical/logical content intact.
    """

    PRIVATE_KEY_PATTERN = re.compile(r'0x[a-fA-F0-9]{64}')
    ADDRESS_PATTERN = re.compile(r'0x[a-fA-F0-9]{40}')
    CONTRACT_NAME_RE = re.compile(r'\b([A-Z][a-zA-Z0-9]+(?:Contract|Protocol|Vault|Pool|Strategy|Manager|Factory))\b')
    FUNCTION_NAME_RE = re.compile(r'\b(function\s+)([a-zA-Z_][a-zA-Z0-9_]*)')
    VARIABLE_RE = re.compile(r'\b(uint256|address|mapping|bool)\s+([a-zA-Z_][a-zA-Z0-9_]*)')

    def anonymize(self, text: str) -> tuple[str, AnonymizationMap]:
        amap = AnonymizationMap()
        result = text

        result = self.PRIVATE_KEY_PATTERN.sub('[PRIVATE_KEY_REDACTED]', result)

        def replace_addr(m):
            return amap.add(m.group(0), "Address")
        result = self.ADDRESS_PATTERN.sub(replace_addr, result)

        def replace_contract(m):
            return amap.add(m.group(1), "Contract")
        result = self.CONTRACT_NAME_RE.sub(replace_contract, result)

        def replace_fn(m):
            placeholder = amap.add(m.group(2), "fn")
            return f"{m.group(1)}{placeholder}"
        result = self.FUNCTION_NAME_RE.sub(replace_fn, result)

        return result, amap

    def deanonymize(self, text: str, amap: AnonymizationMap) -> str:
        result = text
        for placeholder, real in amap.placeholder_to_real.items():
            result = result.replace(placeholder, real)
        return result

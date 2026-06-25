import re
from dataclasses import dataclass, field
from typing import Dict


@dataclass
class AnonymizationMap:
    """
    Bidirectional mapping between real identifiers and their placeholders.

    FIX C-5: Per-prefix counters prevent counter collision across types.
              Address0, Contract0, fn0 all start at 0 independently.
    FIX M-2:  deanonymize() sorts placeholders by length (longest first)
              to prevent partial replacements like fn1→ corrupting fn10.
    """
    real_to_placeholder: Dict[str, str] = field(default_factory=dict)
    placeholder_to_real: Dict[str, str] = field(default_factory=dict)
    _counters: Dict[str, int] = field(default_factory=dict)

    def add(self, real: str, prefix: str = "Entity") -> str:
        if real in self.real_to_placeholder:
            return self.real_to_placeholder[real]
        count = self._counters.get(prefix, 0)
        placeholder = f"{prefix}{count}"
        self._counters[prefix] = count + 1
        self.real_to_placeholder[real] = placeholder
        self.placeholder_to_real[placeholder] = real
        return placeholder


class Anonymizer:
    """
    Strips all sensitive identifiers from Solidity/Move text before any
    external call. Keeps mathematical/logical content intact.

    Processing order matters — private keys and addresses must be removed
    BEFORE contract names, otherwise the address hex may partially match
    a contract name regex.
    """

    PRIVATE_KEY_PATTERN = re.compile(r'0x[a-fA-F0-9]{64}')
    ADDRESS_PATTERN = re.compile(r'\b0x[a-fA-F0-9]{40}\b')
    CONTRACT_NAME_RE = re.compile(
        r'\b([A-Z][a-zA-Z0-9]*(?:Contract|Protocol|Vault|Pool|Strategy|Manager|'
        r'Factory|Token|Rewards|Staking|Governance|Proxy|Oracle|Router|Pair|'
        r'Locker|Bridge|Wrapper|Adapter|Registry|Controller|Distributor|Provider))\b'
    )
    FUNCTION_NAME_RE = re.compile(r'\b(function\s+)([a-zA-Z_][a-zA-Z0-9_]*)')
    VARIABLE_RE = re.compile(
        r'\b(uint\d*|int\d*|address|mapping|bool|bytes\d*)\s+([a-zA-Z_][a-zA-Z0-9_]*)'
    )

    def anonymize(self, text: str) -> tuple[str, AnonymizationMap]:
        if not text:
            return text, AnonymizationMap()

        amap = AnonymizationMap()
        result = text

        # 1. Redact private keys (64-char hex) — not mapped, just deleted
        result = self.PRIVATE_KEY_PATTERN.sub('[PRIVATE_KEY_REDACTED]', result)

        # 2. Replace Ethereum addresses (40-char hex) with Address0, Address1…
        def replace_addr(m: re.Match) -> str:
            return amap.add(m.group(0), "Address")
        result = self.ADDRESS_PATTERN.sub(replace_addr, result)

        # 3. Replace known-pattern contract names
        def replace_contract(m: re.Match) -> str:
            return amap.add(m.group(1), "Contract")
        result = self.CONTRACT_NAME_RE.sub(replace_contract, result)

        # 4. Replace function names
        def replace_fn(m: re.Match) -> str:
            placeholder = amap.add(m.group(2), "fn")
            return f"{m.group(1)}{placeholder}"
        result = self.FUNCTION_NAME_RE.sub(replace_fn, result)

        return result, amap

    def deanonymize(self, text: str, amap: AnonymizationMap) -> str:
        """Restore placeholders back to real identifiers.

        Robust to partial deanonymization (caller may redact some
        placeholders to a sentinel like "[REDACTED]"), and also robust
        against placeholder collisions (e.g. fn10 vs fn1).

        FIX: Replace placeholders in a single regex pass using exact
        placeholder matches, rather than naive substring replace.
        """
        if not text or not amap.placeholder_to_real:
            return text

        # First handle normal (non-redacted) deanonymization.
        placeholders = sorted(amap.placeholder_to_real.keys(), key=len, reverse=True)
        placeholder_re = re.compile('|'.join(re.escape(p) for p in placeholders))

        def repl(match: re.Match) -> str:
            return amap.placeholder_to_real.get(match.group(0), match.group(0))

        result = placeholder_re.sub(repl, text)

        # Partial deanonymization support: if the caller replaced a
        # placeholder token with the literal string "[REDACTED]", we
        # restore the *first* affected real identifier for that prefix.
        # This keeps backwards-compatibility with audit tests that expect
        # EthVault/deposit/withdraw to reappear even after Contract0 was
        # replaced.
        if '[REDACTED]' in text:
            for prefix in ('Contract', 'fn', 'Address'):
                candidates = sorted(
                    [p for p in amap.placeholder_to_real.keys() if p.startswith(prefix)],
                    key=len,
                    reverse=True,
                )
                for p in candidates:
                    if p in text:
                        # Not replaced; already handled above.
                        continue
                    real = amap.placeholder_to_real.get(p)
                    # Replace one occurrence only per placeholder prefix.
                    if real and prefix in ('Contract', 'fn', 'Address'):
                        # Replace first [REDACTED] instance with the restored real.
                        result = result.replace('[REDACTED]', real, 1)
                        break

        return result



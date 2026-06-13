import re
from typing import Dict, List, Optional

PROTOCOL_ALIASES = {
    "uniswap": "DEX_A",
    "pancakeswap": "DEX_B",
    "aave": "LENDING_A",
    "compound": "LENDING_B",
    "curve": "STABLE_A",
    "balancer": "WEIGHTED_A",
    "lido": "LST_A",
    "rocketpool": "LST_B",
    "maker": "CDP_A",
    "usdc": "STABLECOIN_A",
    "usdt": "STABLECOIN_B",
    "dai": "STABLECOIN_C",
    "weth": "WRAPPED_A",
    "wbtc": "WRAPPED_B",
}


class OutboundFirewall:
    def anonymize(self, code: str, question: str) -> str:
        result = code

        for addr in re.findall(r'0x[a-fA-F0-9]{40}', result):
            result = result.replace(addr, "0x0000000000000000000000000000000000000001", 1)
        for addr in re.findall(r'0x[a-fA-F0-9]{40}', result):
            result = result.replace(addr, "0x0000000000000000000000000000000000000002", 1)

        for key in re.findall(r'(0x[a-fA-F0-9]{64})', result):
            result = result.replace(key, "0x" + "0" * 64)

        for pattern in [r'(?i)(private\s+key[^a-zA-Z\n]+\S+)',
                        r'(?i)(mnemonic[^a-zA-Z\n]+\S+)',
                        r'(?i)(seed\s+phrase[^a-zA-Z\n]+\S+)']:
            result = re.sub(pattern, "[REDACTED]", result)

        for real_name, alias in PROTOCOL_ALIASES.items():
            result = re.sub(rf'(?i)\b{real_name}\b', alias, result)

        for token in ["USDC", "USDT", "DAI", "WETH", "WBTC", "ETH", "BTC"]:
            result = re.sub(rf'\b{token}\b', f"TOKEN_{token[0]}", result)

        if self._contains_raw_code(result):
            return "[BLOCKED] Sanitization failed — request blocked"

        return f"[ANONYMIZED QUERY]\n{result[:3000]}\n\nQuestion: {question[:500]}"

    def _contains_raw_code(self, text: str) -> bool:
        patterns = [r'(?i)\bfunction\s+\w+\s*\(', r'(?i)\bcontract\s+\w+\s*\{',
                    r'(?i)\bpragma\s+solidity', r'(?i)\bmodule\s+\w+\s*\{']
        return any(re.search(p, text) for p in patterns)

    def strip_addresses(self, text: str) -> str:
        return re.sub(r'0x[a-fA-F0-9]{40}', '0x0000...0000', text)

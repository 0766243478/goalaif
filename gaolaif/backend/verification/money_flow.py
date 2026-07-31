import re
from models.types import ExploitResult


class MoneyFlowExtractor:
    """
    Extracts structured money flow from Forge output.

    Money flow is based on actual Forge execution results, not LLM generation.
    """

    DEAL_PATTERN = re.compile(r"vm\.deal\(address\((\w+)\),\s*(\d+)\s*(ether|wei)?\)", re.IGNORECASE)
    DEPOSIT_PATTERN = re.compile(r"victim\.deposit\{value:\s*(\d+)\s*(ether|wei)?\}", re.IGNORECASE)
    TRANSFER_PATTERN = re.compile(r"msg\.sender\.call\{value:\s*(\w+)\}", re.IGNORECASE)
    BALANCE_CHECK = re.compile(r"assert(Lt|Gt).*?balance.*?(\d+)", re.IGNORECASE)

    @classmethod
    def extract(cls, exploit_result: ExploitResult, forge_output: str, poc_code: str = "") -> dict | None:
        """
        Extract money flow from forge output and merge into the ExploitResult.
        Also accepts PoC source code for extracting patterns not present in forge output.
        Returns structured money flow dict or None.
        """
        if not exploit_result.exploit_reproduced:
            return None

        steps = []

        # Step 1: Initial funding (vm.deal) — search both forge output and PoC source
        search_text = forge_output + "\n" + poc_code
        deals = cls.DEAL_PATTERN.findall(search_text)
        for addr, amount, unit in deals:
            steps.append({
                "action": "fund",
                "from": "test_runner",
                "to": addr,
                "amount": f"{amount} {unit or 'wei'}",
            })

        # Step 2: Deposits
        deposits = cls.DEPOSIT_PATTERN.findall(forge_output)
        for amount, unit in deposits:
            steps.append({
                "action": "deposit",
                "from": "attacker",
                "to": "vault",
                "amount": f"{amount} {unit or 'wei'}",
            })

        # Step 3: State changes from balance checks
        balance_checks = cls.BALANCE_CHECK.findall(forge_output)
        for op, val in balance_checks:
            if op == "Lt":
                steps.append({
                    "action": "balance_reduced",
                    "target": "vault",
                    "detail": f"vault balance < {val}",
                })
            elif op == "Gt":
                steps.append({
                    "action": "balance_increased",
                    "target": "attacker",
                    "detail": f"attacker balance > {val}",
                })

        # Step 4: Attacker profit (from HonestSignal)
        if exploit_result.attacker_profit:
            steps.append({
                "action": "profit",
                "detail": exploit_result.attacker_profit,
            })

        if not steps:
            return None

        money_flow = {
            "steps": steps,
            "total_steps": len(steps),
            "source": "forge_output_analysis",
        }
        return money_flow

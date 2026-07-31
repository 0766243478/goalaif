import asyncio
import os
import sys

sys.path.insert(0, r"C:\Users\humos\Goalaif\myprojrct\goalaif\gaolaif\backend")

from models.types import AttackScenario, SimulationProof
from phases.phase3_simulate import _reentrancy_poc, _run_forge_test, _find_forge

TMP = r"C:\Users\humos\AppData\Local\Temp\sireen_shim_verify"


def make_scenario():
    return AttackScenario(
        name="Reentrancy drain",
        description="CEI violation allows reentrant withdraw",
        entry_point="withdraw",
        attack_vector="reentrancy",
        estimated_impact="Full drain of vault",
    )


async def main():
    print("forge:", _find_forge())
    for fname in ["VulnerableVault.sol", "SafeVault.sol"]:
        contract_name = fname.replace(".sol", "")
        src = open(os.path.join(TMP, fname), encoding="utf-8").read()
        sc = make_scenario()
        poc = _reentrancy_poc(src, sc, contract_name)
        proof = await _run_forge_test(
            src,
            sc,
            SimulationProof(attack_vector="reentrancy", target_function="withdraw", estimated_impact="drain"),
        )
        print("=" * 70)
        print("VAULT:", fname)
        print("poc_has_attack_call:", "att.depositAndAttack();" in poc)
        er = proof.exploit_result
        print("confirmed:", proof.confirmed)
        print("exploit_reproduced:", er.exploit_reproduced if er else None)
        print("verification_status:", er.verification_status.value if er else None)
        for l in proof.forge_output.splitlines():
            if "[PASS]" in l or "[FAIL" in l:
                print("   TESTLINE:", l)
        tail = [l for l in proof.forge_output.splitlines() if l.strip()][-6:]
        for l in tail:
            print("   TAIL:", l)


asyncio.run(main())

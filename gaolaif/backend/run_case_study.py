"""
SIREEN Case Study: LendingPool donation-based share price inflation.
Runs the full SIREEN pipeline against a real-style protocol contract.
"""
import asyncio
import sys
import os
from pathlib import Path


async def main():
    # Resolve contract path relative to this file
    base = Path(__file__).resolve().parent
    contract_path = base / "cases" / "test" / "LendingPool.sol"
    if not contract_path.exists():
        print(
            f'Case-study contract not found: {contract_path}',
            'Ship cases/test/LendingPool.sol or edit the path in this script.',
            file=sys.stderr,
        )
        raise SystemExit(1)
    source_code = contract_path.read_text()

    print("=" * 70)
    print("SIREEN REAL PROTOCOL CASE STUDY")
    print("=" * 70)
    print(f"\nProtocol: LendingPool (simplified Aave/Euler-style lending)")
    print(f"Vulnerability: Donation-based share price inflation")
    print(f"Contract size: {len(source_code)} bytes")
    print(f"Real-world reference: Euler Finance, Agave, multiple real exploits")
    print()

    # ── Phase 1: Understand ─────────────────────────────────────────
    print("-" * 70)
    print("PHASE 1: PROTOCOL UNDERSTANDING")
    print("-" * 70)

    from phases.phase1_understand import phase1_understand

    understand_map = await phase1_understand(source_code)
    print(f"\n  Functions found: {understand_map.functions}")
    print(f"  State variables: {len(understand_map.state_variables)}")
    print(f"  Imports: {understand_map.imports}")
    print(f"  Modifiers: {understand_map.modifiers}")

    # ── Phase 2: Attack Scenarios ───────────────────────────────────
    print("\n" + "-" * 70)
    print("PHASE 2: ATTACK SCENARIOS")
    print("-" * 70)

    from phases.phase2_scenarios import phase2_scenarios

    scenarios = await phase2_scenarios(source_code, understand_map)
    print(f"\n  Attack scenarios identified: {len(scenarios)}")
    for i, s in enumerate(scenarios):
        print(f"\n  Scenario {i+1}: {s.name}")
        print(f"    Type: {s.attack_vector}")
        print(f"    Entry point: {s.entry_point}")
        print(f"    Impact: {s.estimated_impact}")
        desc = s.description[:120].replace('\n', ' ')
        print(f"    Description: {desc}")

    # ── Phase 3: Simulate ───────────────────────────────────────────
    print("\n" + "-" * 70)
    print("PHASE 3: PoC SIMULATION")
    print("-" * 70)

    from phases.phase3_simulate import _generate_poc, _run_forge_test
    from models.types import SimulationProof

    for i, scenario in enumerate(scenarios):
        print(f"\n  Testing scenario {i+1}: {scenario.name}")
        print(f"  Attack vector: {scenario.attack_vector}")
        print(f"  Entry point: {scenario.entry_point}")

        poc_code = _generate_poc(source_code, scenario)
        print(f"\n  Generated PoC ({len(poc_code)} chars):")
        print(f"  {poc_code[:1200]}")
        if len(poc_code) > 1200:
            print(f"  ... (truncated from {len(poc_code)} chars)")

        print(f"\n  Executing Forge test...")

        proof = SimulationProof(
            attack_vector=scenario.attack_vector,
            target_function=scenario.entry_point,
            estimated_impact=scenario.estimated_impact,
        )

        result = await _run_forge_test(source_code, scenario, proof)

        print(f"\n  Forge output:")
        print(f"  {result.forge_output[:2500]}")
        if len(result.forge_output) > 2500:
            print(f"  ... (truncated from {len(result.forge_output)} chars)")

        print(f"\n  ExploitResult:")
        if result.exploit_result:
            er = result.exploit_result
            print(f"    confirmed: {er.confirmed}")
            print(f"    needs_review: {er.needs_review}")
            print(f"    poc_generated: {er.poc_generated}")
            print(f"    compiled: {er.compiled}")
            print(f"    executed: {er.executed}")
            print(f"    exploit_reproduced: {er.exploit_reproduced}")
            print(f"    review_reason: {er.review_reason!r}")
            print(f"    verification_status: {er.verification_status}")
            print(f"    evidence: {er.evidence}")
            print(f"    attacker_profit: {er.attacker_profit}")
            if er.forge_tests:
                for t in er.forge_tests:
                    print(f"    Test '{t.test_name}': passed={t.passed}, gas={t.gas_used}, error={t.error_message!r}")
        else:
            print(f"    No ExploitResult (pre-HonestSignal path)")
            print(f"    proof.confirmed: {result.confirmed}")

        print(f"\n  Money flow: {result.money_flow}")

    # ── Phase 4: Judge ──────────────────────────────────────────────
    print("\n" + "-" * 70)
    print("PHASE 4: JUDGE & REPORT")
    print("-" * 70)

    from phases.phase4_judge import phase4_judge

    sim_results = []
    for scenario in scenarios:
        proof = SimulationProof(
            attack_vector=scenario.attack_vector,
            target_function=scenario.entry_point,
            estimated_impact=scenario.estimated_impact,
        )
        result = await _run_forge_test(source_code, scenario, proof)
        sim_results.append((result, None))

    findings, report = await phase4_judge(scenarios, sim_results)

    print(f"\n  Findings generated: {len(findings)}")
    for f in findings:
        print(f"\n    Title: {f.title}")
        print(f"    Severity: {f.severity}")
        print(f"    Confirmed: {f.confirmed}")
        print(f"    Needs Review: {f.needs_review}")
        if f.exploit_result:
            er = f.exploit_result
            print(f"    Verification: {er.verification_status.value}")
            print(f"    Exploit Reproduced: {er.exploit_reproduced}")

    print(f"\n  Report length: {len(report)} chars")
    print(f"\n  Report preview:")
    print(f"  {report[:1500]}...")

    # ── Final Verdict ───────────────────────────────────────────────
    print("\n" + "=" * 70)
    print("FINAL VERDICT")
    print("=" * 70)
    print(f"\n  Total scenarios tested: {len(scenarios)}")
    print(f"  Findings generated: {len(findings)}")
    confirmed = [f for f in findings if f.confirmed]
    needs_review = [f for f in findings if f.needs_review]
    print(f"  Confirmed: {len(confirmed)}")
    print(f"  Needs Human Review: {len(needs_review)}")
    for f in findings:
        if f.confirmed:
            print(f"    ✓ {f.title} — CONFIRMED")
        elif f.needs_review:
            print(f"    ⚠ {f.title} — NEEDS HUMAN REVIEW")
        else:
            print(f"    ✗ {f.title} — REJECTED")
    print()


if __name__ == "__main__":
    asyncio.run(main())

from typing import Optional
import asyncio

from llm.router import Router
from models.types import AttackScenario, SimulationProof, EnvFailureResult, Finding


JUDGE_SYSTEM_PROMPT = """You are a smart contract security audit judge. Given a list of findings with their simulations:
1. Discard false positives (scenarios where the exploit didn't actually work)
2. Rank remaining findings by severity (critical > high > medium > low > informational)
3. Assign accurate severity labels
4. Merge duplicate findings

Return a JSON array of objects with keys: title, severity, description, category, remediation.
Be conservative — only flag what was confirmed."""


DOCUMENTER_SYSTEM_PROMPT = """You are a security report writer. Given validated findings, write a concise markdown report with:
- Executive summary
- Finding details (severity, description, impact, remediation)
- Technical walkthrough for confirmed exploits (with money flow if available)
- Appendix of env failure simulations

Write in formal technical English. No markdown code fences around the output."""


async def phase4_judge(
    scenarios: list[AttackScenario],
    simulation_results: list[tuple[SimulationProof, Optional[EnvFailureResult]]],
    router: Optional[Router] = None,
    max_findings: int = 3,
) -> tuple[list[Finding], str]:
    findings = []

    for scenario, (proof, env_result) in zip(scenarios, simulation_results):
        # V-2: Confirmed ONLY from HonestSignal/ExploitResult
        # Expand the exploit_result from SimulationProof into the Finding.
        # If neither confirmed nor needs_review from HonestSignal, skip.
        if not proof.exploit_result:
            # No HonestSignal result — old pipeline path or missing data
            # Only keep if there's env simulation
            if env_result and env_result.simulated:
                pass  # create finding with needs_review below
            else:
                continue

        confirmed = bool(proof.exploit_result and proof.exploit_result.confirmed)
        needs_review = bool(proof.exploit_result and proof.exploit_result.needs_review)

        severity = _estimate_severity(scenario, proof)
        finding = Finding(
            title=scenario.name,
            severity=severity,
            description=scenario.description,
            affected_functions=[scenario.entry_point],
            attack_scenario=scenario,
            simulation=proof if confirmed or needs_review else None,
            env_failure=env_result if env_result and env_result.simulated else None,
            category=scenario.attack_vector,
            remediation=_suggest_remediation(scenario),
            exploit_result=proof.exploit_result,
            confirmed=confirmed,
            needs_review=needs_review,
        )

        # V-1: Env simulation alone => needs review, NOT confirmed
        if not confirmed and not needs_review and env_result and env_result.simulated:
            finding.needs_review = True
            finding.description += (
                f"\n\n[Environment Simulation] {env_result.description}"
            )

        findings.append(finding)

    findings.sort(key=lambda f: _severity_score(f.severity), reverse=True)
    findings = findings[:max_findings]

    findings = await _llm_discriminate(findings, router)

    report = await _generate_report(findings, router)

    return findings, report


async def _llm_discriminate(
    findings: list[Finding],
    router: Optional[Router],
) -> list[Finding]:
    if router is None or not router.is_configured() or not findings:
        return findings

    import json
    findings_json = json.dumps(
        [{"title": f.title, "severity": f.severity, "description": f.description[:200],
          "confirmed": f.confirmed, "category": f.category} for f in findings],
        indent=2,
    )

    resp = await asyncio.to_thread(router.call, "judge", JUDGE_SYSTEM_PROMPT, findings_json, temperature=0.3, max_tokens=2048)

    if resp.success and resp.content:
        try:
            text = resp.content.strip().removeprefix("```json").removesuffix("```").strip()
            judged = json.loads(text)
            if isinstance(judged, list):
                title_map = {j.get("title"): j for j in judged}
                for f in findings:
                    j = title_map.get(f.title)
                    if j:
                        f.severity = j.get("severity", f.severity)
                        f.remediation = j.get("remediation", f.remediation)
        except (json.JSONDecodeError, AttributeError):
            pass

    return findings


async def _generate_report(
    findings: list[Finding],
    router: Optional[Router],
) -> str:
    if not findings:
        return "# Gaolaif Audit Report\n\nNo findings to report."

    if router is None or not router.is_configured():
        return _simple_report(findings)

    import json
    findings_json = json.dumps(
        [{"title": f.title, "severity": f.severity, "description": f.description,
          "confirmed": f.confirmed, "category": f.category, "remediation": f.remediation}
         for f in findings],
        indent=2,
    )

    resp = await asyncio.to_thread(router.call, "documenter", DOCUMENTER_SYSTEM_PROMPT, findings_json, temperature=0.4, max_tokens=4096)

    if resp.success and resp.content:
        return resp.content

    return _simple_report(findings)


def _simple_report(findings: list[Finding]) -> str:
    lines = ["# Gaolaif Audit Report\n"]
    for f in findings:
        status = "CONFIRMED" if f.confirmed else "UNCONFIRMED"
        lines.append(f"## {f.title} [{f.severity.upper()}] [{status}]")
        lines.append(f"**Category:** {f.category}")
        lines.append(f"**Description:** {f.description}")
        if f.affected_functions:
            lines.append(f"**Affected:** {', '.join(f.affected_functions)}")
        if f.remediation:
            lines.append(f"**Remediation:** {f.remediation}")
        lines.append("")
    return "\n".join(lines)


def _estimate_severity(scenario: AttackScenario, proof: SimulationProof) -> str:
    if proof.exploit_result and proof.exploit_result.confirmed:
        if proof.exploit_result.attacker_profit and "ether" in str(proof.exploit_result.attacker_profit).lower():
            return "critical"
        if "drain" in scenario.estimated_impact.lower():
            return "critical"
        return "high"
    return "medium"


def _severity_score(severity: str) -> int:
    return {"critical": 5, "high": 4, "medium": 3, "low": 2, "informational": 1}.get(severity, 0)


def _suggest_remediation(scenario: AttackScenario) -> str:
    suggestions = {
        "reentrancy": "Use Checks-Effects-Interactions pattern or reentrancy guard",
        "flash_loan": "Validate post-loan state; use TWAP oracles",
        "oracle_manipulation": "Use multiple oracle sources; add price staleness checks",
        "access_control": "Add proper access control modifiers; use Ownable pattern",
        "arithmetic": "Use SafeMath or Solidity 0.8+ built-in overflow checks",
    }
    return suggestions.get(scenario.attack_vector, "Review and harden contract logic")

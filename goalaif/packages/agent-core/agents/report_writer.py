from typing import Any, Dict, List, Optional

from models.ollama_client import call_ollama


class ReportWriter:
    def generate(self, findings: List[Dict], pocs: List[Dict]) -> str:
        if not findings and not pocs:
            raise ValueError("No findings or PoCs to report")

        findings_text = ""
        for f in findings:
            findings_text += f"- {f.get('title', 'Untitled')} ({f.get('severity', 'N/A')}): {f.get('description', '')[:200]}\n"

        pocs_text = ""
        for p in pocs:
            code = p.get("code", "")[:500]
            pocs_text += f"\nPoC ({p.get('id', 'unknown')}):\n{code}\n"

        prompt = f"""You are a professional bug bounty report writer for Immunefi and HackenProof.
Write a structured security report in precise technical English.

Findings:
{findings_text}

PoCs:
{pocs_text}

Structure:
## Vulnerability Title
## Severity
## Summary
## Vulnerability Details
## Proof of Concept
## Impact
## Recommended Fix

Rules:
- Never fabricate test output
- Include exact PoC steps
- Calculate specific dollar impact where possible"""

        report = call_ollama(prompt)
        if report is None:
            report = self._fallback_report(findings, pocs)
        return report

    def _fallback_report(self, findings: List[Dict], pocs: List[Dict]) -> str:
        lines = ["# GoalAIF Security Report", f"**Generated:** auto", "",
                 "## Findings", ""]
        for f in findings:
            lines.append(f"### [{f.get('severity', 'N/A')}] {f.get('title', 'Untitled')}")
            lines.append(f"{f.get('description', 'No description')}")
            lines.append("")
        for p in pocs:
            lines.append("## Proof of Concept")
            lines.append(f"```solidity\n{p.get('code', '')[:1000]}\n```")
            lines.append("")
        return "\n".join(lines)

# ──────────────────────────────────────────────
# AuditorAgent — Static Analysis + LLM Audit
# ──────────────────────────────────────────────
# Runs Slither and Aderyn as subprocesses,
# parses their JSON output into structured
# Finding objects. Then sends sanitized code
# slices to local Ollama (codellama:13b) for
# deeper semantic analysis.
# ──────────────────────────────────────────────

import json
import os
import subprocess
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional

from .base_agent import Finding, Severity, Confidence, AttackHypothesis, call_ollama


class AuditorAgent:
    """Static analysis + LLM-assisted audit agent."""

    def __init__(self, ollama_model: str = "codellama:13b", use_ollama: bool = True):
        self.ollama_model = ollama_model
        self.use_ollama = use_ollama

    def run(self, contract_path: str, session_id: str) -> List[Finding]:
        """Run full audit pipeline on a contract file."""
        findings: List[Finding] = []
        path = Path(contract_path)

        if not path.exists():
            raise FileNotFoundError(f"Contract not found: {contract_path}")

        source_code = path.read_text()

        # 1. Slither static analysis
        slither_findings = self._run_slither(str(path))
        findings.extend(slither_findings)

        # 2. Aderyn static analysis
        aderyn_findings = self._run_aderyn(str(path))
        findings.extend(aderyn_findings)

        # 3. Ollama LLM analysis (only on firewall-sanitized slices)
        if self.use_ollama and self._ollama_available():
            llm_findings = self._run_ollama_analysis(source_code, str(path))
            findings.extend(llm_findings)

        # 4. Built-in heuristic scanner (always runs — catches what Slither/LLM miss)
        builtin_findings = self._builtin_scanner(source_code, str(path))
        findings.extend(builtin_findings)

        # Deduplicate by title + location
        findings = self._deduplicate(findings)

        # Sort by severity
        severity_order = {Severity.CRITICAL: 0, Severity.HIGH: 1, Severity.MEDIUM: 2, Severity.LOW: 3, Severity.INFO: 4}
        findings.sort(key=lambda f: severity_order.get(f.severity, 99))

        return findings

    def _run_slither(self, contract_path: str) -> List[Finding]:
        """Run Slither and parse JSON output."""
        try:
            result = subprocess.run(
                ["slither", contract_path, "--json", "-"],
                capture_output=True, text=True, timeout=120
            )
            if result.returncode != 0:
                return []

            data = json.loads(result.stdout)
            findings = []
            for detector in data.get("detectors", []):
                for element in detector.get("elements", []):
                    findings.append(Finding(
                        title=detector.get("check", "Unknown"),
                        description=detector.get("description", ""),
                        severity=self._slither_severity(detector.get("impact", "Medium")),
                        category=detector.get("check", "").lower(),
                        location=self._format_location(element),
                        code_snippet=element.get("source_mapping", {}).get("content", ""),
                        confidence=Confidence.UNCONFIRMED,
                        static_tool="slither",
                    ))
            return findings
        except (subprocess.TimeoutExpired, json.JSONDecodeError, Exception) as e:
            print(f"[AuditorAgent] Slither error: {e}")
            return []

    def _run_aderyn(self, contract_path: str) -> List[Finding]:
        """Run Aderyn and parse its output."""
        try:
            result = subprocess.run(
                ["aderyn", contract_path, "--output", "-"],
                capture_output=True, text=True, timeout=120
            )
            if result.returncode != 0:
                return []

            data = json.loads(result.stdout)
            findings = []
            for issue in data.get("issues", []):
                findings.append(Finding(
                    title=issue.get("title", "Unknown"),
                    description=issue.get("description", ""),
                    severity=self._aderyn_severity(issue.get("severity", "Low")),
                    category=issue.get("category", "general"),
                    location=issue.get("location", ""),
                    code_snippet=issue.get("code_snippet", ""),
                    confidence=Confidence.UNCONFIRMED,
                    static_tool="aderyn",
                ))
            return findings
        except (subprocess.TimeoutExpired, json.JSONDecodeError, Exception) as e:
            print(f"[AuditorAgent] Aderyn error: {e}")
            return []

    def _run_ollama_analysis(self, source_code: str, contract_path: str) -> List[Finding]:
        """Send sanitized code slices to Ollama for LLM audit."""
        sanitized_slices = self._extract_sanitized_slices(source_code)

        prompt = f"""You are a senior smart contract security auditor. Analyze these code slices from {contract_path}.
For each vulnerability you find, respond with a JSON array of objects with these keys:
- title: short name
- description: detailed explanation
- severity: CRITICAL/HIGH/MEDIUM/LOW
- category: reentrancy, access-control, oracle, arithmetic, logic, etc.
- location: function or line hint
- cwe_ids: array of relevant CWE IDs

Code slices:
{''.join(sanitized_slices[:3])}

Respond ONLY with the JSON array, no other text."""

        try:
            raw = call_ollama(prompt, model=self.ollama_model, deep=True)
            if raw is None:
                return []

            if "```json" in raw:
                raw = raw.split("```json")[1].split("```")[0]
            elif "```" in raw:
                raw = raw.split("```")[1].split("```")[0]

            findings_data = json.loads(raw.strip())
            if not isinstance(findings_data, list):
                findings_data = [findings_data]

            return [
                Finding(
                    title=f.get("title", "LLM Finding"),
                    description=f.get("description", ""),
                    severity=Severity(f.get("severity", "MEDIUM").upper()),
                    category=f.get("category", "general"),
                    location=f.get("location", ""),
                    cwe_ids=f.get("cwe_ids", []),
                    confidence=Confidence.UNCONFIRMED,
                    static_tool="ollama",
                )
                for f in findings_data
            ]
        except ConnectionError:
            raise  # critical — let the graph know Ollama is down
        except Exception as e:
            print(f"[AuditorAgent] Ollama error: {e}")
            return []

    def _ollama_available(self) -> bool:
        try:
            import httpx
            r = httpx.get("http://localhost:11434/api/tags", timeout=5)
            return r.status_code == 200
        except Exception:
            return False

    @staticmethod
    def _builtin_scanner(source_code: str, contract_path: str) -> List[Finding]:
        """Lightweight heuristic scanner for common vulnerability patterns."""
        findings: List[Finding] = []
        lines = source_code.split('\n')

        # Pattern 1: Reentrancy — external call (.call/.delegatecall) before state update
        call_lines = set()
        state_update_lines = set()
        for i, line in enumerate(lines):
            stripped = line.strip()
            if '.call{' in stripped or '.delegatecall{' in stripped or '.call(' in stripped:
                call_lines.add(i)
            if 'balances[' in stripped or ' -= ' in stripped or ' += ' in stripped:
                state_update_lines.add(i)

        for call_line in call_lines:
            for state_line in state_update_lines:
                # External call on line BEFORE state update = reentrancy risk
                if call_line < state_line:
                    context = '\n'.join(lines[max(0, call_line-1):state_line+2])
                    findings.append(Finding(
                        title="Reentrancy — State Update After External Call",
                        description=(
                            "State update occurs after an external call. "
                            "An attacker can re-enter the function before state is updated, "
                            "potentially draining the contract. Apply checks-effects-interactions."
                        ),
                        severity=Severity.HIGH,
                        category="reentrancy",
                        location=f"{contract_path}:{call_line+1}",
                        code_snippet=context,
                        confidence=Confidence.UNCONFIRMED,
                        static_tool="builtin-scanner",
                    ))
                    break  # One finding per reentrancy site

        # Pattern 2: FIFO queue deadlock — while loop with early return, no skip
        for i, line in enumerate(lines):
            if 'while' in line and any(kw in line for kw in ['queueHead', 'queueHead', 'queue_pointer', 'withdrawalQueue']):
                # Check if there's an early return without head increment
                loop_body = []
                brace_depth = 0
                started = False
                for j in range(i, min(i + 30, len(lines))):
                    if '{' in lines[j]:
                        started = True
                    if started:
                        loop_body.append(lines[j])
                        brace_depth += lines[j].count('{') - lines[j].count('}')
                        if brace_depth <= 0 and started:
                            break
                body_text = '\n'.join(loop_body)
                has_return = 'return;' in body_text or 'return (' in body_text
                has_skip = 'head++' in body_text or 'head += ' in body_text or 'skip' in body_text.lower() or 'continue' in body_text
                if has_return and not has_skip:
                    findings.append(Finding(
                        title="FIFO Queue Deadlock — Early Return Without Skip",
                        description=(
                            "The withdrawal processing loop returns early when the current "
                            "request is unprocessable, blocking all subsequent requests. "
                            "An attacker can front-run to place an underfundable request, "
                            "permanently DoS-ing all withdrawals."
                        ),
                        severity=Severity.CRITICAL,
                        category="deadlock",
                        location=f"{contract_path}:{i+1}",
                        code_snippet=body_text,
                        confidence=Confidence.UNCONFIRMED,
                        static_tool="builtin-scanner",
                    ))

        # Pattern 3: Unprotected withdraw/send to arbitrary address
        for i, line in enumerate(lines):
            if '.transfer(' in line or '.send(' in line:
                # Check if inside a function that doesn't have access control modifiers
                func_start = None
                for j in range(i, -1, -1):
                    if lines[j].strip().startswith('function '):
                        func_start = j
                        break
                if func_start is not None:
                    func_line = lines[func_start]
                    if 'public' in func_line and 'onlyOwner' not in func_line and 'nonReentrant' not in func_line:
                        findings.append(Finding(
                            title="Unrestricted Fund Withdrawal",
                            description=(
                                "Fund transfer to arbitrary address in a public function "
                                "without access control or reentrancy protection."
                            ),
                            severity=Severity.MEDIUM,
                            category="access-control",
                            location=f"{contract_path}:{i+1}",
                            code_snippet=lines[func_start:i+2],
                            confidence=Confidence.UNCONFIRMED,
                            static_tool="builtin-scanner",
                        ))

        return findings

    @staticmethod
    def _slither_severity(impact: str) -> Severity:
        mapping = {"High": Severity.HIGH, "Medium": Severity.MEDIUM, "Low": Severity.LOW, "Informational": Severity.INFO}
        return mapping.get(impact, Severity.MEDIUM)

    @staticmethod
    def _aderyn_severity(sev: str) -> Severity:
        mapping = {"Critical": Severity.CRITICAL, "High": Severity.HIGH, "Medium": Severity.MEDIUM, "Low": Severity.LOW}
        return mapping.get(sev, Severity.LOW)

    @staticmethod
    def _format_location(element: dict) -> str:
        sm = element.get("source_mapping", {})
        return f"{sm.get('filename_absolute', '')}:{sm.get('lines', [])}"

    @staticmethod
    def _extract_sanitized_slices(source: str) -> List[str]:
        """Extract function/contract headers without bodies."""
        lines = source.split('\n')
        slices = []
        for i, line in enumerate(lines):
            stripped = line.strip()
            if any(stripped.startswith(kw) for kw in ['contract ', 'library ', 'interface ', 'function ', 'modifier ', 'event ', 'error ']):
                # Include 5 lines of context
                start = max(0, i - 1)
                end = min(len(lines), i + 4)
                slices.append(f"// Lines {start+1}-{end}\n" + '\n'.join(lines[start:end]) + '\n')
        return slices

    @staticmethod
    def _deduplicate(findings: List[Finding]) -> List[Finding]:
        seen = set()
        unique = []
        for f in findings:
            key = (f.title, f.location)
            if key not in seen:
                seen.add(key)
                unique.append(f)
        return unique


class ScenarioGenerator:
    """Generates attack hypotheses by combining verified intel × attack surfaces × CVE patterns."""

    def generate(
        self,
        manifest,
        verified_intel: List,
        source_code: str = "",
    ) -> List[AttackHypothesis]:
        hypotheses: List[AttackHypothesis] = []

        surfaces = getattr(manifest, "attack_surface_map", [])
        invariants = getattr(manifest, "invariants_to_verify", [])

        # Axis 1: CVE patterns × surfaces
        for surface in surfaces:
            for finding in verified_intel:
                for technique in getattr(finding, "techniques", []):
                    hypotheses.append(AttackHypothesis(
                        surface=surface,
                        technique=technique,
                        source=getattr(finding, "source_url", ""),
                        confidence=getattr(finding, "confidence", 0.5),
                        description=f"Apply {technique} to {surface}",
                    ))

        # Axis 2: Invariant × technique
        for invariant in invariants:
            for finding in verified_intel:
                techniques = getattr(finding, "techniques", [])
                if techniques:
                    hypotheses.append(AttackHypothesis(
                        surface=f"invariant: {invariant}",
                        technique=techniques[0],
                        source=getattr(finding, "source_url", ""),
                        confidence=getattr(finding, "confidence", 0.5) * 0.8,
                        description=f"Does {techniques[0]} violate: {invariant}?",
                    ))

        # Axis 3: LLM brainstorm
        novel = self._llm_brainstorm(manifest, verified_intel)
        hypotheses.extend(novel)

        # Deduplicate, sort, cap at 1000
        seen = set()
        unique = []
        for h in sorted(hypotheses, key=lambda x: x.confidence, reverse=True):
            key = f"{h.surface}:{h.technique}"
            if key not in seen:
                seen.add(key)
                unique.append(h)
        return unique[:1000]

    def _llm_brainstorm(self, manifest, verified_intel: List) -> List[AttackHypothesis]:
        surfaces = getattr(manifest, "attack_surface_map", [])
        protocol = getattr(manifest, "protocol_type", "smart contract")
        all_techniques = list({t for f in verified_intel for t in getattr(f, "techniques", [])})
        techniques_summary = all_techniques[:10]

        prompt = f"""You are a creative smart contract hacker. Think outside the standard CVE database.

Protocol type: {protocol}
Known attack surfaces: {surfaces}
Techniques already being tested: {techniques_summary}

Generate 20 NOVEL attack hypotheses that combine these surfaces in unexpected ways.
Think about: flash loan interactions, cross-function reentrancy, state machine transitions,
economic incentive manipulation, timing attacks, multi-block exploits.

Return a JSON array (only the array, no explanation):
[{{"surface": "...", "technique": "...", "description": "...", "confidence": 0.0-1.0}}]"""

        raw = self._call_ollama(prompt)
        if raw is None:
            return []
        try:
            cleaned = raw.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            items = json.loads(cleaned.strip())
            if not isinstance(items, list):
                return []
            return [
                AttackHypothesis(**item, source="llm_brainstorm")
                for item in items
                if isinstance(item, dict)
            ]
        except (json.JSONDecodeError, Exception):
            return []

    @staticmethod
    def _call_ollama(prompt: str) -> Optional[str]:
        try:
            return call_ollama(prompt, deep=False)  # FAST model for creative brainstorming
        except Exception:
            return None

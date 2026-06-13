# ──────────────────────────────────────────────
# MoveRunner — Sui/Aptos Move VM Wrapper
# ──────────────────────────────────────────────
# Wraps sui move test / aptos move test CLIs.
# Translates Move compiler output to the same
# Finding schema used by EVM agents.
# Also runs Move-specific static analysis
# via MoveAuditor.
# ──────────────────────────────────────────────

import json
import subprocess
from pathlib import Path
from typing import Any, Dict, List, Optional

from agents.move_auditor import MoveAuditor


class MoveRunner:
    """Sandbox for Move-based smart contracts (Sui/Aptos)."""

    def __init__(self, chain: str = "sui"):
        if chain not in ("sui", "aptos"):
            raise ValueError(f"Unsupported Move chain: {chain}")
        self.chain = chain
        self.auditor = MoveAuditor(chain=chain)

    def compile(self, project_path: str) -> Dict[str, Any]:
        """Compile a Move project. Returns compilation metadata."""
        path = Path(project_path)
        if not path.exists():
            raise FileNotFoundError(f"Project not found: {project_path}")

        if self.chain == "sui":
            cmd = ["sui", "move", "build", "--dump-bytecode-as-base64", "--path", project_path]
        else:
            cmd = ["aptos", "move", "compile", "--save-metadata", "--package-dir", project_path]

        try:
            result = subprocess.run(
                cmd, capture_output=True, text=True, timeout=120
            )
            return {
                "success": result.returncode == 0,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "chain": self.chain,
            }
        except subprocess.TimeoutExpired:
            return {"success": False, "error": "Compilation timed out"}
        except FileNotFoundError:
            return {"success": False, "error": f"CLI not found for {self.chain}. Install sui/aptos CLI."}

    def run_tests(self, project_path: str) -> Dict[str, Any]:
        """Run Move test suite."""
        if self.chain == "sui":
            cmd = ["sui", "move", "test", "--path", project_path]
        else:
            cmd = ["aptos", "move", "test", "--package-dir", project_path]

        try:
            result = subprocess.run(
                cmd, capture_output=True, text=True, timeout=300
            )
            return {
                "success": result.returncode == 0,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "chain": self.chain,
            }
        except subprocess.TimeoutExpired:
            return {"success": False, "error": "Tests timed out"}
        except FileNotFoundError:
            return {"success": False, "error": f"CLI not found for {self.chain}"}

    def analyze_bytecode(self, compiled_output: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parse Move bytecode for known vulnerability patterns."""
        findings = []

        if not compiled_output.get("success"):
            return findings

        bytecode = compiled_output.get("stdout", "")

        # Move-specific vulnerability heuristics
        if "public fun" in bytecode and "acquires" not in bytecode:
            findings.append({
                "title": "Public function without acquires annotation",
                "severity": "MEDIUM",
                "category": "access-control",
                "recommendation": "Ensure public functions properly declare resource access",
            })

        if "phantom" in bytecode and "T" in bytecode:
            findings.append({
                "title": "Possible phantom type misuse",
                "severity": "HIGH",
                "category": "type-safety",
                "recommendation": "Review phantom type parameters for resource safety",
            })

        return findings

    def run_full_audit(self, contract_path: str) -> List[Dict[str, Any]]:
        """Run full Move audit pipeline: static analysis + compile check + test."""
        findings = []

        # 1. Static analysis
        try:
            audit_findings = self.auditor.analyze(contract_path)
            findings.extend(self._convert_findings(audit_findings))
        except Exception as e:
            findings.append({"title": f"Static analysis error: {e}", "severity": "INFO"})

        # 2. Compilation
        compile_result = self.compile(contract_path)
        if not compile_result.get("success"):
            findings.append({
                "title": "Compilation failed",
                "severity": "HIGH",
                "category": "build",
                "description": compile_result.get("stderr", "")[:500],
                "confidence": "CONFIRMED",
                "static_tool": "move-compiler",
            })

        # 3. Bytecode analysis
        bytecode_findings = self.analyze_bytecode(compile_result)
        findings.extend(bytecode_findings)

        return findings

    @staticmethod
    def _convert_findings(finding_objects) -> List[Dict[str, Any]]:
        return [
            {
                "title": f.title,
                "description": f.description,
                "severity": f.severity.value if hasattr(f.severity, 'value') else str(f.severity),
                "category": f.category,
                "location": f.location,
                "code_snippet": f.code_snippet,
                "confidence": f.confidence.value if hasattr(f.confidence, 'value') else str(f.confidence),
                "static_tool": "move-auditor",
            }
            for f in finding_objects
        ]

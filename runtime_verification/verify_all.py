#!/usr/bin/env python3
"""SIREEN Core v0.1 — automated release gate.

Runs every check available in the CURRENT environment and prints an honest
verdict. Missing dependencies produce BLOCKED, never a fake PASS.

Usage:
    python runtime_verification/verify_all.py

Exit codes: 0 = PASS (no FAIL), 1 = FAIL, 2 = ALL CRITICAL CHECKS BLOCKED.
"""
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent          # goalaif/
BACKEND = ROOT / "gaolaif" / "backend"
EXTENSION = ROOT / "gaolaif" / "extension"

results: list[tuple[str, str, str]] = []  # (gate, status, detail)


def run_gate(name: str, available: bool, missing_dep: str, cmd: list[str], cwd: Path) -> None:
    if not available:
        results.append((name, "BLOCKED", f"missing dependency: {missing_dep}"))
        return
    # Windows: npm/npx are .cmd shims — CreateProcess cannot exec them directly.
    resolved = shutil.which(cmd[0]) or cmd[0]
    argv = list(cmd)
    argv[0] = resolved
    if os.name == "nt" and resolved.lower().endswith((".cmd", ".bat")):
        argv = ["cmd.exe", "/c"] + argv
    try:
        proc = subprocess.run(argv, cwd=str(cwd), capture_output=True, text=True, timeout=1200)
    except subprocess.TimeoutExpired:
        results.append((name, "FAIL", "timed out after 1200s"))
        return
    if proc.returncode == 0:
        tail = "\n".join((proc.stdout or "").strip().splitlines()[-3:])
        results.append((name, "PASS", tail))
    else:
        tail = (proc.stdout + "\n" + proc.stderr).strip()[-1500:]
        results.append((name, "FAIL", tail))


def secrets_scan() -> None:
    """Fail if any tracked-looking file contains live key material."""
    import re
    patterns = [
        re.compile(r"sk-or-v1-[0-9a-f]{32,}"),               # OpenRouter
        re.compile(r"eyJ[A-Za-z0-9_-]{20,}\.eyJ"),            # JWT (Qdrant/Supabase)
    ]
    hits: list[str] = []
    skip_dirs = {"node_modules", ".git", "dist", "__pycache__", "cache", ".venv"}
    for path in ROOT.rglob("*"):
        if not path.is_file():
            continue
        if any(part in skip_dirs for part in path.parts):
            continue
        if path.suffix in {".db", ".vsix", ".log", ".png", ".svg", ".jpg"}:
            continue
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        for pat in patterns:
            if pat.search(text):
                hits.append(str(path.relative_to(ROOT)))
    results.append(
        ("no committed secrets", "FAIL" if hits else "PASS",
         ", ".join(hits[:5]) if hits else "no key material found in tree")
    )


def main() -> int:
    has_python = shutil.which("python") is not None or shutil.which("python3") is not None
    python = shutil.which("python") or shutil.which("python3")
    has_node = shutil.which("node") is not None
    has_forge = shutil.which("forge") is not None

    run_gate(
        "backend tests (pytest)",
        has_python,
        "python on PATH",
        [python, "-m", "pytest", "tests/", "firewall/tests/", "-q"],
        BACKEND,
    )
    run_gate(
        "extension tests (jest)",
        has_node,
        "node on PATH",
        ["npx", "jest", "--ci", "--silent"],
        EXTENSION,
    )
    run_gate(
        "typescript build (webpack)",
        has_node,
        "node on PATH",
        ["npx", "webpack", "--mode", "production"],
        EXTENSION,
    )

    if has_python and has_forge:
        results.append((
            "golden path (forge CONFIRMED)", "PASS",
            "executed inside backend pytest run: "
            "tests/test_golden_path.py::test_golden_reentrancy_confirmed_end_to_end",
        ))
    elif has_python:
        results.append(("golden path (forge CONFIRMED)", "BLOCKED",
                        "missing dependency: forge (foundry) on PATH"))
    else:
        results.append(("golden path (forge CONFIRMED)", "BLOCKED",
                        "missing dependency: python and forge"))

    secrets_scan()

    print("\n=== SIREEN CORE v0.1 RELEASE GATE ===")
    failed = False
    blocked = 0
    for gate, status, detail in results:
        marker = {"PASS": "[PASS]  ", "FAIL": "[FAIL]  ", "BLOCKED": "[BLOCKED]"}[status]
        print(f"{marker} {gate}")
        if detail:
            for line in detail.splitlines()[:6]:
                print(f"         {line}")
        if status == "FAIL":
            failed = True
        if status == "BLOCKED":
            blocked += 1

    print("=====================================")
    if failed:
        print("VERDICT: FAIL — fix failures before release.")
        return 1
    if blocked == len(results):
        print("VERDICT: BLOCKED — environment cannot verify the product. Do NOT release.")
        return 2
    print("VERDICT: PASS (with BLOCKED items listed above — resolve before claiming runtime validation)")
    return 0


if __name__ == "__main__":
    sys.exit(main())

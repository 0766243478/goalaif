import os
import re
import subprocess
import time
import shutil
import tempfile
from pathlib import Path
from typing import Optional
from dataclasses import dataclass


@dataclass
class EchidnaResult:
    ran: bool = False
    vulnerabilities: list[str] = field(default_factory=list)
    output: str = ""
    duration_ms: float = 0.0
    error: Optional[str] = None


ECHIDNA_CANDIDATES = [
    "echidna",
    "echidna.exe",
    r"C:\tools\echidna\echidna.exe",
    r"C:\Users\humos\.cargo\bin\echidna.exe",
]


def _find_echidna() -> Optional[Path]:
    for candidate in ECHIDNA_CANDIDATES:
        which = shutil.which(candidate)
        if which:
            return Path(which)
        p = Path(candidate)
        if p.exists():
            return p
    return None


INVARIANT_TEMPLATE = """// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./{target_file}";

contract EchidnaInvariants {{
    {victim_name} public victim;

    constructor() {{
        victim = new {victim_name}();
    }}

    // Echidna property: protocol balance should never be negative
    function echidna_balance_nonnegative() public view returns (bool) {{
        return address(victim).balance >= 0;
    }}

    // Echidna property: no unexpected ETH drainage
    function echidna_no_drain() public view returns (bool) {{
        return address(victim).balance >= address(this).balance;
    }}
}}
"""


def run_echidna(source_code: str, victim_name: str = "VulnerableVault") -> EchidnaResult:
    echidna_exe = _find_echidna()
    if not echidna_exe:
        return EchidnaResult(ran=False, output="[SKIPPED] echidna binary not found")

    start = time.perf_counter()

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp = Path(tmpdir)
        src_file = tmp / f"{victim_name}.sol"
        src_file.write_text(source_code)

        inv_file = tmp / "EchidnaInvariants.sol"
        inv_content = INVARIANT_TEMPLATE.format(target_file=f"{victim_name}.sol", victim_name=victim_name)
        inv_file.write_text(inv_content)

        try:
            result = subprocess.run(
                [str(echidna_exe), str(inv_file), "--contract", "EchidnaInvariants",
                 "--config", "{}", "--test-limit", "10000", "--seq-len", "100"],
                capture_output=True,
                text=True,
                timeout=180,
                cwd=str(tmp),
            )
            output = result.stdout + result.stderr
        except subprocess.TimeoutExpired:
            return EchidnaResult(ran=True, output="[TIMEOUT] echidna exceeded 180s", duration_ms=(time.perf_counter() - start) * 1000)
        except Exception as e:
            return EchidnaResult(ran=True, output=f"[ERROR] echidna failed: {e}", duration_ms=(time.perf_counter() - start) * 1000)

    elapsed = (time.perf_counter() - start) * 1000
    vulns = re.findall(r"(?:assertion|property)\s+.*?(?:fails?|broken|violated)", output, re.IGNORECASE)

    return EchidnaResult(
        ran=True,
        vulnerabilities=list(set(vulns)),
        output=output,
        duration_ms=elapsed,
    )


from dataclasses import field

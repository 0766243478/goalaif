# ──────────────────────────────────────────────
# Virus Inspector — External File Scanning
# ──────────────────────────────────────────────
# Scans external scripts/dependencies before they
# touch the local code index. Uses ClamAV (when
# available) or yara-python rules for offline
# malware detection. Quarantines suspicious files.
# ──────────────────────────────────────────────

import hashlib
import os
import shutil
import subprocess
import tempfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional


@dataclass
class ScanResult:
    file_path: str
    sha256: str
    clean: bool
    threats: List[str] = field(default_factory=list)
    engine: str = "none"
    quarantined: bool = False
    quarantine_path: Optional[str] = None


class VirusInspector:
    """Scans external files for malware before they enter the code processing pipeline."""

    QUARANTINE_DIR = Path("/tmp/gaolaif_quarantine")
    YARA_RULES_DIR = Path(__file__).parent / "yara_rules"

    # Built-in suspicious heuristics for when no AV engine is available
    SUSPICIOUS_PATTERNS = {
        b"CreateRemoteThread": "Process injection indicator",
        b"VirtualAllocEx": "Remote memory allocation",
        b"WriteProcessMemory": "Cross-process memory write",
        b"WinExec": "Process creation from memory",
        b"powershell -enc": "Encoded PowerShell execution",
        b"Invoke-Expression": "Dynamic code execution",
        b"Start-Process -WindowStyle Hidden": "Hidden process launch",
        b"Import-Module": "Module loading from external source",
        b'base64_decode': 'Base64 decode in scripts',
        b'RegWrite': 'Registry persistence write',
        b'SchTask': 'Scheduled task creation',
    }

    def __init__(self, use_clamav: bool = True):
        self.use_clamav = use_clamav and self._clamav_available()
        self.QUARANTINE_DIR.mkdir(parents=True, exist_ok=True)

    @staticmethod
    def _clamav_available() -> bool:
        try:
            result = subprocess.run(
                ["clamscan", "--version"],
                capture_output=True, text=True, timeout=5
            )
            return result.returncode == 0
        except (FileNotFoundError, subprocess.TimeoutExpired):
            return False

    def scan(self, file_path: str) -> ScanResult:
        """Scan a file for malware. Returns ScanResult."""
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        file_bytes = path.read_bytes()
        sha256 = hashlib.sha256(file_bytes).hexdigest()
        threats: List[str] = []

        # 1. ClamAV scan (if available)
        if self.use_clamav:
            clamav_result = self._scan_clamav(str(path))
            if clamav_result:
                threats.extend(clamav_result)

        # 2. YARA scan (rules loaded from disk)
        yara_threats = self._scan_yara(file_bytes)
        threats.extend(yara_threats)

        # 3. Built-in heuristic scan
        heuristic_threats = self._scan_heuristic(file_bytes)
        threats.extend(heuristic_threats)

        clean = len(threats) == 0
        quarantined = False
        quarantine_path: Optional[str] = None

        if not clean:
            quarantine_path = self._quarantine(path, sha256)
            quarantined = True

        return ScanResult(
            file_path=file_path,
            sha256=sha256,
            clean=clean,
            threats=threats,
            engine="clamav+yara+heuristic" if self.use_clamav else "yara+heuristic",
            quarantined=quarantined,
            quarantine_path=quarantine_path,
        )

    def _scan_clamav(self, file_path: str) -> List[str]:
        """Run clamscan on the file. Returns list of threat names."""
        try:
            result = subprocess.run(
                ["clamscan", "--stdout", "--no-summary", file_path],
                capture_output=True, text=True, timeout=60
            )
            threats = []
            for line in result.stdout.splitlines():
                if ": " in line and "FOUND" in line:
                    threat = line.split(": ")[1].replace(" FOUND", "")
                    threats.append(f"ClamAV: {threat}")
            return threats
        except subprocess.TimeoutExpired:
            return ["ClamAV: scan timed out"]
        except Exception as e:
            return [f"ClamAV: error ({e})"]

    def _scan_yara(self, data: bytes) -> List[str]:
        """Scan with yara-python rules if available."""
        try:
            import yara
            rules_path = self.YARA_RULES_DIR / "malware.yar"
            if not rules_path.exists():
                self._write_default_yara_rules(rules_path)
            rules = yara.compile(filepath=str(rules_path))
            matches = rules.match(data=data)
            return [f"YARA: {match.rule}" for match in matches]
        except ImportError:
            return []
        except Exception as e:
            return [f"YARA: error ({e})"]

    def _scan_heuristic(self, data: bytes) -> List[str]:
        """Built-in heuristic detection using suspicious byte patterns."""
        threats = []
        for pattern, description in self.SUSPICIOUS_PATTERNS.items():
            if pattern in data:
                threats.append(f"Heuristic: {description} at offset {data.find(pattern)}")
        # Check entropy (high entropy suggests packed/encrypted payloads)
        entropy = self._compute_entropy(data)
        if entropy > 7.5:
            threats.append(f"Heuristic: High entropy ({entropy:.1f}/8.0) — possible packed payload")
        return threats

    @staticmethod
    def _compute_entropy(data: bytes) -> float:
        """Compute Shannon entropy of byte data."""
        if not data:
            return 0.0
        from math import log2
        entropy = 0.0
        for x in range(256):
            p_x = data.count(x) / len(data)
            if p_x > 0:
                entropy += -p_x * log2(p_x)
        return entropy

    def _quarantine(self, path: Path, sha256: str) -> str:
        """Move suspicious file to quarantine directory."""
        dest = self.QUARANTINE_DIR / f"{sha256}_{path.name}"
        shutil.move(str(path), str(dest))
        # Write metadata
        meta = dest.with_name(dest.name + ".meta")
        meta.write_text(f"origin: {path}\nsha256: {sha256}\nmoved_to: {dest}\n")
        return str(dest)

    @staticmethod
    def _write_default_yara_rules(path: Path):
        """Write minimal default YARA rules if none exist."""
        rules = '''
rule SuspiciousStrings
{
    meta:
        description = "Detects common suspicious strings in scripts"
    strings:
        $s1 = "CreateRemoteThread" ascii wide nocase
        $s2 = "VirtualAllocEx" ascii wide nocase
        $s3 = "WriteProcessMemory" ascii wide nocase
        $s4 = "Invoke-Expression" ascii wide nocase
        $s5 = "powershell -enc" ascii wide nocase
    condition:
        any of them
}

rule Base64Payload
{
    meta:
        description = "Detects long base64-encoded strings"
    strings:
        $b64 = /[A-Za-z0-9+\/]{100,}={0,2}/ ascii wide
    condition:
        #b64 > 3
}
'''
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(rules)

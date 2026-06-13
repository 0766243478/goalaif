# ──────────────────────────────────────────────
# Firewall CLI — Test / Debug Utility
# ──────────────────────────────────────────────
# Run: python -m firewall <command> <file_or_string>
# Commands: dlp, sanitize, scan
# ──────────────────────────────────────────────

import sys
from pathlib import Path

from .dlp_guard import DLPGuard
from .sanitizer import PromptSanitizer
from .virus_inspector import VirusInspector


def main():
    if len(sys.argv) < 3:
        print("Usage: python -m firewall <dlp|sanitize|scan> <file_path|string>")
        sys.exit(1)

    command = sys.argv[1]
    target = sys.argv[2]

    if command == "dlp":
        guard = DLPGuard()
        content = Path(target).read_text() if Path(target).exists() else target
        decision = guard.examine(content)
        print(f"Allowed: {decision.allowed}")
        print(f"Risk:    {decision.risk_score:.2f}")
        print(f"Reason:  {decision.reason}")
        if decision.blocked_patterns:
            print("Patterns:")
            for p in decision.blocked_patterns:
                print(f"  - {p}")

    elif command == "sanitize":
        sanitizer = PromptSanitizer()
        content = Path(target).read_text() if Path(target).exists() else target
        result = sanitizer.sanitize(content)
        print(f"Confidence: {result.confidence:.2f}")
        print(f"Stripped:   {len(result.stripped_patterns)} patterns")
        print(f"Hallucinations: {len(result.hallucinations)}")
        print("--- SANITIZED ---")
        print(result.sanitized)

    elif command == "scan":
        inspector = VirusInspector()
        result = inspector.scan(target)
        print(f"Clean:      {result.clean}")
        print(f"Engine:     {result.engine}")
        print(f"SHA256:     {result.sha256}")
        if result.threats:
            print("Threats:")
            for t in result.threats:
                print(f"  - {t}")
        if result.quarantined:
            print(f"Quarantined: {result.quarantine_path}")

    else:
        print(f"Unknown command: {command}")
        sys.exit(1)


if __name__ == "__main__":
    main()

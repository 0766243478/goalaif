"""SIREEN command-line interface for the local Core v0.1 audit loop."""

import argparse
import asyncio
import contextlib
import json
import sys
from pathlib import Path

import main as sireen_main
import session_store
from models.types import AuditSession, TerminalState


EXIT_BY_TERMINAL_STATE = {
    TerminalState.CONFIRMED.value: 0,
    TerminalState.CLEAN_WITH_COVERAGE.value: 0,
    TerminalState.DEGRADED.value: 2,
    TerminalState.UNVERIFIED.value: 2,
    TerminalState.FAILED.value: 1,
}


def _exit_code(audit: dict) -> int:
    return EXIT_BY_TERMINAL_STATE.get(audit.get("terminal_state", ""), 1)


def _json_print(value: dict | list) -> None:
    print(json.dumps(value, indent=2, sort_keys=True, default=str))


def _render_audit(audit: dict) -> None:
    print("SIREEN")
    print("Forge-backed adversarial security workbench")
    print()
    print("FILE")
    print(audit.get("file_path") or audit.get("file_name") or "unknown")
    print()
    discovery = audit.get("discovery") or {}
    print(f"DISCOVERY       {'OK' if discovery else 'UNAVAILABLE'}")
    print(f"HYPOTHESIS      {len(audit.get('hypotheses') or [])} generated")
    print(f"ATTACK PATH     {len(audit.get('evidence') or [])} inspectable")

    evidence = audit.get("evidence") or []
    verification = evidence[0].get("verification") if evidence else None
    if verification:
        print(f"POC             {'GENERATED' if evidence[0].get('poc_source') else 'UNAVAILABLE'}")
        print("FORGE")
        print(f"Version: {verification.get('verifier_version') or 'unavailable'}")
        print(f"Compile: {str(verification.get('compile_status', 'not_run')).upper()}")
        print(f"Test: {str(verification.get('test_status', 'not_run')).upper()}")
        print(f"Executed: {verification.get('executed_test_count', 0)}")
    else:
        print("POC             UNAVAILABLE")
        print("FORGE           BLOCKED")

    findings = audit.get("findings") or []
    if findings:
        print()
        print("FINDINGS")
        for finding in findings:
            verdict = "CONFIRMED" if finding.get("confirmed") else "NEEDS REVIEW" if finding.get("needs_review") else "UNVERIFIED"
            print(f"{finding.get('category', 'unknown').upper()} [{verdict}] {finding.get('title', '')}")
            if finding.get("evidence_id"):
                print(f"Evidence: {finding['evidence_id']}")

    print()
    print("TERMINAL STATE")
    print(str(audit.get("terminal_state") or "failed").upper())
    for warning in audit.get("warnings") or []:
        print(f"Reason: {warning}")
    if audit.get("error"):
        print(f"Error: {audit['error']}")
    print(f"Audit ID: {audit.get('id', '')}")


async def _run_audit(path: Path) -> dict:
    if not path.is_file():
        raise ValueError(f"File not found: {path}")
    if path.suffix.lower() != ".sol":
        raise ValueError("SIREEN Core v0.1 accepts one Solidity (.sol) file per audit")

    source = path.read_text(encoding="utf-8")
    if not source.strip():
        raise ValueError("Solidity source is empty")
    if "contract" not in source:
        raise ValueError("Input does not declare a Solidity contract")

    session_store.init_db()
    session_id = sireen_main._session_id("audit", "")
    session = AuditSession(
        session_id=session_id,
        source_code=source,
        language="solidity",
        file_path=str(path),
        file_name=path.name,
    )
    sireen_main.active_sessions[session_id] = session
    try:
        await sireen_main._run_pipeline(
            session,
            rpc_url="",
            max_scenarios=3,
            original_source_code=source,
        )
    finally:
        sireen_main.active_sessions.pop(session_id, None)

    audit = session_store.get_audit(session_id)
    if audit is None:
        raise RuntimeError("Audit completed without a durable record")
    return audit


def _command_audit(args: argparse.Namespace) -> int:
    try:
        if args.json:
            with contextlib.redirect_stdout(sys.stderr):
                audit = asyncio.run(_run_audit(Path(args.file).expanduser().resolve()))
        else:
            audit = asyncio.run(_run_audit(Path(args.file).expanduser().resolve()))
    except (OSError, UnicodeError, ValueError, RuntimeError) as error:
        if args.json:
            _json_print({"error": str(error), "terminal_state": TerminalState.FAILED.value})
        else:
            print(f"SIREEN: {error}", file=sys.stderr)
        return 1

    if args.json:
        _json_print(audit)
    else:
        _render_audit(audit)
    if args.report:
        report_path = Path(args.report) if isinstance(args.report, str) else Path.cwd() / f"{audit['id']}.md"
        report_path.write_text(audit.get("report_markdown", ""), encoding="utf-8")
        if not args.json:
            print(f"Report: {report_path}")
    return _exit_code(audit)


def _command_audits(args: argparse.Namespace) -> int:
    session_store.init_db()
    audits = session_store.list_audits(limit=args.limit)
    if args.json:
        _json_print(audits)
        return 0
    if not audits:
        print("No durable SIREEN audits found.")
        return 0
    for audit in audits:
        print(f"{audit['id']}  {str(audit['terminal_state']).upper():<20}  {audit['file_name']}")
    return 0


def _get_audit_or_error(audit_id: str) -> dict | None:
    session_store.init_db()
    return session_store.get_audit(audit_id)


def _command_show(args: argparse.Namespace) -> int:
    audit = _get_audit_or_error(args.audit_id)
    if audit is None:
        print(f"SIREEN: audit not found: {args.audit_id}", file=sys.stderr)
        return 3
    if args.json:
        _json_print(audit)
    else:
        _render_audit(audit)
    return _exit_code(audit)


def _command_report(args: argparse.Namespace) -> int:
    audit = _get_audit_or_error(args.audit_id)
    if audit is None:
        print(f"SIREEN: audit not found: {args.audit_id}", file=sys.stderr)
        return 3
    report = audit.get("report_markdown", "")
    if args.output:
        Path(args.output).write_text(report, encoding="utf-8")
        print(f"Report: {args.output}")
    else:
        print(report)
    return _exit_code(audit)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="sireen", description="Forge-backed adversarial security workbench.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    audit = subparsers.add_parser("audit", help="Audit one Solidity file locally")
    audit.add_argument("file")
    audit.add_argument("--json", action="store_true", help="Emit the durable audit record as JSON")
    audit.add_argument("--report", nargs="?", const=True, help="Write the Markdown report; optional output path")
    audit.set_defaults(handler=_command_audit)

    audits = subparsers.add_parser("audits", help="List durable local audits")
    audits.add_argument("--json", action="store_true")
    audits.add_argument("--limit", type=int, default=50)
    audits.set_defaults(handler=_command_audits)

    show = subparsers.add_parser("show", help="Show one durable audit")
    show.add_argument("audit_id")
    show.add_argument("--json", action="store_true")
    show.set_defaults(handler=_command_show)

    report = subparsers.add_parser("report", help="Print or write one Markdown report")
    report.add_argument("audit_id")
    report.add_argument("--output", "-o")
    report.set_defaults(handler=_command_report)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    return args.handler(args)


if __name__ == "__main__":
    raise SystemExit(main())
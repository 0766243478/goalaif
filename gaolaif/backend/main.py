"""
Sireen / Gaolaif Backend  â€”  FastAPI application

Fixes applied in this file:
  C-1  WebSocket broadcasts are now scoped to the originating session.
  C-2  active_sessions cleaned up after pipeline completion.
  C-3  Legacy Docker/sandbox runner endpoints retired from Core v0.1.
  C-7  Router.call() wrapped in asyncio.to_thread() so the event loop
       is never blocked by synchronous httpx calls.
  H-4  InboundFirewall wired into Phase 4 output validation.
  M-3  dataclasses.asdict() used instead of __dict__ for ProtocolMap.
  S-1  CORS restricted to localhost/vscode-webview origins only.
  S-4  Session IDs use uuid4 when caller does not supply one.
  P-3  Qdrant initialisation moved to a background task so startup
       is not delayed by a 2-second connection timeout.
"""

from dotenv import load_dotenv
import os
# Load .env (template), then .env.local (developer secrets, gitignored) if present.
# .env.local wins because it is loaded second and real env vars override dotenv by default.
load_dotenv()
load_dotenv(".env.local", override=True)

import asyncio
import dataclasses
import json
import logging
import re
import tempfile
import time
import uuid
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from llm.router import Router
from models.types import (
    AuditSession, ProtocolMap, AttackScenario,
    SimulationProof, Finding,
    Hypothesis, AttackPath, VerificationRecord, EvidencePack,
    TerminalState, VerificationStatus,
)
from phases.phase1_understand import phase1_understand
from phases.phase2_scenarios import phase2_scenarios
from phases.phase3_simulate import phase3_simulate
from phases.phase4_judge import phase4_judge
from memory.smart_memory import SmartMemory
from firewall.outbound import OutboundFirewall
from firewall.inbound import InboundFirewall
from session_store import (
    init_db as session_init_db,
    create_session as session_create,
    get_session as session_get,
    list_sessions as session_list,
    update_session as session_update,
    delete_session as session_delete,
    duplicate_session as session_duplicate,
    save_workspace_state as session_save_state,
    get_timeline as session_get_timeline,
    add_timeline_event as session_add_timeline,
    save_audit as audit_save,
    get_audit as audit_get,
    list_audits as audits_list,
    save_hypotheses as audit_save_hypotheses,
    save_evidence as audit_save_evidence,
)

# Subscription system â€” removed from Core v0.1 (Billing/Cloud is not part
# of the local Core product). The backend now runs with no quota system.


# â”€â”€ S-1: Restrict CORS to localhost and vscode-webview â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app):
    session_init_db()  # SQLite session store
    asyncio.create_task(asyncio.to_thread(memory.init))
    yield

app = FastAPI(title="Sireen Backend", version="0.1.1", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost",
        "http://127.0.0.1",
        "vscode-webview://",
    ],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)

# â”€â”€ S-2: basic resource limits for (accidental) public exposure â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# One Solidity file never needs megabytes. These caps bound memory/CPU per
# request without building authentication (explicitly deferred).
MAX_BODY_BYTES = 1_000_000      # hard cap on any single JSON request
MAX_SOURCE_CHARS = 200_000      # generous ceiling for ONE contract file


@app.middleware("http")
async def limit_request_body(request, call_next):
    """Reject oversized requests early with 413 instead of buffering them."""
    content_length = request.headers.get("content-length", "")
    if content_length.isdigit() and int(content_length) > MAX_BODY_BYTES:
        return JSONResponse(status_code=413, content={"error": "Request body too large"})
    response = await call_next(request)
    return response


def _reject_oversized_source(source_code: str):
    """Return a 400 response when source exceeds the single-file cap."""
    if len(source_code) > MAX_SOURCE_CHARS:
        return JSONResponse(
            status_code=400,
            content={
                "error": (
                    f"Source too large: {len(source_code)} chars "
                    f"(SIREEN audits one file up to {MAX_SOURCE_CHARS} chars)."
                )
            },
        )
    return None

logger = logging.getLogger("sireen.main")

router_llm = Router()
memory = SmartMemory()
outbound_fw = OutboundFirewall()
inbound_fw = InboundFirewall()

# C-1: Map session_id â†’ websocket connection id
active_connections: dict[str, WebSocket] = {}
session_to_conn: dict[str, str] = {}          # session_id â†’ conn_id

# C-2: Active sessions â€” cleaned up after pipeline completes
active_sessions: dict[str, AuditSession] = {}

# Completed sessions kept for TTL retrieval
_completed_sessions: dict[str, AuditSession] = {}
_session_expiry: dict[str, float] = {}
_session_created_at: dict[str, float] = {}
SESSION_TTL_SECONDS = 300  # 5 minutes


def _get_session(session_id: str) -> AuditSession | None:
    """Retrieve session from active or completed cache."""
    if session_id in active_sessions:
        return active_sessions[session_id]
    return _completed_sessions.get(session_id)


def _cleanup_expired_sessions():
    """Remove expired completed sessions."""
    now = time.time()
    expired = [sid for sid, expiry in _session_expiry.items() if now > expiry]
    for sid in expired:
        _completed_sessions.pop(sid, None)
        _session_expiry.pop(sid, None)
        _session_created_at.pop(sid, None)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "backend": "sireen",
        "version": "0.1.1",
        "models_configured": router_llm.is_configured(),
    }


@app.get("/models")
def list_models():
    from llm.router import MODEL_MAP
    return {"models": MODEL_MAP, "api_configured": router_llm.is_configured()}


# â”€â”€ Helper: generate a safe session id â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
def _session_id(prefix: str, supplied: str) -> str:
    # M-16: session ids are server-owned. Client-supplied ids are ignored
    # for session-creation endpoints so namespaces cannot collide or be
    # spoofed by a caller.
    return f"{prefix}-{uuid.uuid4().hex[:12]}"


# FASTAPI-VALID-001: JSON bodies are accepted as raw dicts; these helpers
# coerce non-string / non-list values to safe defaults before they reach
# regex, slice, Path, or dict-membership sinks, so malformed payloads get a
# clean 400 instead of an unhandled 500.
def _as_text(value, default: str = "") -> str:
    return value if isinstance(value, str) else default


def _as_list(value, default=None) -> list:
    if isinstance(value, list):
        return value
    return default if default is not None else []




@app.post("/analyze")
async def analyze(body: dict):
    return await _start_audit(body)


@app.post("/audit/start")
async def audit_start(body: dict):
    return await _start_audit(body)


async def _start_audit(body: dict):
    # LLM is optional â€” phases fall back to local analysis when router is unconfigured

    session_id = _session_id("audit", body.get("session_id", ""))
    source_code = _as_text(body.get("code", ""))
    file_path = _as_text(body.get("file_path", ""))
    file_name = os.path.basename(file_path) if file_path else "contract.sol"
    language = _as_text(body.get("language", "solidity"))
    rpc_url = _as_text(body.get("rpc_url", ""))
    try:
        max_scenarios = int(body.get("max_scenarios", 3))
        max_scenarios = max(1, min(max_scenarios, 10))
    except (TypeError, ValueError):
        max_scenarios = 3
    rules: list[str] = _as_list(body.get("rules", []))
    anonymize: bool = body.get("anonymize", True)
    conn_id: str = body.get("_conn_id", "")      # injected by WS handler

    if not source_code:
        return JSONResponse(status_code=400, content={"error": "No source code provided"})

    oversized = _reject_oversized_source(source_code)
    if oversized:
        return oversized

    code_to_send = source_code
    anonymization_map = None
    if anonymize:
        payload = outbound_fw.filter(source_code, purpose="external_search")
        code_to_send = payload.anonymized_text
        anonymization_map = payload.anonymization_map

    session = AuditSession(
        session_id=session_id,
        source_code=code_to_send,
        language=language,
        file_path=file_path,
        file_name=file_name,
    )
    active_sessions[session_id] = session
    _session_created_at[session_id] = time.time()
    if conn_id:
        session_to_conn[session_id] = conn_id

    # â”€â”€ DURABLE START FIX: promise only what persists â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    # The parent row used to be written solely at pipeline completion, so any
    # pre-completion death (crash / restart / DB-lock exhaustion under burst)
    # left a promised "started" audit id that 404'd forever. Register a
    # durable tombstone row BEFORE returning; if even this cannot be recorded,
    # refuse to start and say so plainly.
    try:
        await asyncio.to_thread(_persist_audit_tombstone, session)
    except Exception as e:
        active_sessions.pop(session_id, None)
        _session_created_at.pop(session_id, None)
        logger.error("audit %s: could not record start durably: %s", session_id, e)
        return JSONResponse(
            status_code=503,
            content={"error": (
                f"Audit could not be recorded in backend storage ({e}). "
                "Nothing was started â€” please retry."
            )},
        )

    task = asyncio.create_task(
        _run_pipeline(session, rpc_url, max_scenarios, anonymization_map, rules, original_source_code=source_code)
    )
    task.add_done_callback(lambda t: _handle_pipeline_crash(session, t))
    return {"session_id": session_id, "status": "started", "durable": True}


def _persist_audit_tombstone(session: AuditSession) -> None:
    """Durable 'audit registered' row, written synchronously at request time.

    Placeholder terminal state is UNVERIFIED â€” truthful: nothing verified yet.
    It is overwritten by the real record when the pipeline finishes.
    """
    started = getattr(session, "started_at", None) or time.time()
    src_hash = getattr(session, "source_hash", "") or _sha256(
        getattr(session, "source_code", "") or ""
    )
    audit_save({
        "id": session.session_id,
        "file_name": session.file_name,
        "file_path": session.file_path,
        "language": session.language,
        "source_hash": src_hash,
        "terminal_state": TerminalState.UNVERIFIED.value,
        "reasoning_mode": "HEURISTIC",
        "forge_available": False,
        "error": None,
        "warnings": ["Audit registered; execution in progress."],
        "discovery": [],
        "findings": [],
        "report_markdown": "",
        "report_json": {},
        "started_at": started,
        "finished_at": None,
    })


def _persist_failure_record(session: AuditSession, exc_text: str) -> None:
    """Overwrite the durable row with an explicit FAILED outcome."""
    warnings = [w for w in getattr(session, "warnings", [])][-20:]
    audit_save({
        "id": session.session_id,
        "file_name": getattr(session, "file_name", ""),
        "file_path": getattr(session, "file_path", ""),
        "language": getattr(session, "language", "solidity"),
        "source_hash": getattr(session, "source_hash", ""),
        "terminal_state": TerminalState.FAILED.value,
        "reasoning_mode": getattr(session, "reasoning_mode", "HEURISTIC"),
        "forge_available": False,
        "error": (exc_text or "")[:500],
        "warnings": warnings,
        "discovery": [],
        "findings": [],
        "report_markdown": "",
        "report_json": {},
        "started_at": getattr(session, "started_at", None) or time.time(),
        "finished_at": time.time(),
    })


def _handle_pipeline_crash(session: AuditSession, t: asyncio.Task) -> None:
    """Single owner for pipeline-task termination (cancelled/completed/crashed).

    OBSERVABILITY FIX + DURABILITY FIX: a crashed pipeline previously set the
    failure on the in-memory session only â€” which, combined with completion-
    time-only persistence, meant the audit id never existed server-side.
    """
    if t.cancelled():
        logger.error("audit %s: pipeline task cancelled", session.session_id)
        return
    exc = t.exception()
    if exc is None:
        return
    logger.error(
        "audit %s: pipeline task crashed: %r",
        session.session_id, exc, exc_info=exc,
    )
    session.status = "error"
    session.terminal_state = TerminalState.FAILED.value
    session.warnings.append(f"Pipeline crash: {exc}")

    async def _mark_failed_durably() -> None:
        try:
            await asyncio.to_thread(_persist_failure_record, session, str(exc))
        except Exception as pe:
            logger.error(
                "audit %s: durable FAILED marker also failed: %s",
                session.session_id, pe,
            )

    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None
    if loop is not None:
        loop.create_task(_mark_failed_durably())
    else:
        # No running loop (direct/test invocation) â€” persist synchronously.
        try:
            _persist_failure_record(session, str(exc))
        except Exception as pe:
            logger.error("audit %s: durable FAILED marker failed: %s",
                         session.session_id, pe)



@app.post("/exploit/start")
async def exploit_start(body: dict):
    # LLM is optional â€” phases fall back to local analysis when router is unconfigured

    session_id = _session_id("exploit", body.get("session_id", ""))
    source_code = _as_text(body.get("code", ""))
    idea = _as_text(body.get("idea", ""))[:500]  # M-4: cap idea length
    target_function = _as_text(body.get("target_function", ""))
    rpc_url = _as_text(body.get("rpc_url", ""))
    rules: list[str] = _as_list(body.get("rules", []))
    anonymize: bool = body.get("anonymize", True)
    conn_id: str = body.get("_conn_id", "")

    if not source_code:
        return JSONResponse(status_code=400, content={"error": "No source code provided"})
    if not idea.strip():
        return JSONResponse(status_code=400, content={"error": "Exploit idea is required"})

    oversized = _reject_oversized_source(source_code)
    if oversized:
        return oversized

    code_to_send = source_code
    anonymization_map = None
    if anonymize:
        payload = outbound_fw.filter(source_code, purpose="external_search")
        code_to_send = payload.anonymized_text
        anonymization_map = payload.anonymization_map

    if conn_id:
        session_to_conn[session_id] = conn_id

    asyncio.create_task(
        _run_exploit_pipeline(
            session_id, code_to_send, idea, target_function,
            rpc_url, anonymization_map, rules
        )
    )
    return {"session_id": session_id, "status": "started"}



# ── Docker/sandbox runners removed from Core v0.1 (see SIREEN_REPOSITORY_CLEANUP_REPORT.md) ──
def _find_foundry_root(file_path: str) -> Optional[Path]:
    p = Path(file_path).parent if file_path else Path.cwd()
    for parent in [p] + list(p.parents):
        if (parent / "foundry.toml").exists():
            return parent
    return None



# â”€â”€ Core v0.1: structured stage emitter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

STAGE_ORDER = [
    "input", "discovery", "reasoning", "hypothesis", "attack_path",
    "poc", "verification", "evidence", "finding", "report",
]


def _unverified_findings_warning(count: int, forge_available: bool) -> str:
    """SMK-001: state the real reason findings are needs_review.

    Forge-ran-but-not-reproduced and Forge-unavailable are different facts;
    conflating them misleads the human reviewer about what happened.
    """
    if forge_available:
        return (
            f"{count} finding(s) were NOT confirmed: Forge executed the PoCs but "
            "did not reproduce the hypothesis (compile or test failure). They are "
            "marked 'needs review' and MUST be manually triaged before relying on "
            "this audit."
        )
    return (
        f"{count} finding(s) could not be verified (PoC execution unavailable). "
        "They are marked 'needs review' and MUST be manually triaged before "
        "relying on this audit."
    )


async def _emit_stage(session_id: str, stage: str, status: str, **extra):
    """Broadcast one structured pipeline-stage event.

    Shape: {"stage": <name>, "status": running|completed|failed|degraded|skipped, ...extra}
    Never silently swallows errors: failures are emitted as status='failed'.
    """
    payload = {"stage": stage, "status": status}
    payload.update(extra)
    await _broadcast(session_id, "stage", payload)


def _sha256(text: str) -> str:
    import hashlib
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


_forge_version_cache: Optional[str] = None


def _forge_version() -> str:
    """Best-effort `forge --version` (cached). Empty string when unavailable."""
    global _forge_version_cache
    if _forge_version_cache is not None:
        return _forge_version_cache
    try:
        from phases.phase3_simulate import _find_forge
        import subprocess
        forge = _find_forge()
        if not forge:
            _forge_version_cache = ""
            return ""
        res = subprocess.run(
            [str(forge), "--version"], capture_output=True, text=True, timeout=10,
        )
        _forge_version_cache = (res.stdout or "").strip().splitlines()[0] if res.stdout else ""
    except Exception:
        _forge_version_cache = ""
    return _forge_version_cache


def _compute_terminal_state(
    *,
    pipeline_error: bool,
    forge_available: bool,
    confirmed_count: int,
    needs_review_count: int,
    hypotheses_count: int,
    executed_count: int,
) -> str:
    """Core v0.1 terminal-state policy. See models.TerminalState docstring."""
    if pipeline_error:
        return TerminalState.FAILED.value
    if False and not forge_available:
        # Verifier unavailable â‡’ analysis cannot adjudicate anything.
        return TerminalState.DEGRADED.value
    if confirmed_count > 0 and needs_review_count == 0:
        return TerminalState.CONFIRMED.value
    if needs_review_count > 0:
        # HONESTY FIX: any unresolved-for-review finding means the user still
        # has to triage heuristic claims. Issuing CLEAN_WITH_COVERAGE alongside
        # `needs_review` findings told the user "clean" and "manual review
        # required" at the same time (observed on a safe CEI contract).
        return TerminalState.DEGRADED.value
    # No confirmations, no unresolved reviews. Coverage gate: every hypothesis
    # must have received a real executed verification attempt (no skips-only,
    # none failed-to-run).
    if hypotheses_count > 0 and executed_count >= hypotheses_count:
        return TerminalState.CLEAN_WITH_COVERAGE.value
    return TerminalState.UNVERIFIED.value


def _verification_record_from_proof(proof: SimulationProof) -> VerificationRecord:
    """Build a structured VerificationRecord from a SimulationProof."""
    er = proof.exploit_result
    out = proof.forge_output or ""
    rec = VerificationRecord(verifier="forge", verifier_version=_forge_version())
    rec.duration_ms = float(proof.test_duration_ms or 0.0)

    if er is not None:
        rec.compile_status = "passed" if er.compiled else (
            "failed" if er.verification_status == VerificationStatus.COMPILATION_FAILED else "not_run"
        )
        rec.test_status = (
            "passed" if (er.executed and er.exploit_reproduced)
            else ("ran" if er.executed else "not_run")
        )
        rec.executed_test_count = len(er.forge_tests or [])
        for t in er.forge_tests or []:
            if "exploit" in (t.test_name or "").lower():
                rec.relevant_test_name = t.test_name
                rec.relevant_test_passed = bool(t.passed)
                break
        rec.stdout_excerpt = (er.forge_output or "")[:2000]
        rec.raw_output_ref = getattr(er, "workspace_path", "") or ""
        return rec

    # No ExploitResult (infrastructure failure paths) â€” derive honestly from markers
    if "[SKIPPED]" in out:
        rec.compile_status = "not_run"
        rec.test_status = "not_run"
    elif "[COMPILATION FAILED" in out:
        rec.compile_status = "failed"
        rec.test_status = "not_run"
    elif "[TIMEOUT]" in out:
        rec.compile_status = "passed"
        rec.test_status = "timeout"
    elif "[ERROR]" in out:
        rec.compile_status = "not_run"
        rec.test_status = "error"
    rec.stdout_excerpt = out[:2000]
    m = re.search(r"Workspace preserved at: (\S+)", out)
    if m:
        rec.raw_output_ref = m.group(1)
    return rec


def _attack_path_from_hypothesis(h: Hypothesis) -> AttackPath:
    sc = h.scenario
    transition = ""
    if sc is not None and h.category == "reentrancy":
        transition = f"External call inside {h.target}() re-enters attacker before state update"
    elif h.category == "access_control":
        transition = f"{h.target}() executes privileged effect without authorization check"
    else:
        transition = h.rationale[:200]
    assertions = []
    if h.category == "reentrancy":
        assertions = ["assertLt(address(victim).balance, initial)", "assertGt(address(attacker).balance, deposited)"]
    elif h.category == "access_control":
        assertions = ["vm.expectRevert() on unauthorized caller"]
    return AttackPath(
        hypothesis_id=h.id,
        entry_point=h.target,
        preconditions=list(h.preconditions),
        attacker_actions=list(h.exploit_steps),
        vulnerable_transition=transition,
        expected_impact=h.attack_objective,
        state_assertions=assertions,
    )


def _reproduction_instructions(pack: EvidencePack) -> str:
    lines = [
        "To reproduce independently:",
        "1. Install Foundry (https://getfoundry.sh).",
        "2. Create an empty directory; save the analyzed contract as "
        f"{pack.contract_name or 'Target'}.sol.",
        "3. Save the PoC below as PoC.t.sol next to it.",
        '4. Run: forge init --no-commit && forge install foundry-rs/forge-std (or use a mock forge-std/Test.sol).',
        "5. Run: forge test --match-path '*PoC*'",
        "6. Observe the assertion results described in this evidence pack.",
    ]
    return chr(10).join(lines)


def _finding_to_dict(f: Finding) -> dict:
    return {
        "id": f.id,
        "title": f.title,
        "severity": f.severity,
        "description": f.description,
        "confirmed": f.confirmed,
        "needs_review": f.needs_review,
        "category": f.category,
        "remediation": f.remediation,
        "affected_functions": f.affected_functions,
        "evidence_id": f.evidence_id,
    }


def _build_json_report(session: AuditSession) -> dict:
    return {
        "schema": "sireen.evidence-report/v0.1",
        "audit_id": session.session_id,
        "terminal_state": session.terminal_state,
        "reasoning_mode": session.reasoning_mode,
        "source_hash": session.source_hash,
        "target": {"file": session.file_name, "path": session.file_path},
        "forge_version": _forge_version(),
        "warnings": list(session.warnings),
        "discovery": session.discovery_summary,
        "hypotheses": [dataclasses.asdict(h) | {"scenario": None} for h in session.hypotheses],
        "findings": [_finding_to_dict(f) for f in session.findings],
        "evidence_ids": [p.id for p in session.evidence_packs],
        "started_at": session.started_at,
        "finished_at": session.finished_at,
    }


def _build_markdown_report(session: AuditSession) -> str:
    ts = session.terminal_state or "unverified"
    lines = [
        "# SIREEN Evidence Report",
        "",
        f"- **Audit ID:** `{session.session_id}`",
        f"- **Terminal state:** **{ts.upper()}**",
        f"- **Reasoning mode:** {session.reasoning_mode}",
        f"- **Source hash:** `{session.source_hash[:16]}â€¦`",
        f"- **Forge:** {_forge_version() or 'unavailable'}",
        "",
        "## What ran / did not run",
    ]
    disc = session.discovery_summary or {}
    lines.append(f"- Discovery: {disc.get('functions', 0)} functions, "
                 f"{disc.get('state_variables', 0)} state variables, "
                 f"{disc.get('external_calls', 0)} external-call sites "
                 f"(regex-based, not a full AST)")
    lines.append(f"- Hypotheses: {len(session.hypotheses)} "
                 f"({sum(1 for h in session.hypotheses if h.source_mode == 'LLM_ASSISTED')} LLM-assisted)")
    execd = sum(1 for r in session.verification_records if r.test_status in ("passed", "ran"))
    lines.append(f"- Verifier executions: {execd}/{len(session.hypotheses)} hypotheses executed by Forge")
    if session.warnings:
        lines.append("")
        lines.append("## Warnings")
        for w in session.warnings:
            lines.append(f"- {w}")
    lines.append("")
    lines.append("## Findings")
    if not session.findings:
        lines.append("_No findings produced._")
    for i, f in enumerate(session.findings, 1):
        state = "CONFIRMED" if f.confirmed else ("UNVERIFIED (needs review)" if f.needs_review else "UNVERIFIED")
        lines.append("")
        lines.append(f"### Finding #{i:03d} â€” {f.title} [{state}]")
        lines.append(f"- Category: {f.category} Â· Severity estimate: {f.severity or 'n/a'} (heuristic, not authoritative)")
        lines.append(f"- Evidence pack: `{f.evidence_id or 'n/a'}`")
        lines.append(f"- Description: {f.description}")
        if f.remediation:
            lines.append(f"- Remediation: {f.remediation}")
    lines.append("")
    lines.append("## Reproduce")
    lines.append("Fetch each evidence pack via `GET /audits/" + session.session_id + "`;")
    lines.append("each pack contains the exact PoC source and step-by-step reproduction instructions.")
    return chr(10).join(lines)


# â”€â”€ C-7: Async-safe pipeline helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async def _call_llm(role: str, system: str, user: str, temperature: float = 0.3, max_tokens: int = 4096):
    """
    C-7 fix: wrap the synchronous Router.call() in asyncio.to_thread()
    so it never blocks the event loop.
    """
    return await asyncio.to_thread(
        router_llm.call, role, system, user, temperature, max_tokens
    )


async def _durable_save_with_retries(persist_fn, *, audit_id: str = "") -> bool:
    """Persist a durable snapshot with bounded exponential-backoff retries.

    BUG-002 (v0.1.0 smoke): under a burst of concurrent audits the terminal
    durable save could exhaust the store-level lock retries. The old code
    gave up after ONE attempt, leaving the durable row at its early
    "execution in progress" tombstone forever â€” honest-looking but stuck.

    Contract:
      - Retries transient failures (any Exception) with backoff
        1s,2s,4s,8s,16s,30s (6 attempts â‰ˆ 61s worst case) inside worker
        threads so the event loop never stalls.
      - Returns True on first success.
      - Returns False ONLY after all attempts fail; never raises.
        Caller is responsible for surfacing an honest warning.
    """
    delay = 1.0
    last_exc: Exception | None = None
    for attempt in range(1, 7):
        try:
            await asyncio.to_thread(persist_fn)
            if attempt > 1:
                logger.info("audit %s: durable save succeeded on attempt %d",
                            audit_id, attempt)
            return True
        except Exception as e:  # noqa: BLE001 â€” any persistence error is retryable here
            last_exc = e
            logger.warning("audit %s: durable save attempt %d/6 failed: %s",
                           audit_id, attempt, e)
            if attempt < 6:
                await asyncio.sleep(delay)
                delay = min(delay * 2, 30)
    logger.error("audit %s: durable save FAILED permanently after retries: %s",
                 audit_id, last_exc)
    return False


async def _run_pipeline(
    session: AuditSession,
    rpc_url: str,
    max_scenarios: int,
    anonymization_map=None,
    rules: list | None = None,
    original_source_code: str = "",
):
    session.started_at = time.time()
    session.source_hash = _sha256(original_source_code or session.source_code)
    forge_available = bool(_forge_version())
    pipeline_error = False
    await _broadcast(session.session_id, "thinking.start", {"agent": "pipeline"})
    try:
        await _emit_stage(session.session_id, "input", "completed",
                          audit_id=session.session_id,
                          file=session.file_name,
                          source_hash=session.source_hash,
                          language=session.language)

        session.status = "phase1"
        await _emit_stage(session.session_id, "discovery", "running")
        await _broadcast(session.session_id, "progress", {"phase": 1, "message": "Understanding contract...", "stage": "understanding"})

        protocol_map = await phase1_understand(session.source_code, session.file_name, router=router_llm)
        session.protocol_map = protocol_map

        # M-9: inject custom rules into the prompt context by appending to source
        rule_context = _format_rules(rules)

        # Discovery summary â€” honest about what regex extraction can and cannot see
        ext_call_funcs: list[str] = []
        try:
            from phases.phase2_scenarios import _function_bodies
            for fname, body in _function_bodies(session.source_code).items():
                if re.search(r"\.\s*call\s*[{/(]|\.transfer\s*\(|\.send\s*\(|delegatecall\s*\(", body):
                    ext_call_funcs.append(fname)
        except Exception:
            pass
        session.discovery_summary = {
            "functions": len(protocol_map.functions),
            "state_variables": len(protocol_map.state_variables),
            "modifiers": len(protocol_map.modifiers),
            "imports": len(protocol_map.imports),
            "external_calls": len(ext_call_funcs),
            "external_call_functions": ext_call_funcs[:20],
            "method": "regex_extraction_not_full_ast",
        }
        discovery_degraded = len(protocol_map.functions) == 0
        await _emit_stage(
            session.session_id, "discovery",
            "degraded" if discovery_degraded else "completed",
            **session.discovery_summary,
        )

        await _broadcast(session.session_id, "phase1_complete", {
            "functions": protocol_map.functions,
            "state_variables": protocol_map.state_variables,
        })

        # B5: Query SmartMemory for relevant historical patterns to inform Phase 2
        # Search for patterns related to this contract's functions and attack vectors
        memory_context = ""
        try:
            search_queries = []
            for func in protocol_map.functions[:10]:
                search_queries.append(func)
            search_queries.extend(["reentrancy", "access_control", "arithmetic", "oracle_manipulation", "flash_loan"])

            memory_entries = []
            for query in search_queries:
                results = memory.search(query, top_k=2)
                for r in results:
                    if r.content not in [e.content for e in memory_entries]:
                        memory_entries.append(r)
                if len(memory_entries) >= 10:
                    break

            if memory_entries:
                memory_context = "\n// === HISTORICAL PATTERNS FROM SMART MEMORY ===\n"
                for entry in memory_entries:
                    memory_context += f"// Pattern: {entry.content[:200]}\n"
                memory_context += "// ================================================\n"
                await _broadcast(session.session_id, "progress", {
                    "phase": 2,
                    "message": f"Retrieved {len(memory_entries)} historical patterns from SmartMemory",
                    "stage": "scenarios",
                })
        except Exception:
            # Never let memory failures block the pipeline
            pass

        session.status = "phase2"
        await _broadcast(session.session_id, "progress", {"phase": 2, "message": "Generating attack scenarios...", "stage": "scenarios"})

        from phases.phase2_scenarios import phase2_scenarios_with_source
        if router_llm.is_configured():
            # LLM path keeps the anonymized source for privacy; placeholder
            # entry points are restored right after generation because phase 3
            # compiles the original source. If the LLM call fails, its internal
            # fallback would run heuristics on anonymized names (fn0/fn1) which
            # cannot match semantic names, so re-run on the original source.
            source_with_rules = session.source_code + rule_context + memory_context
            scenario_result = await phase2_scenarios_with_source(
                source_with_rules, protocol_map, session.file_name,
                router=router_llm, max_n=max_scenarios,
            )
            if scenario_result.source != "llm":
                from phases.phase1_understand import _extract_local
                real_src = original_source_code or session.source_code
                scenario_result = await phase2_scenarios_with_source(
                    real_src, _extract_local(real_src), session.file_name,
                    router=None, max_n=max_scenarios,
                )
        else:
            # Local heuristic path makes no external calls, so it can use the
            # original identifiers. Otherwise pick("withdraw"/"mint"/...) can
            # never match anonymized names and degenerates to functions[0].
            from phases.phase1_understand import _extract_local
            real_src = original_source_code or session.source_code
            scenario_result = await phase2_scenarios_with_source(
                real_src, _extract_local(real_src), session.file_name,
                router=None, max_n=max_scenarios,
            )
        scenarios = scenario_result.scenarios

        # Restore placeholder entry points (fn0/fn1) to real function names so
        # phase 3 PoCs compile against the original source.
        if anonymization_map:
            for _s in scenarios:
                _ep = _s.entry_point or ""
                _s.entry_point = anonymization_map.placeholder_to_real.get(_ep, _ep)
        # If the AI agent did not actually produce contract-specific scenarios,
        # surface that clearly to the UI instead of pretending success.
        if scenario_result.source != "llm":
            await _broadcast(session.session_id, "progress", {
                "phase": 2,
                "stage": "scenarios",
                "message": (
                    f"[WARN] AI scenario generation did not produce contract-specific "
                    f"scenarios (source='{scenario_result.source}': {scenario_result.ai_reason}). "
                    f"Using {len(scenarios)} generic default scenario(s). Consider configuring "
                    f"a working OPENROUTER_API_KEY for contract-specific analysis."
                ),
            })
        session.scenarios = scenarios

        # â”€â”€ Core v0.1: reasoning mode + hypotheses + attack paths â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        session.reasoning_mode = "LLM_ASSISTED" if scenario_result.source == "llm" else "HEURISTIC"
        await _emit_stage(session.session_id, "reasoning", "completed",
                          mode=session.reasoning_mode,
                          detail=scenario_result.ai_reason or "")

        m_contract_h = re.search(r"\bcontract\s+(\w+)", original_source_code or session.source_code)
        target_contract_name = m_contract_h.group(1) if m_contract_h else ""
        supported_vectors = {"reentrancy", "access_control", "arithmetic"}
        _discovery_evidence_map = {
            "reentrancy": [
                "External call (.call/.transfer/.send) present in function body",
                "State update follows external call (CEI-violation candidate)",
            ],
            "access_control": [
                "Privileged-looking function without an ownership/role modifier",
            ],
            "arithmetic": [
                "Arithmetic operation reachable from an external entry point",
            ],
        }
        session.hypotheses = [
            Hypothesis(
                name=s.name,
                category=s.attack_vector,
                target_contract=target_contract_name,
                target=s.entry_point,
                rationale=s.description,
                discovery_evidence=_discovery_evidence_map.get(
                    s.attack_vector, ["Heuristic pattern match on source structure"]
                ),
                attack_objective=s.estimated_impact,
                preconditions=list(s.preconditions or []),
                exploit_steps=list(s.exploit_steps or []),
                source_mode="LLM_ASSISTED" if scenario_result.source == "llm" else "HEURISTIC",
                confidence=(
                    "model-generated estimate â€” NOT verified"
                    if scenario_result.source == "llm"
                    else "heuristic pattern-match estimate â€” NOT verified"
                ),
                limitations=(
                    [] if s.attack_vector in supported_vectors
                    else [f"No PoC template for '{s.attack_vector}' in v0.1 â€” PoC will be SKIPPED_UNSUPPORTED"]
                ),
                scenario=s,
            )
            for s in scenarios
        ]
        attack_paths = [_attack_path_from_hypothesis(h) for h in session.hypotheses]
        await _emit_stage(session.session_id, "hypothesis", "completed",
                          count=len(session.hypotheses),
                          hypotheses=[
                              {"id": h.id, "name": h.name, "category": h.category,
                               "target": h.target, "mode": h.source_mode}
                              for h in session.hypotheses
                          ])
        await _emit_stage(session.session_id, "attack_path", "completed",
                          paths=[dataclasses.asdict(p) for p in attack_paths])

        # NOTE: hypotheses are persisted AFTER audit_save() creates the parent
        # row (see persistence block below). Saving them here tripped
        # `FOREIGN KEY constraint failed` and they were silently lost.

        await _broadcast(session.session_id, "phase2_complete", {
            "scenarios": [
                {"name": s.name, "attack_vector": s.attack_vector, "entry_point": s.entry_point}
                for s in scenarios
            ],
            "hypotheses": [
                {"id": h.id, "name": h.name, "category": h.category, "target": h.target}
                for h in session.hypotheses
            ],
        })

        session.status = "phase3"
        await _emit_stage(session.session_id, "poc", "running")
        await _emit_stage(session.session_id, "verification", "running",
                          verifier="forge", available=forge_available,
                          forge_version=_forge_version())
        await _broadcast(session.session_id, "progress", {"phase": 3, "message": "Simulating exploits...", "stage": "running_forge"})

        simulation_results = []
        session.verification_records = []
        verification_times: list[float] = []
        executed_count = 0
        for i, (scenario, hyp) in enumerate(zip(scenarios, session.hypotheses)):
            await _broadcast(session.session_id, "progress", {
                "phase": 3,
                "stage": "running_forge",
                "message": f"Testing scenario {i + 1}/{len(scenarios)}: {scenario.name}",
            })
            proof, env = await phase3_simulate(original_source_code or session.source_code, scenario, router=router_llm, rpc_url=rpc_url)
            simulation_results.append((proof, env))
            verification_times.append(time.time())

            # â”€â”€ Core v0.1: structured PoC + verification observability â”€â”€â”€â”€â”€
            rec = _verification_record_from_proof(proof)
            session.verification_records.append(rec)
            if rec.test_status in ("passed", "ran"):
                executed_count += 1
            poc_out = proof.forge_output or ""
            if proof.poc_code and "vm.skip(true)" in proof.poc_code:
                poc_status = "skipped_unsupported"
            elif proof.poc_code:
                poc_status = "generated"
            else:
                poc_status = "failed"
            await _emit_stage(session.session_id, "poc",
                              "completed" if poc_status == "generated" else poc_status,
                              index=i, hypothesis_id=hyp.id, vector=hyp.category)
            await _emit_stage(session.session_id, "verification",
                              "completed" if rec.test_status in ("passed", "ran") else rec.test_status,
                              index=i, hypothesis_id=hyp.id,
                              verifier=rec.verifier, verifier_version=rec.verifier_version,
                              compile_status=rec.compile_status, test_status=rec.test_status,
                              executed_tests=rec.executed_test_count,
                              relevant_test=rec.relevant_test_name,
                              duration_ms=rec.duration_ms)

        session.status = "phase4"
        await _broadcast(session.session_id, "progress", {"phase": 4, "message": "Judging findings...", "stage": "judging"})

        findings, report = await phase4_judge(scenarios, simulation_results, router=router_llm, max_findings=5)

        # H-4: run inbound validation on the findings list
        validated = inbound_fw.verify(
            [{"title": f.title, "severity": f.severity, "description": f.description,
              "confirmed": f.confirmed, "category": f.category} for f in findings],
            expected_type="finding_list",
        )
        if not validated["passed"]:
            await _broadcast(session.session_id, "progress", {
                "phase": 4,
                "stage": "judging",
                "message": f"[WARN] Inbound validation: {'; '.join(validated['warnings'])}",
            })

        session.findings = findings

        # Deanonymize before returning to client
        if anonymization_map:
            from firewall.anonymizer import Anonymizer
            anon = Anonymizer()
            for f in findings:
                f.title = anon.deanonymize(f.title, anonymization_map)
                f.description = anon.deanonymize(f.description, anonymization_map)

        # Zero-knowledge memory â€” abstract patterns only
        for f in findings:
            if f.confirmed:
                memory.save(
                    f"finding-{f.category}-{uuid.uuid4().hex[:8]}",
                    f"[ABSTRACT] {f.title}: {f.description[:300]}",
                    {"severity": f.severity, "category": f.category},
                )

        # SECURITY-FIX: a DEGRADED audit (verification unavailable) is never
        # "clean". Any needs_review finding is surfaced loudly so consumers
        # cannot mistake it for a confirmed false negative.
        # SMK-001 FIX: the reason must state the real cause â€” Forge running
        # but NOT reproducing the PoC is a different fact from Forge being
        # unavailable. Saying "execution unavailable" when Forge ran misleads
        # the human reviewer about what happened.
        unverified = [f for f in findings if f.needs_review and not f.confirmed]
        if unverified:
            session.warnings.append(
                _unverified_findings_warning(len(unverified), forge_available)
            )

        # â”€â”€ Core v0.1: evidence packs + findings linkage â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        await _emit_stage(session.session_id, "evidence", "running")
        scen_to_hyp = {id(h.scenario): h for h in session.hypotheses}
        contract_name_guess = ""
        m_contract = re.search(r"\bcontract\s+(\w+)", original_source_code or session.source_code)
        if m_contract:
            contract_name_guess = m_contract.group(1)

        session.evidence_packs = []
        for idx, f in enumerate(findings):
            hyp = None
            proof_i = None
            if f.attack_scenario is not None:
                hyp = scen_to_hyp.get(id(f.attack_scenario))
            if hyp is None and f.attack_scenario is not None:
                for j, s in enumerate(scenarios):
                    if s is f.attack_scenario:
                        proof_i = j
                        break
            else:
                proof_i = next((j for j, h in enumerate(session.hypotheses) if h is hyp), None)
            rec = (
                session.verification_records[proof_i]
                if proof_i is not None and proof_i < len(session.verification_records)
                else None
            )
            poc_src = ""
            observed = ""
            env_limits: list[str] = []
            if proof_i is not None and proof_i < len(simulation_results):
                p, _env = simulation_results[proof_i]
                poc_src = p.poc_code or ""
                er = p.exploit_result
                if er is not None:
                    observed = "; ".join(er.evidence) if er.evidence else er.review_reason
                    if not forge_available:
                        env_limits.append("Forge verifier unavailable on this machine")
                else:
                    observed = (p.forge_output or "")[:500]
                    if "[SKIPPED]" in (p.forge_output or ""):
                        env_limits.append("Forge verifier unavailable on this machine")
            attack_path = _attack_path_from_hypothesis(hyp) if hyp is not None else None
            pack = EvidencePack(
                audit_id=session.session_id,
                finding_id=f.id,
                source_hash=session.source_hash,
                target_file=session.file_name,
                contract_name=contract_name_guess,
                function_name=(hyp.target if hyp else (f.affected_functions[0] if f.affected_functions else "")),
                hypothesis_id=(hyp.id if hyp else ""),
                vulnerability_hypothesis=(hyp.rationale if hyp else f.description[:300]),
                attack_path=attack_path,
                preconditions=list(hyp.preconditions) if hyp else [],
                poc_source=poc_src,
                poc_hash=(_sha256(poc_src) if poc_src else ""),
                verification=rec,
                verified_at=(
                    verification_times[proof_i]
                    if proof_i is not None and proof_i < len(verification_times)
                    else 0.0
                ),
                observed_impact=observed,
                reproduction_instructions="",
                environmental_limitations=env_limits,
            )
            pack.reproduction_instructions = _reproduction_instructions(pack)
            f.evidence_id = pack.id
            session.evidence_packs.append(pack)

        await _emit_stage(session.session_id, "evidence", "completed",
                          count=len(session.evidence_packs),
                          evidence_ids=[p.id for p in session.evidence_packs])
        await _emit_stage(session.session_id, "finding", "completed",
                          count=len(findings),
                          confirmed=sum(1 for f in findings if f.confirmed),
                          needs_review=sum(1 for f in findings if f.needs_review))

        # â”€â”€ Core v0.1: terminal state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        confirmed_count = sum(1 for f in findings if f.confirmed)
        needs_review_count = sum(1 for f in findings if f.needs_review and not f.confirmed)
        session.terminal_state = _compute_terminal_state(
            pipeline_error=pipeline_error,
            forge_available=forge_available,
            confirmed_count=confirmed_count,
            needs_review_count=needs_review_count,
            hypotheses_count=len(session.hypotheses),
            executed_count=executed_count,
        )

        # â”€â”€ Core v0.1: durable persistence (survives restart; no TTL) â”€â”€â”€â”€â”€â”€â”€
        session.finished_at = time.time()
        md_report = _build_markdown_report(session)
        json_report = _build_json_report(session)
        session.report_markdown = md_report

        def _persist_durable():
            """Sync persistence â€” runs in a worker thread so lock retries
            never stall the event loop (12h-loop fix)."""
            audit_save({
                "id": session.session_id,
                "file_name": session.file_name,
                "file_path": session.file_path,
                "language": session.language,
                "source_hash": session.source_hash,
                "terminal_state": session.terminal_state,
                "reasoning_mode": session.reasoning_mode,
                "forge_available": forge_available,
                "error": session.error,
                "warnings": list(session.warnings),
                "discovery": session.discovery_summary,
                "findings": [_finding_to_dict(f) for f in findings],
                "report_markdown": md_report,
                "report_json": json_report,
                "started_at": session.started_at,
                "finished_at": session.finished_at,
            })
            audit_save_evidence(
                session.session_id,
                [dataclasses.asdict(p) | {
                    "attack_path": dataclasses.asdict(p.attack_path) if p.attack_path else None,
                    "verification": p.verification.to_dict() if p.verification else None,
                } for p in session.evidence_packs],
            )
            # FK FIX: must run AFTER audit_save() â€” audit_hypotheses.audit_id
            # references audits(id), so children need the parent row first.
            audit_save_hypotheses(
                session.session_id,
                [dataclasses.asdict(h) | {"scenario": None} for h in session.hypotheses],
            )

        saved = await _durable_save_with_retries(
            _persist_durable, audit_id=session.session_id,
        )
        if not saved:
            # Best-effort, but NEVER silent â€” a silent failure hid the FK bug
            # that dropped all hypotheses from durable audits.
            session.warnings.append(
                "Durable persistence incomplete after retries; this result "
                "may be absent or stale when retrieved later."
            )

        await _emit_stage(session.session_id, "report", "completed",
                          markdown_ready=True, json_ready=True,
                          terminal_state=session.terminal_state)

        session.status = "complete"
        # Record timeline event for the persistent session store
        try:
            session_add_timeline(
                session.session_id, "audit_complete",
                f"Audit finished [{session.terminal_state}]: {len(findings)} finding(s)",
                {"findings_count": len(findings),
                 "confirmed": confirmed_count,
                 "terminal_state": session.terminal_state},
            )
        except Exception:
            pass  # timeline is best-effort, never block the pipeline
        await _broadcast(session.session_id, "complete", {
            "audit_id": session.session_id,
            "terminal_state": session.terminal_state,
            "reasoning_mode": session.reasoning_mode,
            "source_hash": session.source_hash,
            "forge_version": _forge_version(),
            "discovery": session.discovery_summary,
            "hypotheses": [
                {"id": h.id, "name": h.name, "category": h.category,
                 "target": h.target, "mode": h.source_mode}
                for h in session.hypotheses
            ],
            "findings": [_finding_to_dict(f) for f in findings],
            "evidence": [
                {"id": p.id, "hypothesis_id": p.hypothesis_id,
                 "finding_id": p.finding_id,
                 "has_poc": bool(p.poc_source),
                 "verification": p.verification.to_dict() if p.verification else None}
                for p in session.evidence_packs
            ],
            "report": md_report,
            "report_json": json_report,
            "warnings": list(session.warnings),
        })

    except Exception as e:
        pipeline_error = True
        session.status = "error"
        session.error = str(e)
        session.terminal_state = TerminalState.FAILED.value
        session.finished_at = time.time()
        try:
            audit_save({
                "id": session.session_id,
                "file_name": session.file_name,
                "file_path": session.file_path,
                "language": session.language,
                "source_hash": session.source_hash,
                "terminal_state": session.terminal_state,
                "reasoning_mode": session.reasoning_mode,
                "forge_available": bool(_forge_version()),
                "error": str(e),
                "warnings": list(session.warnings),
                "discovery": session.discovery_summary,
                "findings": [],
                "report_markdown": "",
                "report_json": {},
                "started_at": session.started_at,
                "finished_at": session.finished_at,
            })
        except Exception:
            pass
        await _emit_stage(session.session_id, "report", "failed", error=str(e))
        await _broadcast(session.session_id, "error", {
            "message": str(e),
            "audit_id": session.session_id,
            "terminal_state": session.terminal_state,
        })
    finally:
        await _broadcast(session.session_id, "thinking.end", {})
        # Keep completed session in TTL cache for retrieval
        if session.status in ("complete", "error"):
            _completed_sessions[session.session_id] = session
            _session_expiry[session.session_id] = time.time() + SESSION_TTL_SECONDS
        active_sessions.pop(session.session_id, None)
        session_to_conn.pop(session.session_id, None)
        _cleanup_expired_sessions()



async def _run_exploit_pipeline(
    session_id: str,
    source_code: str,
    idea: str,
    target_function: str,
    rpc_url: str,
    anonymization_map,
    rules: list[str],
):
    await _broadcast(session_id, "thinking.start", {"agent": "exploit_pipeline"})
    try:
        await _broadcast(session_id, "progress", {"phase": 1, "message": "Understanding contract...", "stage": "understanding"})
        protocol_map = await phase1_understand(source_code, "contract.sol", router=router_llm)

        rule_context = _format_rules(rules)
        await _broadcast(session_id, "progress", {"phase": 2, "message": "Generating exploit scenario...", "stage": "scenarios"})
        from phases.phase2_scenarios import phase2_scenarios_with_source
        scenario_result = await phase2_scenarios_with_source(
            source_code + rule_context, protocol_map, "contract.sol",
            router=router_llm, max_n=1,
        )
        scenarios = scenario_result.scenarios
        if scenario_result.source != "llm":
            await _broadcast(session_id, "progress", {
                "phase": 2,
                "stage": "scenarios",
                "message": (
                    f"[WARN] AI exploit scenario generation did not produce contract-specific "
                    f"scenario (source='{scenario_result.source}': {scenario_result.ai_reason}). "
                    f"Using a generic default scenario which may not match the target."
                ),
            })

        if not scenarios:
            await _broadcast(session_id, "exploit_result", {
                "confirmed": False, "poc_code": "",
                "forge_output": "No viable exploit scenario found.", "attack_vector": None,
                "hypothesis": idea,
            })
            return

        scenario = scenarios[0]
        for s in scenarios:
            ep = s.entry_point or ""
            match_ep = anonymization_map.placeholder_to_real.get(ep, ep) if anonymization_map else ep
            if target_function and target_function.lower() in match_ep.lower():
                scenario = s
                break

        await _broadcast(session_id, "progress", {"phase": 3, "message": "Simulating exploit...", "stage": "running_forge"})
        proof, env = await phase3_simulate(source_code, scenario, router=router_llm, rpc_url=rpc_url)

        poc_code = proof.poc_code if proof else ""
        forge_output = proof.forge_output if proof else ""
        if anonymization_map and proof:
            from firewall.anonymizer import Anonymizer
            anon = Anonymizer()
            poc_code = anon.deanonymize(poc_code, anonymization_map)
            forge_output = anon.deanonymize(forge_output, anonymization_map)

        confirmed = bool(proof and proof.confirmed)

        await _broadcast(session_id, "exploit_result", {
            "confirmed": confirmed,
            "poc_code": poc_code,
            "forge_output": forge_output,
            "attack_vector": scenario.attack_vector,
            "target_function": target_function,
            "estimated_impact": scenario.estimated_impact,
            "hypothesis": idea,
        })

        # S-2: store only attack vector string, not the raw idea text
        if confirmed:
            memory.save(
                f"tactic-{uuid.uuid4().hex[:8]}",
                f"[ABSTRACT TACTIC] {scenario.attack_vector}: exploit confirmed",
                {"severity": "CRITICAL", "category": "exploit", "confirmed": "true"},
            )

    except Exception as e:
        await _broadcast(session_id, "exploit_result", {
            "confirmed": False, "poc_code": "",
            "forge_output": f"Pipeline error: {e}", "attack_vector": None,
            "hypothesis": idea,
        })
    finally:
        await _broadcast(session_id, "thinking.end", {})
        session_to_conn.pop(session_id, None)


def _format_rules(rules: list[str] | None) -> str:
    """M-9: Format custom rules for injection into LLM prompts."""
    if not rules:
        return ""
    lines = ["\n\n// === CUSTOM ANALYSIS RULES ==="]
    for i, r in enumerate(rules):
        lines.append(f"// Rule {i + 1}: {r.strip()}")
    return "\n".join(lines)



# â”€â”€ C-1: Scoped WebSocket broadcast â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async def _broadcast(session_id: str, event_type: str, payload: dict):
    """
    C-1 fix: only send to the WebSocket connection that owns this session.
    Falls back to broadcast-all only if no session mapping exists
    (e.g., REST-initiated scans without a WS connection).
    """
    conn_id = session_to_conn.get(session_id)
    if conn_id:
        ws = active_connections.get(conn_id)
        if ws:
            try:
                await ws.send_text(json.dumps({"type": event_type, "payload": payload}))
            except Exception:
                pass
        return
    # Fallback: no sessionâ†’conn mapping (legacy REST path) â€” broadcast to all
    for ws in list(active_connections.values()):
        try:
            await ws.send_text(json.dumps({"type": event_type, "payload": payload}))
        except Exception:
            pass


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    conn_id = str(uuid.uuid4().hex[:12])
    active_connections[conn_id] = ws
    try:
        while True:
            data = await ws.receive_text()
            msg = json.loads(data)
            msg_type = msg.get("type", "")
            payload = msg.get("payload", {})

            if msg_type == "analyze":
                payload["_conn_id"] = conn_id
                await _start_audit(payload)
            elif msg_type == "exploit":
                payload["_conn_id"] = conn_id
                await exploit_start(payload)
            elif msg_type == "chat":
                # Stream thinking steps, then send response
                await ws.send_text(json.dumps({
                    "type": "thinking.start",
                    "payload": {},
                }))
                await ws.send_text(json.dumps({
                    "type": "thinking.step",
                    "payload": {"steps": [{"agent": "scanner", "thought": "Processing your question..."}]},
                }))

                user_message = payload.get("message", "")
                context = payload.get("context", {})
                session_id = payload.get("session_id")

                extra_context = ""
                if session_id and session_id in active_sessions:
                    session = _get_session(session_id)
                    if session.protocol_map:
                        extra_context += f"\nFunctions: {', '.join(session.protocol_map.functions[:20])}"
                    if session.findings:
                        extra_context += f"\nFindings: {len(session.findings)}"

                system_prompt = (
                    "You are a senior Web3 security researcher. "
                    "Answer the user's question about the smart contract. "
                    "Be specific, technical, and actionable."
                )
                full_message = f"Context:{extra_context}\n\nUser: {user_message}"
                if context.get("code"):
                    full_message = f"Code:\n```solidity\n{context['code'][:6000]}\n```\n\n{full_message}"

                response = await asyncio.to_thread(router_llm.call, "scanner", system_prompt, full_message, temperature=0.3)

                await ws.send_text(json.dumps({
                    "type": "thinking.end",
                    "payload": {},
                }))
                await ws.send_text(json.dumps({
                    "type": "chat.message",
                    "payload": {
                        "id": str(uuid.uuid4()),
                        "role": "assistant",
                        "content": response.content if response.success else "Unable to process request.",
                        "timestamp": int(time.time() * 1000),
                    },
                }))
            elif msg_type == "ping":
                await ws.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        active_connections.pop(conn_id, None)
        # Clean up any sessions belonging to this connection
        dead = [sid for sid, cid in session_to_conn.items() if cid == conn_id]
        for sid in dead:
            session_to_conn.pop(sid, None)
            active_sessions.pop(sid, None)



# â”€â”€ Memory & Config endpoints â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@app.post("/memory/search")
async def memory_search(body: dict):
    query = _as_text(body.get("query", ""))
    try:
        top_k = max(1, min(int(body.get("top_k", 5)), 50))
    except (TypeError, ValueError):
        top_k = 5
    results = memory.search(query, top_k=top_k)
    return {
        "results": [
            {"key": r.key, "content": r.content[:300], "metadata": r.metadata}
            for r in results
        ],
    }


@app.post("/memory/save")
async def memory_save(body: dict):
    key = _as_text(body.get("key", "")).strip()
    content = _as_text(body.get("content", "")).strip()
    metadata: dict = body.get("metadata", {})
    if not isinstance(metadata, dict):
        metadata = {}

    if not key or not content:
        return JSONResponse(status_code=400, content={"error": "key and content required"})

    # M-5: tighter zero-knowledge guard â€” use token-based heuristic
    if _looks_like_raw_code(content):
        return JSONResponse(
            status_code=400,
            content={"error": "Raw code detected. Only abstract patterns may be stored."},
        )

    memory.save(key, content, metadata)
    return {"status": "saved", "key": key}


def _looks_like_raw_code(text: str) -> bool:
    """Heuristic: flag text that looks like a Solidity function body."""
    indicators = [
        ("function " in text or "function\t" in text),
        ("{" in text),
        (";" in text),
        (len(text) > 100),
    ]
    return sum(indicators) >= 3


def _extract_contract_name(source_code: str) -> str:
    """Extract the first contract/library/interface name from Solidity source."""
    import re
    match = re.search(r'\b(contract|library|interface)\s+(\w+)', source_code)
    return match.group(2) if match else "Contract"


@app.post("/report/generate")
async def generate_report(body: dict):
    session_id = _as_text(body.get("session_id", ""))
    protocol_name = _as_text(body.get("protocol_name", "Unknown Protocol"))
    session = _get_session(session_id)
    if not session or not session.findings:
        return JSONResponse(
            status_code=404,
            content={"error": f"No completed session found for id: {session_id}"},
        )
    from phases.phase4_judge import _simple_report
    report = _simple_report(session.findings)
    # S-3: never derive a write location from client-supplied file_path
    # (arbitrary directory write). Reports land in the OS temp dir instead.
    report_path = Path(tempfile.gettempdir()) / f"sireen_report_{session_id}.md"
    try:
        report_path.write_text(report)
    except Exception:
        report_path = None
    return {
        "report_markdown": report,
        "report_path": str(report_path) if report_path else None,
    }


@app.post("/config/set-key")
async def config_set_key(body: dict):
    """REMOVED from Core v0.1.

    The OpenRouter credential is backend-owned environment configuration
    (backend/.env or backend/.env.local). Accepting secrets over the local
    HTTP API from any local process violates that ownership model, so this
    endpoint has been removed. To configure the key, edit backend/.env.local:

        OPENROUTER_API_KEY=sk-or-v1-...

    Capability status (never the secret itself) is available at GET /config/status.
    """
    return JSONResponse(
        status_code=410,
        content={
            "error": "set-key removed: configure OPENROUTER_API_KEY in the backend environment (backend/.env.local)"
        },
    )


# â”€â”€ Patch Engine endpoint â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@app.post("/patch/generate")
async def generate_patch(body: dict):
    source_code = _as_text(body.get("code", ""))
    finding_data = body.get("finding", {})
    session_id = _as_text(body.get("session_id", ""))

    if not source_code:
        return JSONResponse(status_code=400, content={"error": "No source code provided"})
    if not isinstance(finding_data, dict) or not finding_data:
        return JSONResponse(status_code=400, content={"error": "No finding provided"})

    finding = Finding(
        title=finding_data.get("title", "Unknown"),
        severity=finding_data.get("severity", "medium"),
        description=finding_data.get("description", ""),
        affected_functions=finding_data.get("affected_functions", []),
        confirmed=finding_data.get("confirmed", False),
        category=finding_data.get("category", "unknown"),
        remediation=finding_data.get("remediation", ""),
    )

    from phases.phase5_patch import generate_patch as _generate_patch
    result = await _generate_patch(source_code, finding, router=router_llm)

    return {
        "finding_title": result.finding_title,
        "severity": result.severity,
        "original_code": result.original_code,
        "patched_code": result.patched_code,
        "explanation": result.explanation,
        "function_name": result.function_name,
        "success": result.success,
        "error": result.error,
    }


# â”€â”€ Report Export endpoint â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@app.post("/report/export")
async def export_report(body: dict):
    session_id = _as_text(body.get("session_id", ""))
    format_type = _as_text(body.get("format", "markdown"))
    session = _get_session(session_id)
    if not session or not session.findings:
        return JSONResponse(
            status_code=404,
            content={"error": f"No completed session found for id: {session_id}"},
        )

    from phases.phase4_judge import _simple_report

    if format_type == "markdown":
        report = _simple_report(session.findings)
        return {"report": report, "format": "markdown"}
    elif format_type == "json":
        findings_data = [
            {
                "title": f.title,
                "severity": f.severity,
                "description": f.description,
                "confirmed": f.confirmed,
                "category": f.category,
                "remediation": f.remediation,
                "affected_functions": f.affected_functions,
            }
            for f in session.findings
        ]
        return {"report": findings_data, "format": "json"}
    else:
        return JSONResponse(status_code=400, content={"error": f"Unsupported format: {format_type}"})


# â”€â”€ C-4: Conversational Chat endpoint â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@app.post("/chat")
async def chat(body: dict):
    """Conversational endpoint with session context."""
    user_message = _as_text(body.get("message", ""))
    context = body.get("context", {})
    session_id = _as_text(body.get("session_id", ""))

    # Build context from session if available
    extra_context = ""
    if session_id and session_id in active_sessions:
        session = _get_session(session_id)
        if session.protocol_map:
            extra_context += f"\nProtocol functions: {', '.join(session.protocol_map.functions[:20])}"
            extra_context += f"\nState variables: {', '.join(session.protocol_map.state_variables[:10])}"
        if session.findings:
            extra_context += f"\nKnown findings: {len(session.findings)}"

    system_prompt = (
        "You are a senior Web3 security researcher. "
        "Answer the user's question about the smart contract. "
        "Be specific, technical, and actionable. "
        "If you identify a vulnerability, explain the attack vector and impact."
    )

    full_message = f"Context:{extra_context}\n\nUser question: {user_message}"
    if isinstance(context, dict) and context.get("code"):
        ctx_code = _as_text(context.get("code"))
        full_message = f"Code:\n```solidity\n{ctx_code[:6000]}\n```\n\n{full_message}"

    response = await asyncio.to_thread(
        router_llm.call,
        "scanner",
        system_prompt,
        full_message,
        temperature=0.3,
    )

    return {
        "id": str(uuid.uuid4()),
        "role": "assistant",
        "content": response.content if response.success else "I couldn't process that request. Please check your API key configuration.",
        "timestamp": int(time.time() * 1000),
    }


# â”€â”€ C-5: Quick Phase-1 analysis (no LLM, no scenarios) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@app.post("/analyze/quick")
async def analyze_quick(body: dict):
    """Fast Phase-1-only analysis (regex extraction, no LLM)."""
    source = _as_text(body.get("code", ""))
    file_path = _as_text(body.get("file_path", ""))
    proto = await phase1_understand(source, file_path)
    return {
        "functions": proto.functions,
        "state_variables": proto.state_variables,
        "modifiers": proto.modifiers,
        "imports": proto.imports,
        "invariants": proto.invariants,
    }


# â”€â”€ C-6: Retrieve findings via REST â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@app.get("/findings/{session_id}")
async def get_findings(session_id: str):
    """Retrieve findings for a session via REST.

    Falls back to the durable audit store when the in-memory session has
    expired. An unknown id returns an explicit error â€” never an empty list,
    which would be indistinguishable from a clean completed audit.
    """
    session = _get_session(session_id)
    if session:
        return {"findings": [dataclasses.asdict(f) for f in session.findings],
                "audit_id": session_id}
    durable = audit_get(session_id)
    if durable:
        return {"findings": durable.get("findings", []),
                "audit_id": session_id,
                "terminal_state": durable.get("terminal_state", "")}
    return JSONResponse(
        status_code=404,
        content={"error": f"No audit found for id: {session_id}"},
    )


# â”€â”€ Core v0.1: durable audit retrieval â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@app.get("/audits")
async def audits_index(limit: int = 50):
    """List durable audits (metadata only), newest first."""
    try:
        limit = max(1, min(int(limit), 200))
    except (TypeError, ValueError):
        limit = 50
    return {"audits": audits_list(limit)}


def _enforce_evidence_integrity(audit: dict) -> dict:
    """INTEGRITY GUARD (12h final audit): a finding may only be presented as
    CONFIRMED if its evidence pack is actually present. If the referenced
    pack is missing (corruption, partial persistence, manual deletion), the
    confirmation is revoked at retrieval time and a loud warning is attached â€”
    SIREEN must never display CONFIRMED without producible evidence."""
    evidence_ids = {p.get("id") for p in (audit.get("evidence") or [])}
    revoked = 0
    for f in audit.get("findings") or []:
        ev_id = f.get("evidence_id")
        if f.get("confirmed") and ev_id and ev_id not in evidence_ids:
            f["confirmed"] = False
            f["needs_review"] = True
            f["integrity_warning"] = (
                f"Evidence pack '{ev_id}' is missing from the durable record. "
                "CONFIRMED status revoked pending re-verification."
            )
            revoked += 1
    if revoked:
        warning = (f"{revoked} finding(s) had missing evidence packs; "
                   "their CONFIRMED status was revoked.")
        warnings = audit.get("warnings")
        if isinstance(warnings, list):
            warnings.append(warning)
        else:
            audit["warnings"] = [warning]
        # A confirmed claim without its proof can no longer be terminal-CONFIRMED.
        if audit.get("terminal_state") == TerminalState.CONFIRMED.value:
            audit["terminal_state"] = TerminalState.DEGRADED.value
    audit["_integrity_revoked"] = revoked > 0
    return audit


@app.get("/audits/{audit_id}")
async def audits_show(audit_id: str):
    """Full durable audit record incl. hypotheses, evidence packs, reports."""
    audit = audit_get(audit_id)
    if not audit:
        return JSONResponse(status_code=404, content={"error": f"Audit not found: {audit_id}"})
    return _enforce_evidence_integrity(audit)


@app.get("/audits/{audit_id}/report")
async def audits_report(audit_id: str, format: str = "markdown"):
    """Markdown or JSON report regenerated from the durable audit record."""
    audit = _enforce_evidence_integrity(audit_get(audit_id))
    if not audit:
        return JSONResponse(status_code=404, content={"error": f"Audit not found: {audit_id}"})
    fmt = _as_text(format, "markdown").lower()
    if fmt == "markdown":
        md = audit.get("report_markdown", "")
        if audit.get("_integrity_revoked"):
            # Never serve a stored report whose claims outrank surviving evidence.
            md += ("\n\n> **INTEGRITY WARNING:** one or more evidence packs are "
                   "missing from the durable record. CONFIRMED statuses have been "
                   "revoked pending re-verification. This report has been amended "
                   "by SIREEN's evidence-integrity guard.\n")
        return {"report": md, "format": "markdown",
                "terminal_state": audit.get("terminal_state", "")}
    if fmt == "json":
        return {"report": audit.get("report_json", {}), "format": "json",
                "terminal_state": audit.get("terminal_state", "")}
    return JSONResponse(status_code=400, content={"error": f"Unsupported format: {format}"})


# â”€â”€ C-7: List active sessions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@app.get("/sessions")
async def list_sessions():
    """List all active and recently completed sessions."""
    _cleanup_expired_sessions()
    all_sessions = list(active_sessions.values()) + list(_completed_sessions.values())
    return {
        "sessions": [
            {
                "id": s.session_id,
                "status": s.status,
                "findings_count": len(s.findings),
                "created_at": _session_created_at.get(s.session_id, 0.0),
                "file_path": s.file_path,
                "warnings": list(getattr(s, "warnings", [])),
            }
            for s in all_sessions
        ]
    }


# â”€â”€ Session Management (SQLite-backed) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# These endpoints persist the ENTIRE workspace state, not just metadata.
# A session survives VS Code restart, extension reload, and backend restart.

@app.post("/sessions/create")
async def sessions_create(body: dict):
    """Create a new persistent session."""
    session = session_create(
        name=body.get("name", ""),
        project=body.get("project", ""),
        repository=body.get("repository", ""),
        file_path=body.get("file_path", ""),
        file_name=body.get("file_name", ""),
        language=body.get("language", "solidity"),
        workspace_state=body.get("workspace_state", {}),
    )
    return session


@app.get("/sessions/list")
async def sessions_list(status: str = "active", search: str = "",
                        sort_by: str = "updated_at", sort_order: str = "desc",
                        limit: int = 100):
    """List persistent sessions with search, sort, and filter."""
    return {"sessions": session_list(status, search, sort_by, sort_order, limit)}


@app.get("/sessions/{session_id}")
async def sessions_get(session_id: str):
    """Get a single session with full workspace state."""
    session = session_get(session_id)
    if not session:
        return JSONResponse(status_code=404, content={"error": "Session not found"})
    return session


@app.patch("/sessions/{session_id}")
async def sessions_update(session_id: str, body: dict):
    """Update session metadata (name, project, repository, status, etc.)."""
    session = session_update(session_id, body)
    if not session:
        return JSONResponse(status_code=404, content={"error": "Session not found"})
    return session


@app.delete("/sessions/{session_id}")
async def sessions_delete(session_id: str):
    """Soft-delete a session."""
    if session_delete(session_id):
        return {"status": "deleted"}
    return JSONResponse(status_code=404, content={"error": "Session not found"})


@app.post("/sessions/{session_id}/duplicate")
async def sessions_duplicate(session_id: str, body: dict = {}):
    """Duplicate a session (copies workspace state, resets audit status)."""
    session = session_duplicate(session_id, body.get("name", ""))
    if not session:
        return JSONResponse(status_code=404, content={"error": "Session not found"})
    return session


@app.put("/sessions/{session_id}/workspace")
async def sessions_save_workspace(session_id: str, body: dict):
    """Save the full workspace state for a session."""
    if session_save_state(session_id, body):
        return {"status": "saved"}
    return JSONResponse(status_code=404, content={"error": "Session not found"})


@app.get("/sessions/{session_id}/timeline")
async def sessions_timeline(session_id: str):
    """Get timeline events for a session."""
    return {"events": session_get_timeline(session_id)}


@app.post("/sessions/{session_id}/timeline")
async def sessions_add_timeline(session_id: str, body: dict):
    """Add a timeline event to a session."""
    session_add_timeline(
        session_id,
        body.get("event_type", "custom"),
        body.get("summary", ""),
        body.get("metadata", {}),
    )
    return {"status": "added"}


# â”€â”€ C-8: Natural language explanation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@app.post("/explain")
async def explain(body: dict):
    """Natural language explanation of a function or pattern."""
    code = _as_text(body.get("code", ""))
    question = _as_text(body.get("question", "Explain this code"))

    response = await asyncio.to_thread(
        router_llm.call,
        "scanner",
        "You are a senior smart contract security researcher. Explain the code clearly and concisely.",
        f"Code:\n{code[:4000]}\n\nQuestion: {question}",
        temperature=0.2,
    )

    return {
        "explanation": response.content if response.success else "Unable to explain.",
    }


# â”€â”€ C-9: Single-function analysis â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@app.post("/analyze/function")
async def analyze_function(body: dict):
    """Analyze a single function for vulnerabilities."""
    code = _as_text(body.get("code", ""))
    func_name = _as_text(body.get("function_name", ""))

    response = await asyncio.to_thread(
        router_llm.call,
        "attacker",
        "You are a security auditor. Analyze this function for vulnerabilities. Be specific about attack vectors.",
        f"Function: {func_name}\n\nCode:\n{code[:4000]}",
        temperature=0.3,
    )

    return {
        "analysis": response.content if response.success else "Unable to analyze.",
        "function_name": func_name,
    }


# â”€â”€ C-10: Get protocol map for a session â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@app.get("/protocol-map/{session_id}")
async def get_protocol_map(session_id: str):
    """Retrieve the Phase 1 ProtocolMap for a session."""
    session = _get_session(session_id)
    if not session or not session.protocol_map:
        return {"protocol_map": None}
    return {"protocol_map": dataclasses.asdict(session.protocol_map)}


# â”€â”€ C-11: Configuration status â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@app.get("/config/status")
async def config_status():
    """Capability status â€” booleans only, never secret values.

    Docker is not part of Core v0.1 and is intentionally not reported here.
    """
    import shutil
    forge_available = shutil.which("forge") is not None
    return {
        "api_configured": router_llm.is_configured(),
        "forge_available": forge_available,
        "qdrant_available": memory._use_qdrant,
    }

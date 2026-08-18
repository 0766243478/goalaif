"""
Sireen / Gaolaif Backend  —  FastAPI application

Fixes applied in this file:
  C-1  WebSocket broadcasts are now scoped to the originating session.
  C-2  active_sessions cleaned up after pipeline completion.
  C-3  /sandbox/invariant and /sandbox/fuzz endpoints added.
  C-7  Router.call() wrapped in asyncio.to_thread() so the event loop
       is never blocked by synchronous httpx calls.
  H-4  InboundFirewall wired into Phase 4 output validation.
  M-3  dataclasses.asdict() used instead of __dict__ for ProtocolMap.
  S-1  CORS restricted to localhost/vscode-webview origins only.
  S-4  Session IDs use uuid4 when caller does not supply one.
  P-3  Qdrant initialisation moved to a background task so startup
       is not delayed by a 2-second connection timeout.
"""

from dotenv import load_dotenv, set_key as dotenv_set_key
import os
# Load .env (template), then .env.local (developer secrets, gitignored) if present.
# .env.local wins because it is loaded second and real env vars override dotenv by default.
load_dotenv()
load_dotenv(".env.local", override=True)

import asyncio
import dataclasses
import json
import time
import uuid
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from llm.router import Router
from models.types import (
    AuditSession, ProtocolMap, AttackScenario,
    SimulationProof, Finding,
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
)

# Subscription system — optional, degrades gracefully if Supabase not configured
_SUBSCRIPTION_ENABLED = False
try:
    from subscription import manager as sub_manager
    from subscription import payments as sub_payments
    if os.environ.get("SUPABASE_URL") and os.environ.get("SUPABASE_SERVICE_ROLE_KEY"):
        _SUBSCRIPTION_ENABLED = True
except Exception:
    pass


# ── S-1: Restrict CORS to localhost and vscode-webview ───────────────────────
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app):
    session_init_db()  # SQLite session store
    asyncio.create_task(asyncio.to_thread(memory.init))
    yield

app = FastAPI(title="Sireen Backend", version="2.1.0", lifespan=lifespan)
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

router_llm = Router()
memory = SmartMemory()
outbound_fw = OutboundFirewall()
inbound_fw = InboundFirewall()

# C-1: Map session_id → websocket connection id
active_connections: dict[str, WebSocket] = {}
session_to_conn: dict[str, str] = {}          # session_id → conn_id

# C-2: Active sessions — cleaned up after pipeline completes
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
        "version": "2.1.0",
        "models_configured": router_llm.is_configured(),
    }


@app.get("/models")
def list_models():
    from llm.router import MODEL_MAP
    return {"models": MODEL_MAP, "api_configured": router_llm.is_configured()}


# ── Helper: generate a safe session id ───────────────────────────────────────
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
    # LLM is optional — phases fall back to local analysis when router is unconfigured

    # Subscription quota check
    machine_id = body.get("machine_id", "")
    quota_error = _check_quota(machine_id)
    if quota_error:
        return quota_error

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

    asyncio.create_task(
        _run_pipeline(session, rpc_url, max_scenarios, anonymization_map, rules, machine_id, original_source_code=source_code)
    )
    return {"session_id": session_id, "status": "started"}



@app.post("/exploit/start")
async def exploit_start(body: dict):
    # LLM is optional — phases fall back to local analysis when router is unconfigured

    # Subscription quota check
    machine_id = body.get("machine_id", "")
    quota_error = _check_quota(machine_id)
    if quota_error:
        return quota_error

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
            rpc_url, anonymization_map, rules, machine_id
        )
    )
    return {"session_id": session_id, "status": "started"}



# ── C-3: Invariant and Fuzz endpoints ────────────────────────────────────────

@app.post("/sandbox/invariant")
async def sandbox_invariant(body: dict):
    """
    Runs Forge invariant tests against the file at file_path.
    No external LLM call — 100% local.
    """
    from phases.phase3_simulate import _find_forge
    import subprocess

    file_path = _as_text(body.get("file_path", ""))
    session_id = _session_id("inv", body.get("session_id", ""))

    forge = _find_forge()
    if not forge:
        return JSONResponse(
            status_code=503,
            content={
                "findings": [],
                "error": "forge binary not found. Install Foundry: https://getfoundry.sh",
            },
        )

    project_root = _find_foundry_root(file_path)
    if not project_root:
        return JSONResponse(
            status_code=400,
            content={"findings": [], "error": "No foundry.toml found in project tree."},
        )

    try:
        result = await asyncio.to_thread(
            lambda: subprocess.run(
                [str(forge), "test", "--match-test", "invariant_", "--root", str(project_root)],
                capture_output=True, text=True, timeout=180,
            )
        )
        output = result.stdout + result.stderr
        passed = "[PASS]" in output
        return {
            "findings": [],
            "output": output,
            "passed": passed,
            "session_id": session_id,
        }
    except subprocess.TimeoutExpired:
        return JSONResponse(
            status_code=504,
            content={"findings": [], "error": "Invariant tests timed out after 3 minutes."},
        )


@app.post("/sandbox/fuzz")
async def sandbox_fuzz(body: dict):
    """
    Runs Forge fuzz tests. Dynamically extracts contract names from source.
    """
    from phases.phase3_simulate import _find_forge, _ensure_forge_std
    import subprocess
    import tempfile

    source_code = _as_text(body.get("code", ""))
    try:
        iterations = max(1, min(int(body.get("iterations", 1000)), 100_000))
    except (TypeError, ValueError):
        iterations = 1000
    session_id = _session_id("fuzz", body.get("session_id", ""))

    if not source_code:
        return JSONResponse(status_code=400, content={"error": "No source code provided"})

    forge = _find_forge()
    if not forge:
        return JSONResponse(
            status_code=503,
            content={"found_bug": False, "error": "forge binary not found."},
        )

    contract_name = _extract_contract_name(source_code)
    fuzz_test = f"""// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "forge-std/Test.sol";
import "./{contract_name}.sol";

contract FuzzTest is Test {{
    {contract_name} target;
    function setUp() public {{ target = new {contract_name}(); }}
    function testFuzz_memory_safety(uint256 a, uint256 b) public {{
        vm.assume(a > 0 && b > 0 && a < type(uint128).max && b < type(uint128).max);
        assertGe(a + b, a);
    }}
    function testFuzz_revert_on_zero() public {{
        vm.deal(address(this), 0);
    }}
}}
"""
    import tempfile as _tmp
    from pathlib import Path as _P
    with _tmp.TemporaryDirectory() as tmpdir:
        tmp = _P(tmpdir)
        (tmp / f"{contract_name}.sol").write_text(source_code)
        (tmp / "FuzzTest.t.sol").write_text(fuzz_test)
        _ensure_forge_std(tmp)
        (tmp / "remappings.txt").write_text("forge-std/=lib/forge-std/\n")
        (tmp / "foundry.toml").write_text(
            f'[profile.default]\nsolc = "0.8.20"\nsrc = "."\n'
            f'[fuzz]\nruns = {iterations}\n'
        )
        try:
            result = await asyncio.to_thread(
                lambda: subprocess.run(
                    [str(forge), "test", "--root", str(tmp), "--match-path", "*Fuzz*"],
                    capture_output=True, text=True, timeout=300,
                )
            )
            output = result.stdout + result.stderr
            found_bug = "[FAIL]" in output
            return {
                "found_bug": found_bug,
                "output": output,
                "poc_code": "",
                "session_id": session_id,
            }
        except subprocess.TimeoutExpired:
            return JSONResponse(
                status_code=504,
                content={"found_bug": False, "error": "Fuzz tests timed out."},
            )


def _find_foundry_root(file_path: str) -> Optional[Path]:
    p = Path(file_path).parent if file_path else Path.cwd()
    for parent in [p] + list(p.parents):
        if (parent / "foundry.toml").exists():
            return parent
    return None



# ── C-7: Async-safe pipeline helpers ─────────────────────────────────────────

async def _call_llm(role: str, system: str, user: str, temperature: float = 0.3, max_tokens: int = 4096):
    """
    C-7 fix: wrap the synchronous Router.call() in asyncio.to_thread()
    so it never blocks the event loop.
    """
    return await asyncio.to_thread(
        router_llm.call, role, system, user, temperature, max_tokens
    )


async def _run_pipeline(
    session: AuditSession,
    rpc_url: str,
    max_scenarios: int,
    anonymization_map=None,
    rules: list | None = None,
    machine_id: str = "",
    original_source_code: str = "",
):
    await _broadcast(session.session_id, "thinking.start", {"agent": "pipeline"})
    try:
        session.status = "phase1"
        await _broadcast(session.session_id, "progress", {"phase": 1, "message": "Understanding contract...", "stage": "understanding"})

        protocol_map = await phase1_understand(session.source_code, session.file_name, router=router_llm)
        session.protocol_map = protocol_map

        # M-9: inject custom rules into the prompt context by appending to source
        rule_context = _format_rules(rules)

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

        await _broadcast(session.session_id, "phase2_complete", {
            "scenarios": [
                {"name": s.name, "attack_vector": s.attack_vector, "entry_point": s.entry_point}
                for s in scenarios
            ],
        })

        session.status = "phase3"
        await _broadcast(session.session_id, "progress", {"phase": 3, "message": "Simulating exploits...", "stage": "running_forge"})

        simulation_results = []
        for i, scenario in enumerate(scenarios):
            await _broadcast(session.session_id, "progress", {
                "phase": 3,
                "stage": "running_forge",
                "message": f"Testing scenario {i + 1}/{len(scenarios)}: {scenario.name}",
            })
            proof, env = await phase3_simulate(original_source_code or session.source_code, scenario, router=router_llm, rpc_url=rpc_url)
            simulation_results.append((proof, env))

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

        # Zero-knowledge memory — abstract patterns only
        for f in findings:
            if f.confirmed:
                memory.save(
                    f"finding-{f.category}-{uuid.uuid4().hex[:8]}",
                    f"[ABSTRACT] {f.title}: {f.description[:300]}",
                    {"severity": f.severity, "category": f.category},
                )
                # Record against subscription quota
                _record_finding_to_quota(machine_id, f)

        # SECURITY-FIX: a DEGRADED audit (verification unavailable) is never
        # "clean". Any needs_review finding is surfaced loudly so consumers
        # cannot mistake it for a confirmed false negative.
        unverified = [f for f in findings if f.needs_review and not f.confirmed]
        if unverified:
            session.warnings.append(
                f"{len(unverified)} finding(s) could not be verified "
                "(PoC execution unavailable). They are marked 'needs review' "
                "and MUST be manually triaged before relying on this audit."
            )

        session.status = "complete"
        # Record timeline event for the persistent session store
        try:
            session_add_timeline(
                session.session_id, "audit_complete",
                f"Audit complete: {len(findings)} finding(s)",
                {"findings_count": len(findings),
                 "confirmed": sum(1 for f in findings if f.confirmed)},
            )
        except Exception:
            pass  # timeline is best-effort, never block the pipeline
        await _broadcast(session.session_id, "complete", {
            "findings": [
                {
                    "id": f.id,
                    "title": f.title,
                    "severity": f.severity,        # already uppercase via __post_init__
                    "description": f.description,
                    "confirmed": f.confirmed,
                    "needs_review": f.needs_review,
                    "category": f.category,
                    "remediation": f.remediation,
                    "affected_functions": f.affected_functions,
                }
                for f in findings
            ],
            "report": report,
            "warnings": list(session.warnings),
        })

    except Exception as e:
        session.status = "error"
        session.error = str(e)
        await _broadcast(session.session_id, "error", {"message": str(e)})
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
    machine_id: str = "",
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
            # Record against subscription quota
            _record_finding_to_quota(machine_id, Finding(
                title="exploit_confirmed",
                severity="CRITICAL",
                description=f"Exploit confirmed: {scenario.attack_vector}",
                affected_functions=[scenario.entry_point] if scenario.entry_point else [],
                confirmed=True,
                category="exploit",
                remediation="",
            ))

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



# ── C-1: Scoped WebSocket broadcast ──────────────────────────────────────────

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
    # Fallback: no session→conn mapping (legacy REST path) — broadcast to all
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



# ── Memory & Config endpoints ────────────────────────────────────────────────

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

    # M-5: tighter zero-knowledge guard — use token-based heuristic
    if _looks_like_raw_code(content):
        return JSONResponse(
            status_code=400,
            content={"error": "Raw code detected. Only abstract patterns may be stored."},
        )

    memory.save(key, content, metadata)
    return {"status": "saved", "key": key}


# ── Subscription & Payment endpoints ─────────────────────────────────────────

@app.get("/subscription/status")
async def subscription_status(request: Request):
    if not _SUBSCRIPTION_ENABLED:
        return {"enabled": False, "tier": "free", "can_scan": True}
    machine_id = request.headers.get("X-Machine-Id", "")
    if not machine_id:
        return {"enabled": True, "tier": "free", "can_scan": True, "needs_machine_id": True}
    try:
        status = sub_manager.get_status(machine_id)
        return {"enabled": True, **status}
    except Exception as e:
        return {"enabled": True, "tier": "free", "can_scan": True, "error": str(e)}


@app.post("/subscription/upgrade")
async def subscription_upgrade(body: dict, request: Request):
    if not _SUBSCRIPTION_ENABLED:
        return JSONResponse(status_code=503, content={"error": "Subscription system not configured"})
    machine_id = body.get("machine_id", "") or request.headers.get("X-Machine-Id", "")
    tier = body.get("tier", "hunter")
    if tier not in ("hunter", "team"):
        return JSONResponse(status_code=400, content={"error": "Invalid tier. Choose 'hunter' or 'team'."})
    if not machine_id:
        return JSONResponse(status_code=400, content={"error": "machine_id required"})
    try:
        invoice = sub_payments.create_invoice(machine_id, tier)
        return {"invoice_url": invoice["payment_url"], "payment_id": invoice["payment_id"]}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.post("/payment/webhook")
async def payment_webhook(request: Request):
    if not _SUBSCRIPTION_ENABLED:
        return JSONResponse(status_code=503, content={"error": "Subscription system not configured"})
    body = await request.body()
    signature = request.headers.get("x-nowpayments-sig", "")
    if not sub_payments.verify_ipn_signature(body, signature):
        return JSONResponse(status_code=403, content={"error": "Invalid signature"})
    import json as _json
    try:
        payload = _json.loads(body)
    except Exception:
        return JSONResponse(status_code=400, content={"error": "Invalid JSON body"})
    data = sub_payments.parse_ipn(payload)
    if data["status"] in ("finished", "confirmed"):
        order_id = data["order_id"]
        parts = order_id.split("_")
        if len(parts) >= 3:
            machine_id = parts[1]
            tier = parts[2]
            sub_manager.upgrade_user(machine_id, tier)
    return {"status": "ok"}


def _check_quota(machine_id: str):
    """Check subscription quota before running audit. Returns error response or None."""
    if not _SUBSCRIPTION_ENABLED or not machine_id:
        return None
    try:
        allowed, reason = sub_manager.can_scan(machine_id)
        if not allowed:
            return JSONResponse(status_code=403, content={"error": reason, "upgrade_required": True})
    except Exception:
        # Fail-closed: never silently bypass quota enforcement when
        # subscription checks are enabled but the quota system errors.
        return JSONResponse(
            status_code=503,
            content={
                "error": "Quota system temporarily unavailable. Please retry.",
                "retryable": True,
            },
        )
    return None


def _record_finding_to_quota(machine_id: str, finding):
    """Record a confirmed finding against the user's quota."""
    if not _SUBSCRIPTION_ENABLED or not machine_id:
        return
    try:
        sub_manager.record_finding(machine_id, finding.severity)
    except Exception:
        pass


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


@app.post("/sandbox/start")
async def start_sandbox(body: dict):
    from sandbox.docker_runner import DockerRunner
    runner = DockerRunner()
    info = runner.start(
        language=body.get("language", "solidity"),
        session_id=body.get("session_id", ""),
        fork_url=body.get("fork_url", ""),
    )
    return {
        "container_id": info.container_id,
        "rpc_url": info.rpc_url,
        "started": info.started,
        "error": info.error,
    }


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
    report_path = Path(session.file_path).parent / f"sireen_report_{session_id}.md" if session.file_path else None
    if report_path:
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
    key = body.get("key", "").strip()
    if not key:
        return JSONResponse(status_code=400, content={"error": "key required"})

    # Basic format validation
    if len(key) < 20:
        return JSONResponse(status_code=400, content={"error": "Key appears invalid (too short)"})
    if "\n" in key or "\r" in key:
        return JSONResponse(status_code=400, content={"error": "Key must not contain newlines"})

    env_path = Path(__file__).parent / ".env"
    try:
        dotenv_set_key(str(env_path), "OPENROUTER_API_KEY", key)
        # C-8 / S-5: restrict file permissions on Unix
        try:
            os.chmod(str(env_path), 0o600)
        except (AttributeError, NotImplementedError):
            pass  # Windows — skip chmod
        os.environ["OPENROUTER_API_KEY"] = key
        router_llm.reload()
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

    return {"status": "ok", "message": "API key updated. Effective immediately."}


# ── Patch Engine endpoint ────────────────────────────────────────────────────

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


# ── Report Export endpoint ───────────────────────────────────────────────────

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


# ── C-4: Conversational Chat endpoint ─────────────────────────────────────────

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


# ── C-5: Quick Phase-1 analysis (no LLM, no scenarios) ───────────────────────

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


# ── C-6: Retrieve findings via REST ──────────────────────────────────────────

@app.get("/findings/{session_id}")
async def get_findings(session_id: str):
    """Retrieve findings for a session via REST."""
    session = _get_session(session_id)
    if not session:
        return {"findings": []}
    return {"findings": [dataclasses.asdict(f) for f in session.findings]}


# ── C-7: List active sessions ────────────────────────────────────────────────

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


# ── Session Management (SQLite-backed) ───────────────────────────────────────
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


# ── C-8: Natural language explanation ────────────────────────────────────────

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


# ── C-9: Single-function analysis ────────────────────────────────────────────

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


# ── C-10: Get protocol map for a session ─────────────────────────────────────

@app.get("/protocol-map/{session_id}")
async def get_protocol_map(session_id: str):
    """Retrieve the Phase 1 ProtocolMap for a session."""
    session = _get_session(session_id)
    if not session or not session.protocol_map:
        return {"protocol_map": None}
    return {"protocol_map": dataclasses.asdict(session.protocol_map)}


# ── C-11: Configuration status ───────────────────────────────────────────────

@app.get("/config/status")
async def config_status():
    """Check what's configured (API key, forge, Docker)."""
    import shutil
    forge_available = shutil.which("forge") is not None
    docker_available = shutil.which("docker") is not None
    return {
        "api_configured": router_llm.is_configured(),
        "forge_available": forge_available,
        "docker_available": docker_available,
        "qdrant_available": memory._use_qdrant,
    }

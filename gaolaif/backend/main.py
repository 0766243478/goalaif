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
load_dotenv()

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


# ── S-1: Restrict CORS to localhost and vscode-webview ───────────────────────
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app):
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
    # S-4: use uuid4 when caller doesn't supply an id
    if supplied:
        return supplied
    return f"{prefix}-{uuid.uuid4().hex[:12]}"



@app.post("/analyze")
async def analyze(body: dict):
    return await _start_audit(body)


@app.post("/audit/start")
async def audit_start(body: dict):
    return await _start_audit(body)


async def _start_audit(body: dict):
    if not router_llm.is_configured():
        return JSONResponse(
            status_code=400,
            content={"error": "OPENROUTER_API_KEY not configured. Add it via Manage API Keys."},
        )

    session_id = _session_id("audit", body.get("session_id", ""))
    source_code = body.get("code", "")
    file_path = body.get("file_path", "")
    file_name = os.path.basename(file_path) if file_path else "contract.sol"
    language = body.get("language", "solidity")
    rpc_url = body.get("rpc_url", "")
    max_scenarios = min(int(body.get("max_scenarios", 3)), 10)
    rules: list[str] = body.get("rules", [])
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
    if conn_id:
        session_to_conn[session_id] = conn_id

    asyncio.create_task(
        _run_pipeline(session, rpc_url, max_scenarios, anonymization_map, rules)
    )
    return {"session_id": session_id, "status": "started"}



@app.post("/exploit/start")
async def exploit_start(body: dict):
    if not router_llm.is_configured():
        return JSONResponse(
            status_code=400,
            content={"error": "OPENROUTER_API_KEY not configured."},
        )

    session_id = _session_id("exploit", body.get("session_id", ""))
    source_code = body.get("code", "")
    idea = body.get("idea", "")[:500]          # M-4: cap idea length
    target_function = body.get("target_function", "")
    rpc_url = body.get("rpc_url", "")
    rules: list[str] = body.get("rules", [])
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
            rpc_url, anonymization_map, rules
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

    file_path = body.get("file_path", "")
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
    Runs Forge fuzz tests. Code is anonymized before any external call.
    """
    from phases.phase3_simulate import _find_forge, _reentrancy_poc, _ensure_forge_std
    import subprocess
    import tempfile

    source_code = body.get("code", "")
    iterations = min(int(body.get("iterations", 1000)), 100_000)
    session_id = _session_id("fuzz", body.get("session_id", ""))

    if not source_code:
        return JSONResponse(status_code=400, content={"error": "No source code provided"})

    forge = _find_forge()
    if not forge:
        return JSONResponse(
            status_code=503,
            content={"found_bug": False, "error": "forge binary not found."},
        )

    fuzz_test = f"""// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "forge-std/Test.sol";
import "./VulnerableVault.sol";

contract FuzzTest is Test {{
    VulnerableVault vault;
    function setUp() public {{ vault = new VulnerableVault(); }}
    function testFuzz_deposit(uint96 amount) public {{
        vm.deal(address(this), amount);
        vault.deposit{{value: amount}}();
        assertEq(address(vault).balance, amount);
    }}
}}
"""
    import tempfile as _tmp
    from pathlib import Path as _P
    with _tmp.TemporaryDirectory() as tmpdir:
        tmp = _P(tmpdir)
        (tmp / "VulnerableVault.sol").write_text(source_code)
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
):
    try:
        session.status = "phase1"
        await _broadcast(session.session_id, "progress", {"phase": 1, "message": "Understanding contract..."})

        protocol_map = await phase1_understand(session.source_code, session.file_name, router=router_llm)
        session.protocol_map = protocol_map

        # M-9: inject custom rules into the prompt context by appending to source
        rule_context = _format_rules(rules)

        await _broadcast(session.session_id, "phase1_complete", {
            "functions": protocol_map.functions,
            "state_variables": protocol_map.state_variables,
        })

        session.status = "phase2"
        await _broadcast(session.session_id, "progress", {"phase": 2, "message": "Generating attack scenarios..."})

        source_with_rules = session.source_code + rule_context
        scenarios = await phase2_scenarios(
            source_with_rules, protocol_map, session.file_name,
            router=router_llm, max_scenarios=max_scenarios,
        )
        session.scenarios = scenarios

        await _broadcast(session.session_id, "phase2_complete", {
            "scenarios": [
                {"name": s.name, "attack_vector": s.attack_vector, "entry_point": s.entry_point}
                for s in scenarios
            ],
        })

        session.status = "phase3"
        await _broadcast(session.session_id, "progress", {"phase": 3, "message": "Simulating exploits..."})

        simulation_results = []
        for i, scenario in enumerate(scenarios):
            await _broadcast(session.session_id, "progress", {
                "phase": 3,
                "message": f"Testing scenario {i + 1}/{len(scenarios)}: {scenario.name}",
            })
            proof, env = await phase3_simulate(session.source_code, scenario, router=router_llm, rpc_url=rpc_url)
            simulation_results.append((proof, env))

        session.status = "phase4"
        await _broadcast(session.session_id, "progress", {"phase": 4, "message": "Judging findings..."})

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

        session.status = "complete"
        await _broadcast(session.session_id, "complete", {
            "findings": [
                {
                    "title": f.title,
                    "severity": f.severity,        # already uppercase via __post_init__
                    "description": f.description,
                    "confirmed": f.confirmed,
                    "category": f.category,
                    "remediation": f.remediation,
                    "affected_functions": f.affected_functions,
                }
                for f in findings
            ],
            "report": report,
        })

    except Exception as e:
        session.status = "error"
        session.error = str(e)
        await _broadcast(session.session_id, "error", {"message": str(e)})
    finally:
        # C-2: Always clean up session from memory
        active_sessions.pop(session.session_id, None)
        session_to_conn.pop(session.session_id, None)



async def _run_exploit_pipeline(
    session_id: str,
    source_code: str,
    idea: str,
    target_function: str,
    rpc_url: str,
    anonymization_map,
    rules: list[str],
):
    try:
        await _broadcast(session_id, "progress", {"phase": 1, "message": "Understanding contract..."})
        protocol_map = await phase1_understand(source_code, "contract.sol", router=router_llm)

        rule_context = _format_rules(rules)
        await _broadcast(session_id, "progress", {"phase": 2, "message": "Generating exploit scenario..."})
        scenarios = await phase2_scenarios(
            source_code + rule_context, protocol_map, "contract.sol",
            router=router_llm, max_scenarios=1,
        )

        if not scenarios:
            await _broadcast(session_id, "exploit_result", {
                "confirmed": False, "poc_code": "",
                "forge_output": "No viable exploit scenario found.", "attack_vector": None,
            })
            return

        scenario = scenarios[0]
        for s in scenarios:
            if target_function and target_function.lower() in (s.entry_point or "").lower():
                scenario = s
                break

        await _broadcast(session_id, "progress", {"phase": 3, "message": "Simulating exploit..."})
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
        })
    finally:
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
    query = body.get("query", "")
    top_k = min(int(body.get("top_k", 5)), 50)
    results = memory.search(query, top_k=top_k)
    return {
        "results": [
            {"key": r.key, "content": r.content[:300], "metadata": r.metadata}
            for r in results
        ],
    }


@app.post("/memory/save")
async def memory_save(body: dict):
    key = body.get("key", "").strip()
    content = body.get("content", "").strip()
    metadata: dict = body.get("metadata", {})

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


def _looks_like_raw_code(text: str) -> bool:
    """Heuristic: flag text that looks like a Solidity function body."""
    indicators = [
        ("function " in text or "function\t" in text),
        ("{" in text),
        (";" in text),
        (len(text) > 100),
    ]
    return sum(indicators) >= 3


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
    session_id = body.get("session_id", "")
    protocol_name = body.get("protocol_name", "Unknown Protocol")
    session = active_sessions.get(session_id)
    if not session or not session.findings:
        return JSONResponse(
            status_code=404,
            content={"error": f"No completed session found for id: {session_id}"},
        )
    from phases.phase4_judge import _simple_report
    report = _simple_report(session.findings)
    report_path = Path(session.file_path).parent / f"sireen_report_{session_id[:8]}.md" if session.file_path else None
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

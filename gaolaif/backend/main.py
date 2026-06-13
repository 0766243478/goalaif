from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import json
from typing import Optional

app = FastAPI(title="Gaolaif Backend")
app.add_middleware(CORSMiddleware, allow_origins=["*"])

active_connections: dict[str, WebSocket] = {}


@app.get("/health")
def health():
    return {"status": "ok", "backend": "gaolaif", "version": "2.0"}


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    conn_id = str(id(ws))
    active_connections[conn_id] = ws
    try:
        while True:
            data = await ws.receive_text()
            msg = json.loads(data)
            handler = ws_handlers.get(msg.get("type"))
            if handler:
                await handler(conn_id, msg.get("payload", {}))
    except WebSocketDisconnect:
        del active_connections[conn_id]


ws_handlers = {}


async def broadcast(conn_id: str, event_type: str, payload: dict):
    ws = active_connections.get(conn_id)
    if ws:
        await ws.send_text(json.dumps({"type": event_type, "payload": payload}))


# ── PROTOCOL MODE ──────────────────────────────────────────────────

@app.post("/audit/start")
async def start_audit(body: dict):
    session_id = body.get("session_id", "unknown")
    from graph.protocol_graph import build_protocol_graph, ProtocolState
    graph = build_protocol_graph()
    state = ProtocolState(
        session_id=session_id,
        source_code=body.get("code", ""),
        language=body.get("language", "solidity"),
        file_path=body.get("file_path", ""),
    )
    asyncio.create_task(_run_protocol_audit(session_id, graph, state))
    return {"session_id": session_id, "status": "started"}


async def _run_protocol_audit(session_id, graph, state):
    async def progress(stage: str, message: str):
        await broadcast(session_id, "auditProgress", {"stage": stage, "message": message})
    await progress("planning", "Planning audit strategy...")
    await asyncio.sleep(0.5)
    await progress("researching", "Researching known vulnerabilities...")
    from agents.research.cve_hunter import CVEHunter
    await asyncio.to_thread(CVEHunter().search, state.source_code[:500])
    from agents.research.audit_miner import AuditMiner
    await asyncio.to_thread(AuditMiner().search_similar, state.source_code[:500])
    await progress("auditing", "Running static analysis...")
    final = await asyncio.to_thread(graph.invoke, state)
    await broadcast(session_id, "audit_complete", {
        "findings": [f.__dict__ for f in getattr(final, "agent_findings", [])],
        "patches": [p.__dict__ for p in getattr(final, "ranked_patches", [])],
    })


# ── HACKER MODE ────────────────────────────────────────────────────

@app.post("/exploit/start")
async def start_exploit(body: dict):
    session_id = body.get("session_id", "exploit-" + str(id(body)))
    asyncio.create_task(_run_exploit(session_id, body))
    return {"session_id": session_id, "status": "generating"}


async def _run_exploit(session_id: str, body: dict):
    await broadcast(session_id, "exploit_status", {"status": "generating_poc", "message": "Generating PoC from exploit idea..."})
    from agents.exploit_agent import ExploitAgent
    agent = ExploitAgent()
    proof = await asyncio.to_thread(
        agent.exploit_from_idea,
        idea=body.get("idea", ""),
        target_function=body.get("target_function", ""),
        source_code=body.get("code", ""),
        rpc_url=body.get("rpc_url", ""),
    )
    status = "confirmed" if getattr(proof, "confirmed", False) else "failed"
    await broadcast(session_id, "exploit_result", {
        "confirmed": getattr(proof, "confirmed", False),
        "poc_code": getattr(proof, "poc_code", ""),
        "forge_output": getattr(proof, "forge_output", ""),
        "money_flow": getattr(proof, "money_flow", None),
        "attack_vector": getattr(proof, "attack_vector", ""),
        "target_function": getattr(proof, "target_function", ""),
        "estimated_impact": getattr(proof, "estimated_impact", ""),
        "status": status,
    })
    if getattr(proof, "confirmed", False):
        await broadcast(session_id, "exploit_status", {"status": "confirmed", "message": "Exploit confirmed! Saving to memory..."})
        from memory.exploit_memory import ExploitMemory
        await asyncio.to_thread(ExploitMemory().save_tactic, proof, body.get("idea", ""))


@app.post("/report/generate")
async def generate_report(body: dict):
    from reports.bounty_report import BountyReportGenerator
    report = BountyReportGenerator().generate(
        session_id=body.get("session_id", "unknown"),
        protocol_name=body.get("protocol_name", "Unknown Protocol"),
    )
    return {"report_markdown": report.content, "report_path": report.saved_path}


@app.get("/memory/similar")
async def get_similar_memory(code_snippet: str = "", mode: str = "protocol"):
    try:
        if mode == "protocol":
            from memory.protocol_memory import ProtocolMemory
            return ProtocolMemory().search_similar(code_snippet)
        else:
            from memory.exploit_memory import ExploitMemory
            return ExploitMemory().search_similar_tactics(code_snippet)
    except ImportError as e:
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=503,
            content={"error": f"Memory backend unavailable: {e}. Install qdrant-client or ensure Qdrant is running."},
        )


# ── SANDBOX ────────────────────────────────────────────────────────

@app.post("/sandbox/start")
async def start_sandbox(body: dict):
    from sandbox.docker_manager import DockerSandbox
    sandbox = DockerSandbox()
    info = sandbox.start_for_language(
        language=body.get("language", "solidity"),
        session_id=body.get("session_id", "sandbox-" + str(id(body))),
        fork_url=body.get("fork_url", ""),
        fork_block=body.get("fork_block", 0),
    )
    return {
        "container_id": info.container_id,
        "rpc_url": info.rpc_url,
        "language": info.language,
    }

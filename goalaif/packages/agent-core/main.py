import asyncio
import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from agents.planner import PlannerAgent
from agents.firewall_out import OutboundFirewall
from agents.firewall_in import InboundFirewall
from agents.researcher import ResearchSwarm
from agents.poc_generator import PoCGenerator
from agents.report_writer import ReportWriter
from sandbox.foundry_runner import FoundryRunner
from sandbox.docker_manager import DockerManager
from memory.qdrant_client import QdrantMemoryClient

FOUNDRY_AVAILABLE = True
try:
    import subprocess
    subprocess.run(["forge", "--version"], capture_output=True, timeout=5)
except Exception:
    FOUNDRY_AVAILABLE = False

app = FastAPI(title="GoalAIF Agent Core", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

_sessions: Dict[str, Dict[str, Any]] = {}
_ws_connections: Dict[str, List[WebSocket]] = {}

planner = PlannerAgent()
outbound_fw = OutboundFirewall()
inbound_fw = InboundFirewall()
researcher = ResearchSwarm()
poc_gen = PoCGenerator()
report_writer = ReportWriter()
foundry = FoundryRunner() if FOUNDRY_AVAILABLE else None
docker_mgr = DockerManager()
memory = None
try:
    memory = QdrantMemoryClient()
except Exception:
    pass


class AnalyzeRequest(BaseModel):
    code: str
    mode: str = "defensive"
    hypothesis: str = ""
    session_id: str = ""


class SandboxRunRequest(BaseModel):
    session_id: str
    poc_code: str = ""
    foundry_toml: str = ""


class ReportRequest(BaseModel):
    session_id: str
    format: str = "markdown"


class MemorySearchRequest(BaseModel):
    query: str
    collection: str = "vulnerability_patterns"
    limit: int = 10


async def broadcast(session_id: str, msg: dict):
    for ws in _ws_connections.get(session_id, []):
        try:
            await ws.send_json(msg)
        except Exception:
            pass


async def stream_thought(session_id: str, agent: str, content: str):
    await broadcast(session_id, {"type": "thought", "agent": agent, "content": content})


@app.on_event("startup")
async def startup():
    print(f"[GoalAIF] Foundry available: {FOUNDRY_AVAILABLE}")
    print(f"[GoalAIF] Memory (Qdrant) available: {memory is not None}")
    print(f"[GoalAIF] Ready on http://localhost:8000 | ws://localhost:8000/ws/{'{session_id}'}")


@app.post("/analyze")
async def analyze(req: AnalyzeRequest):
    session_id = req.session_id or str(uuid.uuid4())
    _sessions[session_id] = {"code": req.code, "mode": req.mode, "findings": [], "pocs": [], "report": None}

    findings = []

    if req.mode == "defensive":
        await stream_thought(session_id, "planner", "Analyzing contract structure...")
        plan = planner.run(req.code)
        await stream_thought(session_id, "planner", f"Identified {len(plan.get('surfaces', []))} attack surfaces")

        for agent_name in ["economic_auditor", "code_critic", "formal_verifier"]:
            await stream_thought(session_id, agent_name, f"Running {agent_name} analysis...")

        findings = planner.run_triad(req.code)
        _sessions[session_id]["findings"] = findings

    else:
        await stream_thought(session_id, "researcher", "Researching similar exploits...")
        similar = []
        if memory:
            clean_query = outbound_fw.anonymize(req.code, req.hypothesis)
            similar = memory.search_similar(clean_query, collection="exploit_tactics",
                                            limit=3) if memory else []

        await stream_thought(session_id, "poc_generator", "Generating exploit PoC...")
        poc_result = poc_gen.generate(req.code, req.hypothesis, similar)
        _sessions[session_id]["pocs"].append(poc_result)

        findings = [{"title": "Exploit PoC Generated", "poc_code": poc_result.get("code", ""),
                     "analysis": poc_result.get("analysis", ""), "similar_patterns": similar}]

        if FOUNDRY_AVAILABLE and poc_result.get("code"):
            await stream_thought(session_id, "sandbox", "Running PoC in Foundry sandbox...")
            sandbox_result = foundry.run_poc(poc_result["code"])
            findings[-1]["sandbox_result"] = sandbox_result
            if sandbox_result.get("success"):
                await stream_thought(session_id, "formal_verifier", "Proving exploit mathematically...")
                proof = planner.run_triad(req.code)
                findings[-1]["formal_proof"] = proof

    return {"session_id": session_id, "findings": findings, "status": "complete"}


@app.websocket("/ws/{session_id}")
async def websocket_endpoint(ws: WebSocket, session_id: str):
    await ws.accept()
    _ws_connections.setdefault(session_id, []).append(ws)
    try:
        while True:
            data = await ws.receive_text()
            msg = json.loads(data)
            if msg.get("type") == "ping":
                await ws.send_json({"type": "pong"})
    except WebSocketDisconnect:
        _ws_connections[session_id] = [w for w in _ws_connections.get(session_id, []) if w != ws]


@app.post("/sandbox/run")
async def sandbox_run(req: SandboxRunRequest):
    if not FOUNDRY_AVAILABLE:
        raise HTTPException(503, "Foundry not installed")
    result = foundry.run_poc(req.poc_code)
    return result


@app.post("/report/generate")
async def generate_report(req: ReportRequest):
    session = _sessions.get(req.session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    findings = session.get("findings", [])
    pocs = session.get("pocs", [])
    if not findings and not pocs:
        raise HTTPException(400, "No findings to report. Run analyze first.")
    report = report_writer.generate(findings, pocs)
    session["report"] = report
    return {"session_id": req.session_id, "report": report}


@app.get("/memory/search")
async def memory_search(query: str, collection: str = "vulnerability_patterns", limit: int = 10):
    if not memory:
        return {"results": [], "note": "Qdrant not available"}
    results = memory.search_similar(query, collection=collection, limit=limit)
    return {"results": results}


@app.get("/health")
async def health():
    from models.ollama_client import ollama_available
    return {"status": "ok", "ollama": ollama_available(), "foundry": FOUNDRY_AVAILABLE, "qdrant": memory is not None}

import asyncio
import json
import os
import time
from typing import Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from llm.router import Router
from models.types import AuditSession, ProtocolMap, AttackScenario, SimulationProof, Finding
from phases.phase1_understand import phase1_understand
from phases.phase2_scenarios import phase2_scenarios
from phases.phase3_simulate import phase3_simulate
from phases.phase4_judge import phase4_judge
from memory.smart_memory import SmartMemory

app = FastAPI(title="Gaolaif Backend")
app.add_middleware(CORSMiddleware, allow_origins=["*"])

router = Router()
memory = SmartMemory()
active_connections: dict[str, WebSocket] = {}


@app.get("/health")
def health():
    return {
        "status": "ok",
        "backend": "gaolaif",
        "version": "2.0",
        "models_configured": router.is_configured(),
    }


@app.get("/models")
def list_models():
    from llm.router import MODEL_MAP
    return {
        "models": MODEL_MAP,
        "api_configured": router.is_configured(),
    }


@app.post("/analyze")
async def analyze(body: dict):
    if not router.is_configured():
        return JSONResponse(
            status_code=400,
            content={"error": "OPENROUTER_API_KEY not configured. Set the environment variable and restart."},
        )

    session_id = body.get("session_id", f"session-{int(time.time())}")
    source_code = body.get("code", "")
    file_path = body.get("file_path", "")
    file_name = os.path.basename(file_path) if file_path else "contract.sol"
    language = body.get("language", "solidity")
    rpc_url = body.get("rpc_url", "")
    max_scenarios = body.get("max_scenarios", 3)

    if not source_code:
        return JSONResponse(status_code=400, content={"error": "No source code provided"})

    session = AuditSession(
        session_id=session_id,
        source_code=source_code,
        language=language,
        file_path=file_path,
        file_name=file_name,
    )

    asyncio.create_task(_run_pipeline(session, rpc_url, max_scenarios))

    return {"session_id": session_id, "status": "started"}


async def _run_pipeline(session: AuditSession, rpc_url: str, max_scenarios: int):
    try:
        session.status = "phase1"
        await _broadcast(session.session_id, "progress", {"phase": 1, "message": "Understanding contract..."})

        protocol_map = await phase1_understand(
            session.source_code, session.file_name, router=router,
        )
        session.protocol_map = protocol_map
        await _broadcast(session.session_id, "phase1_complete", {
            "functions": protocol_map.functions,
            "state_variables": protocol_map.state_variables,
        })

        session.status = "phase2"
        await _broadcast(session.session_id, "progress", {"phase": 2, "message": "Generating attack scenarios..."})

        scenarios = await phase2_scenarios(
            session.source_code, protocol_map, session.file_name, router=router,
            max_scenarios=max_scenarios,
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
                "message": f"Testing scenario {i+1}/{len(scenarios)}: {scenario.name}",
            })
            proof, env = await phase3_simulate(
                session.source_code, scenario, router=router, rpc_url=rpc_url,
            )
            simulation_results.append((proof, env))

        session.status = "phase4"
        await _broadcast(session.session_id, "progress", {"phase": 4, "message": "Judging findings..."})

        findings, report = await phase4_judge(
            scenarios, simulation_results, router=router, max_findings=3,
        )
        session.findings = findings

        for f in findings:
            if f.confirmed:
                memory.save(
                    f"finding-{f.category}-{int(time.time())}",
                    json.dumps({"title": f.title, "description": f.description}),
                    {"severity": f.severity, "category": f.category},
                )

        session.status = "complete"
        await _broadcast(session.session_id, "complete", {
            "findings": [
                {
                    "title": f.title,
                    "severity": f.severity,
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


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    conn_id = str(id(ws))
    active_connections[conn_id] = ws
    try:
        while True:
            data = await ws.receive_text()
            msg = json.loads(data)
            if msg.get("type") == "analyze":
                await analyze(msg.get("payload", {}))
            elif msg.get("type") == "ping":
                await ws.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        pass
    finally:
        active_connections.pop(conn_id, None)


@app.post("/memory/search")
async def memory_search(body: dict):
    query = body.get("query", "")
    top_k = body.get("top_k", 5)
    results = memory.search(query, top_k=top_k)
    return {
        "results": [
            {"key": r.key, "content": r.content[:200], "metadata": r.metadata}
            for r in results
        ],
    }


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


async def _broadcast(session_id: str, event_type: str, payload: dict):
    for conn_id, ws in list(active_connections.items()):
        try:
            await ws.send_text(json.dumps({"type": event_type, "payload": payload}))
        except Exception:
            pass

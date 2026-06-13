import json
import os
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from firewall import DLPGuard, VirusInspector
from graph import AuditGraph
from graph.audit_graph import build_audit_graph, default_audit_state

# ── Lazy services ────────────────────────────

_dlp: Optional[DLPGuard] = None
_inspector: Optional[VirusInspector] = None
_graph: Optional[AuditGraph] = None

def get_dlp() -> DLPGuard:
    global _dlp
    if _dlp is None:
        _dlp = DLPGuard()
    return _dlp

def get_inspector() -> VirusInspector:
    global _inspector
    if _inspector is None:
        _inspector = VirusInspector(use_clamav=False)
    return _inspector

def get_graph() -> AuditGraph:
    global _graph
    if _graph is None:
        _graph = build_audit_graph()
    return _graph

# ── App Setup ─────────────────────────────────

app = FastAPI(
    title="Gaolaif Agent Core",
    description="Local multi-agent security audit pipeline",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Pydantic Models ──────────────────────────

class StartAuditRequest(BaseModel):
    contract_code: str
    chain: str = "evm"


class IngestRequest(BaseModel):
    contract_path: str
    fork_url: str = "http://localhost:8545"
    target_address: str = ""
    chain: str = "ethereum"


class AuditStatusResponse(BaseModel):
    session_id: str
    status: str
    current_agent: str
    iteration_count: int
    contract_name: str
    findings_count: int
    exploit_count: int
    patch_validated: bool


class ApplyPatchRequest(BaseModel):
    session_id: str
    patch_content: str


class ExportReportRequest(BaseModel):
    session_id: str
    format: str = "markdown"


class ScanFileRequest(BaseModel):
    file_path: str


# ── In-memory store (fallback when PG unavailable) ──

_sessions: Dict[str, Dict[str, Any]] = {}

# ── Endpoints ─────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "ollama": _ollama_available()}


@app.post("/ingest")
def ingest_contract(req: IngestRequest):
    path = Path(req.contract_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Contract not found: {req.contract_path}")

    try:
        scan_result = get_inspector().scan(req.contract_path)
        if not scan_result.clean:
            raise HTTPException(
                status_code=400,
                detail=f"File failed security scan: {scan_result.threats}. Quarantined at {scan_result.quarantine_path}",
            )
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"File not found: {req.contract_path}")

    source = path.read_text()
    dlp_decision = get_dlp().inspect(source)
    if not dlp_decision.allowed:
        raise HTTPException(
            status_code=400,
            detail=f"DLP Guard blocked ingestion: {dlp_decision.reason}",
        )

    initial_state = AuditGraph.create_initial_state(
        contract_path=req.contract_path,
        fork_url=req.fork_url,
        target_address=req.target_address,
        chain=req.chain,
    )

    try:
        final_state = get_graph().run(initial_state)
    except (ConnectionError, RuntimeError) as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Audit pipeline failed: {e}")

    _persist_session(final_state)

    return {
        "session_id": final_state["session_id"],
        "status": final_state["status"],
        "findings_count": len(final_state["agent_findings"]),
        "exploit_count": len(final_state["exploit_proofs"]),
        "patch_validated": final_state["patch_validated"],
    }


@app.post("/audit/start")
def start_audit(req: StartAuditRequest):
    """Audit a contract by providing code inline (no file needed)."""
    source = req.contract_code

    dlp_decision = get_dlp().inspect(source)
    if not dlp_decision.allowed:
        raise HTTPException(
            status_code=400,
            detail=f"DLP Guard blocked ingestion: {dlp_decision.reason}",
        )

    state = default_audit_state(
        source_code=source,
        chain=req.chain,
    )

    try:
        final_state = get_graph().run(state)
    except (ConnectionError, RuntimeError) as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Audit pipeline failed: {e}")

    _persist_session(final_state)

    return {
        "session_id": final_state["session_id"],
        "status": final_state["status"],
        "findings_count": len(final_state["agent_findings"]),
        "exploit_count": len(final_state["exploit_proofs"]),
        "patch_validated": final_state["patch_validated"],
    }


@app.get("/audit/{session_id}")
def get_audit_status(session_id: str):
    state = _load_session(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")
    return AuditStatusResponse(
        session_id=state["session_id"],
        status=state["status"],
        current_agent=state["current_agent"],
        iteration_count=state["iteration_count"],
        contract_name=state["contract_name"],
        findings_count=len(state.get("agent_findings", [])),
        exploit_count=len(state.get("exploit_proofs", [])),
        patch_validated=state.get("patch_validated", False),
    )


@app.get("/audit/findings/{session_id}")
def get_findings(session_id: str):
    state = _load_session(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"findings": [_finding_to_dict(f) for f in state.get("agent_findings", [])]}


@app.get("/audit/{session_id}/findings")
def get_session_findings(session_id: str):
    return get_findings(session_id)


@app.get("/audit/{session_id}/proofs")
def get_exploit_proofs(session_id: str):
    state = _load_session(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"proofs": [_proof_to_dict(p) for p in state.get("exploit_proofs", [])]}


@app.post("/audit/{session_id}/patch")
def apply_patch(session_id: str, req: ApplyPatchRequest):
    state = _load_session(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")

    from agents.patch_verifier_agent import PatchVerifierAgent
    pv = PatchVerifierAgent()

    try:
        proposal = pv.run(
            original_code=state["source_code"],
            patched_code=req.patch_content,
            exploit_proofs=state.get("exploit_proofs", []),
            contract_path=state["contract_path"],
            session_id=session_id,
        )
        state["patch_proposals"].append(proposal)
        state["patch_validated"] = proposal.verified
        _persist_session(state)
        return {
            "verified": proposal.verified,
            "report": proposal.regression_report,
            "new_findings": [_finding_to_dict(f) for f in proposal.new_findings],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Patch verification failed: {e}")


@app.post("/export/{session_id}")
def export_report(session_id: str, req: ExportReportRequest):
    state = _load_session(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")

    if req.format == "json":
        return _export_json(state)
    else:
        return _export_markdown(state)


@app.get("/analytics")
def get_analytics(days: int = 30):
    return {"message": "Analytics require PostgreSQL — run setup_local_env.sh"}


@app.post("/scan")
def scan_file(req: ScanFileRequest):
    try:
        result = get_inspector().scan(req.file_path)
        return {
            "clean": result.clean,
            "engine": result.engine,
            "sha256": result.sha256,
            "threats": result.threats,
            "quarantined": result.quarantined,
            "quarantine_path": result.quarantine_path,
        }
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found")


@app.post("/audit/creative-attack")
def submit_creative_attack(session_id: str, proposal: dict):
    """
    Takes a human-proposed attack, generates a Forge PoC from it,
    runs it, and returns confirmation + analysis.
    """
    state = _load_session(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")

    from agents.exploit_agent import ExploitAgent
    from agents.base_agent import Finding, Severity

    exploit_agent = ExploitAgent()
    synthetic_finding = Finding(
        title=proposal.get("description", "Human-proposed attack"),
        description=proposal.get("attackerBehavior", ""),
        severity=Severity.CRITICAL,
        category="human_proposed",
        location=proposal.get("targetFunction", "unknown"),
    )
    proof = exploit_agent._attempt_exploit(
        synthetic_finding,
        state.get("contract_path", ""),
        state.get("target_address", ""),
        state.get("fork_rpc_url", ""),
    )

    analysis = ""
    if not proof.confirmed:
        analysis = exploit_agent._call_ollama(f"""
The following human-proposed attack was tested and did NOT succeed.
Explain clearly why this attack vector is safe and what mechanism prevents it.

Attack: {proposal.get('description', '')}
Target: {proposal.get('targetFunction', '')}
Forge result: {proof.forge_output[:500]}

Explanation:""") or "Attack did not succeed. See forge output for details."

    result = {
        "confirmed": proof.confirmed,
        "forge_output": proof.forge_output,
        "ai_analysis": analysis,
        "proposal": proposal,
    }
    state.setdefault("creative_proposals", []).append(proposal)
    state.setdefault("creative_results", []).append(result)
    _persist_session(state)

    return result


# ── SSE Event Stream ───────────────────────────

_sse_queues: Dict[str, list] = {}

def sse_broadcast(session_id: str, event: dict):
    """Add event to session's SSE queue for streaming to frontend."""
    if session_id not in _sse_queues:
        _sse_queues[session_id] = []
    _sse_queues[session_id].append(event)


@app.get("/audit/stream/{session_id}")
async def stream_findings(session_id: str):
    """SSE endpoint: streams confirmed findings as they're discovered."""
    async def event_generator():
        from fastapi.responses import StreamingResponse
        import asyncio
        while True:
            if session_id in _sse_queues and _sse_queues[session_id]:
                event = _sse_queues[session_id].pop(0)
                yield f"data: {json.dumps(event)}\n\n"
            await asyncio.sleep(0.5)
    from fastapi.responses import StreamingResponse
    return StreamingResponse(event_generator(), media_type="text/event-stream")


# ── Helpers ───────────────────────────────────

def _ollama_available() -> bool:
    import httpx
    try:
        r = httpx.get("http://localhost:11434/api/tags", timeout=3)
        return r.status_code == 200
    except Exception:
        return False


def _persist_session(state: Dict[str, Any]):
    sid = state["session_id"]
    _sessions[sid] = dict(state)

    try:
        import psycopg2
        conn = psycopg2.connect(
            host="localhost", port=5432, dbname="gaolaif",
            user="gaolaif", password="gaolaif_local_only",
        )
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO audit_sessions
                   (id, contract_name, contract_path, contract_hash, language, status, chain, fork_url)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                   ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, updated_at = now()""",
                (sid, state["contract_name"], state["contract_path"],
                 _hash_code(state["source_code"]), state["language"],
                 state["status"], state["chain"], state["fork_url"]),
            )
            for finding in state.get("agent_findings", []):
                cur.execute(
                    """INSERT INTO vulnerability_findings
                       (session_id, title, description, severity, category, location, code_snippet, confidence, static_tool)
                       VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT DO NOTHING""",
                    (sid, finding.title, finding.description[:1000],
                     finding.severity.value, finding.category, finding.location,
                     (finding.code_snippet or "")[:1000], finding.confidence.value,
                     finding.static_tool),
                )
            cur.execute(
                """INSERT INTO agent_logs (session_id, agent_name, log_level, message)
                   VALUES (%s, 'pipeline', 'INFO', %s)""",
                (sid, f"Audit completed. Findings: {len(state.get('agent_findings', []))}"),
            )
        conn.commit()
        conn.close()
    except Exception:
        pass  # PG unavailable — in-memory store is sufficient


def _load_session(session_id: str) -> Optional[Dict[str, Any]]:
    # Try in-memory first
    if session_id in _sessions:
        return _sessions[session_id]

    try:
        import psycopg2
        import psycopg2.extras
        conn = psycopg2.connect(
            host="localhost", port=5432, dbname="gaolaif",
            user="gaolaif", password="gaolaif_local_only",
        )
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT * FROM audit_sessions WHERE id = %s", (session_id,))
            row = cur.fetchone()
            if row:
                return dict(row)
        conn.close()
    except Exception:
        pass
    return None


def _export_json(state: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "session_id": state["session_id"],
        "contract": state["contract_name"],
        "path": state["contract_path"],
        "chain": state["chain"],
        "status": state["status"],
        "findings": [_finding_to_dict(f) for f in state.get("agent_findings", [])],
        "exploit_proofs": [_proof_to_dict(p) for p in state.get("exploit_proofs", [])],
        "patch_proposals": [_patch_to_dict(p) for p in state.get("patch_proposals", [])],
        "generated_at": __import__("datetime").datetime.now().isoformat(),
        "tool": "Gaolaif Security Workspace v0.1.0",
    }


def _export_markdown(state: Dict[str, Any]) -> str:
    lines = [
        f"# Gaolaif Audit Report: {state['contract_name']}",
        "",
        f"**Session:** `{state['session_id']}`",
        f"**Chain:** {state['chain']}",
        f"**Status:** {state['status']}",
        f"**Date:** {__import__('datetime').datetime.now().isoformat()}",
        "",
        "---",
        "## Vulnerability Findings",
        "",
    ]
    for f in state.get("agent_findings", []):
        lines.append(f"### [{f.severity.value}] {f.title}")
        lines.append(f"**Category:** {f.category}  ")
        lines.append(f"**Location:** {f.location}  ")
        lines.append(f"**Confidence:** {f.confidence.value}  ")
        if f.description:
            lines.append("")
            lines.append(f.description)
        lines.append("")

    for p in state.get("exploit_proofs", []):
        status = "CONFIRMED" if p.confirmed else "UNCONFIRMED"
        lines.append(f"- **{p.attack_vector}**: {status}")

    lines.append("")
    lines.append("*Report generated by Gaolaif v0.1.0 — 100% local processing*")
    return "\n".join(lines)


def _finding_to_dict(f: Any) -> Dict:
    return {
        "title": f.title,
        "description": f.description,
        "severity": f.severity.value if hasattr(f.severity, 'value') else str(f.severity),
        "category": f.category,
        "location": f.location,
        "code_snippet": f.code_snippet,
        "confidence": f.confidence.value if hasattr(f.confidence, 'value') else str(f.confidence),
        "static_tool": f.static_tool,
    }


def _proof_to_dict(p: Any) -> Dict:
    return {
        "finding_id": p.finding_id,
        "poc_code": p.poc_code,
        "forge_output": p.forge_output[:500],
        "confirmed": p.confirmed,
        "attack_vector": p.attack_vector,
        "estimated_impact": p.estimated_impact,
    }


def _patch_to_dict(p: Any) -> Dict:
    return {
        "finding_id": p.finding_id,
        "verified": p.verified,
        "regression_report": p.regression_report,
        "new_findings": [_finding_to_dict(f) for f in p.new_findings],
    }


def _hash_code(code: str) -> str:
    import hashlib
    return hashlib.sha256(code.encode()).hexdigest()

import hashlib
import json
import os
import random
import subprocess
import tempfile
import time
import uuid
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeout
from pathlib import Path
from typing import (
    Any,
    Callable,
    Dict,
    List,
    Literal,
    Optional,
    TypedDict,
    Union,
)

from agents import AuditorAgent, ExploitAgent, PatchVerifierAgent
from agents.base_agent import ExploitProof, Finding, PatchProposal, AttackHypothesis, RankedPatchOption, _response_cache
from agents.planner_agent import PlannerAgent, ResearchManifest
from agents.research import CVEHunterAgent, AuditMinerAgent, HackerTechniqueAgent
from agents.auditor_agent import ScenarioGenerator
from agents.patch_verifier_agent import PatchArchitect
from firewall.sanitizer import Sanitizer

# Supported languages
SUPPORTED_LANGUAGES = {"solidity", "move"}

# Constants
MAX_POC_ATTEMPTS = 15
MAX_PARALLEL_ANVIL = 3
MAX_ITERATIONS = 20


class EVMRunner:
    """Manages dynamic Anvil ports for parallel Forge execution."""

    def __init__(self):
        self.port = random.randint(9000, 9999)

    def start_fork(self, rpc_url: str = "", block_number: int = 0):
        if not rpc_url:
            return f"http://localhost:{self.port}"
        args = ["anvil", "--fork-url", rpc_url, "--port", str(self.port), "--silent"]
        if block_number:
            args.extend(["--fork-block-number", str(block_number)])
        self.proc = subprocess.Popen(args, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        time.sleep(3)
        return f"http://localhost:{self.port}"

    def stop(self):
        if hasattr(self, "proc"):
            self.proc.terminate()
            self.proc.wait()


class AuditState(TypedDict):
    session_id: str
    contract_name: str
    contract_path: str
    source_code: str
    language: Literal["solidity", "move", "rust"]
    chain: str
    fork_url: str
    target_address: str
    fork_rpc_url: str
    code_slices: List[str]
    static_findings: List[dict]
    agent_findings: List[Finding]
    exploit_proofs: List[ExploitProof]
    patch_proposals: List[PatchProposal]
    patch_validated: bool
    current_agent: str
    iteration_count: int
    status: Literal["ingesting", "auditing", "exploiting", "patching", "complete", "error"]
    error_message: Optional[str]
    research_manifest: Optional[ResearchManifest]
    external_research: List
    verified_intel: List
    attack_hypotheses: List[AttackHypothesis]
    ranked_patches: List[RankedPatchOption]
    creative_proposals: List[dict]
    creative_results: List[dict]


def build_audit_graph(forge_path: str = "forge", fork_url: str = "http://localhost:8545") -> "AuditGraph":
    """Factory: creates a fully configured AuditGraph."""
    return AuditGraph(forge_path=forge_path, fork_url=fork_url)


def default_audit_state(**overrides: Any) -> AuditState:
    """Create an AuditState with sensible defaults. Override any field."""
    state: Dict[str, Any] = {
        "session_id": str(uuid.uuid4()),
        "contract_name": "",
        "contract_path": "",
        "source_code": "",
        "language": "solidity",
        "chain": "ethereum",
        "fork_url": "http://localhost:8545",
        "target_address": "",
        "fork_rpc_url": "",
        "code_slices": [],
        "static_findings": [],
        "agent_findings": [],
        "exploit_proofs": [],
        "patch_proposals": [],
        "patch_validated": False,
        "current_agent": "",
        "iteration_count": 0,
        "status": "ingesting",
        "error_message": None,
        "research_manifest": None,
        "external_research": [],
        "verified_intel": [],
        "attack_hypotheses": [],
        "ranked_patches": [],
        "creative_proposals": [],
        "creative_results": [],
    }
    state.update(overrides)
    return AuditState(**state)


class GraphNode:
    def __init__(self, name: str, fn: Callable[[AuditState], AuditState]):
        self.name = name
        self.fn = fn

    def __call__(self, state: AuditState) -> AuditState:
        return self.fn(state)


class AuditGraph:
    """LangGraph-like state machine for audit orchestration."""

    def __init__(self, forge_path: str = "forge", fork_url: str = "http://localhost:8545"):
        self.forge_path = forge_path
        self.fork_url = fork_url
        self.nodes: Dict[str, GraphNode] = {}
        self.edges: Dict[str, str] = {}
        self.conditional_edges: Dict[str, Callable[[AuditState], str]] = {}
        self._timers: Dict[str, float] = {}

        self.auditor = AuditorAgent()
        self.exploiter = ExploitAgent(forge_path=forge_path, fork_url=fork_url)
        self.patch_verifier = PatchVerifierAgent(forge_path=forge_path, fork_url=fork_url)
        self.planner = PlannerAgent()
        self.cve_hunter = CVEHunterAgent()
        self.audit_miner = AuditMinerAgent()
        self.hacker_technique = HackerTechniqueAgent()
        self.scenario_generator = ScenarioGenerator()
        self.patch_architect = PatchArchitect()
        self.sanitizer = Sanitizer(None)

        self._build_graph()

    def _timed(self, name: str, fn: Callable) -> Callable:
        """Wrap a node function with timing."""
        def wrapper(state: AuditState) -> AuditState:
            start = time.perf_counter()
            result = fn(state)
            elapsed = time.perf_counter() - start
            self._timers[name] = elapsed
            print(f"[TIMER] {name}: {elapsed:.2f}s")
            return result
        return wrapper

    # ── Graph construction ─────────────────────

    def _build_graph(self):
        self.add_node("ingest",               self._timed("ingest", self._ingest_node))
        self.add_node("plan",                 self._timed("plan", self._plan_node))
        self.add_node("outbound_firewall",    self._timed("outbound_firewall", self._outbound_firewall_node))
        self.add_node("external_research",    self._timed("external_research", self._external_research_node))
        self.add_node("inbound_firewall",     self._timed("inbound_firewall", self._inbound_firewall_node))
        self.add_node("generate_scenarios",   self._timed("generate_scenarios", self._scenario_node))
        self.add_node("auditor",              self._timed("auditor", self._auditor_node))
        self.add_node("exploit",              self._timed("exploit", self._exploit_node))
        self.add_node("architect_patches",    self._timed("architect_patches", self._architect_patches_node))
        self.add_node("patch_verifier",       self._timed("patch_verifier", self._patch_verifier_node))

        self.add_edge("ingest", "plan")
        self.add_edge("plan", "outbound_firewall")
        self.add_edge("outbound_firewall", "external_research")
        self.add_edge("external_research", "inbound_firewall")
        self.add_edge("inbound_firewall", "generate_scenarios")
        self.add_edge("generate_scenarios", "auditor")
        self.add_edge("auditor", "exploit")
        self.add_edge("exploit", "architect_patches")
        self.add_edge("architect_patches", "patch_verifier")

        self.add_conditional_edge(
            "patch_verifier",
            self._should_loop,
            {"complete": "__end__", "exploit": "exploit"},
        )

    def add_node(self, name: str, fn: Callable[[AuditState], AuditState]):
        self.nodes[name] = GraphNode(name, fn)

    def add_edge(self, src: str, dst: str):
        self.edges[src] = dst

    def add_conditional_edge(self, src: str, condition: Callable[[AuditState], str], mapping: Dict[str, str]):
        self.conditional_edges[src] = condition
        self.edges[src] = "__conditional__"

    # ── Execution ───────────────────────────────

    def invoke(self, initial_state: AuditState) -> AuditState:
        """Alias for run(). Compatible with LangGraph API conventions."""
        return self.run(initial_state)

    def run(self, initial_state: AuditState) -> AuditState:
        state = dict(initial_state)
        current = "ingest"
        visited = set()

        # Fill defaults for any missing key
        for key, default_val in default_audit_state().items():
            if key not in state or state[key] is None:
                state[key] = default_val

        while current != "__end__":
            if current in visited:
                state["status"] = "error"
                state["error_message"] = f"Cycle detected at node '{current}'"
                break
            visited.add(current)

            node = self.nodes.get(current)
            if not node:
                state["status"] = "error"
                state["error_message"] = f"Unknown node '{current}'"
                break

            state["current_agent"] = current
            try:
                state = node(state)
            except (ConnectionError, RuntimeError) as e:
                state["status"] = "error"
                state["error_message"] = str(e)
                if isinstance(e, ConnectionError):
                    raise
                break
            except Exception as e:
                state["status"] = "error"
                state["error_message"] = f"Unhandled error in node '{current}': {e}"
                break

            if state["status"] == "error":
                break

            if self.edges.get(current) == "__conditional__":
                condition_fn = self.conditional_edges.get(current)
                if condition_fn:
                    next_label = condition_fn(state)
                    mapping = self._get_mapping(current) or {}
                    current = mapping.get(next_label, "__end__")
                else:
                    current = "__end__"
            else:
                current = self.edges.get(current, "__end__")

            state["iteration_count"] += 1
            if state["iteration_count"] > MAX_ITERATIONS:
                state["status"] = "error"
                state["error_message"] = "Max iterations exceeded"
                break

        if state["status"] not in ("error",):
            state["status"] = "complete"

        return AuditState(**state)

    def _get_mapping(self, src: str) -> Optional[Dict[str, str]]:
        if src == "patch_verifier":
            return {"complete": "__end__", "exploit": "exploit"}
        return None

    # ── Node: Plan ─────────────────────────────

    def _plan_node(self, state: AuditState) -> AuditState:
        state["status"] = "auditing"
        try:
            state = self.planner.run(dict(state))
        except Exception as e:
            state["status"] = "error"
            state["error_message"] = f"PlannerAgent failed: {e}"
        return state

    # ── Node: Outbound Firewall ─────────────────

    def _outbound_firewall_node(self, state: AuditState) -> AuditState:
        manifest = state.get("research_manifest")
        if manifest is None:
            return state
        manifest_text = json.dumps({
            "attack_surface_map": manifest.attack_surface_map,
            "knowledge_gaps": manifest.knowledge_gaps,
            "protocol_type": manifest.protocol_type,
            "chain": manifest.chain,
            "invariants": manifest.invariants_to_verify,
        })
        dlp_check = self.sanitizer.sanitize(manifest_text)
        if not dlp_check.allowed:
            state["status"] = "error"
            state["error_message"] = f"Outbound firewall blocked manifest: {dlp_check.reason}"
        return state

    # ── Node: External Research (Parallel) ──────

    def _external_research_node(self, state: AuditState) -> AuditState:
        manifest = state.get("research_manifest")
        if manifest is None:
            state["external_research"] = []
            return state

        def run_cve():
            return self.cve_hunter.run(manifest)

        def run_audit():
            return self.audit_miner.run(manifest)

        def run_hacker():
            return self.hacker_technique.run(manifest)

        with ThreadPoolExecutor(max_workers=3) as pool:
            f1 = pool.submit(run_cve)
            f2 = pool.submit(run_audit)
            f3 = pool.submit(run_hacker)
            all_findings = f1.result() + f2.result() + f3.result()

        state["external_research"] = all_findings
        return state

    # ── Node: Inbound Firewall ──────────────────

    def _inbound_firewall_node(self, state: AuditState) -> AuditState:
        findings = state.get("external_research", [])
        manifest = state.get("research_manifest")
        if not findings or manifest is None:
            state["verified_intel"] = []
            return state
        state["verified_intel"] = self.sanitizer.verify_research_findings(findings, manifest)
        return state

    # ── Node: Scenario Generator ────────────────

    def _scenario_node(self, state: AuditState) -> AuditState:
        manifest = state.get("research_manifest")
        intel = state.get("verified_intel", [])
        source = state.get("source_code", "")
        hypotheses = self.scenario_generator.generate(manifest, intel, source)
        state["attack_hypotheses"] = hypotheses
        return state

    # ── Node: Architect Patches ─────────────────

    def _architect_patches_node(self, state: AuditState) -> AuditState:
        findings = state.get("agent_findings", [])
        proofs = state.get("exploit_proofs", [])
        source = state.get("source_code", "")
        all_patches: List[RankedPatchOption] = []
        for proof in proofs:
            finding = next((f for f in findings if f.title == proof.attack_vector), None)
            if finding:
                patches = self.patch_architect.generate_ranked_patches(finding, proof, source)
                all_patches.extend(patches)
        state["ranked_patches"] = all_patches
        return state

    # ── Node: Ingest ────────────────────────────

    def _ingest_node(self, state: AuditState) -> AuditState:
        state["status"] = "ingesting"
        source = state.get("source_code", "")
        path_str = state.get("contract_path", "")

        # If source_code is provided directly (no file on disk), write to temp
        if not path_str or not Path(path_str).exists():
            if source.strip():
                tmp = tempfile.NamedTemporaryFile(
                    mode="w", suffix=".sol", delete=False, prefix="gaolaif_"
                )
                tmp.write(source)
                path_str = tmp.name
                tmp.close()
                state["contract_path"] = path_str
            else:
                state["status"] = "error"
                state["error_message"] = "No source code or valid contract path provided"
                return state

        path = Path(path_str)
        if not path.exists():
            state["status"] = "error"
            state["error_message"] = f"Contract not found: {path_str}"
            return state

        if not source:
            source = path.read_text()
            state["source_code"] = source

        state["contract_name"] = path.stem

        # Detect language: first by extension, then by content heuristics
        suffix = path.suffix.lower()
        if suffix == ".sol":
            state["language"] = "solidity"
        elif suffix == ".move":
            state["language"] = "move"
        else:
            state["language"] = "rust"

        # Content-based detection override (temp files always have .sol extension)
        head = source[:200].strip()
        if state["language"] == "solidity" and not head.startswith("pragma") and not head.startswith("//") and not head.startswith("/*"):
            if "def " in head or "import " in head or "class " in head:
                state["language"] = "rust"

        if state["language"] not in SUPPORTED_LANGUAGES:
            state["status"] = "error"
            state["error_message"] = f"Unsupported language: {state['language']}. Only solidity and move are supported."
            return state

        # Extract sanitized code slices
        lines = source.split("\n")
        slices = []
        for i, line in enumerate(lines):
            stripped = line.strip()
            if any(stripped.startswith(kw) for kw in ["contract ", "library ", "interface ", "function ", "modifier ", "module ", "public "]):
                start = max(0, i - 1)
                end = min(len(lines), i + 4)
                slices.append(f"// Lines {start+1}-{end}\n" + "\n".join(lines[start:end]))
        state["code_slices"] = slices[:20]

        return state

    # ── Node: Auditor ───────────────────────────

    def _auditor_node(self, state: AuditState) -> AuditState:
        state["status"] = "auditing"
        try:
            findings = self.auditor.run(state["contract_path"], state["session_id"])
            state["agent_findings"] = findings
        except ConnectionError:
            raise  # Let critical failures (Ollama down) propagate
        except Exception as e:
            state["status"] = "error"
            state["error_message"] = f"AuditorAgent failed: {e}"
        return state

    # ── Node: Exploit (Triage + Parallel + Early Reporting) ──

    def _exploit_node(self, state: AuditState) -> AuditState:
        state["status"] = "exploiting"
        try:
            findings = state.get("agent_findings", [])

            # Triage: rank by severity + confidence, cap at MAX_POC_ATTEMPTS
            severity_rank = {"CRITICAL": 3, "HIGH": 2, "MEDIUM": 1, "LOW": 0}
            candidates = [f for f in findings if f.severity in ("CRITICAL", "HIGH")]
            candidates.sort(
                key=lambda f: (severity_rank.get(str(f.severity), 0), str(f.confidence)),
                reverse=True,
            )
            candidates = candidates[:MAX_POC_ATTEMPTS]

            if not candidates:
                state["exploit_proofs"] = []
                return state

            # Run PoCs in parallel
            proofs = self._run_pocs_parallel(
                candidates,
                state["contract_path"],
                state.get("target_address", ""),
                state.get("fork_rpc_url", ""),
                max_workers=MAX_PARALLEL_ANVIL,
            )

            state["exploit_proofs"] = proofs

            # Early CRITICAL reporting — emit finding as soon as confirmed
            for proof in proofs:
                if proof.confirmed:
                    print(f"[EARLY REPORT] Confirmed exploit: {proof.attack_vector}")

        except Exception as e:
            state["status"] = "error"
            state["error_message"] = f"ExploitAgent failed: {e}"
        return state

    def _run_pocs_parallel(
        self, findings: List[Finding], contract_path: str,
        target_address: str, fork_rpc_url: str, max_workers: int = 3,
    ) -> List[ExploitProof]:
        agent = ExploitAgent(forge_path=self.forge_path, fork_url=self.fork_url)
        proofs: List[ExploitProof] = []

        with ThreadPoolExecutor(max_workers=max_workers) as pool:
            future_map = {
                pool.submit(
                    agent._attempt_exploit, f, contract_path, target_address, fork_rpc_url
                ): f for f in findings
            }
            for future in future_map:
                finding = future_map[future]
                try:
                    proof = future.result(timeout=130)
                    proofs.append(proof)
                except FuturesTimeout:
                    import uuid as _uuid
                    from agents.base_agent import ExploitProof
                    proofs.append(ExploitProof(
                        finding_id=_uuid.uuid4().hex[:8],
                        poc_code="",
                        forge_output="",
                        confirmed=False,
                        attack_vector=finding.category,
                        estimated_impact="unknown",
                        reason="PoC timed out after 130s",
                    ))
                except Exception as e:
                    import uuid as _uuid
                    from agents.base_agent import ExploitProof
                    proofs.append(ExploitProof(
                        finding_id=_uuid.uuid4().hex[:8],
                        poc_code="",
                        forge_output="",
                        confirmed=False,
                        attack_vector=finding.category,
                        estimated_impact="unknown",
                        reason=f"PoC failed: {e}",
                    ))

        return proofs

    # ── Node: PatchVerifier ─────────────────────

    def _patch_verifier_node(self, state: AuditState) -> AuditState:
        state["status"] = "patching"

        if not state["exploit_proofs"]:
            state["patch_validated"] = True
            return state

        try:
            proposal = self.patch_verifier.run(
                original_code=state["source_code"],
                patched_code=state["source_code"],
                exploit_proofs=state["exploit_proofs"],
                contract_path=state["contract_path"],
                session_id=state["session_id"],
            )
            state["patch_proposals"].append(proposal)
            state["patch_validated"] = proposal.verified
        except Exception as e:
            state["patch_validated"] = False
            state["error_message"] = f"PatchVerifierAgent failed: {e}"

        return state

    @staticmethod
    def _should_loop(state: AuditState) -> str:
        if state["patch_validated"]:
            return "complete"
        if state["iteration_count"] < 3:
            return "exploit"
        return "complete"

    @staticmethod
    def create_initial_state(
        contract_path: str,
        fork_url: str = "http://localhost:8545",
        target_address: str = "",
        chain: str = "ethereum",
    ) -> AuditState:
        return default_audit_state(
            contract_path=contract_path,
            fork_url=fork_url,
            target_address=target_address,
            chain=chain,
        )

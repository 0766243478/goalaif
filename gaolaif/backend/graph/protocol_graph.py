from dataclasses import dataclass, field
from typing import Any, Callable
from agents.audit_agent import AuditAgent, Finding
from agents.planner_agent import PlannerAgent
from agents.patch_agent import PatchAgent, Patch


@dataclass
class ProtocolState:
    session_id: str = ""
    source_code: str = ""
    language: str = "solidity"
    file_path: str = ""
    audit_plan: dict = field(default_factory=dict)
    agent_findings: list = field(default_factory=list)
    ranked_patches: list = field(default_factory=list)
    status: str = "initialized"


class GraphNode:
    def __init__(self, name: str, fn: Callable[[ProtocolState], ProtocolState]):
        self.name = name
        self.fn = fn

    def __call__(self, state: ProtocolState) -> ProtocolState:
        return self.fn(state)


class ProtocolGraph:
    def __init__(self):
        self.nodes: list[GraphNode] = []

    def add_node(self, node: GraphNode):
        self.nodes.append(node)

    def invoke(self, state: ProtocolState) -> ProtocolState:
        current = state
        for node in self.nodes:
            current = node(current)
        return current


def build_protocol_graph() -> ProtocolGraph:
    graph = ProtocolGraph()

    planner = PlannerAgent()
    auditor = AuditAgent()
    patcher = PatchAgent()

    def plan_node(state: ProtocolState) -> ProtocolState:
        plan = planner.plan(state.source_code)
        state.audit_plan = plan
        state.status = "planned"
        return state

    def audit_node(state: ProtocolState) -> ProtocolState:
        findings = auditor.audit(state.source_code)
        state.agent_findings = findings
        state.status = "audited"
        return state

    def patch_node(state: ProtocolState) -> ProtocolState:
        patches = patcher.generate_patches(state.agent_findings)
        state.ranked_patches = patches
        state.status = "completed"
        return state

    graph.add_node(GraphNode("planner", plan_node))
    graph.add_node(GraphNode("auditor", audit_node))
    graph.add_node(GraphNode("patcher", patch_node))

    return graph

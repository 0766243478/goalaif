"""
Tier 1 — Smoke Test
Proves the state machine runs from START to END without crashing.
Uses a trivially reentrant contract. Does NOT test finding quality,
only that nodes execute and return valid state.
"""

import pytest
from graph.audit_graph import build_audit_graph, default_audit_state

SIMPLE_VULNERABLE_CONTRACT = """
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract VulnerableVault {
    mapping(address => uint256) public balances;

    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    // Classic reentrancy: state update AFTER external call
    function withdraw(uint256 amount) external {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        balances[msg.sender] -= amount;
    }
}
"""


def test_full_pipeline_runs_without_exception():
    """State machine must reach terminal state without crashing."""
    graph = build_audit_graph()
    state = default_audit_state(
        session_id="smoke-test-001",
        source_code=SIMPLE_VULNERABLE_CONTRACT,
    )
    final_state = graph.invoke(state)

    assert final_state["status"] in ["complete", "error"], \
        f"Pipeline stuck in status: {final_state['status']}"
    assert final_state["iteration_count"] < 20, \
        "Pipeline looped more than 20 times — possible infinite loop"


def test_pipeline_produces_at_least_one_finding():
    """AuditorAgent must find at least one issue in the vulnerable contract."""
    graph = build_audit_graph()
    state = default_audit_state(
        session_id="smoke-test-002",
        source_code=SIMPLE_VULNERABLE_CONTRACT,
    )
    final_state = graph.invoke(state)

    assert len(final_state["agent_findings"]) > 0, \
        "AuditorAgent found nothing in a known-vulnerable contract"


def test_pipeline_visits_all_nodes():
    """Pipeline must visit all nodes (ingest → plan → fw → research → scenarios → auditor → exploit → patches → patch_verifier)."""
    graph = build_audit_graph()
    visited: list[str] = []

    # Wrap each node to record visits
    original_nodes = dict(graph.nodes)
    for name, node in original_nodes.items():
        original_fn = node.fn
        def make_wrapper(n):
            def wrapped(s):
                visited.append(n)
                return original_fn(s)
            return wrapped
        graph.nodes[name].fn = make_wrapper(name)

    state = default_audit_state(
        session_id="smoke-test-003",
        source_code=SIMPLE_VULNERABLE_CONTRACT,
    )
    graph.invoke(state)

    expected = ["ingest", "plan", "outbound_firewall", "external_research",
                "inbound_firewall", "generate_scenarios", "auditor",
                "exploit", "architect_patches", "patch_verifier"]
    for node_name in expected:
        assert node_name in visited, \
            f"Pipeline never visited node '{node_name}'. Visited: {visited}"

import pytest
from unittest.mock import patch
from agents.planner_agent import PlannerAgent, ResearchManifest

SIMPLE_VULNERABLE_CONTRACT = """
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;
contract Vault {
    mapping(address => uint256) public balances;
    function deposit() external payable { balances[msg.sender] += msg.value; }
    function withdraw(uint256 amt) external {
        require(balances[msg.sender] >= amt, "insufficient");
        (bool ok,) = msg.sender.call{value: amt}("");
        require(ok, "transfer failed");
        balances[msg.sender] -= amt;
    }
}
"""


def test_manifest_contains_no_source_code():
    agent = PlannerAgent()
    manifest = agent._build_manifest(SIMPLE_VULNERABLE_CONTRACT, session_id="test-001")
    full_text = " ".join(manifest.attack_surface_map) + " " + " ".join(manifest.knowledge_gaps)
    assert "function " not in full_text, "Manifest must not contain Solidity syntax"
    assert "mapping(" not in full_text, "Manifest must not contain Solidity syntax"
    assert "require(" not in full_text, "Manifest must not contain Solidity syntax"


def test_manifest_has_all_required_fields():
    agent = PlannerAgent()
    manifest = agent._build_manifest(SIMPLE_VULNERABLE_CONTRACT, session_id="test-002")
    assert len(manifest.attack_surface_map) > 0, "Must have at least one attack surface"
    assert len(manifest.knowledge_gaps) > 0, "Must have at least one knowledge gap"
    assert manifest.protocol_type in ("liquid_staking", "amm", "lending", "bridge", "governance", "yield", "other")
    assert manifest.chain in ("evm", "move")
    assert manifest.session_id == "test-002"


def test_manifest_fallback_when_ollama_unavailable():
    agent = PlannerAgent()
    with patch.object(agent, "_call_ollama", return_value=None):
        manifest = agent._build_manifest(SIMPLE_VULNERABLE_CONTRACT, session_id="test-003")
        assert len(manifest.attack_surface_map) > 0
        assert manifest.protocol_type == "other"


def test_manifest_fallback_on_bad_json():
    agent = PlannerAgent()
    with patch.object(agent, "_call_ollama", return_value="not valid json {{{"):
        manifest = agent._build_manifest(SIMPLE_VULNERABLE_CONTRACT, session_id="test-004")
        assert manifest.protocol_type == "other"

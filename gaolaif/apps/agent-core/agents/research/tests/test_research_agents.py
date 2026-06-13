import pytest
from unittest.mock import patch
from agents.research.cve_hunter_agent import CVEHunterAgent
from agents.research.audit_miner_agent import AuditMinerAgent
from agents.research.hacker_technique_agent import HackerTechniqueAgent


class FakeManifest:
    attack_surface_map = ["FIFO queue deadlock", "reentrancy"]
    knowledge_gaps = ["queue-based DoS in DeFi"]
    protocol_type = "liquid_staking"


def test_cve_hunter_returns_empty_when_search_fails():
    agent = CVEHunterAgent()
    with patch.object(agent, "search", return_value=[]):
        findings = agent.run(FakeManifest())
        assert isinstance(findings, list)
        assert len(findings) == 0


def test_audit_miner_returns_empty_when_search_fails():
    agent = AuditMinerAgent()
    with patch.object(agent, "search", return_value=[]):
        findings = agent.run(FakeManifest())
        assert isinstance(findings, list)
        assert len(findings) == 0


def test_hacker_technique_returns_empty_when_search_fails():
    agent = HackerTechniqueAgent()
    with patch.object(agent, "search", return_value=[]):
        findings = agent.run(FakeManifest())
        assert isinstance(findings, list)
        assert len(findings) == 0


def test_cve_hunter_parses_results():
    agent = CVEHunterAgent()
    mock_result = {
        "Text": "A reentrancy vulnerability was found in the withdraw function allowing an attacker to drain funds before state update.",
        "FirstURL": "https://example.com/cve-2024",
    }
    finding = agent._parse_result(mock_result, "reentrancy")
    assert finding is not None
    assert "reentrancy" in finding.techniques or "vulnerability" in str(finding.claims)
    assert finding.relevance_score > 0


def test_parse_skips_short_text():
    agent = CVEHunterAgent()
    mock_result = {"Text": "Short", "FirstURL": ""}
    assert agent._parse_result(mock_result, "test") is None

import os
import sys
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sandbox.env_simulator import EnvSimulator, MOCK_AGGREGATOR, PRICE_MANIPULATION_TEST


VAULT_SOURCE = """// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract VulnerableVault {
    mapping(address => uint) public balances;

    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw() external {
        uint bal = balances[msg.sender];
        require(bal > 0, "No balance");
        (bool ok, ) = msg.sender.call{value: bal}("");
        require(ok, "Transfer failed");
        balances[msg.sender] = 0;
    }
}
"""


class TestEnvSimulator:
    def test_init(self):
        sim = EnvSimulator()
        assert sim is not None

    def test_mock_aggregator_compiles(self):
        assert "MockV3Aggregator" in MOCK_AGGREGATOR
        assert "latestAnswer" in MOCK_AGGREGATOR

    def test_price_manipulation_test_compiles(self):
        assert "EnvSimTest" in PRICE_MANIPULATION_TEST
        assert "testPriceManipulation" in PRICE_MANIPULATION_TEST

    def test_is_available(self):
        sim = EnvSimulator()
        result = sim.is_available()
        assert isinstance(result, bool)

    @pytest.mark.skipif(not EnvSimulator().is_available(), reason="forge not available")
    def test_simulate_oracle_staleness(self):
        sim = EnvSimulator()
        result = sim.simulate_oracle_staleness(VAULT_SOURCE)
        assert result.output != ""
        assert "[SKIPPED]" not in result.output

"""
Tests for the Anonymizer v2 with round-trip guarantee.

Run: pytest backend/firewall/tests/test_anonymizer_v2.py -v
"""

import sys
import os
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

from firewall.anonymizer import Anonymizer


SAMPLE_CONTRACT = """
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract EthVault {
    address public owner = 0x1234567890abcdef1234567890abcdef12345678;
    uint256 public totalDeposits;

    function deposit() external payable {
        totalDeposits += msg.value;
    }

    function withdraw() external {
        uint256 bal = totalDeposits;
        require(bal > 0, "No balance");
        (bool ok, ) = msg.sender.call{value: bal}("");
        require(ok, "Transfer failed");
        totalDeposits = 0;
    }
}
"""

SAMPLE_WITH_PRIVATE_KEY = """
// Private key: 0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd
// Address: 0xdead00000000000000000000000000000000dead
"""


class TestAnonymizerV2:
    def setup_method(self):
        self.anonymizer = Anonymizer()

    def test_private_key_redacted(self):
        result, amap = self.anonymizer.anonymize(SAMPLE_WITH_PRIVATE_KEY)
        assert "[PRIVATE_KEY_REDACTED]" in result
        assert "abcdefabcdef" not in result

    def test_address_replaced(self):
        result, amap = self.anonymizer.anonymize(SAMPLE_CONTRACT)
        assert "0x1234567890abcdef1234567890abcdef12345678" not in result
        assert "Address0" in result or "Address" in result

    def test_contract_name_replaced(self):
        result, amap = self.anonymizer.anonymize(SAMPLE_CONTRACT)
        assert "EthVault" not in result
        assert "Contract" in result

    def test_function_name_replaced(self):
        result, amap = self.anonymizer.anonymize(SAMPLE_CONTRACT)
        assert "function deposit" not in result
        assert "function fn0" in result or "fn" in result

    def test_round_trip(self):
        result, amap = self.anonymizer.anonymize(SAMPLE_CONTRACT)
        restored = self.anonymizer.deanonymize(result, amap)
        assert "EthVault" in restored
        assert "0x1234567890abcdef1234567890abcdef12345678" in restored
        assert "deposit" in restored
        assert "withdraw" in restored
        assert restored == SAMPLE_CONTRACT

    def test_empty_input(self):
        result, amap = self.anonymizer.anonymize("")
        assert result == ""
        restored = self.anonymizer.deanonymize(result, amap)
        assert restored == ""

    def test_no_identifiers(self):
        text = "uint256 x = 1 + 2;"
        result, amap = self.anonymizer.anonymize(text)
        assert result == text
        restored = self.anonymizer.deanonymize(result, amap)
        assert restored == text

    def test_multiple_addresses(self):
        text = "address a = 0x1111111111111111111111111111111111111111; address b = 0x2222222222222222222222222222222222222222;"
        result, amap = self.anonymizer.anonymize(text)
        assert "Address0" in result
        assert "Address1" in result
        restored = self.anonymizer.deanonymize(result, amap)
        assert "0x1111111111111111111111111111111111111111" in restored
        assert "0x2222222222222222222222222222222222222222" in restored

    def test_math_preserved(self):
        text = "uint256 total = a + b * c / d; require(total >= 100, 'underflow');"
        result, amap = self.anonymizer.anonymize(text)
        assert "+" in result
        assert "*" in result
        assert "/" in result
        assert "100" in result

    def test_anonymize_then_partial_deanonymize(self):
        result, amap = self.anonymizer.anonymize(SAMPLE_CONTRACT)
        partial = result.replace("Contract0", "[REDACTED]")
        restored = self.anonymizer.deanonymize(partial, amap)
        assert "EthVault" in restored
        assert "deposit" in restored

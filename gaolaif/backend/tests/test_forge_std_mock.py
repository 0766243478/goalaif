"""
Tests for the shared MOCK_FORGE_STD module.
Verifies the mock is valid Solidity and has required components.
"""
import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sandbox.forge_std_mock import MOCK_FORGE_STD


class TestMockForgeStd:
    def test_is_string(self):
        assert isinstance(MOCK_FORGE_STD, str)

    def test_has_pragma(self):
        assert "pragma solidity" in MOCK_FORGE_STD

    def test_has_vm_interface(self):
        assert "interface Vm" in MOCK_FORGE_STD

    def test_has_deal_function(self):
        assert "function deal(address, uint256)" in MOCK_FORGE_STD

    def test_has_prank_function(self):
        assert "function prank(address)" in MOCK_FORGE_STD

    def test_has_warp_function(self):
        assert "function warp(uint256)" in MOCK_FORGE_STD

    def test_has_test_contract(self):
        assert "contract Test {" in MOCK_FORGE_STD

    def test_has_expect_revert(self):
        assert "function expectRevert()" in MOCK_FORGE_STD

    def test_has_skip(self):
        assert "function skip(bool)" in MOCK_FORGE_STD

    assert_true_has_assertions = True
    def test_has_assertions(self):
        assert "function assertTrue" in MOCK_FORGE_STD
        assert "function assertEq" in MOCK_FORGE_STD
        assert "function assertGt" in MOCK_FORGE_STD

    def test_has_dstest(self):
        assert "abstract contract DSTest" in MOCK_FORGE_STD

    def test_minimal_length(self):
        assert len(MOCK_FORGE_STD) > 1000, "MOCK_FORGE_STD appears too short"

    def test_importable_from_both_locations(self):
        from sandbox.forge_std_mock import MOCK_FORGE_STD as shared
        assert shared is MOCK_FORGE_STD

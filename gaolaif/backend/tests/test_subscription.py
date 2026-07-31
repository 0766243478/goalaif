"""
Tests for the subscription manager module.
Uses mocked Supabase client since we can't connect in tests.
"""
import os
import sys
from datetime import date
from unittest.mock import patch, MagicMock

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from subscription import manager


@pytest.fixture(autouse=True)
def mock_supabase():
    """Mock Supabase client for all tests."""
    mock_client = MagicMock()
    mock_table = MagicMock()
    mock_client.table.return_value = mock_table
    mock_table.select.return_value = mock_table
    mock_table.eq.return_value = mock_table
    mock_table.execute.return_value = MagicMock(data=[])
    with patch.object(manager, "_sb", mock_client), \
         patch.object(manager, "_client", return_value=mock_client):
        yield mock_client


class TestGetOrCreateUser:
    def test_returns_existing_user(self, mock_supabase):
        existing_user = {
            "machine_id": "existing",
            "tier": "free",
            "critical_used": 0,
            "medium_used": 0,
            "reset_date": str(date.today().replace(day=1)),
        }
        mock_supabase.table.return_value.execute.return_value = MagicMock(data=[existing_user])
        user = manager.get_or_create_user("existing")
        assert user["machine_id"] == "existing"
        assert user["tier"] == "free"


class TestCanScan:
    def test_free_tier_allows_scan_when_quota_available(self, mock_supabase):
        user = {
            "machine_id": "test",
            "tier": "free",
            "critical_used": 0,
            "medium_used": 0,
            "reset_date": str(date.today().replace(day=1)),
        }
        mock_supabase.table.return_value.execute.return_value = MagicMock(data=[user])
        allowed, reason = manager.can_scan("test")
        assert allowed is True
        assert reason == "ok"

    def test_free_tier_blocks_when_quota_exhausted(self, mock_supabase):
        user = {
            "machine_id": "test",
            "tier": "free",
            "critical_used": 1,
            "medium_used": 1,
            "reset_date": str(date.today().replace(day=1)),
        }
        mock_supabase.table.return_value.execute.return_value = MagicMock(data=[user])
        allowed, reason = manager.can_scan("test")
        assert allowed is False
        assert "limit" in reason.lower() or "upgrade" in reason.lower()

    def test_hunter_tier_always_allows(self, mock_supabase):
        user = {
            "machine_id": "test",
            "tier": "hunter",
            "critical_used": 999,
            "medium_used": 999,
            "reset_date": str(date.today().replace(day=1)),
        }
        mock_supabase.table.return_value.execute.return_value = MagicMock(data=[user])
        allowed, reason = manager.can_scan("test")
        assert allowed is True


class TestGetStatus:
    def test_free_tier_status(self, mock_supabase):
        user = {
            "machine_id": "test",
            "tier": "free",
            "critical_used": 0,
            "medium_used": 0,
            "reset_date": str(date.today().replace(day=1)),
        }
        mock_supabase.table.return_value.execute.return_value = MagicMock(data=[user])
        status = manager.get_status("test")
        assert status["tier"] == "free"
        assert status["critical_remaining"] == 1
        assert status["medium_remaining"] == 1
        assert status["can_scan"] is True

    def test_paid_tier_status(self, mock_supabase):
        user = {
            "machine_id": "test",
            "tier": "team",
            "critical_used": 50,
            "medium_used": 30,
            "reset_date": str(date.today().replace(day=1)),
        }
        mock_supabase.table.return_value.execute.return_value = MagicMock(data=[user])
        status = manager.get_status("test")
        assert status["tier"] == "team"
        assert status["can_scan"] is True


class TestTierLimits:
    def test_limits_defined(self):
        assert "free" in manager.LIMITS
        assert "hunter" in manager.LIMITS
        assert "team" in manager.LIMITS
        assert manager.LIMITS["free"]["critical"] == 1
        assert manager.LIMITS["free"]["medium"] == 1

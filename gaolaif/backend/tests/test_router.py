"""
Tests for the LLM router module.
Tests configuration checks, model mapping, and error handling.
No actual API calls are made.
"""
import os
import sys
from unittest.mock import patch, MagicMock

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from llm.router import Router, MODEL_MAP, LLMResponse


class TestRouterConfiguration:
    def test_not_configured_without_key(self):
        with patch.dict(os.environ, {"OPENROUTER_API_KEY": ""}, clear=False):
            router = Router(api_key="")
            assert router.is_configured() is False

    def test_configured_with_key(self):
        router = Router(api_key="test-key-123456789012345")
        assert router.is_configured() is True

    def test_reads_env_key(self):
        with patch.dict(os.environ, {"OPENROUTER_API_KEY": "env-key-1234567890123"}, clear=False):
            router = Router()
            assert router.is_configured() is True
            assert router.api_key == "env-key-1234567890123"


class TestModelMap:
    def test_all_roles_defined(self):
        expected_roles = {"scanner", "attacker", "verifier", "judge", "documenter"}
        assert set(MODEL_MAP.keys()) == expected_roles

    def test_models_are_strings(self):
        for role, model in MODEL_MAP.items():
            assert isinstance(model, str), f"Model for {role} should be a string"
            assert "/" in model, f"Model for {role} should contain provider/model format"


class TestRouterCall:
    def test_returns_error_when_not_configured(self):
        router = Router(api_key="")
        response = router.call("scanner", "system", "user")
        assert response.success is False
        assert "not configured" in response.error.lower()

    def test_returns_error_for_unknown_role(self):
        router = Router(api_key="test-key-123456789012345")
        response = router.call("nonexistent_role", "system", "user")
        assert response.success is False
        assert "unknown" in response.error.lower()

    @patch("httpx.Client.post")
    def test_successful_api_call(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "choices": [{"message": {"content": "test response"}}]
        }
        mock_post.return_value = mock_resp

        router = Router(api_key="test-key-123456789012345")
        response = router.call("scanner", "system", "user prompt")
        assert response.success is True
        assert response.content == "test response"
        assert response.latency_ms >= 0

    @patch("httpx.Client.post")
    def test_handles_http_error(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.status_code = 401
        mock_resp.text = "Unauthorized"
        mock_post.return_value = mock_resp

        router = Router(api_key="test-key-123456789012345")
        response = router.call("scanner", "system", "user")
        assert response.success is False
        assert "401" in response.error

    def test_reload_resets_client(self):
        router = Router(api_key="old-key-123456789012345")
        old_client = router._get_client()
        router.reload()
        assert router._client is None
        assert router.api_key == os.environ.get("OPENROUTER_API_KEY", "")


class TestLLMResponse:
    def test_default_values(self):
        resp = LLMResponse(content="test", model="m", latency_ms=100)
        assert resp.success is True
        assert resp.error is None

    def test_error_response(self):
        resp = LLMResponse(content="", model="m", latency_ms=0, success=False, error="fail")
        assert resp.success is False
        assert resp.error == "fail"

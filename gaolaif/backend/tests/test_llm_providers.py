"""Unit tests for SIREEN Multi-Provider LLM Router & Secure Configuration."""

import json
import os
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from llm.router import (
    CONFIG_FILE,
    Router,
    SUPPORTED_PROVIDERS,
    load_config,
    mask_key,
    save_config,
)


@pytest.fixture(autouse=True)
def clean_env_and_config(tmp_path, monkeypatch):
    """Isolate LLM config and environment for each test."""
    fake_config_dir = tmp_path / ".sireen"
    fake_config_file = fake_config_dir / "config.json"
    monkeypatch.setattr("llm.router.CONFIG_DIR", fake_config_dir)
    monkeypatch.setattr("llm.router.CONFIG_FILE", fake_config_file)
    for p in SUPPORTED_PROVIDERS.values():
        monkeypatch.delenv(p["env_key"], raising=False)
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    monkeypatch.delenv("SIREEN_LLM_PROVIDER", raising=False)
    monkeypatch.delenv("SIREEN_LLM_MODEL", raising=False)
    monkeypatch.delenv("SIREEN_LLM_BASE_URL", raising=False)


def test_mask_key():
    assert mask_key("") == "<none>"
    assert mask_key("short") == "***"
    assert mask_key("sk-or-v1-abcdef0123456789") == "sk-o...6789"


def test_secure_config_persistence(tmp_path):
    cfg = {"provider": "openai", "api_key": "sk-test-12345678", "model": "gpt-4o"}
    save_config(cfg)
    loaded = load_config()
    assert loaded == cfg
    assert (tmp_path / ".sireen" / "config.json").exists()


def test_router_not_configured_returns_error():
    router = Router()
    assert router.is_configured() is False
    assert router.get_mode_description() == "HEURISTIC"
    res = router.call("attacker", "System", "User")
    assert res.success is False
    assert "not configured" in res.error


def test_router_openai_mock_call():
    router = Router(api_key="sk-fake-openai", provider="openai")
    assert router.is_configured() is True
    assert "LLM_ASSISTED (openai/" in router.get_mode_description()

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "choices": [{"message": {"content": "OpenAI generated attack scenario"}}]
    }

    with patch("httpx.Client.post", return_value=mock_resp):
        res = router.call("attacker", "System prompt", "User prompt")
        assert res.success is True
        assert res.content == "OpenAI generated attack scenario"


def test_router_anthropic_format_call():
    router = Router(api_key="sk-ant-test", provider="anthropic")
    assert router.is_configured() is True
    assert "LLM_ASSISTED (anthropic/" in router.get_mode_description()

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "content": [{"type": "text", "text": "Anthropic response"}]
    }

    with patch("httpx.Client.post", return_value=mock_resp) as mock_post:
        res = router.call("scanner", "System prompt", "User prompt")
        assert res.success is True
        assert res.content == "Anthropic response"
        mock_post.assert_called_once()
        args, kwargs = mock_post.call_args
        assert args[0] == "/messages"
        assert kwargs["json"]["system"] == "System prompt"


def test_router_ollama_local_mode():
    router = Router(provider="ollama")
    # Ollama requires no API key by default
    assert router.is_configured() is True
    assert "LOCAL_MODEL (ollama/" in router.get_mode_description()

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "choices": [{"message": {"content": "Local model output"}}]
    }

    with patch("httpx.Client.post", return_value=mock_resp):
        res = router.call("verifier", "System", "User")
        assert res.success is True
        assert res.content == "Local model output"

"""SIREEN Multi-Provider LLM Router & Secure Configuration Management.

Supports:
- OpenRouter (Default cloud aggregator)
- OpenAI (gpt-4o, gpt-4o-mini, etc.)
- Anthropic Claude (claude-3-5-sonnet, etc.)
- Google Gemini (gemini-1.5-pro, etc.)
- Ollama (Local models: llama3, mistral, deepseek-coder, etc.)
- Custom OpenAI-compatible endpoints (vLLM, LocalAI, text-generation-webui)

Configuration priority:
1. Environment variables (OPENROUTER_API_KEY, OPENAI_API_KEY, etc.)
2. Local secure configuration file: ~/.sireen/config.json (0600 permissions)
3. Default heuristic fallback (when no key/endpoint is configured)
"""

import json
import os
import stat
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional

import httpx

CONFIG_DIR = Path.home() / ".sireen"
CONFIG_FILE = CONFIG_DIR / "config.json"

SUPPORTED_PROVIDERS = {
    "openrouter": {
        "name": "OpenRouter",
        "base_url": "https://openrouter.ai/api/v1",
        "env_key": "OPENROUTER_API_KEY",
        "default_model": "openai/gpt-oss-20b:free",
        "auth_type": "bearer",
    },
    "openai": {
        "name": "OpenAI",
        "base_url": "https://api.openai.com/v1",
        "env_key": "OPENAI_API_KEY",
        "default_model": "gpt-4o-mini",
        "auth_type": "bearer",
    },
    "anthropic": {
        "name": "Anthropic Claude",
        "base_url": "https://api.anthropic.com/v1",
        "env_key": "ANTHROPIC_API_KEY",
        "default_model": "claude-3-5-sonnet-20241022",
        "auth_type": "anthropic",
    },
    "gemini": {
        "name": "Google Gemini",
        "base_url": "https://generativelanguage.googleapis.com/v1beta/openai",
        "env_key": "GEMINI_API_KEY",
        "default_model": "gemini-1.5-flash",
        "auth_type": "bearer",
    },
    "ollama": {
        "name": "Ollama (Local)",
        "base_url": "http://localhost:11434/v1",
        "env_key": "OLLAMA_API_KEY",
        "default_model": "llama3.2",
        "auth_type": "none",
    },
    "custom": {
        "name": "Custom OpenAI-Compatible Endpoint",
        "base_url": "http://localhost:8000/v1",
        "env_key": "CUSTOM_LLM_API_KEY",
        "default_model": "default",
        "auth_type": "bearer",
    },
}

MODEL_MAP = {
    "scanner": "openai/gpt-oss-20b:free",
    "attacker": "nvidia/nemotron-nano-9b-v2:free",
    "verifier": "nvidia/nemotron-3.5-content-safety:free",
    "judge": "nvidia/nemotron-nano-9b-v2:free",
    "documenter": "cohere/north-mini-code:free",
}

DEFAULT_TEMPERATURES = {
    "scanner": 0.1,
    "attacker": 0.7,
    "verifier": 0.2,
    "judge": 0.3,
    "documenter": 0.4,
}


@dataclass
class LLMResponse:
    content: str
    model: str
    latency_ms: float
    success: bool = True
    error: Optional[str] = None


def mask_key(key: str) -> str:
    """Safely mask API key for terminal display."""
    if not key:
        return "<none>"
    if len(key) <= 8:
        return "***"
    return f"{key[:4]}...{key[-4:]}"


def load_config() -> dict[str, Any]:
    """Load config from ~/.sireen/config.json securely."""
    if not CONFIG_FILE.is_file():
        return {}
    try:
        return json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {}


def save_config(cfg: dict[str, Any]) -> None:
    """Save config to ~/.sireen/config.json with strict 0600 file permissions."""
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    try:
        os.chmod(CONFIG_DIR, 0o700)
    except OSError:
        pass

    temp_file = CONFIG_DIR / "config.json.tmp"
    temp_file.write_text(json.dumps(cfg, indent=2), encoding="utf-8")
    try:
        os.chmod(temp_file, 0o600)
    except OSError:
        pass
    temp_file.replace(CONFIG_FILE)
    try:
        os.chmod(CONFIG_FILE, 0o600)
    except OSError:
        pass


class Router:
    """Multi-provider LLM router with fallback and secure configuration."""

    def __init__(self, api_key: Optional[str] = None, provider: Optional[str] = None):
        self._client: Optional[httpx.Client] = None
        self.reload(api_key=api_key, provider=provider)

    def reload(self, api_key: Optional[str] = None, provider: Optional[str] = None):
        """Reload configuration from environment and ~/.sireen/config.json."""
        self.close()
        saved_cfg = load_config()

        # Determine provider
        if provider:
            self.provider = provider.lower()
        elif "SIREEN_LLM_PROVIDER" in os.environ:
            self.provider = os.environ["SIREEN_LLM_PROVIDER"].lower()
        else:
            self.provider = saved_cfg.get("provider", "openrouter").lower()

        if self.provider not in SUPPORTED_PROVIDERS:
            self.provider = "openrouter"

        meta = SUPPORTED_PROVIDERS[self.provider]

        # Determine base URL
        if "SIREEN_LLM_BASE_URL" in os.environ:
            self.base_url = os.environ["SIREEN_LLM_BASE_URL"].rstrip("/")
        else:
            self.base_url = saved_cfg.get("base_url", meta["base_url"]).rstrip("/")

        # Determine model
        if "SIREEN_LLM_MODEL" in os.environ:
            self.model_override = os.environ["SIREEN_LLM_MODEL"]
        else:
            self.model_override = saved_cfg.get("model", "")

        # Determine API key
        if api_key is not None:
            self.api_key = api_key
        elif meta["env_key"] in os.environ:
            self.api_key = os.environ[meta["env_key"]]
        elif "OPENROUTER_API_KEY" in os.environ and self.provider == "openrouter":
            self.api_key = os.environ["OPENROUTER_API_KEY"]
        else:
            self.api_key = saved_cfg.get("api_key", "")

        self._client = None

    def _get_client(self) -> httpx.Client:
        if self._client is None:
            headers = {"Content-Type": "application/json"}
            meta = SUPPORTED_PROVIDERS[self.provider]
            if meta["auth_type"] == "bearer" and self.api_key:
                headers["Authorization"] = f"Bearer {self.api_key}"
            elif meta["auth_type"] == "anthropic" and self.api_key:
                headers["x-api-key"] = self.api_key
                headers["anthropic-version"] = "2023-06-01"

            self._client = httpx.Client(
                base_url=self.base_url,
                headers=headers,
                timeout=120.0,
            )
        return self._client

    def is_configured(self) -> bool:
        meta = SUPPORTED_PROVIDERS[self.provider]
        if meta["auth_type"] == "none":
            return bool(self.base_url)
        return bool(self.api_key) and self.api_key != ""

    def get_mode_description(self) -> str:
        """Return human-readable mode string for evidence reports."""
        if not self.is_configured():
            return "HEURISTIC"
        model = self.model_override or SUPPORTED_PROVIDERS[self.provider]["default_model"]
        if self.provider == "ollama":
            return f"LOCAL_MODEL (ollama/{model})"
        return f"LLM_ASSISTED ({self.provider}/{model})"

    def call(
        self,
        model_role: str,
        system_prompt: str,
        user_prompt: str,
        temperature: Optional[float] = None,
        max_tokens: int = 4096,
    ) -> LLMResponse:
        if not self.is_configured():
            return LLMResponse(
                content="",
                model=model_role,
                latency_ms=0,
                success=False,
                error=f"{SUPPORTED_PROVIDERS[self.provider]['env_key']} not configured",
            )

        # Validate role for OpenRouter / standard mapping
        if self.provider == "openrouter":
            if model_role not in MODEL_MAP and not self.model_override:
                return LLMResponse(
                    content="",
                    model=model_role,
                    latency_ms=0,
                    success=False,
                    error=f"Unknown model role: {model_role}",
                )

        # Resolve model
        if self.model_override:
            model = self.model_override
        elif self.provider == "openrouter":
            model = MODEL_MAP.get(model_role, SUPPORTED_PROVIDERS[self.provider]["default_model"])
        else:
            model = SUPPORTED_PROVIDERS[self.provider]["default_model"]

        temp = temperature if temperature is not None else DEFAULT_TEMPERATURES.get(model_role, 0.3)
        start = time.perf_counter()

        try:
            client = self._get_client()

            # Anthropic special payload format
            if self.provider == "anthropic":
                payload = {
                    "model": model,
                    "system": system_prompt,
                    "messages": [{"role": "user", "content": user_prompt}],
                    "temperature": temp,
                    "max_tokens": max_tokens,
                }
                endpoint = "/messages"
            else:
                # Standard OpenAI-compatible format (OpenAI, OpenRouter, Gemini, Ollama, Custom)
                payload = {
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    "temperature": temp,
                    "max_tokens": max_tokens,
                }
                endpoint = "/chat/completions"

            resp = client.post(endpoint, json=payload)
            latency = (time.perf_counter() - start) * 1000

            if resp.status_code != 200:
                return LLMResponse(
                    content="",
                    model=model,
                    latency_ms=latency,
                    success=False,
                    error=f"HTTP {resp.status_code}: {resp.text[:200]}",
                )

            data = resp.json()
            if self.provider == "anthropic":
                content = "".join(b.get("text", "") for b in data.get("content", []))
            else:
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "")

            return LLMResponse(content=content, model=model, latency_ms=latency, success=True)

        except httpx.TimeoutException:
            latency = (time.perf_counter() - start) * 1000
            return LLMResponse(
                content="", model=model, latency_ms=latency, success=False, error="Request timed out",
            )
        except Exception as e:
            latency = (time.perf_counter() - start) * 1000
            return LLMResponse(
                content="", model=model, latency_ms=latency, success=False, error=str(e),
            )

    def close(self):
        if self._client:
            self._client.close()
            self._client = None

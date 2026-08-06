import os
import json
import time
from typing import Optional
from dataclasses import dataclass, field

import httpx


OPENROUTER_BASE = "https://openrouter.ai/api/v1"

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


class Router:
    def __init__(self, api_key: Optional[str] = None):
        # Explicit None means "read from env"; empty string means "explicitly not configured"
        self.api_key = api_key if api_key is not None else os.environ.get("OPENROUTER_API_KEY", "")
        self._client: Optional[httpx.Client] = None

    def _get_client(self) -> httpx.Client:
        if self._client is None:
            self._client = httpx.Client(
                base_url=OPENROUTER_BASE,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                timeout=120.0,
            )
        return self._client

    def is_configured(self) -> bool:
        return bool(self.api_key) and self.api_key != ""

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
                error="OPENROUTER_API_KEY not configured",
            )

        model = MODEL_MAP.get(model_role)
        if not model:
            return LLMResponse(
                content="",
                model=model_role,
                latency_ms=0,
                success=False,
                error=f"Unknown model role: {model_role}",
            )

        temp = temperature if temperature is not None else DEFAULT_TEMPERATURES.get(model_role, 0.3)

        start = time.perf_counter()
        try:
            client = self._get_client()
            resp = client.post(
                "/chat/completions",
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    "temperature": temp,
                    "max_tokens": max_tokens,
                },
            )
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

    def reload(self):
        """Re-read the API key from env and reset the HTTP client."""
        self.api_key = os.environ.get("OPENROUTER_API_KEY", "")
        self.close()  # next call to _get_client() will create a fresh client

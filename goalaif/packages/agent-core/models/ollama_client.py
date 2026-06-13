import httpx
from typing import Optional

OLLAMA_BASE = "http://localhost:11434"
FAST_MODEL = "deepseek-coder:6.7b"
DEEP_MODEL = "codellama:13b"


def call_ollama(prompt: str, model: str = DEEP_MODEL, timeout: int = 120) -> Optional[str]:
    try:
        resp = httpx.post(
            f"{OLLAMA_BASE}/api/generate",
            json={"model": model, "prompt": prompt, "stream": False},
            timeout=timeout,
        )
        resp.raise_for_status()
        raw = resp.json().get("response", "")
        if raw.startswith("```"):
            raw = raw.split("```", 2)[1] if "```" in raw[3:] else raw[3:]
            if raw.endswith("```"):
                raw = raw[:-3]
        return raw.strip() or None
    except Exception:
        return None


def call_ollama_deep(prompt: str) -> Optional[str]:
    return call_ollama(prompt, model=DEEP_MODEL, timeout=180)


def ollama_available() -> bool:
    try:
        r = httpx.get(f"{OLLAMA_BASE}/api/tags", timeout=3)
        return r.status_code == 200
    except Exception:
        return False

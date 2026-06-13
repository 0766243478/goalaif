from typing import List, Optional


class Embedder:
    def embed(self, text: str) -> List[float]:
        from models.ollama_client import call_ollama
        prompt = f"Generate a compact semantic vector embedding for this text. Return only a JSON array of 128 floats between -1 and 1:\n\n{text[:500]}"
        try:
            raw = call_ollama(prompt, model="nomic-embed-text")
            if raw:
                import json, re
                arr = re.search(r'\[.*?\]', raw, re.DOTALL)
                if arr:
                    vec = json.loads(arr.group())
                    if isinstance(vec, list) and len(vec) == 128:
                        return vec
            return [0.0] * 128
        except Exception:
            return [0.0] * 128

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        return [self.embed(t) for t in texts]

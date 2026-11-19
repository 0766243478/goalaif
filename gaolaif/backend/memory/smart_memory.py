"""
SmartMemory — local knowledge base with Qdrant primary / dict fallback.

Fixes:
  P-3  init() is called lazily (via background task) so Qdrant connection
       timeout does not block FastAPI startup.
  H-11 _search_fallback now uses pure substring matching (the hash-based
       branch was unreliable and has been removed).
  V-1  Real sentence-transformers embeddings when available; hash-based
       pseudo-embedding fallback when not.
"""

import hashlib
import json
import os
import uuid
from enum import Enum
from typing import Optional
from dataclasses import dataclass, field


class MemoryMode(str, Enum):
    """Where pattern memory lives.

    AUTO    — use Qdrant when reachable, otherwise the process-local dict.
    QDRANT  — require Qdrant; fail loudly at init instead of silently degrading.
    MEMORY  — process-local dict only; never attempt a network connection.
    OFF     — store and return nothing; the pipeline runs without recall.
    """
    AUTO = "auto"
    QDRANT = "qdrant"
    MEMORY = "memory"
    OFF = "off"


def resolve_mode() -> MemoryMode:
    raw = os.environ.get("SIREEN_MEMORY_MODE", "").strip().lower()
    try:
        return MemoryMode(raw) if raw else MemoryMode.AUTO
    except ValueError:
        return MemoryMode.AUTO


@dataclass
class MemoryEntry:
    key: str
    content: str
    metadata: dict = field(default_factory=dict)
    hash: str = ""


class SmartMemory:
    def __init__(self):
        self._qdrant_client = None
        self._collection_name = "sireen_memory"
        self._fallback_store: dict[str, MemoryEntry] = {}
        self._use_qdrant = False
        self._mode = resolve_mode()
        self._init_error = ""
        self._embedder = None
        self._embed_dim = 384
        # NOTE: init() is NOT called here — it is called from the FastAPI
        # startup event via asyncio.to_thread(memory.init) so the 2-second
        # Qdrant timeout does not block uvicorn startup.

    def init(self):
        """P-3 fix: called in background, not in __init__."""
        self._mode = resolve_mode()
        if self._mode is MemoryMode.OFF:
            self._use_qdrant = False
            return
        if self._mode is MemoryMode.MEMORY:
            self._use_qdrant = False
            self._init_embedder()
            return

        self._init_embedder()
        try:
            from qdrant_client import QdrantClient
            host = os.environ.get("QDRANT_HOST", "localhost")
            port = int(os.environ.get("QDRANT_PORT", "6333"))
            api_key = os.environ.get("QDRANT_API_KEY", "")
            if api_key:
                self._qdrant_client = QdrantClient(url=f"https://{host}:{port}", api_key=api_key, timeout=2.0)
            else:
                self._qdrant_client = QdrantClient(host, port=port, timeout=2.0)
            self._qdrant_client.get_collections()
            self._ensure_collection()
            self._use_qdrant = True
            self._init_error = ""
        except Exception as exc:
            self._use_qdrant = False
            self._init_error = str(exc)
            if self._mode is MemoryMode.QDRANT:
                # Explicitly requested Qdrant must not degrade silently — the
                # operator asked for durable recall and is not getting it.
                raise

    @property
    def mode(self) -> str:
        return self._mode.value

    def describe(self) -> dict:
        """Truthful capability report for /config/status and diagnostics."""
        return {
            "mode": self._mode.value,
            "backend": "qdrant" if self._use_qdrant else "memory",
            "degraded": bool(self._mode is MemoryMode.QDRANT and not self._use_qdrant),
            "init_error": self._init_error,
        }

    def _init_embedder(self):
        """V-1 fix: try sentence-transformers, fall back to hash-based."""
        try:
            from sentence_transformers import SentenceTransformer
            model_name = "all-MiniLM-L6-v2"
            self._embedder = SentenceTransformer(model_name)
            self._embed_dim = self._embedder.get_sentence_embedding_dimension()
        except ImportError:
            self._embedder = None

    def _ensure_collection(self):
        from qdrant_client.http.models import VectorParams, Distance
        cols = [c.name for c in self._qdrant_client.get_collections().collections]
        if self._collection_name not in cols:
            self._qdrant_client.create_collection(
                collection_name=self._collection_name,
                vectors_config=VectorParams(size=self._embed_dim, distance=Distance.COSINE),
            )

    def _compute_hash(self, content: str) -> str:
        return hashlib.sha256(content.encode()).hexdigest()[:16]

    def _compute_vector(self, text: str) -> list[float]:
        if self._embedder is not None:
            return self._embedder.encode(text).tolist()
        h = self._compute_hash(text)
        pseudo_vec = [float(int(h[i:i+2], 16)) / 255.0 for i in range(0, min(32, len(h)), 2)]
        return (pseudo_vec * 192)[:self._embed_dim]

    def save(self, key: str, content: str, metadata: Optional[dict] = None):
        if self._mode is MemoryMode.OFF:
            return
        if not key or not content:
            return
        entry = MemoryEntry(
            key=key,
            content=content,
            metadata=metadata or {},
            hash=self._compute_hash(content),
        )
        if self._use_qdrant:
            self._save_qdrant(entry)
        else:
            self._fallback_store[key] = entry

    def _save_qdrant(self, entry: MemoryEntry):
        try:
            from qdrant_client.http.models import PointStruct
            point_id = abs(hash(entry.key)) % (2 ** 63)
            vec = self._compute_vector(entry.content)
            self._qdrant_client.upsert(
                collection_name=self._collection_name,
                points=[PointStruct(
                    id=point_id,
                    vector=vec,
                    payload={
                        "key": entry.key,
                        "content": entry.content,
                        "metadata": json.dumps(entry.metadata),
                        "hash": entry.hash,
                    },
                )],
            )
        except Exception:
            self._fallback_store[entry.key] = entry

    def search(self, query: str, top_k: int = 5) -> list[MemoryEntry]:
        if self._mode is MemoryMode.OFF:
            return []
        if self._use_qdrant:
            return self._search_qdrant(query, top_k)
        return self._search_fallback(query, top_k)

    def _search_qdrant(self, query: str, top_k: int) -> list[MemoryEntry]:
        try:
            qvec = self._compute_vector(query)
            # qdrant-client 1.16 removed QdrantClient.search(); query_points is
            # the supported replacement and returns a QueryResponse with
            # `.points`. Older clients keep the legacy call.
            if hasattr(self._qdrant_client, "query_points"):
                results = self._qdrant_client.query_points(
                    collection_name=self._collection_name,
                    query=qvec,
                    limit=top_k,
                ).points
            else:
                results = self._qdrant_client.search(
                    collection_name=self._collection_name,
                    query_vector=qvec,
                    limit=top_k,
                )
            entries = []
            for r in results:
                p = r.payload
                entries.append(MemoryEntry(
                    key=p.get("key", ""),
                    content=p.get("content", ""),
                    metadata=json.loads(p.get("metadata", "{}")),
                    hash=p.get("hash", ""),
                ))
            return entries
        except Exception:
            return self._search_fallback(query, top_k)

    def _search_fallback(self, query: str, top_k: int) -> list[MemoryEntry]:
        """
        H-11 fix: pure case-insensitive substring match on content.
        The previous hash-based branch (qhash in entry.hash) was a near-miss
        comparison that almost never succeeded. Removed entirely.
        """
        ql = query.lower()
        results = [
            entry for entry in self._fallback_store.values()
            if ql in entry.content.lower()
        ]
        # Rank by content length proximity to query length (simple heuristic)
        results.sort(key=lambda e: abs(len(e.content) - len(query)))
        return results[:top_k]

    def get(self, key: str) -> Optional[MemoryEntry]:
        if self._use_qdrant:
            return self._get_qdrant(key)
        return self._fallback_store.get(key)

    def _get_qdrant(self, key: str) -> Optional[MemoryEntry]:
        try:
            from qdrant_client.http.models import Filter, FieldCondition, MatchValue
            results = self._qdrant_client.scroll(
                collection_name=self._collection_name,
                scroll_filter=Filter(
                    must=[FieldCondition(key="key", match=MatchValue(value=key))]
                ),
                limit=1,
            )[0]
            if results:
                p = results[0].payload
                return MemoryEntry(
                    key=p.get("key", ""),
                    content=p.get("content", ""),
                    metadata=json.loads(p.get("metadata", "{}")),
                    hash=p.get("hash", ""),
                )
        except Exception:
            pass
        return self._fallback_store.get(key)

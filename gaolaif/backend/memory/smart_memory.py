"""
SmartMemory — local knowledge base with Qdrant primary / dict fallback.

Fixes:
  P-3  init() is called lazily (via background task) so Qdrant connection
       timeout does not block FastAPI startup.
  H-11 _search_fallback now uses pure substring matching (the hash-based
       branch was unreliable and has been removed).
"""

import hashlib
import json
import uuid
from typing import Optional
from dataclasses import dataclass, field


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
        # NOTE: init() is NOT called here — it is called from the FastAPI
        # startup event via asyncio.to_thread(memory.init) so the 2-second
        # Qdrant timeout does not block uvicorn startup.

    def init(self):
        """P-3 fix: called in background, not in __init__."""
        try:
            from qdrant_client import QdrantClient
            self._qdrant_client = QdrantClient("localhost", port=6333, timeout=2.0)
            self._qdrant_client.get_collections()
            self._ensure_collection()
            self._use_qdrant = True
        except Exception:
            self._use_qdrant = False

    def _ensure_collection(self):
        from qdrant_client.http.models import VectorParams, Distance
        cols = [c.name for c in self._qdrant_client.get_collections().collections]
        if self._collection_name not in cols:
            self._qdrant_client.create_collection(
                collection_name=self._collection_name,
                vectors_config=VectorParams(size=384, distance=Distance.COSINE),
            )

    def _compute_hash(self, content: str) -> str:
        return hashlib.sha256(content.encode()).hexdigest()[:16]

    def save(self, key: str, content: str, metadata: Optional[dict] = None):
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
            self._qdrant_client.upsert(
                collection_name=self._collection_name,
                points=[PointStruct(
                    id=point_id,
                    vector=[0.0] * 384,
                    payload={
                        "key": entry.key,
                        "content": entry.content,
                        "metadata": json.dumps(entry.metadata),
                        "hash": entry.hash,
                    },
                )],
            )
        except Exception:
            # Fall back to dict on Qdrant write failure
            self._fallback_store[entry.key] = entry

    def search(self, query: str, top_k: int = 5) -> list[MemoryEntry]:
        if self._use_qdrant:
            return self._search_qdrant(query, top_k)
        return self._search_fallback(query, top_k)

    def _search_qdrant(self, query: str, top_k: int) -> list[MemoryEntry]:
        try:
            results = self._qdrant_client.search(
                collection_name=self._collection_name,
                query_vector=[0.0] * 384,
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

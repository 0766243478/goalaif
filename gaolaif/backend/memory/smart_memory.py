import hashlib
import json
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
        self._collection_name = "gaolaif_memory"
        self._fallback_store: dict[str, MemoryEntry] = {}
        self._use_qdrant = False
        self._init_qdrant()

    def _init_qdrant(self):
        try:
            from qdrant_client import QdrantClient
            from qdrant_client.http.exceptions import UnexpectedResponse
            self._qdrant_client = QdrantClient("localhost", port=6333, timeout=2.0)
            self._qdrant_client.get_collections()
            self._ensure_collection()
            self._use_qdrant = True
        except Exception:
            self._use_qdrant = False

    def _ensure_collection(self):
        from qdrant_client.http.models import VectorParams, Distance
        collections = [c.name for c in self._qdrant_client.get_collections().collections]
        if self._collection_name not in collections:
            self._qdrant_client.create_collection(
                collection_name=self._collection_name,
                vectors_config=VectorParams(size=384, distance=Distance.COSINE),
            )

    def _compute_hash(self, content: str) -> str:
        return hashlib.sha256(content.encode()).hexdigest()[:16]

    def save(self, key: str, content: str, metadata: Optional[dict] = None):
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
        from qdrant_client.http.models import PointStruct
        point_id = abs(hash(entry.key)) % (2**63)
        self._qdrant_client.upsert(
            collection_name=self._collection_name,
            points=[PointStruct(
                id=point_id,
                vector=[0.0] * 384,
                payload={"key": entry.key, "content": entry.content,
                         "metadata": json.dumps(entry.metadata), "hash": entry.hash},
            )],
        )

    def search(self, query: str, top_k: int = 5) -> list[MemoryEntry]:
        if self._use_qdrant:
            return self._search_qdrant(query, top_k)
        return self._search_fallback(query, top_k)

    def _search_qdrant(self, query: str, top_k: int) -> list[MemoryEntry]:
        try:
            from qdrant_client.http.models import Filter, FieldCondition, MatchValue
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
            return []

    def _search_fallback(self, query: str, top_k: int) -> list[MemoryEntry]:
        qhash = self._compute_hash(query)
        results = []
        for entry in self._fallback_store.values():
            if qhash in entry.hash or query.lower() in entry.content.lower():
                results.append(entry)
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
        return None

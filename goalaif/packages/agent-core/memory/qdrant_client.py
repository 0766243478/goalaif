import json
import uuid
from typing import Any, Dict, List, Optional

from memory.embedder import Embedder


class QdrantMemoryClient:
    def __init__(self, host: str = "localhost", port: int = 6333):
        self.host = host
        self.port = port
        self.embedder = Embedder()
        self._collections = {"vulnerability_patterns", "fix_patterns", "exploit_tactics", "poc_templates"}
        self._connected = False
        self._in_memory: Dict[str, List[Dict]] = {c: [] for c in self._collections}
        try:
            from qdrant_client import QdrantClient
            self.client = QdrantClient(host=host, port=port)
            self.client.get_collections()
            self._connected = True
        except Exception:
            self.client = None

    def _ensure_collection(self, name: str):
        if not self.client:
            return
        try:
            self.client.get_collection(name)
        except Exception:
            from qdrant_client.models import VectorParams, Distance
            self.client.create_collection(name, vectors_config=VectorParams(size=128, distance=Distance.COSINE))

    def store_finding(self, collection: str, finding: Dict):
        if collection not in self._collections:
            collection = "vulnerability_patterns"
        text = json.dumps(finding)
        vector = self.embedder.embed(text)
        f_id = str(uuid.uuid4())
        self._in_memory[collection].append({"id": f_id, "payload": finding, "vector": vector})

        if self.client and self._connected:
            from qdrant_client.models import PointStruct
            self._ensure_collection(collection)
            self.client.upsert(collection, points=[PointStruct(id=f_id, vector=vector, payload=finding)])

    def search_similar(self, query: str, collection: str = "vulnerability_patterns", limit: int = 5) -> List[Dict]:
        if collection not in self._collections:
            collection = "vulnerability_patterns"
        query_vector = self.embedder.embed(query)

        if self.client and self._connected:
            try:
                self._ensure_collection(collection)
                results = self.client.search(collection, query_vector=query_vector, limit=limit)
                return [{"score": r.score, **r.payload} for r in results]
            except Exception:
                pass

        items = self._in_memory.get(collection, [])
        scored = []
        for item in items:
            score = self._cosine_sim(query_vector, item.get("vector", [0.0] * 128))
            scored.append({"score": score, **item["payload"]})
        scored.sort(key=lambda x: x["score"], reverse=True)
        return scored[:limit]

    def get_attack_suggestions(self, query: str, limit: int = 3) -> List[Dict]:
        return self.search_similar(query, collection="exploit_tactics", limit=limit)

    @staticmethod
    def _cosine_sim(a: List[float], b: List[float]) -> float:
        import math
        dot = sum(x * y for x, y in zip(a, b))
        na = math.sqrt(sum(x * x for x in a))
        nb = math.sqrt(sum(x * x for x in b))
        if na == 0 or nb == 0:
            return 0.0
        return dot / (na * nb)

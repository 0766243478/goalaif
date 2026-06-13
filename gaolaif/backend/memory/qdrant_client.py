import uuid
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from qdrant_client.http.exceptions import UnexpectedResponse

QDRANT_URL = "http://localhost:6333"
EMBED_DIM = 384

client = QdrantClient(url=QDRANT_URL)


def get_embedding(text: str) -> tuple[list[float], bool]:
    """Returns (embedding, is_real_embedding). Hash fallback when Ollama offline."""
    try:
        import httpx
        resp = httpx.post(
            "http://localhost:11434/api/embeddings",
            json={"model": "nomic-embed-text", "prompt": text},
            timeout=5,
        )
        if resp.status_code == 200:
            return resp.json()["embedding"], True
    except Exception:
        pass

    return _hash_embedding(text), False


def _hash_embedding(text: str) -> list[float]:
    """Deterministic embedding using MD5 hash — no external dependency."""
    import hashlib
    raw = hashlib.md5(text.encode()).digest()
    vec = []
    for i in range(EMBED_DIM):
        h = hashlib.sha256(raw + str(i).encode()).digest()
        val = int.from_bytes(h[:4], 'big') / 2**32
        vec.append(val * 2 - 1)
    norm = sum(v * v for v in vec) ** 0.5
    return [v / norm for v in vec]


def ensure_collection(name: str):
    try:
        client.get_collection(name)
    except UnexpectedResponse:
        client.create_collection(
            name,
            vectors_config=VectorParams(size=EMBED_DIM, distance=Distance.COSINE),
        )


def upsert(collection: str, text: str, metadata: dict) -> str:
    ensure_collection(collection)
    embedding, _ = get_embedding(text)
    point_id = str(uuid.uuid4())
    client.upsert(
        collection,
        points=[PointStruct(id=point_id, vector=embedding, payload={"text": text, **metadata})],
    )
    return point_id


def search(collection: str, query: str, top_k: int = 5) -> list[dict]:
    ensure_collection(collection)
    embedding, is_real = get_embedding(query)
    results = client.search(collection, query_vector=embedding, limit=top_k)
    return [{"score": r.score, "degraded": not is_real, **r.payload} for r in results]

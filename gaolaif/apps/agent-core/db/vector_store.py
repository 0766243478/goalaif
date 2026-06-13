# ──────────────────────────────────────────────
# VectorStore — pgvector Operations
# ──────────────────────────────────────────────
# Stores and queries code embeddings using
# pgvector. All embedding generation is local
# via Ollama (nomic-embed-text).
# ──────────────────────────────────────────────

import os
from typing import Any, Dict, List, Optional, Tuple

import psycopg2
import psycopg2.extras
import psycopg2.pool


class VectorStore:
    """pgvector-backed vector store for code embeddings."""

    def __init__(
        self,
        host: str = "localhost",
        port: int = 5432,
        dbname: str = "gaolaif",
        user: str = "gaolaif",
        password: str = "gaolaif_local_only",
    ):
        self.conn_pool = psycopg2.pool.ThreadedConnectionPool(
            minconn=1, maxconn=10,
            host=host, port=port, dbname=dbname,
            user=user, password=password,
        )

    def store_embedding(
        self,
        session_id: str,
        chunk_index: int,
        chunk_text: str,
        embedding: List[float],
        source_file: str,
        start_line: int,
        end_line: int,
    ):
        """Store a single code chunk embedding."""
        conn = self.conn_pool.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """INSERT INTO code_embeddings
                       (session_id, chunk_index, chunk_text, embedding, source_file, start_line, end_line)
                       VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                    (session_id, chunk_index, chunk_text, embedding, source_file, start_line, end_line),
                )
            conn.commit()
        finally:
            self.conn_pool.putconn(conn)

    def store_embeddings_batch(self, embeddings: List[Dict[str, Any]]):
        """Batch insert multiple embeddings."""
        conn = self.conn_pool.getconn()
        try:
            with conn.cursor() as cur:
                psycopg2.extras.execute_values(
                    cur,
                    """INSERT INTO code_embeddings
                       (session_id, chunk_index, chunk_text, embedding, source_file, start_line, end_line)
                       VALUES %s""",
                    [
                        (
                            e["session_id"], e["chunk_index"], e["chunk_text"],
                            e["embedding"], e["source_file"], e["start_line"], e["end_line"],
                        )
                        for e in embeddings
                    ],
                )
            conn.commit()
        finally:
            self.conn_pool.putconn(conn)

    def search_similar(
        self,
        session_id: str,
        embedding: List[float],
        limit: int = 10,
        threshold: float = 0.7,
    ) -> List[Dict[str, Any]]:
        """Search for semantically similar code chunks."""
        conn = self.conn_pool.getconn()
        try:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    """SELECT chunk_text, source_file, start_line, end_line,
                              1 - (embedding <=> %s::vector) AS similarity
                       FROM code_embeddings
                       WHERE session_id = %s
                         AND 1 - (embedding <=> %s::vector) >= %s
                       ORDER BY similarity DESC
                       LIMIT %s""",
                    (embedding, session_id, embedding, threshold, limit),
                )
                return cur.fetchall()
        finally:
            self.conn_pool.putconn(conn)

    def get_session_embeddings(self, session_id: str) -> List[Dict[str, Any]]:
        """Get all embeddings for a session."""
        conn = self.conn_pool.getconn()
        try:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    "SELECT * FROM code_embeddings WHERE session_id = %s ORDER BY chunk_index",
                    (session_id,),
                )
                return cur.fetchall()
        finally:
            self.conn_pool.putconn(conn)

    def delete_session(self, session_id: str):
        """Delete all embeddings for a session."""
        conn = self.conn_pool.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM code_embeddings WHERE session_id = %s", (session_id,))
            conn.commit()
        finally:
            self.conn_pool.putconn(conn)

    @staticmethod
    def generate_embedding(text: str) -> List[float]:
        """Generate embedding locally via Ollama."""
        import httpx
        try:
            response = httpx.post(
                "http://localhost:11434/api/embeddings",
                json={"model": "nomic-embed-text", "prompt": text},
                timeout=30,
            )
            response.raise_for_status()
            return response.json()["embedding"]
        except Exception as e:
            raise RuntimeError(f"Failed to generate embedding: {e}")

    def close(self):
        self.conn_pool.closeall()

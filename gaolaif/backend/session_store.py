"""
Sireen Session Store — SQLite-backed persistent session management.

A Session is the PRIMARY object in SIREEN. Every audit, AI conversation,
exploit, report, note, task, finding, and timeline entry belongs to a Session.

This module persists the ENTIRE workspace state — not just metadata — so that
closing VS Code never loses the user's work.

Schema:
  sessions         — session metadata + full workspace state (JSON blob)
  session_timeline — append-only timeline events per session
"""

import json
import sqlite3
import time
import uuid
from pathlib import Path
from typing import Any, Optional

DB_PATH = Path(__file__).parent / "sessions.db"


def _get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    """Create tables if they don't exist. Called on backend startup."""
    conn = _get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS sessions (
            id              TEXT PRIMARY KEY,
            name            TEXT NOT NULL DEFAULT 'Untitled Session',
            project         TEXT NOT NULL DEFAULT '',
            repository      TEXT NOT NULL DEFAULT '',
            status          TEXT NOT NULL DEFAULT 'active',
            -- 'active' | 'archived' | 'deleted'
            audit_status    TEXT NOT NULL DEFAULT 'idle',
            -- 'idle' | 'running' | 'complete' | 'error'
            file_path       TEXT NOT NULL DEFAULT '',
            file_name       TEXT NOT NULL DEFAULT '',
            language        TEXT NOT NULL DEFAULT 'solidity',
            created_at      REAL NOT NULL,
            updated_at      REAL NOT NULL,
            workspace_state  TEXT NOT NULL DEFAULT '{}'
            -- Full JSON blob: ALL session state including:
            -- findings, exploits, chatMessages, notes, tasks,
            -- thinkingSteps, auditProgress, auditPhase, protocol,
            -- contractCode, contractFilePath, activeView,
            -- rightPanelTab, rightPanelOpen, bottomPanelTab,
            -- sessionView, findingsFilter, sandboxReady,
            -- simulationLog, suggestions, memoryEntries,
            -- memoryCollection, activeSessionId, activeSessionName,
            -- sessionView, patchResult, apiKeySet, protocol,
            -- connectionStatus, rightPanelOpen, bottomPanelOpen
        );

        CREATE TABLE IF NOT EXISTS session_timeline (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id  TEXT NOT NULL,
            timestamp   REAL NOT NULL,
            event_type  TEXT NOT NULL,
            -- 'audit_started' | 'audit_complete' | 'chat_message' | 'exploit_started'
            -- | 'exploit_complete' | 'report_generated' | 'patch_generated'
            -- | 'note_added' | 'task_created' | 'task_completed' | 'session_created'
            -- | 'session_renamed' | 'session_archived' | 'session_restored'
            summary     TEXT NOT NULL DEFAULT '',
            metadata    TEXT NOT NULL DEFAULT '{}',
            FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
        CREATE INDEX IF NOT EXISTS idx_sessions_updated ON sessions(updated_at DESC);
        CREATE INDEX IF NOT EXISTS idx_timeline_session ON session_timeline(session_id, timestamp DESC);
    """)
    conn.commit()
    conn.close()


def create_session(
    name: str = "",
    project: str = "",
    repository: str = "",
    file_path: str = "",
    file_name: str = "",
    language: str = "solidity",
    workspace_state: Optional[dict] = None,
) -> dict:
    """Create a new session and return it as a dict."""
    sid = f"session-{uuid.uuid4().hex[:12]}"
    now = time.time()
    ws = workspace_state or {}
    conn = _get_db()
    conn.execute(
        """INSERT INTO sessions
           (id, name, project, repository, status, audit_status,
            file_path, file_name, language, created_at, updated_at, workspace_state)
           VALUES (?, ?, ?, ?, 'active', 'idle', ?, ?, ?, ?, ?, ?)""",
        (sid, name or "Untitled Session", project, repository,
         file_path, file_name, language, now, now, json.dumps(ws)),
    )
    _add_timeline_event(conn, sid, "session_created", f"Session '{name or 'Untitled Session'}' created")
    conn.commit()
    conn.close()
    return get_session(sid)


def get_session(session_id: str) -> Optional[dict]:
    """Retrieve a single session by ID, including workspace state."""
    conn = _get_db()
    row = conn.execute("SELECT * FROM sessions WHERE id = ? AND status != 'deleted'", (session_id,)).fetchone()
    conn.close()
    return _row_to_dict(row) if row else None


def list_sessions(
    status: str = "active",
    search: str = "",
    sort_by: str = "updated_at",
    sort_order: str = "desc",
    limit: int = 100,
) -> list[dict]:
    """List sessions with optional search, sort, and filter."""
    conn = _get_db()
    valid_sort = {"created_at", "updated_at", "name", "status"}
    sort_col = sort_by if sort_by in valid_sort else "updated_at"
    sort_dir = "ASC" if sort_order.lower() == "asc" else "DESC"

    if status == "all":
        where = "status != 'deleted'"
        params: list[Any] = []
    else:
        where = "status = ?"
        params = [status]

    if search:
        where += " AND (name LIKE ? OR project LIKE ? OR repository LIKE ? OR file_name LIKE ?)"
        pat = f"%{search}%"
        params.extend([pat, pat, pat, pat])

    rows = conn.execute(
        f"SELECT * FROM sessions WHERE {where} ORDER BY {sort_col} {sort_dir} LIMIT ?",
        params + [limit],
    ).fetchall()
    conn.close()
    return [_row_to_dict(r) for r in rows]


def update_session(session_id: str, updates: dict) -> Optional[dict]:
    """Update session fields. Supports name, project, repository, status,
    audit_status, file_path, file_name, language, workspace_state."""
    conn = _get_db()
    row = conn.execute("SELECT * FROM sessions WHERE id = ? AND status != 'deleted'", (session_id,)).fetchone()
    if not row:
        conn.close()
        return None

    allowed = {"name", "project", "repository", "status", "audit_status",
               "file_path", "file_name", "language", "workspace_state"}
    sets = []
    params: list[Any] = []
    for key, val in updates.items():
        if key in allowed:
            if key == "workspace_state":
                sets.append(f"{key} = ?")
                params.append(json.dumps(val) if isinstance(val, dict) else val)
            else:
                sets.append(f"{key} = ?")
                params.append(val)

    if not sets:
        conn.close()
        return _row_to_dict(row)

    sets.append("updated_at = ?")
    params.append(time.time())
    params.append(session_id)
    conn.execute(f"UPDATE sessions SET {', '.join(sets)} WHERE id = ?", params)

    if "name" in updates:
        _add_timeline_event(conn, session_id, "session_renamed", f"Renamed to '{updates['name']}'")
    if "status" in updates and updates["status"] == "archived":
        _add_timeline_event(conn, session_id, "session_archived", "Session archived")

    conn.commit()
    conn.close()
    return get_session(session_id)


def save_workspace_state(session_id: str, state: dict) -> bool:
    """Persist the full workspace state for a session."""
    conn = _get_db()
    row = conn.execute("SELECT id FROM sessions WHERE id = ? AND status != 'deleted'", (session_id,)).fetchone()
    if not row:
        conn.close()
        return False
    conn.execute(
        "UPDATE sessions SET workspace_state = ?, updated_at = ? WHERE id = ?",
        (json.dumps(state), time.time(), session_id),
    )
    conn.commit()
    conn.close()
    return True


def delete_session(session_id: str) -> bool:
    """Soft-delete a session (marks as 'deleted')."""
    conn = _get_db()
    row = conn.execute("SELECT id FROM sessions WHERE id = ?", (session_id,)).fetchone()
    if not row:
        conn.close()
        return False
    conn.execute("UPDATE sessions SET status = 'deleted', updated_at = ? WHERE id = ?", (time.time(), session_id))
    conn.commit()
    conn.close()
    return True


def duplicate_session(session_id: str, new_name: str = "") -> Optional[dict]:
    """Duplicate a session (copies workspace state, resets audit status)."""
    original = get_session(session_id)
    if not original:
        return None
    return create_session(
        name=new_name or f"Copy of {original['name']}",
        project=original.get("project", ""),
        repository=original.get("repository", ""),
        file_path=original.get("file_path", ""),
        file_name=original.get("file_name", ""),
        language=original.get("language", "solidity"),
        workspace_state=original.get("workspace_state", {}),
    )


def get_timeline(session_id: str, limit: int = 100) -> list[dict]:
    """Get timeline events for a session."""
    conn = _get_db()
    rows = conn.execute(
        "SELECT * FROM session_timeline WHERE session_id = ? ORDER BY timestamp DESC LIMIT ?",
        (session_id, limit),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def add_timeline_event(session_id: str, event_type: str, summary: str, metadata: Optional[dict] = None):
    """Add a timeline event to a session (public API)."""
    conn = _get_db()
    _add_timeline_event(conn, session_id, event_type, summary, metadata)
    conn.commit()
    conn.close()


def _add_timeline_event(conn: sqlite3.Connection, session_id: str, event_type: str,
                        summary: str, metadata: Optional[dict] = None):
    conn.execute(
        "INSERT INTO session_timeline (session_id, timestamp, event_type, summary, metadata) VALUES (?, ?, ?, ?, ?)",
        (session_id, time.time(), event_type, summary, json.dumps(metadata or {})),
    )


def _row_to_dict(row: sqlite3.Row) -> dict:
    d = dict(row)
    try:
        d["workspace_state"] = json.loads(d.get("workspace_state") or "{}")
    except (json.JSONDecodeError, TypeError):
        d["workspace_state"] = {}
    return d

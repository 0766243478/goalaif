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
    # busy_timeout: two SIREEN instances (or an instance + CLI tool) sharing
    # sessions.db previously produced immediate `database is locked` failures.
    conn = sqlite3.connect(str(DB_PATH), timeout=10.0)
    conn.row_factory = sqlite3.Row
    # NOTE: journal_mode=WAL is persistent in the database file and is set once
    # in init_db(). Re-issuing the PRAGMA on every connection interacted badly
    # with concurrent access (observed intermittent `database is locked` on
    # audit persistence).
    conn.execute("PRAGMA busy_timeout = 10000")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


_LOCK_RETRY_DELAYS = (0.25, 0.5, 1.0, 2.0, 4.0)


def _retry_locked(fn, *args, **kwargs):
    """Retry a DB operation on transient `database is locked` errors.

    Root cause never fully identified (lock outlives the writer's own
    commit+close); bounded retries make durability reliable regardless.
    """
    last: Exception | None = None
    for delay in (0.0,) + _LOCK_RETRY_DELAYS:
        if delay:
            time.sleep(delay)
        try:
            return fn(*args, **kwargs)
        except sqlite3.OperationalError as e:
            if "locked" not in str(e).lower():
                raise
            last = e
            _dblog.warning("DB locked, retrying (%ss): %s", delay, e)
    raise last


import logging as _logging
import threading as _threading
import time as _time

_dblog = _logging.getLogger("sireen.db")


def _db_write(name: str, fn):
    """Instrumented write wrapper: logs thread, wait time, and lock errors."""
    t0 = _time.perf_counter()
    _dblog.warning("DB-WRITE enter %s thread=%s", name, _threading.current_thread().name)
    try:
        return fn()
    except sqlite3.OperationalError as e:
        _dblog.error("DB-LOCK %s after %.2fs: %s", name, _time.perf_counter() - t0, e)
        raise
    finally:
        _dblog.warning("DB-WRITE exit %s after %.2fs", name, _time.perf_counter() - t0)



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

        -- Core v0.1: durable audit records (survive restart; no TTL)
        CREATE TABLE IF NOT EXISTS audits (
            id              TEXT PRIMARY KEY,          -- audit-<hex> (= audit session id)
            file_name       TEXT NOT NULL DEFAULT '',
            file_path       TEXT NOT NULL DEFAULT '',
            language        TEXT NOT NULL DEFAULT 'solidity',
            source_hash     TEXT NOT NULL DEFAULT '',
            terminal_state  TEXT NOT NULL DEFAULT '',  -- confirmed|unverified|failed|degraded|clean_with_coverage
            reasoning_mode  TEXT NOT NULL DEFAULT 'HEURISTIC',
            forge_available INTEGER NOT NULL DEFAULT 0,
            error           TEXT,
            warnings        TEXT NOT NULL DEFAULT '[]',
            discovery       TEXT NOT NULL DEFAULT '{}',
            findings        TEXT NOT NULL DEFAULT '[]',   -- JSON list of finding dicts (incl. evidence_id)
            report_markdown TEXT NOT NULL DEFAULT '',
            report_json     TEXT NOT NULL DEFAULT '{}',
            started_at      REAL NOT NULL DEFAULT 0,
            finished_at     REAL NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS audit_hypotheses (
            id          TEXT PRIMARY KEY,              -- hyp-<hex>
            audit_id    TEXT NOT NULL,
            name        TEXT NOT NULL DEFAULT '',
            category    TEXT NOT NULL DEFAULT '',
            target      TEXT NOT NULL DEFAULT '',
            rationale   TEXT NOT NULL DEFAULT '',
            attack_objective TEXT NOT NULL DEFAULT '',
            preconditions  TEXT NOT NULL DEFAULT '[]',
            exploit_steps  TEXT NOT NULL DEFAULT '[]',
            source_mode TEXT NOT NULL DEFAULT 'HEURISTIC',
            created_at  REAL NOT NULL DEFAULT 0,
            FOREIGN KEY (audit_id) REFERENCES audits(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS audit_evidence (
            id          TEXT PRIMARY KEY,              -- evd-<hex>
            audit_id    TEXT NOT NULL,
            hypothesis_id TEXT NOT NULL DEFAULT '',
            payload     TEXT NOT NULL DEFAULT '{}',    -- full EvidencePack dict
            created_at  REAL NOT NULL DEFAULT 0,
            FOREIGN KEY (audit_id) REFERENCES audits(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_audits_state ON audits(terminal_state);
        CREATE INDEX IF NOT EXISTS idx_audits_finished ON audits(finished_at DESC);
        CREATE INDEX IF NOT EXISTS idx_hyp_audit ON audit_hypotheses(audit_id);
        CREATE INDEX IF NOT EXISTS idx_evd_audit ON audit_evidence(audit_id);
    """)
    _migrate_schema(conn)
    conn.commit()
    conn.close()


def _migrate_schema(conn: sqlite3.Connection):
    """Idempotent column migrations for databases created before Core v0.1."""
    hyp_extras = {
        "target_contract": "TEXT NOT NULL DEFAULT ''",
        "discovery_evidence": "TEXT NOT NULL DEFAULT '[]'",
        "confidence": "TEXT NOT NULL DEFAULT ''",
        "limitations": "TEXT NOT NULL DEFAULT '[]'",
    }
    existing = {r["name"] for r in conn.execute("PRAGMA table_info(audit_hypotheses)").fetchall()}
    for col, decl in hyp_extras.items():
        if col not in existing:
            conn.execute(f"ALTER TABLE audit_hypotheses ADD COLUMN {col} {decl}")


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


# ── Core v0.1: durable audit persistence ─────────────────────────────────────

def _save_audit_impl(audit: dict) -> None:
    """Insert or replace a durable audit record.

    Expected keys: id, file_name, file_path, language, source_hash,
    terminal_state, reasoning_mode, forge_available, error, warnings(list),
    discovery(dict), findings(list of dicts), report_markdown, report_json(dict),
    started_at, finished_at. hypotheses/evidence are saved separately.
    """
    conn = _get_db()
    _dblog.warning("DB save_audit enter thread=%s", _threading.current_thread().name)
    conn.execute(
        """INSERT OR REPLACE INTO audits
           (id, file_name, file_path, language, source_hash, terminal_state,
            reasoning_mode, forge_available, error, warnings, discovery,
            findings, report_markdown, report_json, started_at, finished_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            audit.get("id", ""),
            audit.get("file_name", ""),
            audit.get("file_path", ""),
            audit.get("language", "solidity"),
            audit.get("source_hash", ""),
            audit.get("terminal_state", ""),
            audit.get("reasoning_mode", "HEURISTIC"),
            1 if audit.get("forge_available") else 0,
            audit.get("error"),
            json.dumps(audit.get("warnings", [])),
            json.dumps(audit.get("discovery", {})),
            json.dumps(audit.get("findings", [])),
            audit.get("report_markdown", ""),
            json.dumps(audit.get("report_json", {})),
            audit.get("started_at", 0.0),
            audit.get("finished_at", 0.0),
        ),
    )
    conn.commit()
    _dblog.warning("DB save_audit exit ok")
    conn.close()


def save_audit(audit: dict) -> None:
    return _retry_locked(_save_audit_impl, audit)


def get_audit(audit_id: str) -> Optional[dict]:
    """Retrieve a durable audit with its hypotheses and evidence packs."""
    conn = _get_db()
    row = conn.execute("SELECT * FROM audits WHERE id = ?", (audit_id,)).fetchone()
    if not row:
        conn.close()
        return None
    a = dict(row)
    a["warnings"] = json.loads(a.get("warnings") or "[]")
    a["discovery"] = json.loads(a.get("discovery") or "{}")
    a["findings"] = json.loads(a.get("findings") or "[]")
    a["report_json"] = json.loads(a.get("report_json") or "{}")
    hyp_rows = conn.execute(
        "SELECT * FROM audit_hypotheses WHERE audit_id = ?", (audit_id,)
    ).fetchall()
    a["hypotheses"] = []
    for h in hyp_rows:
        hd = dict(h)
        hd["preconditions"] = json.loads(hd.get("preconditions") or "[]")
        hd["exploit_steps"] = json.loads(hd.get("exploit_steps") or "[]")
        hd["discovery_evidence"] = json.loads(hd.get("discovery_evidence") or "[]")
        hd["limitations"] = json.loads(hd.get("limitations") or "[]")
        a["hypotheses"].append(hd)
    ev_rows = conn.execute(
        "SELECT * FROM audit_evidence WHERE audit_id = ?", (audit_id,)
    ).fetchall()
    a["evidence"] = [json.loads(e["payload"] or "{}") for e in ev_rows]
    conn.close()
    return a


def list_audits(limit: int = 50) -> list[dict]:
    """List durable audits (metadata only), newest first."""
    conn = _get_db()
    rows = conn.execute(
        "SELECT id, file_name, file_path, language, source_hash, terminal_state,"
        " reasoning_mode, forge_available, started_at, finished_at"
        " FROM audits ORDER BY finished_at DESC LIMIT ?",
        (limit,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def _save_hypotheses_impl(audit_id: str, hypotheses: list[dict]) -> None:
    """Persist hypotheses for an audit (replaces existing rows)."""
    conn = _get_db()
    conn.execute("DELETE FROM audit_hypotheses WHERE audit_id = ?", (audit_id,))
    for h in hypotheses:
        conn.execute(
            """INSERT OR REPLACE INTO audit_hypotheses
               (id, audit_id, name, category, target, rationale, attack_objective,
                preconditions, exploit_steps, source_mode, created_at,
                target_contract, discovery_evidence, confidence, limitations)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                h.get("id", ""),
                audit_id,
                h.get("name", ""),
                h.get("category", ""),
                h.get("target", ""),
                h.get("rationale", ""),
                h.get("attack_objective", ""),
                json.dumps(h.get("preconditions", [])),
                json.dumps(h.get("exploit_steps", [])),
                h.get("source_mode", "HEURISTIC"),
                h.get("created_at", time.time()),
                h.get("target_contract", ""),
                json.dumps(h.get("discovery_evidence", [])),
                h.get("confidence", ""),
                json.dumps(h.get("limitations", [])),
            ),
        )
    conn.commit()
    conn.close()


def save_hypotheses(audit_id: str, hypotheses: list[dict]) -> None:
    return _retry_locked(_save_hypotheses_impl, audit_id, hypotheses)


def _save_evidence_impl(audit_id: str, evidence: list[dict]) -> None:
    """Persist evidence packs for an audit (replaces existing rows)."""
    conn = _get_db()
    conn.execute("DELETE FROM audit_evidence WHERE audit_id = ?", (audit_id,))
    for e in evidence:
        conn.execute(
            """INSERT OR REPLACE INTO audit_evidence
               (id, audit_id, hypothesis_id, payload, created_at)
               VALUES (?, ?, ?, ?, ?)""",
            (
                e.get("id", ""),
                audit_id,
                e.get("hypothesis_id", ""),
                json.dumps(e),
                e.get("created_at", time.time()),
            ),
        )
    conn.commit()
    conn.close()
def save_evidence(audit_id: str, evidence: list[dict]) -> None:
    return _retry_locked(_save_evidence_impl, audit_id, evidence)


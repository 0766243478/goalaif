# ──────────────────────────────────────────────
# DuckAnalytics — DuckDB Analytics Layer
# ──────────────────────────────────────────────
# Fast analytical queries against audit session
# data. Completely local, zero external deps.
# Used for dashboards, trend analysis, reports.
# ──────────────────────────────────────────────

import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

import duckdb


class DuckAnalytics:
    """Local analytics engine using DuckDB."""

    def __init__(self, db_path: Optional[str] = None):
        if db_path is None:
            db_path = str(Path.home() / ".gaolaif" / "analytics.duckdb")
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self.conn = duckdb.connect(db_path)
        self._init_schema()

    def _init_schema(self):
        """Initialize analytics tables."""
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS audit_daily (
                date DATE NOT NULL,
                total_audits INTEGER DEFAULT 0,
                total_findings INTEGER DEFAULT 0,
                critical_findings INTEGER DEFAULT 0,
                confirmed_exploits INTEGER DEFAULT 0,
                avg_severity_score FLOAT DEFAULT 0.0,
                PRIMARY KEY (date)
            )
        """)

    def record_audit_completion(
        self,
        session_id: str,
        findings_count: int,
        critical_count: int,
        confirmed_count: int,
        avg_severity: float,
    ):
        """Record daily aggregate metrics."""
        self.conn.execute("""
            INSERT INTO audit_daily (date, total_audits, total_findings, critical_findings, confirmed_exploits, avg_severity_score)
            VALUES (CURRENT_DATE, 1, ?, ?, ?, ?)
            ON CONFLICT (date) DO UPDATE SET
                total_audits = audit_daily.total_audits + 1,
                total_findings = audit_daily.total_findings + ?,
                critical_findings = audit_daily.critical_findings + ?,
                confirmed_exploits = audit_daily.confirmed_exploits + ?,
                avg_severity_score = (audit_daily.avg_severity_score + ?) / 2
        """, (findings_count, critical_count, confirmed_count, avg_severity,
              findings_count, critical_count, confirmed_count, avg_severity))

    def query_daily_stats(self, days: int = 30) -> List[Dict[str, Any]]:
        """Get daily audit statistics for the last N days."""
        result = self.conn.execute("""
            SELECT *
            FROM audit_daily
            WHERE date >= CURRENT_DATE - INTERVAL '?' DAY
            ORDER BY date DESC
        """, (days,))
        return [dict(row) for row in result.fetchall()]

    def query_summary(self) -> Dict[str, Any]:
        """Get summary statistics."""
        result = self.conn.execute("""
            SELECT
                COUNT(*) as total_days,
                COALESCE(SUM(total_audits), 0) as total_audits,
                COALESCE(SUM(total_findings), 0) as total_findings,
                COALESCE(SUM(critical_findings), 0) as total_critical,
                COALESCE(SUM(confirmed_exploits), 0) as total_confirmed,
                COALESCE(AVG(avg_severity_score), 0.0) as avg_severity
            FROM audit_daily
        """).fetchone()
        return dict(result) if result else {}

    def export_to_json(self) -> str:
        """Export all analytics as JSON."""
        rows = self.conn.execute("SELECT * FROM audit_daily ORDER BY date").fetchall()
        columns = ["date", "total_audits", "total_findings", "critical_findings", "confirmed_exploits", "avg_severity_score"]
        data = [dict(zip(columns, row)) for row in rows]
        return json.dumps(data, indent=2, default=str)

    def close(self):
        self.conn.close()

-- ──────────────────────────────────────────────
-- Gaolaif — Database Schema v1
-- ──────────────────────────────────────────────
-- Tables: audit_sessions, vulnerability_findings,
--         code_embeddings, agent_logs
-- ──────────────────────────────────────────────

-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- ── Audit Sessions ───────────────────────────
CREATE TABLE IF NOT EXISTS audit_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_name   TEXT NOT NULL,
    contract_path   TEXT NOT NULL,
    contract_hash   TEXT NOT NULL,            -- SHA-256 of ingested source
    language        TEXT NOT NULL CHECK (language IN ('solidity', 'move', 'rust')),
    status          TEXT NOT NULL DEFAULT 'ingesting'
                        CHECK (status IN ('ingesting','auditing','exploiting','patching','complete','error')),
    chain           TEXT DEFAULT 'ethereum',  -- ethereum, sui, aptos, arbitrum, optimism
    fork_url        TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at    TIMESTAMPTZ,
    metadata        JSONB DEFAULT '{}'::jsonb
);

-- ── Vulnerability Findings ───────────────────
CREATE TABLE IF NOT EXISTS vulnerability_findings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID NOT NULL REFERENCES audit_sessions(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    description     TEXT NOT NULL,
    severity        TEXT NOT NULL CHECK (severity IN ('CRITICAL','HIGH','MEDIUM','LOW','INFO')),
    category        TEXT NOT NULL,             -- reentrancy, access-control, oracle, etc.
    location        TEXT NOT NULL,             -- file:line:col
    code_snippet    TEXT,
    confidence      TEXT NOT NULL DEFAULT 'UNCONFIRMED'
                        CHECK (confidence IN ('UNCONFIRMED','CONFIRMED','FALSE_POSITIVE')),
    exploit_proof   JSONB,                    -- ExploitProof dataclass serialized
    patch_proposal  JSONB,                    -- PatchProposal dataclass serialized
    static_tool     TEXT,                     -- slither, aderyn, or manual
    cwe_ids         TEXT[],
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_findings_session   ON vulnerability_findings(session_id);
CREATE INDEX idx_findings_severity  ON vulnerability_findings(severity);
CREATE INDEX idx_findings_confidence ON vulnerability_findings(confidence);

-- ── Code Embeddings (pgvector) ──────────────
CREATE TABLE IF NOT EXISTS code_embeddings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID NOT NULL REFERENCES audit_sessions(id) ON DELETE CASCADE,
    chunk_index     INT NOT NULL,
    chunk_text      TEXT NOT NULL,
    embedding       vector(768),              -- nomic-embed-text produces 768-dim
    source_file     TEXT NOT NULL,
    start_line      INT NOT NULL,
    end_line        INT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_embeddings_session ON code_embeddings(session_id);
CREATE INDEX idx_embeddings_vec     ON code_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ── Agent Logs ───────────────────────────────
CREATE TABLE IF NOT EXISTS agent_logs (
    id              BIGSERIAL PRIMARY KEY,
    session_id      UUID NOT NULL REFERENCES audit_sessions(id) ON DELETE CASCADE,
    agent_name      TEXT NOT NULL,            -- auditor, exploit, patch_verifier, firewall
    log_level       TEXT NOT NULL DEFAULT 'INFO' CHECK (log_level IN ('DEBUG','INFO','WARN','ERROR')),
    message         TEXT NOT NULL,
    metadata        JSONB DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_logs_session  ON agent_logs(session_id);
CREATE INDEX idx_logs_agent    ON agent_logs(agent_name);
CREATE INDEX idx_logs_created  ON agent_logs(created_at);

-- ── Trigger: auto-update updated_at ──────────
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_sessions_updated
    BEFORE UPDATE ON audit_sessions
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_findings_updated
    BEFORE UPDATE ON vulnerability_findings
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

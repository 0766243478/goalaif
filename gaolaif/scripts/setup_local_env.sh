#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────
# Gaolaif — Local Environment Bootstrap Script
# ──────────────────────────────────────────────
# Provisions: Ollama, Foundry (forge/anvil/cast),
# PostgreSQL + pgvector, Redis, Python venv
# ──────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_ROOT/setup.log"

log()  { echo "[$(date '+%H:%M:%S')] $*" | tee -a "$LOG_FILE"; }
err() { log "ERROR: $*"; exit 1; }

# ── OS Detection ──────────────────────────────
OS="$(uname -s)"
ARCH="$(uname -m)"
log "Detected: $OS / $ARCH"

# ── Helper: command exists? ──────────────────
has_cmd() { command -v "$1" &>/dev/null; }

# ── 1. System Dependencies ────────────────────
install_system_deps() {
    log "Installing system dependencies..."
    if has_cmd apt-get; then
        sudo apt-get update -qq
        sudo apt-get install -y -qq \
            curl git build-essential pkg-config \
            libssl-dev libclang-dev postgresql postgresql-client \
            redis-server python3 python3-pip python3-venv \
            clamav clamav-daemon yara \
            cmake jq
    elif has_cmd brew; then
        brew install \
            curl git cmake pkg-config \
            postgresql@16 redis python@3.12 \
            clamav yara jq
    else
        log "WARN: Unrecognized package manager. Install deps manually."
    fi
}

# ── 2. Ollama ─────────────────────────────────
install_ollama() {
    if has_cmd ollama; then
        log "Ollama already installed at $(which ollama)"
        return
    fi
    log "Installing Ollama..."
    if [[ "$OS" == "Linux" ]]; then
        curl -fsSL https://ollama.com/install.sh | sh
    elif [[ "$OS" == "Darwin" ]]; then
        brew install ollama
    fi
    # Start Ollama in background
    ollama serve &>/dev/null &
    log "Ollama started in background"
}

# ── 3. Foundry ────────────────────────────────
install_foundry() {
    if has_cmd forge; then
        log "Foundry already installed ($(forge --version))"
        return
    fi
    log "Installing Foundry..."
    curl -L https://foundry.paradigm.xyz | bash
    # Source foundryup in current shell
    export PATH="$HOME/.foundry/bin:$PATH"
    foundryup
    log "Foundry installed: $(forge --version)"
}

# ── 4. PostgreSQL + pgvector ──────────────────
setup_postgres() {
    log "Setting up PostgreSQL..."
    if has_cmd pg_isready; then
        pg_isready -q && log "PostgreSQL is running" || {
            sudo pg_ctlcluster 16 main start 2>/dev/null || brew services start postgresql@16 2>/dev/null || true
        }
    fi

    # Create gaolaif database and user
    sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='gaolaif'" | grep -q 1 || \
        sudo -u postgres psql -c "CREATE USER gaolaif WITH PASSWORD 'gaolaif_local_only';"
    sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='gaolaif'" | grep -q 1 || \
        sudo -u postgres psql -c "CREATE DATABASE gaolaif OWNER gaolaif;"
    sudo -u postgres psql -d gaolaif -c "CREATE EXTENSION IF NOT EXISTS vector;"
    log "PostgreSQL ready — database 'gaolaif' with pgvector extension"
}

# ── 5. Redis ──────────────────────────────────
setup_redis() {
    log "Setting up Redis..."
    if has_cmd redis-cli; then
        redis-cli ping 2>/dev/null && log "Redis is running" || {
            sudo systemctl start redis-server 2>/dev/null || brew services start redis 2>/dev/null || \
                redis-server --daemonize yes
        }
    fi
}

# ── 6. Python Virtual Environment ─────────────
setup_python_env() {
    log "Setting up Python virtual environment..."
    cd "$PROJECT_ROOT/apps/agent-core"
    python3 -m venv .venv
    source .venv/bin/activate
    pip install --quiet --upgrade pip setuptools wheel
    pip install --quiet \
        fastapi uvicorn[standard] \
        langgraph langchain-ollama pydantic \
        psycopg2-binary duckdb pgvector \
        sqlalchemy alembic \
        celery[redis] \
        yara-python \
        slither-analyzer \
        black isort mypy pytest \
        httpx websockets
    log "Python venv ready at apps/agent-core/.venv"
}

# ── 7. Run Migrations ─────────────────────────
run_migrations() {
    log "Running database migrations..."
    cd "$PROJECT_ROOT/apps/agent-core"
    source .venv/bin/activate
    for f in db/migrations/*.sql; do
        log "Applying migration: $(basename "$f")"
        PGPASSWORD=gaolaif_local_only psql -h localhost -U gaolaif -d gaolaif -f "$f"
    done
    log "Migrations complete"
}

# ── Main ─────────────────────────────────────
main() {
    log "═══ Gaolaif Environment Bootstrap ═══"
    install_system_deps
    install_ollama
    install_foundry
    setup_postgres
    setup_redis
    setup_python_env
    run_migrations
    log "═══ Bootstrap complete ═══"
    echo ""
    echo "Next steps:"
    echo "  1. Run: bash scripts/pull_models.sh"
    echo "  2. Start: cd apps/agent-core && source .venv/bin/activate && uvicorn main:app --reload"
    echo "  3. Start: cd apps/desktop && npm run tauri dev"
}

main "$@"

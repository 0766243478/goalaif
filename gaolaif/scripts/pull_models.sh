#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────
# Gaolaif — Pull Local Ollama Models
# ──────────────────────────────────────────────
# Pulls required models for code analysis
# ──────────────────────────────────────────────

LOG_FILE="$(dirname "$0")/../setup.log"
log() { echo "[$(date '+%H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

MODELS=(
    "codellama:13b"
    "deepseek-coder:6.7b"
    "nomic-embed-text"
)

log "═══ Pulling Ollama Models ═══"

# Ensure Ollama is running
if ! ollama list &>/dev/null; then
    log "Starting Ollama..."
    ollama serve &>/dev/null &
    sleep 2
fi

for model in "${MODELS[@]}"; do
    log "Pulling ${model}..."
    ollama pull "$model"
    log "${model} ready"
done

log "═══ All models pulled ═══"
echo ""
ollama list

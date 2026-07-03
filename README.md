# GoalAIF / Gaolaif

AI-native smart contract security workspace for Web3 auditors and bug bounty hunters. Gaolaif combines a VS Code extension, a FastAPI audit backend, and optional agent-core services to run a four-phase pipeline: understand → attack scenarios → forge simulation → judge and report.

## Features

- **4-phase audit pipeline** — protocol mapping, attack scenario generation, Foundry simulation, and finding validation
- **VS Code extension** — sidebar workspace with Protocol and Hacker modes, inline audit/exploit commands, and live WebSocket progress
- **Privacy firewall** — Anonymizer v2 strips identifiers before any external LLM call; inbound validation on findings
- **Forge integration** — local PoC generation and reentrancy simulation via Foundry
- **Smart memory** — Qdrant-backed abstract pattern storage (zero-knowledge: no raw code stored)
- **Sandbox** — Docker-based EVM/Move environments, invariant and fuzz endpoints
- **Subscription layer** — Supabase-backed tier limits for commercial deployment

## Repository layout

```
goalaif/
├── gaolaif/                    # Primary application
│   ├── backend/                # FastAPI backend (Sireen v2.1)
│   │   ├── phases/             # Phase 1–4 pipeline
│   │   ├── firewall/           # Anonymizer + inbound/outbound filters
│   │   ├── sandbox/            # Docker, Echidna, env simulator
│   │   ├── memory/             # Qdrant smart memory
│   │   ├── subscription/       # Payments + Supabase quotas
│   │   └── tests/              # E2E and unit tests
│   ├── extension/              # VS Code extension (React webview)
│   └── sandbox-images/         # EVM and Move Docker images
├── goalaif/                    # Agent-core package (Ollama + Qdrant stack)
│   ├── packages/agent-core/    # Multi-agent orchestration API
│   └── docker-compose.yml      # Qdrant + agent-core services
├── dynamic_gate_runner.py      # Local gate verification harness
├── SEI_INFRASTRUCTURE_MAP.md   # Sei Network audit reference map
└── gaolaif.html                # Standalone simulation cockpit UI
```

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Python | 3.11+ | Backend and tests |
| Node.js | 18+ | VS Code extension build |
| Foundry (`forge`) | latest | Phase 3 simulation (optional but recommended) |
| Docker | latest | Sandbox containers, Qdrant |
| OPENROUTER_API_KEY | — | LLM calls (OpenRouter) |

## Quick start

### 1. Backend

```bash
cd gaolaif/backend
pip install -r requirements.txt

# Optional: create .env with your API key
echo OPENROUTER_API_KEY=sk-or-v1-... > .env

uvicorn main:app --host 127.0.0.1 --port 7432
```

Verify: `curl http://127.0.0.1:7432/health`

### 2. VS Code extension

```bash
cd gaolaif/extension
npm install
npm run compile
```

Press **F5** in VS Code to launch the Extension Development Host, or package with `vsce package`.

Default backend port in extension settings: **7432** (`gaolaif.backendPort`).

### 3. Agent core (optional)

```bash
cd goalaif
docker compose up -d
```

Starts Qdrant on port 6333 and agent-core on port 8000.

## API overview

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Service status |
| `/models` | GET | Available LLM models |
| `/audit/start` | POST | Start full 4-phase audit |
| `/exploit/start` | POST | Single exploit scenario |
| `/sandbox/invariant` | POST | Run Forge invariant tests |
| `/sandbox/fuzz` | POST | Run Forge fuzz tests |
| `/sandbox/start` | POST | Start Docker sandbox |
| `/memory/search` | POST | Query smart memory |
| `/report/generate` | POST | Generate markdown report |
| `/config/set-key` | POST | Set OpenRouter API key |
| `/ws` | WebSocket | Real-time audit progress |

## Running tests

```bash
# Backend unit + E2E tests
cd gaolaif/backend
pytest tests/ firewall/tests/ -v

# Gate harness (anonymizer + pytest suite)
python dynamic_gate_runner.py

# Extension build check
cd gaolaif/extension && npm run compile
```

Tests that require `OPENROUTER_API_KEY` or live LLM calls are skipped automatically when the key is not set.

## Configuration

| Variable | Description |
|----------|-------------|
| `OPENROUTER_API_KEY` | OpenRouter API key for LLM routing |
| `QDRANT_HOST` | Qdrant host (default: localhost) |
| `QDRANT_PORT` | Qdrant port (default: 6333) |
| `SUPABASE_URL` | Supabase project URL (subscription) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |

## Architecture

```
┌─────────────────┐     WebSocket/REST     ┌──────────────────┐
│  VS Code        │ ◄────────────────────► │  FastAPI Backend │
│  Extension      │                        │  (gaolaif/backend)│
└─────────────────┘                        └────────┬─────────┘
                                                  │
                    ┌─────────────────────────────┼─────────────────────────────┐
                    ▼                             ▼                             ▼
             Phase 1–4 Pipeline           Anonymizer Firewall              Qdrant Memory
             (understand → judge)         (outbound + inbound)            (abstract patterns)
                    │
                    ▼
             Foundry / Docker Sandbox
```

## License

See `gaolaif/extension/LICENSE`.

## Links

- Repository: https://github.com/0766243478/goalaif

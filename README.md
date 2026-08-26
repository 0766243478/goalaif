# Sireen

**Forge-backed adversarial security workbench.** SIREEN turns a Solidity attack hypothesis into an inspectable PoC, an independent Forge verification result, and a human-reviewable evidence report — inside VS Code.

Sireen combines a VS Code extension and a FastAPI audit backend running an explicit stage pipeline: INPUT → DISCOVERY → REASONING → HYPOTHESIS → ATTACK PATH → PoC → VERIFICATION (Forge) → EVIDENCE → FINDING → REPORT.

> **AI reasoning is NOT proof.** A model-generated vulnerability is a *hypothesis*. A PoC is an *attempted demonstration*. Only independent execution (Forge) with a meaningful security-relevant assertion yields **CONFIRMED**.

## What SIREEN does / does NOT do (read this first)

| SIREEN DOES | SIREEN DOES NOT |
|---|---|
| Analyze ONE explicitly selected Solidity file per audit | Scan whole repositories or multi-file projects |
| Generate hypotheses in HEURISTIC mode (no API key) or LLM_ASSISTED mode (OpenRouter key) | Claim any finding is real without Forge evidence |
| Generate Foundry PoCs for **reentrancy, access control, arithmetic** vectors | Produce PoCs for oracle/flash-loan/governance/etc. (marked `skipped_unsupported`) |
| Execute PoCs with local `forge` and record compile/test status, executed-test counts, durations, raw output | Run Slither, Mythril, or Echidna inside the audit path |
| Assign explicit terminal states (below) and persist audits + evidence packs durably in SQLite | Compute authoritative risk scores or severities (labels are heuristic estimates) |
| Export Markdown/JSON reports that reference evidence IDs and reproduction steps | Provide hosted/cloud execution, teams, RBAC, billing in the local product |

## Evidence model & terminal states

Every finding links to an **Evidence Pack**: `audit → hypothesis → attack path → PoC source → Forge verification record → observed impact → reproduction steps`. Fetch via `GET /audits/{audit_id}`.

Terminal states (never a generic "success"):

- **CONFIRMED** — ≥1 finding verified by Forge execution; no unverified findings remain
- **DEGRADED** — partial verification (Forge unavailable, or any finding still requires manual review)
- **UNVERIFIED** — coverage insufficient to classify the run as clean
- **FAILED** — pipeline error, or every PoC failed generation/compilation
- **CLEAN_WITH_COVERAGE** — no confirmed and no review-pending findings, and every hypothesis received a real executed Forge attempt

## Features

- **4-phase audit pipeline** -- protocol mapping, attack scenario generation, Foundry simulation, and finding validation
- **VS Code extension** -- sidebar workspace with Protocol and Hacker modes, inline audit/exploit commands, and live WebSocket progress
- **Privacy firewall** -- Anonymizer v2 strips identifiers before any external LLM call; inbound validation on findings
- **Forge integration** -- local PoC generation and simulation via Foundry (reentrancy / access-control / arithmetic templates; other vectors are honestly skipped)
**Experimental components (shipped but NOT part of the Core v0.1 promise):**

- **Smart memory** -- Qdrant-backed abstract pattern storage (zero-knowledge: no raw code stored). Not used to produce CONFIRMED evidence.
- **Sandbox** -- Docker-based EVM/Move environments, invariant and fuzz endpoints. Requires Docker; not exercised by the core audit path.
- **Patch Engine** -- LLM-powered remediation patch generation for confirmed findings. AI output, never proof of correctness.

- **Report Export** -- Markdown and JSON report formats for bug bounty submissions

**Pro/Cloud preview (inactive in the local product):**

- **Subscription layer** -- Supabase-backed tier limits with NOWPayments integration. No hosted service is operated for v0.1; this code ships dormant.

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

# Optional: enable LLM-assisted reasoning (keys stay LOCAL, never commit them)
cp .env .env.local        # then edit .env.local and set OPENROUTER_API_KEY
# (.env.local is gitignored; without a key SIREEN runs in HEURISTIC mode)

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
| `/audits` | GET | List durable audits |
| `/audits/{id}` | GET | Full durable audit incl. hypotheses + evidence packs |
| `/audits/{id}/report` | GET | Markdown/JSON evidence report |
| `/exploit/start` | POST | Single exploit scenario |
| `/sandbox/invariant` | POST | Run Forge invariant tests |
| `/sandbox/fuzz` | POST | Run Forge fuzz tests |
| `/sandbox/start` | POST | Start Docker sandbox |
| `/memory/search` | POST | Query smart memory |
| `/memory/save` | POST | Save abstract pattern to memory |
| `/report/generate` | POST | Generate markdown report |
| `/report/export` | POST | Export report (markdown/json) |
| `/patch/generate` | POST | Generate remediation patch |
| `/subscription/status` | GET | Check subscription tier/quota |
| `/subscription/upgrade` | POST | Create NOWPayments invoice |
| `/payment/webhook` | POST | NOWPayments IPN webhook |
| `/config/set-key` | POST | Set OpenRouter API key |
| `/ws` | WebSocket | Real-time audit progress |

## Running the backend

The extension can start the backend for you:

1. Install Python 3.11+ and `pip install -r gaolaif/backend/requirements.txt`
2. In VS Code settings set **Sireen: Backend Path** (`gaolaif.backendPath`) to the absolute path of `goalaif/gaolaif/backend`
3. Optionally set **Sireen: Python Path** (`gaolaif.pythonPath`) if `python` is not on PATH
4. Reload VS Code — SIREEN probes `/health` and spawns `uvicorn main:app` automatically

Manual alternative:

```bash
cd goalaif/gaolaif/backend
python -m uvicorn main:app --host 127.0.0.1 --port 7432
```

If the backend cannot be reached, SIREEN shows an actionable warning with a Retry option — audits never silently report success without it.

## Running tests

```bash
# Backend unit + E2E tests (60+ tests)
cd gaolaif/backend
pytest tests/ firewall/tests/ -v

# Runtime verification suite (15 component checks)
python runtime_verification/verify_all.py

# Extension tests (jest)
cd gaolaif/extension
npx jest

# Extension build check
cd gaolaif/extension && npm run compile
```

Tests that require `OPENROUTER_API_KEY` or live LLM calls are skipped automatically when the key is not set.

### End-to-end example (Test Matrix)

With Python 3.11+ and Foundry installed:

```bash
cd gaolaif/backend && pytest tests/ -v          # unit + e2e
# Manual CONFIRMED-path check against a known-vulnerable fixture:
curl -X POST http://127.0.0.1:7432/audit/start \
  -H "Content-Type: application/json" \
  -d "{"code": "$(cat ../../vuln_contracts/01_reentrancy.sol)"}"
# Then poll: curl http://127.0.0.1:7432/audits/<audit_id>
```

Expected for `01_reentrancy.sol` with forge present: terminal_state `CONFIRMED`, ≥1 finding with an evidence pack containing the exact PoC and Forge output. Without forge: terminal_state `DEGRADED` and findings marked needs_review.

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

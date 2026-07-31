# AGENTS.md — Sireen (Gaolaif)

AI-native smart contract security workspace for Web3 auditors. VS Code extension + FastAPI backend running an automated audit pipeline against Solidity and Move contracts.

---

## Project Structure

```
goalaif/
├── docker-compose.prod.yml           # Production: backend (port 7432) + Qdrant
├── dynamic_gate_runner.py            # 11-task local verification harness
├── README.md
├── SEI_INFRASTRUCTURE_MAP.md         # Sei Network audit reference
├── gaolaif/
│   ├── backend/                      # FastAPI (Python 3.12)
│   │   ├── main.py                   # App entry, WebSocket, REST endpoints, pipeline orchestration
│   │   ├── llm/router.py             # OpenRouter HTTP client, MODEL_MAP (5 LLM roles)
│   │   ├── models/types.py           # ProtocolMap, AttackScenario, SimulationProof, Finding
│   │   ├── phases/                   # 5-phase audit pipeline
│   │   │   ├── phase1_understand.py  # Regex extraction + LLM scanner
│   │   │   ├── phase2_scenarios.py   # Attack scenario generation
│   │   │   ├── phase3_simulate.py    # Forge PoC generation + execution + LLM verification
│   │   │   ├── phase4_judge.py       # Finding discrimination + report generation
│   │   │   └── phase5_patch.py       # Remediation patch generation
│   │   ├── firewall/                 # Anonymization + input/output filtering
│   │   │   ├── anonymizer.py         # Address/contract/function redaction + deanonymization
│   │   │   ├── outbound.py           # Blocks sensitive patterns (private keys, mnemonics)
│   │   │   └── inbound.py            # Validates findings, CVEs, exploit proofs
│   │   ├── sandbox/                  # Docker-based EVM/Move execution
│   │   │   ├── docker_runner.py      # Container lifecycle
│   │   │   ├── env_detector.py       # Solidity vs Move detection
│   │   │   ├── env_simulator.py      # Oracle staleness / price manipulation
│   │   │   ├── echidna_runner.py     # Echidna invariant testing
│   │   │   └── forge_std_mock.py     # Lightweight forge-std shim for offline
│   │   ├── memory/smart_memory.py    # Qdrant primary / dict fallback
│   │   ├── subscription/             # Supabase + NOWPayments
│   │   └── tests/                    # pytest suite
│   ├── extension/                    # VS Code extension (TypeScript + React)
│   │   ├── package.json              # Commands, keybindings, menus, config
│   │   ├── webpack.config.js         # Dual: Node (extension) + browser (webview)
│   │   ├── jest.config.js
│   │   └── src/
│   │       ├── extension.ts          # activate/deactivate, wires all providers
│   │       ├── api/backendClient.ts  # HTTP + WebSocket client to backend
│   │       ├── messaging/MessageRouter.ts  # Webview <-> backend bridge
│   │       ├── sidebar/              # WebViewViewProvider + React webview
│   │       ├── commands/             # auditSelection, exploitSelection, runSandbox, generateReport
│   │       ├── editor/               # CodeLens, CodeActions, Diagnostics, Hover providers
│   │       └── decorations/          # Vulnerability highlight
│   └── sandbox-images/               # Docker images for EVM (Anvil) and Move sandboxes
```

---

## Commands

### Backend

```bash
cd gaolaif/backend
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 7432
pytest tests/ firewall/tests/ -v
```

### Extension

```bash
cd gaolaif/extension
npm install
npm run compile              # webpack build
npx jest                     # unit tests
```

### Full Verification

```bash
python dynamic_gate_runner.py    # 11-task local verifier (THE GATE)
```

### Production

```bash
docker compose -f docker-compose.prod.yml up -d   # backend + Qdrant
```

### CI (GitHub Actions)

Push/PR to `main` runs both `pytest` (backend) and `npm run compile && npx jest` (extension).

---

## Architecture

```
VS Code Webview (React)
    |  postMessage() via acquireVsCodeApi()
    v
SidebarProvider (extension host)
    |  delegates to
    v
MessageRouter
    |  HTTP :7432 / WebSocket :7432/ws
    v
FastAPI Backend (main.py)
    |
    +---> Phase 1-5 Pipeline (asyncio tasks)
    +---> Firewall (anonymize <-> deanonymize)
    +---> Memory (Qdrant / dict fallback)
    +---> Sandbox (Docker + Forge + Echidna)
    +---> Subscription (Supabase / NOWPayments)
```

**Message flow**: Webview -> `postMessage` -> SidebarProvider -> MessageRouter -> BackendClient (HTTP/WS) -> FastAPI. Response flows back through WebSocket events (`thinking.start`, `audit.progress`, `audit.complete`, `exploit.complete`, `sandbox.log`, etc.) -> BackendClient -> MessageRouter -> `postMessageToWebview` -> React reducer store.

---

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `OPENROUTER_API_KEY` | Yes (AI features) | LLM routing via OpenRouter |
| `QDRANT_HOST` | No (default: localhost) | Qdrant vector DB |
| `QDRANT_PORT` | No (default: 6333) | Qdrant vector DB |
| `SUPABASE_URL` | No | User/quota management |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Supabase service role |
| `NOWPAYMENTS_API_KEY` | No | Crypto payment invoices |
| `NOWPAYMENTS_IPN_SECRET` | No | Payment webhook HMAC |
| `SIREEN_BACKEND_URL` | No (default: http://localhost:7432) | Payment callback URL |
| `GAOLAIF_CLOUD_URL` | No (default: empty = OFF) | Cloud egress, disabled by default |

Extension setting `gaolaif.backendPort` (default: 7432) controls which port the extension connects to.

---

## Gotchas

1. **No raw code in memory**: `/memory/save` has a `_looks_like_raw_code()` guard that rejects content with Solidity tokens. This is intentional, not a bug.

2. **Source truncation**: Phase 2 truncates source to 6000 chars for LLM context. Phase 3 truncates to 4000 chars for verifier.

3. **Echidna paths are Windows-hardcoded**: `echidna_runner.py` has `C:\Users\humos\.cargo\bin\echidna.exe`.

4. **WebSocket has no auto-reconnect**: Extension connects on activation but won't recover if backend restarts.

5. **Subscription degrades gracefully**: No Supabase env vars = all quota checks pass.

6. **Ephemeral Forge projects**: Phase 3 creates temp dirs, writes source + PoC + mock, runs `forge test`, deletes everything.

7. **Idea length cap**: `/exploit` endpoint caps `idea` at 500 chars.

8. **CORS locked to localhost**: Only `localhost`/`127.0.0.1` and `vscode-webview://` origins allowed.

9. **Dual webpack config**: Extension and webview use separate webpack targets (Node vs browser). Both are in `webpack.config.js`.

10. **Severity normalization**: All finding severities are uppercased in `Finding.__post_init__()`.

---

## Quick Start (Local Dev)

```bash
# Terminal 1: Start backend
cd gaolaif/backend
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 7432

# Terminal 2: Launch VS Code with extension
cd gaolaif/extension
npm install
npm run compile
code --extensionDevelopmentPath=$(pwd)
# Or use VS Code: Run > Start Debugging (F5) with "Run Extension" config
```

Extension connects to backend on `http://localhost:7432`. Backend health check runs on activation.

---

## Key Patterns

- **Anonymization pipeline**: Code anonymized before LLM calls (addresses -> `Address0`, contracts -> `Contract0`, functions -> `fn0`). Deanonymized after. Per-prefix counters prevent collisions. Deanonymization sorts by length (longest first).

- **Dual LLM fallback**: Every phase uses local regex/AST extraction first, then enriches via LLM. Works without API key.

- **Background init**: Qdrant initializes via `asyncio.to_thread()` in FastAPI lifespan, not in `__init__`.

- **Async-safe LLM**: Synchronous `httpx` calls wrapped in `asyncio.to_thread()`.

- **Zero-knowledge memory**: Only abstract pattern descriptions stored (no raw code).

- **Session-scoped broadcasts**: WebSocket events map `session_id -> connection`, so progress goes only to originating client.

- **React store persistence**: `chatMessages`, `tasks`, `researchNotes`, etc. persist to VS Code webview state via `vscode.setState()`.

- **Lazy-loaded views**: `CopilotLayout` uses `React.lazy()` + `Suspense` for all views.

- **Mode system**: "Protocol" (defensive) and "Hacker" (offensive) modes via command palette.

---

## Testing

- **Backend**: `pytest tests/ firewall/tests/ -v` — covers all phases, router, env simulator, forge std mock, HTTP E2E, subscription, anonymizer.
- **Extension**: `npx jest` — BackendClient and component tests.
- **Gate runner**: `python dynamic_gate_runner.py` — 11 tasks verifying anonymizer round-trip, cloud toggle, consensus blocking, etc.
- Tests needing `OPENROUTER_API_KEY` or `forge` auto-skip when unavailable.

---

## LLM Model Map

| Role | Model | Temp | Used In |
|---|---|---|---|
| `scanner` | `nvidia/llama-nemotron-rerank-vl-1b-v2:free` | 0.1 | Phase 1 |
| `attacker` | `openrouter/owl-alpha:free` | 0.7 | Phase 2 |
| `verifier` | `nvidia/nemotron-3-ultra-550b-a55b:free` | 0.2 | Phase 3 |
| `judge` | `nvidia/nemotron-3.5-content-safety:free` | 0.3 | Phase 4 |
| `documenter` | `poolside/laguna-xs.2:free` | 0.4 | Phase 4-5 |

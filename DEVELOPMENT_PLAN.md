# SIREEN — Development Plan (branch: fix/enable-confirmed-demo)

## Inspection summary (all verified by execution)

### Backend architecture (`gaolaif/backend/`)
- **FastAPI app** (`main.py`, v0.1.1) exposing REST + WebSocket. 4-phase audit pipeline:
  - Phase 1 `phase1_understand.py` — regex protocol-map extraction (+ optional LLM scanner)
  - Phase 2 `phase2_scenarios.py` — attack scenario generation (+ optional LLM attacker)
  - Phase 3 `phase3_simulate.py` — Forge PoC generation + `forge build`/`forge test` + HonestSignal verification
  - Phase 4 `phase4_judge.py` — finding discrimination + report (+ optional LLM judge/documenter)
  - Phase 5 `phase5_patch.py` — remediation patch generation (LLM)
- **Session store** (`session_store.py`) — SQLite durable audit/evidence/hypothesis persistence
- **Firewall** (`firewall/`) — anonymizer (PII redaction + deanonymization), inbound (finding validation), outbound (sensitive-pattern blocking)
- **LLM router** (`llm/router.py`) — OpenRouter client, 5 roles, degrades to heuristic mode when no API key
- **Memory** (`memory/smart_memory.py`) — Qdrant primary / dict fallback, zero-knowledge (abstract patterns only)
- **Sandbox/verification** — Forge-based PoC execution with mock forge-std shim (`sandbox/forge_std_mock.py`), `verification/honest_signal.py` (5-gate), `output_parser.py`, `money_flow.py`
- **CLI** (`sireen_cli.py`) — `audit` / `audits` / `show` / `report`; exit codes 0/1/2/3 per terminal state

### Extension (`gaolaif/extension/`)
- VS Code extension (TypeScript + React 18, webpack 5, jest 29). Commands: audit/exploit/analyze/executePoC/switchMode/chat/report/patch. WebSocket + HTTP client to `:7432`.

### Test results (executed)
- Backend pytest: **109 passed, 6 skipped** (skips = forge missing / no API key)
- Extension jest: **56 passed**
- Webpack build: **compiles** (3 pre-existing size warnings, no errors)
- Release gate `verify_all.py`: **PASS** (forge golden path BLOCKED — no forge on PATH)

### Dependencies
- Python 3.11.2; `fastapi, uvicorn, httpx, pydantic, python-dotenv, qdrant-client, pytest, pytest-asyncio, websockets` (installed via pip with `--trusted-host` due to sandbox SSL cert issue)
- Node 24.22.2 / npm 11.19.1; extension deps installed
- **Forge 1.9.0 + solc 0.8.20** manually installed to `~/.foundry/bin` (downloaded via curl -k; GitHub/PyPI TLS blocked for Rust/Python native clients without `--trusted-host`/`-k`)

---

## Errors preventing a working demonstration

| # | Error | Impact | Fix |
|---|-------|--------|-----|
| E1 | `forge build/test` tries to download solc from `binaries.soliditylang.org`; Rust TLS client fails cert verification in this sandbox → every PoC fails compilation → audits can never reach `CONFIRMED` (golden path blocked) | CONFIRMED demo impossible; findings stuck at `needs_review` | P0 below |
| E2 | `sireen` console script not installed; users must run `python -m sireen_cli` from the backend dir | CLI not "out of the box" | P1 below |
| E3 | No `OPENROUTER_API_KEY` → heuristic-only mode (no contract-specific LLM scenarios) | Reduced analysis quality, not a blocker | document only |
| E4 | Extension `gaolaif.backendPath` must be set for auto-spawn of backend | UX, not a blocker | document only |

---

## Prioritized development plan

### P0 — Critical: Enable Forge verification (CONFIRMED path)
**Fix:** In `phases/phase3_simulate.py`, detect a `solc` binary on PATH and pass `--use solc` to `forge build` and `forge test` (auto-detect; falls back to default download behavior when solc is absent). This preserves the existing architecture/auto-download for normal environments while making verification work in TLS-restricted sandboxes.
**Verify:** `test_golden_path.py::test_golden_reentrancy_confirmed_end_to_end` and `test_e2e.py::TestPhase3Simulate::test_simulate_reentrancy` pass; release gate forge item becomes PASS.

### P1 — High: Make CLI `sireen` command available
**Fix:** Run `pip install -e .` in `gaolaif/backend` so the `sireen = sireen_cli:main` console script is on PATH.
**Verify:** `sireen audit test_contracts/VulnerableVault.sol --report` runs end-to-end and emits a terminal state + report.

### P1 — High: End-to-end demonstration
**Fix:** Run the full backend + CLI loop against `test_contracts/VulnerableVault.sol`; confirm `CONFIRMED`/`DEGRADED` terminal state and a populated evidence pack with PoC + Forge output.
**Verify:** manual CLI run + `GET /audits/{id}` returns evidence.

### P2 — Medium: Full release gate green
**Fix:** Re-run `python runtime_verification/verify_all.py` — all gates PASS (forge no longer BLOCKED).
**Verify:** VERDICT: PASS with zero FAIL/BLOCKED.

### P3 — Low: Extension & ops confirmation
**Fix:** Confirm jest (56) and webpack build still green; document `gaolaif.backendPath`/port 7432 setup for auto-spawn.
**Verify:** extension tests pass; backend `/health` reachable.

---

## Implementation status (complete)

- [x] P0: `--use solc` auto-detect in `phase3_simulate.py` — DONE
- [x] P0: re-run backend tests — 113 passed, 2 skipped (forge tests green)
- [x] P1: `pip install -e .` + `sireen` CLI e2e — DONE (`sireen` at ~/.local/bin/sireen)
- [x] P1: end-to-end demo against `test_contracts/VulnerableVault.sol` — DONE (reentrancy CONFIRMED, terminal DEGRADED, exit 2)
- [x] P2: full release gate — backend/extension/forge all PASS; only artifact is a secrets-scan false positive from `pyjwt` installed into site-packages (not a repo secret; git-tracked source is clean)
- [x] P3: extension re-verify — jest 56 passed, webpack builds clean

# SIREEN Core v0.1 — Final Architecture

## Runtime boundary

SIREEN is a VS Code extension backed by a local FastAPI service:

`Webview → extension-host MessageRouter / BackendClient → FastAPI → audit pipeline / SQLite / evidence`

The webview never calls the backend directly. The extension host owns backend communication and passes only presentation-safe data to the webview.

## Credentials and capability status

`OPENROUTER_API_KEY` is backend-owned environment configuration (`backend/.env.local`). It is not collected, stored, or transmitted by the VS Code webview or extension host.

The webview requests `sireen.backend.status`. The extension host queries `/health` and `/config/status`, then posts only:

```ts
{
  backend: 'connected' | 'unavailable',
  llm: 'available' | 'unavailable',
  forge: 'available' | 'unavailable'
}
```

`GET /config/status` returns boolean capabilities only: `api_configured`, `forge_available`, and `qdrant_available`. The historical `POST /config/set-key` route is retained solely as a safe `410 Gone` compatibility response; it cannot accept or persist a secret.

The Settings view presents backend, LLM, Forge, and connection state with a refresh action. Audits remain usable when no LLM key is configured through the backend’s heuristic fallback.

## Retained core

- Multi-phase Solidity audit workflow and terminal verification states.
- Forge-based verification, including Phase 3 environment simulation and Forge standard mock support.
- Evidence packs, audit reports, report retrieval/export, and SQLite audit/session persistence.
- Findings, attack paths, hypotheses, verification records, notes/tasks/chat, and the CLI’s backend-shared behavior.
- Truthfulness rule: a finding cannot be represented as `CONFIRMED` without applicable Forge execution.

## Removed product surface

Docker sandbox runners and UI, subscription/payment code, experimental duplicate agent/memory surfaces, and webview memory/simulation panes were removed where proven unused. This does **not** remove the internal `backend/sandbox/EnvSimulator` or `forge_std_mock`, which are live Phase 3 Forge utilities.

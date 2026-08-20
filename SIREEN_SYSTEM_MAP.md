# SIREEN System Map — August 2026

## Human → VS Code
- **Entry**: SIREEN extension icon in Activity Bar
- **Command**: `gaolaif.sidebar` → opens Security Workspace webview
- **Message**: `postMessage` from webview to host

## VS Code → SIREEN Workspace
- **Extension Host**: `src/extension.ts` — entry point
- **SidebarProvider**: `src/sidebar/SidebarProvider.ts` — view provider
- **SessionManager**: `src/session/SessionManager.ts` — CRUD + isolation
- **AIProviderManager**: `src/session/AIProviderManager.ts` — provider abstraction
- **Webview**: `src/sidebar/webview/main.tsx` — React UI
- **Store**: Redux-like state management in `src/sidebar/webview/store/`

## Session → Agent Orchestrator
- **SessionState**: Types in `src/session/types.ts`
  - id, name, project, status, auditPhase, auditProgress
  - chatMessages, findings, exploits, memoryEntries, tasks, timeline
  - activeView, connectionStatus, apiKeySet, contractCode
- **Session Isolation**: `rejectCrossSessionEvent()` validates session_id
- **Storage**: In-memory Map + SQLite backend (`backend/session_store.py`)

## Agent Orchestrator → Agents
- **Planner**: Maps attack surface
- **Researcher**: Finds patterns, external calls
- **Exploit Agent**: Builds reproduction
- **Terminal**: Executes forge/test commands
- **Judge**: Evaluates evidence, assigns severity
- **Documenter**: Writes reports

## Agents → Backend
- **Router**: `backend/llm/router.py` — OpenAI-compatible calls
- **LLM Models**: openai/gpt-oss-20b, nvidia/nemotron-*, cohere/...
- **Provider Failover**: Primary → Backup → Local
- **API Keys**: `.env.local` (gitignored), env vars

## Backend → Security Engine
- **Phases**: phase1_understand → phase2_scenarios → phase3_simulate → phase4_judge
- **Audit State Machine**: QUEUED → INITIALIZING → ... → COMPLETED/FAILED
- **Firewalls**: Inbound + Outbound (anonymizes keys/addresses)
- **Session Store**: SQLite (`backend/sessions.db`)

## Backend → Terminal/Sandbox
- **Forge**: `forge test --match-test <name>`
- **Commands**: Executed via subprocess
- **Output**: stdout/stderr captured
- **Exit codes**: success/failure

## Backend → Evidence → Judge
- **Evidence**: File paths, line numbers, forge output
- **Simulation**: Attack scenario validation
- **Finding**: title, severity, description, category, remediation
- **Confirmed**: Only from HonestSignal/ExploitResult

## Judge → Findings → Report
- **Findings**: JSON objects with title, severity, description, category, remediation
- **Report**: Markdown executive summary + technical walkthrough
- **Evidence**: Linked to source file/function/line

## UI → User
- **Sidebar**: Session list, audit controls
- **Execution Panel**: Agent activity, terminal output
- **Findings Panel**: List of findings with evidence links
- **Report**: Exportable markdown/PDF

---

## Message / Event Architecture

| Event | Direction | Payload | Owner | Error Handling |
|-------|-----------|---------|-------|----------------|
| `SESSION_CREATED` | Host → Webview | session_id, name, project | SessionManager | Dispatch to store |
| `SESSION_SWITCHED` | Host → Webview | session_id | SessionManager | rejectCrossSessionEvent() |
| `SESSION_DELETED` | Host → Webview | session_id | SessionManager | Cleanup in-memory + SQLite |
| `AI_MESSAGE_SENT` | Webview → Host | session_id, message, role | useSession hook | Route to backend |
| `BACKEND_RESPONSE` | Backend → Webview | session_id, data | Router | WebSocket scoped per session |
| `AGENT_TASK_STARTED` | Orchestrator → UI | agent, task, session_id | Agent system | Show in execution panel |
| `AGENT_TASK_COMPLETED` | Orchestrator → UI | agent, task, result, session_id | Agent system | Update findings |
| `TERMINAL_OUTPUT` | Backend → Webview | session_id, command, stdout, stderr, exit_code | Terminal system | Display with success/failure |
| `AUDIT_STATE_CHANGED` | Backend → Webview | session_id, phase, status | Audit engine | Show progress bar |
| `FINDING_ADDED` | Backend → Webview | session_id, finding | Audit engine | Show in findings panel |
| `REPORT_READY` | Backend → Webview | session_id, report_path | Audit engine | Show export button |

---

## State Machine — Audit Phases

```
QUEUED
  ↓
INITIALIZING
  ↓
DISCOVERING  (phase1_understand)
  ↓
UNDERSTANDING
  ↓
ANALYZING     (pattern detection)
  ↓
HYPOTHESIS    (generate attack scenarios)
  ↓
VALIDATING    (forge simulation)
  ↓
SIMULATING    (phase3_simulate)
  ↓
JUDGING       (phase4_judge)
  ↓
COMPLETED     (all findings confirmed)
  ↑
FAILED        (any phase error)
  ↑
NEEDS_REVIEW  (verification unavailable)
  ↑
CANCELLED     (user stopped)
```

---

## Critical Connections Verified

✅ **TypeScript**: `npx tsc --noEmit` → EXIT CODE: 0  
✅ **Webpack**: `npm run compile` → SUCCESS (3 pre-existing warnings)  
✅ **Backend**: `uvicorn main:app` → Running on `127.0.0.1:7432`  
✅ **Health**: `GET /health` → 200 OK  
✅ **WebSocket**: `/ws` → accepted per session  
✅ **Sessions API**: `GET /sessions/list` → 200 OK with session data  
✅ **Extension**: Debug mode active, communicating with backend  

---

## Unknown / Needs Investigation

❓ **AI Provider Status**: OpenRouter API key present in `.env` but calls returning `"Error: fetch failed"` — need to verify provider is actually reachable  
❓ **10 Concurrent Sessions**: Need to test session isolation with actual concurrent creation  
❓ **Agent Orchestration**: Need to verify planner/researcher/exploit/judge actually execute  
❓ **Terminal Execution**: Need to verify forge commands actually run and produce output  
❓ **Audit State Machine**: Need to verify phases transition correctly through real backend calls  
❓ **Cross-Session Isolation**: Need to verify `rejectCrossSessionEvent()` blocks inter-session events  

---

## Immediate Priorities (Product Truth)

1. **Verify AI provider connectivity** — test actual LLM call from backend
2. **Test 10 concurrent sessions** — verify no cross-talk
3. **Verify agent execution** — planner → researcher → exploit → judge pipeline
4. **Verify terminal output** — forge commands produce real output
5. **Verify audit state machine** — phases transition correctly
6. **Fix provider failover** — if primary fails, switch to backup

This is the product truth. Let me now verify each component.
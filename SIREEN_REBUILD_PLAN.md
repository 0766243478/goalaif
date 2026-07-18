# SIREEN — Rebuild Plan

> Phase 2 of Lead Engineer Mode
> Target Architecture — No code changes yet.

---

## 1. Product Vision

Sireen is a **professional Offensive Security Workspace** inside VS Code.

It is not a website. It is not a chatbot. It is not a dashboard.

It is **an investigation desk** — a persistent environment where a security researcher works alongside an AI agent to:
- Understand smart contract protocols
- Generate and test attack hypotheses
- Run exploit simulations (via Foundry)
- Collect forensic evidence
- Generate professional security reports

### Design Inspirations

| Product | What to Borrow |
|---------|---------------|
| **Cursor** | AI-native code understanding, inline suggestions |
| **GitHub Copilot** | Context-aware completions, panel integration |
| **Linear** | Keyboard-first, clean typography, fast navigation |
| **Raycast** | Command palette-driven, extensions, focus management |
| **Sourcegraph** | Code intelligence, graph visualization |
| **VS Code Native** | Design tokens, webview patterns, command system |

### Look & Feel Principles

- **80% VS Code native** — respect the host environment's design language
- **15% Linear** — clean typography, generous whitespace, subtle borders
- **5% Personality** — subtle color accents for security context (amber alerts, green confirmations, red critical findings)

---

## 2. UX Principles

### 2.1 Investigation Desk, Not Chat App

The sidebar is NOT a ChatGPT clone. It is a **command center**:
- Chat is one mode among equals (findings, threat map, timeline, evidence)
- The AI's responses populate structured panels, not just message bubbles
- Commands and shortcuts drive the interaction, not typing prompts

### 2.2 Keyboard-First

| Shortcut | Action |
|----------|--------|
| `Cmd+K` | Focus search/command input |
| `Cmd+Enter` | Send message / confirm action |
| `Cmd+Shift+P` | Extension command palette |
| `Ctrl+Tab` / `Ctrl+Shift+Tab` | Cycle sidebar tabs |
| `Escape` | Close panel / cancel |
| `Cmd+W` | Close active panel |
| `Cmd+1-7` | Switch to specific tab |

### 2.3 Minimal Cognitive Load

- One primary action per screen
- Progressive disclosure — show complexity only when needed
- Empty states guide the user ("Create an investigation to get started")
- Status indicators visible without reading text

### 2.4 Evidence-First UI

The primary output of Sireen is **evidence**, not chat history:
- Findings are structured data (title, severity, location, proof)
- Evidence is artifacts (forge logs, transaction traces, balance diffs)
- The timeline sequences every action taken during an investigation
- The report is the final compilation of all evidence

### 2.5 Persistent Context

- Current investigation persists across panel opens/closes
- Chat history survives sidebar collapse/reopen
- Active tab selection is remembered
- Scroll position is maintained when switching tabs
- Sidebar and panels share the same investigation context

### 2.6 Fast Iteration

- Pipeline execution streams results as they arrive
- No full-page reloads — everything updates reactively
- Cancel operations with one click
- Retry failed stages without restarting from scratch

---

## 3. Screen Responsibilities

### Welcome (new, first-time experience)

**Purpose:** First-launch onboarding and quick actions.

| Element | Behavior |
|---------|----------|
| Recent investigations | List of last 5 investigations |
| Quick start | "New Investigation" button |
| Template protocols | Quick-select: Uniswap, Aave, Compound |
| Status | Shows when pipeline is idle/running |
| Keyboard | `Enter` to create, `Arrow` to navigate list |

### Chat (sidebar tab, exists)

**Purpose:** Primary AI interaction — natural language conversation.

| Element | Behavior |
|---------|----------|
| Message list | Streaming AI responses, user messages |
| Input box | Send messages, `Cmd+Enter` to send |
| Stop button | Cancel AI response |
| Mode selector | Switch between research/hypothesis/poc/report modes |
| Chain selector | Select target blockchain/protocol |
| Status indicator | AI thinking / idle / error states |

### Findings (sidebar tab, exists — currently empty)

**Purpose:** Structured collection of discovered security issues.

| Element | Behavior |
|---------|----------|
| Finding cards | Title, severity badge, status, short description |
| Severity filter | Critical/High/Medium/Low/Info |
| Status filter | Open/Confirmed/False Positive |
| Click | Opens finding detail in panel or editor |
| Empty state | "No findings yet. Run a simulation to discover issues." |

### Threat Map (sidebar tab, exists — currently empty)

**Purpose:** Visual representation of attack surface and threat vectors.

| Element | Behavior |
|---------|----------|
| Threat nodes | Contracts, functions, access controls |
| Attack paths | Highlighted edges between nodes |
| Risk levels | Color-coded by severity |
| Click | Selects node → shows details |
| Zoom/Pan | Mouse wheel + drag |

### Timeline (sidebar tab, exists — currently empty)

**Purpose:** Sequential log of every action during investigation.

| Element | Behavior |
|---------|----------|
| Event list | Chronological, grouped by phase |
| Event types | Hypothesis, Simulation, Evidence, Finding |
| Click | Shows event details |
| Filter | By phase or type |

### Evidence (sidebar tab, exists — currently empty)

**Purpose:** Raw artifacts collected during investigation.

| Element | Behavior |
|---------|----------|
| Evidence list | Forge logs, transaction traces, balance proofs |
| Type icons | Code/log/trace/image |
| Copy button | Copy raw content |
| Open button | Open in editor |

### Attack Workspace (panel, exists — currently static)

**Purpose:** Live forge terminal for exploit simulation.

| Element | Behavior |
|---------|----------|
| Terminal output | Real-time forge test output |
| Controls | Start/Stop/Restart pipeline |
| Status bar | Current phase, elapsed time |
| Output format | Color-coded (pass/fail/info) |
| Export | Save logs to file |

### Knowledge Graph (panel, exists — currently sample data)

**Purpose:** Relationship visualization between contracts, functions, exploits.

| Element | Behavior |
|---------|----------|
| Graph canvas | Force-directed layout |
| Nodes | Contracts (blue), functions (green), exploits (red) |
| Edges | Calls, inherits, exploits |
| Selection | Click node → show details in inspector |
| Filter | By type, severity, confidence |

### Report Viewer (panel, exists — currently sample report)

**Purpose:** Professional security report display and export.

| Element | Behavior |
|---------|----------|
| Report metadata | Title, date, researcher, protocol |
| Executive summary | AI-generated overview |
| Findings list | Severity-sorted findings with descriptions |
| PoC code blocks | Syntax-highlighted Solidity |
| Evidence | Logs, traces, balance diffs |
| Export buttons | PDF, Markdown, JSON |

### War Room (panel, exists — currently sample sessions)

**Purpose:** Investigation management and session overview.

| Element | Behavior |
|---------|----------|
| Session cards | Name, protocol, status, findings count, last modified |
| Search/filter | By name, status, protocol |
| Sort | By date, severity, status |
| Pinning | Pin important investigations |
| New session | Creates investigation → opens sidebar |

### Settings (panel, exists — functional)

**Purpose:** Extension configuration.

| Element | Behavior |
|---------|----------|
| General | API keys, AI provider, model selection |
| RPC endpoints | Add/edit/remove/clear fork URLs |
| Forge config | Path, Docker image, gas limits |
| Shortcuts | Keyboard shortcut reference |
| About | Version, license, links |
| Danger zone | Reset all settings, clear all data |

### Bounty Dashboard (panel, exists — currently sample data)

**Purpose:** Track bug bounty submissions and findings.

| Element | Behavior |
|---------|----------|
| Bounty cards | Platform, protocol, reward, status |
| Status tracking | Submitted/Accepted/Paid/Rejected |
| Stats header | Total earned, active bounties, acceptance rate |
| External links | Open on platform |

---

## 4. Data Flow Architecture

### 4.1 Global Data Flow

```
User Action (click/keyboard/command)
       │
       ▼
┌──────────────────┐
│  Webview Screen  │  Event handler fires
│  (SolidJS)       │
└──────┬───────────┘
       │
       │ postMessage({ type, payload })
       │
       ▼
┌──────────────────┐
│  Message Bus     │  Central message router
│  (new)           │  Routes to correct handler
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  Provider        │  SidebarProvider or PanelProvider
│  (existing)      │  Validates payload
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  Service Layer   │  PipelineManager, AIClient, etc.
│  (existing)      │  Business logic, no UI awareness
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  App Store       │  Central state store (new)
│  (shared)        │  All UI state in one place
└──────┬───────────┘
       │
       │ postMessage({ type, payload })
       │
       ▼
┌──────────────────┐
│  Webview UI      │  Reactively updates
│  (SolidJS)       │  via createEffect/store subscriptions
└──────────────────┘
```

### 4.2 State Architecture

```
┌──────────────────────────────────────────────────┐
│                  AppStore                         │
│  (src/webview/stores/appStore.ts)                │
│                                                   │
│  ├── appState: AppState                           │
│  │   ├── status: PipelineStatus                   │
│  │   ├── currentInvestigationId: string | null    │
│  │   ├── activeScreen: ScreenType                 │
│  │   └── error: string | null                     │
│  │                                                │
│  ├── investigation: InvestigationState            │
│  │   ├── current: Investigation | null            │
│  │   └── list: Investigation[]                    │
│  │                                                │
│  ├── chat: ChatState                              │
│  │   ├── messages: ChatMessage[]                  │
│  │   └── isStreaming: boolean                     │
│  │                                                │
│  ├── pipeline: PipelineState                      │
│  │   ├── phase: PipelinePhase                     │
│  │   ├── progress: number                         │
│  │   ├── logs: string[]                           │
│  │   └── result: PipelineResult | null            │
│  │                                                │
│  └── findings: FindingState                       │
│      ├── items: Finding[]                         │
│      └── selectedId: string | null                │
└──────────────────────────────────────────────────┘

         ▲
         │ subscribes
         │
┌────────┴────────┐
│  Every Screen   │  Reads store reactively
│  uses createStore or createSignal  │
│  sync'd with store                 │
└─────────────────┘
```

### 4.3 State Machine

```
                         ┌────────────────────────┐
                         │         Idle            │
                         └──────┬─────────────────┘
                                │ createInvestigation
                                ▼
                   ┌────────────────────────┐
            ┌─────│   CreatingInvestigation │
            │     └──────────┬──────────────┘
            │                │ investigationCreated
            │                ▼
            │     ┌────────────────────────┐
            │     │     Researching         │
            │     └──────────┬──────────────┘
            │                │ researchComplete
            │                ▼
            │     ┌────────────────────────┐
            │     │     Reasoning           │
            │     └──────────┬──────────────┘
            │                │ hypothesisGenerated
            │                ▼
            │     ┌────────────────────────┐
            │     │    GeneratingPoC        │
            │     └──────────┬──────────────┘
            │                │ pocGenerated
            │                ▼
            │     ┌────────────────────────┐
            │     │    RunningForge         │◄────┐
            │     └──────────┬──────────────┘     │
            │                │ forgeComplete      │ retry
            │     ┌──────────┴──────────┐         │
            │     ▼                     ▼         │
            │  ┌────────────┐  ┌──────────────┐   │
            │  │ Simulation │  │  Simulation  │───┘
            │  │   Failed   │  │   Passed     │
            │  └─────┬──────┘  └──────┬───────┘
            │        │                │
            │        ▼                ▼
            │     ┌────────────┐  ┌──────────────┐
            │     │ Analysis   │  │  Confirmed    │
            │     └────────────┘  └──────┬───────┘
            │                           │
            │                           ▼
            │                ┌────────────────────┐
            │                │ GeneratingReport    │
            │                └─────────┬──────────┘
            │                          │
            │                          ▼
            │                ┌────────────────────┐
            │                │     Completed       │
            │                └─────────┬──────────┘
            │                          │
            └──────────────────────────┘
                         │
                         ▼
                    ┌────────────┐
                    │   Error    │ ◄──── From any state
                    └────────────┘
```

---

## 5. Message Contracts

Every message must follow this contract:

```
{
  type: string,       // Namespaced, e.g. "investigation:new"
  payload?: any,      // Serializable data
  requestId?: string  // For request/response correlation
}
```

### 5.1 System Messages

| Message | Sender | Receiver | Payload | Response | Failure |
|---------|--------|----------|---------|----------|---------|
| `ready` | Webview | Provider | `{ viewId: string }` | `{ success: true }` | Log error |
| `focus:input` | Webview | Provider | `{ inputId: string }` | — | — |

### 5.2 Investigation Messages

| Message | Sender | Receiver | Payload | Response | Failure |
|---------|--------|----------|---------|----------|---------|
| `investigation:new` | Webview | Provider | `{ title: string, protocol?: string }` | `{ id: string }` | `{ error: string }` |
| `investigation:load` | Webview | Provider | `{ id: string }` | `{ investigation: Investigation }` | `{ error: string }` |
| `investigation:save` | Webview | Provider | `{ investigation: Investigation }` | `{ success: true }` | `{ error: string }` |
| `investigation:list` | Webview | Provider | — | `{ investigations: Investigation[] }` | `{ error: string }` |
| `investigation:delete` | Webview | Provider | `{ id: string }` | `{ success: true }` | `{ error: string }` |
| `investigation:mode` | Webview | Provider | `{ mode: InvestigationMode }` | `{ success: true }` | `{ error: string }` |

### 5.3 Chat Messages

| Message | Sender | Receiver | Payload | Response | Failure |
|---------|--------|----------|---------|----------|---------|
| `chat:send` | Webview | Provider | `{ message: string }` | Streams `chat:stream` events | `{ error: string }` |
| `chat:stop` | Webview | Provider | — | `{ success: true }` | — |
| `chat:stream` | Provider | Webview | `{ chunk: string, done: boolean }` | — | — |
| `chat:complete` | Provider | Webview | `{ fullText: string }` | — | — |

### 5.4 Tab Messages

| Message | Sender | Receiver | Payload | Response | Failure |
|---------|--------|----------|---------|----------|---------|
| `tab:change` | Webview | Provider | `{ tab: TabType }` | `{ success: true }` | — |
| `tab:data` | Provider | Webview | `{ tab: TabType, data: any }` | — | — |

### 5.5 Config Messages

| Message | Sender | Receiver | Payload | Response | Failure |
|---------|--------|----------|---------|----------|---------|
| `config:get` | Webview | Provider | `{ keys: string[] }` | `{ values: Record<string, any> }` | `{ error: string }` |
| `config:save` | Webview | Provider | `{ key: string, value: any }` | `{ success: true }` | `{ error: string }` |
| `config:clear` | Webview | Provider | `{ key: string }` | `{ success: true }` | `{ error: string }` |

### 5.6 Simulation Messages

| Message | Sender | Receiver | Payload | Response | Failure |
|---------|--------|----------|---------|----------|---------|
| `simulation:start` | Webview | Provider | `{ investigationId: string }` | Streams status | `{ error: string }` |
| `simulation:stop` | Webview | Provider | — | `{ success: true }` | — |
| `simulation:status` | Provider | Webview | `{ phase: string, progress: number }` | — | — |
| `simulation:result` | Provider | Webview | `{ result: PipelineResult }` | — | — |
| `simulation:log` | Provider | Webview | `{ line: string }` | — | — |

### 5.7 Report Messages

| Message | Sender | Receiver | Payload | Response | Failure |
|---------|--------|----------|---------|----------|---------|
| `report:list` | Webview | Provider | — | `{ reports: Report[] }` | `{ error: string }` |
| `report:view` | Webview | Provider | `{ id: string }` | `{ report: Report }` | `{ error: string }` |
| `report:export` | Webview | Provider | `{ id: string, format: 'pdf'|'md'|'json' }` | `{ uri: string }` | `{ error: string }` |

### 5.8 Graph Messages

| Message | Sender | Receiver | Payload | Response | Failure |
|---------|--------|----------|---------|----------|---------|
| `graph:selectNode` | Webview | Provider | `{ nodeId: string }` | `{ node: GraphNode }` | — |
| `graph:refresh` | Webview | Provider | `{ investigationId: string }` | `{ nodes: Node[], edges: Edge[] }` | `{ error: string }` |

### 5.9 Bounty Messages

| Message | Sender | Receiver | Payload | Response | Failure |
|---------|--------|----------|---------|----------|---------|
| `bounty:refresh` | Webview | Provider | — | `{ bounties: Bounty[] }` | `{ error: string }` |
| `bounty:viewDetails` | Webview | Provider | `{ id: string }` | `{ bounty: Bounty }` | `{ error: string }` |
| `bounty:openExternal` | Webview | Provider | `{ url: string }` | `{ success: true }` | `{ error: string }` |

### 5.10 Attack Workspace Messages

| Message | Sender | Receiver | Payload | Response | Failure |
|---------|--------|----------|---------|----------|---------|
| `attack:start` | Webview | Provider | `{ investigationId: string }` | Streams logs | `{ error: string }` |
| `attack:stop` | Webview | Provider | — | `{ success: true }` | — |
| `attack:exportLog` | Webview | Provider | `{ format: string }` | `{ uri: string }` | `{ error: string }` |

### 5.11 War Room Messages

| Message | Sender | Receiver | Payload | Response | Failure |
|---------|--------|----------|---------|----------|---------|
| `war-room:new-session` | Webview | Provider | `{ title: string }` | `{ id: string }` | `{ error: string }` |
| `war-room:select-session` | Webview | Provider | `{ id: string }` | `{ session: Session }` | `{ error: string }` |
| `war-room:toggle-pin` | Webview | Provider | `{ id: string }` | `{ success: true }` | `{ error: string }` |
| `war-room:settings` | Webview | Provider | — | Opens settings panel | — |

### 5.12 Error Messages

| Message | Sender | Receiver | Payload | Response | Failure |
|---------|--------|----------|---------|----------|---------|
| `error` | Any | Provider | `{ message: string, source: string }` | Logs + shows | — |

---

## 6. Definition of Done

A feature is **complete** only when ALL of the following are true:

### 6.1 UI Layer
- [ ] Component exists and renders
- [ ] Loading state displays while data is being fetched
- [ ] Empty state displays when no data exists
- [ ] Error state displays when operation fails
- [ ]Keyboard shortcut works (where applicable)
- [ ] Focus management works (tab order, focus trap)
- [ ] Dark theme compatible (uses design tokens)

### 6.2 State Layer
- [ ] Store slice exists for this feature
- [ ] State updates reactively
- [ ] State persists across panel open/close (where applicable)
- [ ] State resets on investigation change

### 6.3 Message Layer
- [ ] Webview sends message with correct type
- [ ] Provider has handler for message type
- [ ] Payload is validated before processing
- [ ] Response is sent back to webview
- [ ] Error response handled gracefully in UI

### 6.4 Command Layer (if applicable)
- [ ] VS Code command is registered
- [ ] Command can be invoked from palette
- [ ] Command works when extension is not yet activated
- [ ] Command has a user-friendly title

### 6.5 Service Layer (if applicable)
- [ ] Business logic is in a service, not the provider
- [ ] Service returns proper error types
- [ ] Service is testable (pure functions or injectable)

### 6.6 Build & Verification
- [ ] `npm run build` passes
- [ ] `npx tsc --noEmit` has 0 errors
- [ ] No console errors in Extension Development Host
- [ ] Manual test confirms the feature works end-to-end

---

## 7. Architecture Decisions

### Decision 1: Shared App Store (new file)
**Decision:** Create `src/webview/stores/appStore.ts` as the single source of truth.
**Rationale:** Currently every screen has isolated state. A shared store enables cross-panel sync, state machine transitions, and consistent loading/error states.
**Trade-off:** All screens must migrate from local `createSignal` to the shared store — migration effort but eliminates state fragmentation.

### Decision 2: Message Bus Layer (new file)
**Decision:** Create `src/webview/providers/messageBus.ts` to route messages.
**Rationale:** Currently each screen constructs `vscode.postMessage()` calls directly. A bus layer enables logging, validation, request/response correlation, and timeout handling.
**Trade-off:** Slight indirection added, but eliminates orphaned messages and enables debugging.

### Decision 3: Keep Dual Provider Architecture
**Decision:** Keep SidebarProvider (webviewView) and PanelProvider (webviewPanel) separate.
**Rationale:** VS Code's webview APIs differ significantly between view-based and panel-based webviews. Merging them would create complexity without benefit.
**Trade-off:** Some duplicate message handling code, but each provider has fundamentally different lifecycle management.

### Decision 4: Pipeline State Streaming
**Decision:** PipelineManager emits events, providers relay them to webview via `simulation:status` and `simulation:log` messages.
**Rationale:** Current pipeline runs silently with no UI feedback. Event-based streaming gives the UI real-time progress.
**Trade-off:** Requires adding an EventEmitter to PipelineManager (or wrapping it in a PipelineRunner service).

### Decision 5: Persistence Strategy
**Decision:** Use VS Code `globalState` for investigation metadata, workspaceState for session data, and file system for reports/artifacts.
**Rationale:** globalState survives across workspaces, workspaceState is scoped to the project, file system is best for large artifacts.
**Trade-off:** Three-tier persistence adds complexity but matches VS Code's intended storage patterns.

### Decision 6: Remove goalaif/ Codebase
**Decision:** Do not merge from goalaif/. Extract patterns (backend client, message router) but implement fresh.
**Rationale:** goalaif uses React + webpack, current project uses SolidJS + esbuild. Direct merge would create incompatibility.
**Trade-off:** Re-implementation effort, but cleaner architecture.

---

## 8. File Change Plan (Summary)

### New Files to Create
| File | Purpose |
|------|---------|
| `src/webview/stores/appStore.ts` | Global state machine + shared store |
| `src/webview/providers/messageBus.ts` | Centralized message routing |
| `src/pipeline/PipelineBridge.ts` | Pipeline → UI event streaming |
| `src/pipeline/forge-stub.ts` | Single forge-std stub (replace duplicate) |

### Files to Modify (Migration)
| File | Change |
|------|--------|
| `src/webview/screens/sidebar.tsx` | Migrate to appStore, wire tabs to real data |
| `src/webview/screens/war-room.tsx` | Remove SAMPLE_SESSIONS, connect to store |
| `src/webview/screens/bounty-dashboard.tsx` | Remove SAMPLE_BOUNTIES, connect to store |
| `src/webview/screens/attack-workspace.tsx` | Wire to PipelineBridge, remove static UI |
| `src/webview/screens/knowledge-graph.tsx` | Remove SAMPLE_NODES, connect to pipeline data |
| `src/webview/screens/report-viewer.tsx` | Remove SAMPLE_REPORT, connect to store |
| `src/providers/SidebarProvider.ts` | Add missing message handlers |
| `src/providers/PanelProvider.ts` | Add missing message handlers, remove `bounty:data` placeholder |
| `src/pipeline/PipelineManager.ts` | Add event emitter, deduplicate forge-stub |
| `src/pipeline/PoCGenerator.ts` | Use shared forge-stub import |
| `src/extension.ts` | Add any new commands |

### Files to Remove
| File | Reason |
|------|--------|
| `src/webview/components/Select.tsx` | Unused (sidebar uses native `<select>`) |
| `src/webview/stores/investigationStore.ts` | Superseded by appStore.ts |
| `goalaif/` directory (eventually) | Old codebase, kept for reference until migration complete |

---

## 9. Migration Strategy

```
Phase 1: Foundation (P0)
  ├── Create appStore.ts (state machine + shared state)
  ├── Create messageBus.ts (message routing)
  ├── Add orphaned message handlers to providers
  ├── Wire sidebar tabs to store (fix empty states)
  └── Remove dead code (Select.tsx, investigationStore.ts)

Phase 2: Pipeline → UI Bridge (P1)
  ├── Create PipelineBridge.ts
  ├── Add event emitter to PipelineManager
  ├── Wire attack-workspace to PipelineBridge
  └── Wire sidebar tabs to pipeline results

Phase 3: Remove Sample Data (P1)
  ├── War Room → real sessions from store
  ├── Knowledge Graph → real nodes from pipeline
  ├── Report Viewer → real reports from pipeline
  └── Bounty Dashboard → real data or API integration

Phase 4: Persistence & Navigation (P2)
  ├── Investigation save/load across sessions
  ├── Cross-panel navigation synchronization
  ├── Keyboard shortcuts implementation
  └── Focus management

Phase 5: Engineering Quality (P3)
  ├── Fix all TypeScript errors
  ├── Add test framework + unit tests
  ├── Add ESLint + Prettier
  └── Add input validation for shell commands

Phase 6: Polish (P2)
  ├── Skeleton loading states
  ├── Smooth transitions
  ├── Design token compliance audit
  └── Accessibility pass
```

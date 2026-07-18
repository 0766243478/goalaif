# SIREEN — System Audit

> Generated: 2026-07-16
> Phase 1 of Lead Engineer Mode
> No source files modified.

---

## 1. Project Tree

```
myprojrct/
├── package.json                          # Extension manifest
├── tsconfig.json                         # TypeScript config
├── build.js                              # esbuild config (Node + Webview)
├── QA_REPORT.md                          # Previous audit doc
├── SIREEN-DESIGN-SPEC.md                 # Design spec
│
├── src/
│   ├── extension.ts                      # Extension activate/deactivate
│   │
│   ├── utils/
│   │   └── webview.ts                    # Webview helper factory
│   │
│   ├── ai/
│   │   └── AIClient.ts                   # LLM client (OpenAI/Anthropic/OpenRouter)
│   │
│   ├── pipeline/
│   │   ├── types.ts                      # All pipeline type definitions
│   │   ├── PipelineManager.ts            # 6-stage pipeline orchestrator
│   │   ├── PoCGenerator.ts              # AI PoC generation + forge compile
│   │   ├── ForgeRunner.ts               # Forge test execution (local/Docker)
│   │   ├── OutputParser.ts              # Forge output parsing (regex)
│   │   ├── HonestSignal.ts              # 3-condition verification
│   │   ├── ReportBuilder.ts             # InvestigationReport construction
│   │   └── DockerSandbox.ts             # Docker container lifecycle
│   │
│   ├── providers/
│   │   ├── SidebarProvider.ts           # WebviewViewProvider for sireen.sidebar
│   │   └── PanelProvider.ts             # WebviewPanel factory for all other views
│   │
│   └── webview/
│       ├── types/
│       │   └── index.ts                 # Webview type definitions
│       ├── providers/
│       │   └── vscode-api.ts            # AcquireVsCodeApi wrapper
│       ├── stores/
│       │   └── investigationStore.ts    # SolidJS store (UNUSED)
│       ├── design-system/
│       │   ├── tokens.css               # Design tokens (colors, spacing, typography)
│       │   ├── global.css               # Reset, base styles, animations
│       │   ├── icons.tsx                # SVG icon components
│       │   └── styles.ts               # injectGlobalStyles() helper
│       ├── components/
│       │   ├── Button.tsx               # Button component
│       │   ├── Badge.tsx                # Badge component
│       │   ├── Card.tsx                 # Card component
│       │   ├── Input.tsx                # Input component
│       │   └── Select.tsx               # Select component (UNUSED)
│       ├── jsx-shim.js                  # SolidJS JSX runtime config
│       └── screens/
│           ├── sidebar.tsx              # Main sidebar view
│           ├── war-room.tsx             # Session manager panel
│           ├── bounty-dashboard.tsx     # Bounty tracker panel
│           ├── attack-workspace.tsx     # Live forge terminal panel
│           ├── knowledge-graph.tsx      # Threat graph visualization panel
│           ├── report-viewer.tsx        # Security report panel
│           └── settings.tsx             # Settings panel
│
└── goalaif/                             # OLDER codebase (React + FastAPI)
    └── gaolaif/extension/
        ├── package.json
        ├── webpack.config.js
        └── src/
            ├── extension.ts
            ├── providers/
            │   ├── ChatViewProvider.ts
            │   ├── AttackTreeProvider.ts
            │   ├── DashboardProvider.ts
            │   ├── ReportProvider.ts
            │   ├── CodeLensProvider.ts
            │   ├── DiagnosticProvider.ts
            │   ├── HoverProvider.ts
            │   └── CodeActionProvider.ts
            ├── stores/
            │   └── AppStore.ts
            ├── services/
            │   ├── BackendClient.ts
            │   ├── MessageRouter.ts
            │   └── AuditOrchestrator.ts
            └── backend/
                ├── main.py
                ├── orchestrator.py
                ├── agents/
                └── models/
```

---

## 2. Extension Activation Flow

```
VS Code starts
  → package.json.activationEvents
    ["onView:sireen.sidebar", "onCommand:sireen.*"]
  → extension.ts activate()
    ├── Registers SidebarProvider as webviewView
    ├── Registers 12 commands
    │   ├── sireen.helloWorld (placeholder)
    │   ├── sireen.runPipeline
    │   ├── sireen.openWarRoom
    │   ├── sireen.openBountyDashboard
    │   ├── sireen.openAttackWorkspace
    │   ├── sireen.openKnowledgeGraph
    │   ├── sireen.openReportViewer
    │   ├── sireen.openSettings
    │   ├── sireen.createInvestigation
    │   ├── sireen.saveInvestigation
    │   └── sireen.loadInvestigation
    ├── Watches configuration changes
    └── Watches color theme changes
```

Command map:

| Command | Handler | Status |
|---------|---------|--------|
| `sireen.helloWorld` | `window.showInformationMessage` | Placeholder |
| `sireen.runPipeline` | Creates PipelineManager → runs pipeline | Functional |
| `sireen.openWarRoom` | PanelProvider.createOrShow('sireen.warRoom') | Functional |
| `sireen.openBountyDashboard` | PanelProvider.createOrShow('sireen.bountyDashboard') | Functional |
| `sireen.openAttackWorkspace` | PanelProvider.createOrShow('sireen.attackWorkspace') | Functional |
| `sireen.openKnowledgeGraph` | PanelProvider.createOrShow('sireen.knowledgeGraph') | Functional |
| `sireen.openReportViewer` | PanelProvider.createOrShow('sireen.reportViewer') | Functional |
| `sireen.openSettings` | PanelProvider.createOrShow('sireen.settings') | Functional |
| `sireen.createInvestigation` | SidebarProvider → sends `investigation:new` | Functional |
| `sireen.saveInvestigation` | SidebarProvider → sends `investigation:save` | Functional |
| `sireen.loadInvestigation` | SidebarProvider → sends `investigation:load` | Functional |

---

## 3. Provider Map

### SidebarProvider (`sireen.sidebar`)

| Message | Direction | Implementation |
|---------|-----------|----------------|
| `ready` | Webview → Extension | No-op (just logs) |
| `investigation:new` | Webview → Extension | Reads title from payload → sends back investigation ID |
| `investigation:load` | Webview → Extension | Loads from globalState → sends back data |
| `investigation:save` | Webview → Extension | Saves to globalState |
| `investigation:list` | Webview → Extension | Returns all saved investigation keys |
| `investigation:delete` | Webview → Extension | Deletes from globalState |
| `chat:send` | Webview → Extension | Logs only (NO implementation) |
| `chat:stop` | Webview → Extension | Logs only (NO implementation) |
| `finding:save` | Webview → Extension | Saves to globalState |
| `finding:list` | Webview → Extension | Returns saved findings |
| `simulation:start` | Webview → Extension | Triggers `sireen.runPipeline` |
| `open:panel` | Webview → Extension | Delegates to PanelProvider factory |
| `error` | Webview → Extension | Logs error, shows error message |

### PanelProvider (WebviewPanel factory)

| Message | Direction | Implementation |
|---------|-----------|----------------|
| `ready` | Webview → Extension | Sends `bounty:data` (empty findings) or session list |
| `config:get` | Webview → Extension | Handles it via workspace.getConfiguration |
| `config:save` | Webview → Extension | Updates workspace configuration |
| `config:clear` | Webview → Extension | Clears config values |
| `session:list` | Webview → Extension | Returns session list from globalState |
| `session:save` | Webview → Extension | Saves to globalState |
| `session:delete` | Webview → Extension | Deletes from globalState |
| `investigation:create` | Webview → Extension | Stores investigation |
| `simulation:start` | Webview → Extension | Triggers pipeline |
| `simulation:stop` | Webview → Extension | Logs only (NO cancel implementation) |
| `open:panel` | Webview → Extension | Opens another panel |
| `reports:list` | Webview → Extension | Lists saved reports |
| `reports:export` | Webview → Extension | `showInformationMessage` placeholder |
| `graph:data` | Webview → Extension | Returns sample graph data |
| `error` | Webview → Extension | Logs error |

### Orphaned Messages (Sent from Webview, NEVER handled)

| Message | Screen | Status |
|---------|--------|--------|
| `bounty:refresh` | bounty-dashboard.tsx | **NO HANDLER** |
| `bounty:viewDetails` | bounty-dashboard.tsx | **NO HANDLER** |
| `bounty:openExternal` | bounty-dashboard.tsx | **NO HANDLER** |
| `war-room:toggle-pin` | war-room.tsx | **NO HANDLER** |
| `war-room:new-session` | war-room.tsx | **NO HANDLER** |
| `war-room:select-session` | war-room.tsx | **NO HANDLER** |
| `war-room:settings` | war-room.tsx | **NO HANDLER** |
| `attack:start` | attack-workspace.tsx | **NO HANDLER** |
| `attack:stop` | attack-workspace.tsx | **NO HANDLER** |
| `attack:exportLog` | attack-workspace.tsx | **NO HANDLER** |
| `graph:refresh` | knowledge-graph.tsx | **NO HANDLER** |
| `report:export` | report-viewer.tsx | PanelProvider has handler — but does nothing useful |
| `report:openEvidence` | report-viewer.tsx | **NO HANDLER** |
| `report:viewInWorkspace` | report-viewer.tsx | **NO HANDLER** |
| `config:get` | settings.tsx | PanelProvider does NOT respond to this message type |

---

## 4. Webview Map

| Screen | File | View ID | Build Entry | Panel Title |
|--------|------|---------|-------------|-------------|
| Sidebar | sidebar.tsx | `sireen.sidebar` | `src/webview/screens/sidebar.tsx` | (embedded in sidebar) |
| War Room | war-room.tsx | `sireen.warRoom` | `src/webview/screens/war-room.tsx` | "War Room" |
| Bounty Dashboard | bounty-dashboard.tsx | `sireen.bountyDashboard` | `src/webview/screens/bounty-dashboard.tsx` | "Bounty Dashboard" |
| Attack Workspace | attack-workspace.tsx | `sireen.attackWorkspace` | `src/webview/screens/attack-workspace.tsx` | "Attack Workspace" |
| Knowledge Graph | knowledge-graph.tsx | `sireen.knowledgeGraph` | `src/webview/screens/knowledge-graph.tsx` | "Knowledge Graph" |
| Report Viewer | report-viewer.tsx | `sireen.reportViewer` | `src/webview/screens/report-viewer.tsx` | "Report Viewer" |
| Settings | settings.tsx | `sireen.settings` | `src/webview/screens/settings.tsx` | "Settings" |

Each screen is built as a separate IIFE bundle by esbuild. There is NO shared webview entry point. Each screen is fully self-contained — they duplicate imports, duplicate CSS injection, and each manages its own state independently.

---

## 5. Message Flow Diagram

```
┌──────────────────┐         ┌────────────────────────────┐
│   Webview Screen │         │       VS Code Extension      │
│   (SolidJS)      │         │                              │
│                  │ postMessage         │                              │
│  Button Click ───┼────────►│  Provider (Sidebar/Panel)    │
│                  │         │                              │
│                  │         │  ├── Reads payload           │
│                  │         │  ├── Calls service/command   │
│                  │         │  ├── Updates globalState     │
│  UI Update ◄─────┼─────────┤  └── Sends response          │
│                  │         │                              │
│  (via createEffect)        │                              │
└──────────────────┘         └────────────────────────────┘

CURRENT PROBLEM:
- Many messages sent from webview have NO receiver in provider
- Many provider messages return empty/hardcoded data
- No error propagation back to UI for failed messages
- No loading state coordination between send and response
- No timeout/retry logic for messages
```

---

## 6. State Store Diagram

```
INVESTIGATION STORE (src/webview/stores/investigationStore.ts)

┌──────────────────────────────────────────────┐
│ InvestigationStore                            │
│                                              │
│  ├── current: Investigation | null           │
│  ├── list: Investigation[]                   │
│  ├── loading: boolean                        │
│  ├── error: string | null                    │
│  ├── activeTab: Tab                          │
│  ├── findings: Finding[]                     │
│  ├── timeline: TimelineEvent[]               │
│  ├── evidence: Evidence[]                    │
│  ├── threatModel: ThreatNode[]               │
│  ├── messages: ChatMessage[]                 │
│  ├── attackGraph: AttackGraph | null         │
│  └── report: Report | null                   │
│                                              │
│  Actions:                                    │
│  ├── setCurrent                              │
│  ├── setList                                 │
│  ├── setLoading                              │
│  ├── setError                                │
│  ├── setActiveTab                            │
│  ├── addFinding                              │
│  ├── setFindings                             │
│  ├── addTimelineEvent                        │
│  ├── addEvidence                             │
│  ├── setThreatModel                          │
│  ├── addMessage                              │
│  ├── setMessages                             │
│  ├── setAttackGraph                          │
│  └── setReport                               │
└──────────────────────────────────────────────┘

STATUS: ZERO screens import this store.
         Every screen uses local createSignal() instead.
```

**Current State Management Per Screen:**

| Screen | State Approach | Store? | Persistence |
|--------|---------------|--------|-------------|
| sidebar.tsx | `createSignal` for messages, tabs, mode, chain | No | No |
| war-room.tsx | `createSignal` for sessions, search, stats | No | No |
| bounty-dashboard.tsx | `createSignal` for bounties, filter | No | No |
| attack-workspace.tsx | `createSignal` for terminal output | No | No |
| knowledge-graph.tsx | `createSignal` for selected node, filter | No | No |
| report-viewer.tsx | `createSignal` for report data | No | No |
| settings.tsx | `createSignal` for all settings | No | No |

---

## 7. Screen Ownership Map

| Screen | Primary Purpose | Actual Content | Gap |
|--------|---------------|----------------|-----|
| **Sidebar** | Investigation management + chat | Chat with tabs (threat/findings/timeline/evidence) | Tabs show "No x yet" — never populated |
| **War Room** | Session overview | 8 hardcoded sample sessions | No connection to real investigations |
| **Bounty Dashboard** | Bounty tracking | 6 hardcoded sample bounties | No real data, no API connection |
| **Attack Workspace** | Live forge terminal | Static UI with empty terminal | No forge integration, no real output |
| **Knowledge Graph** | Threat graph visualization | Hardcoded sample nodes/edges | No pipeline data connection |
| **Report Viewer** | Security report display | Hardcoded sample report | Real reports generated but never shown |
| **Settings** | Configuration | Working config load/save | `config:get` message never handled |

---

## 8. UX Inconsistencies

1. **Design token usage** — Variables from `tokens.css` are defined but screens use hardcoded values inconsistently (e.g., `var(--font-family)` vs hardcoded `'Inter', sans-serif`).

2. **CSS injection duplication** — Every screen calls `injectGlobalStyles()` on mount, which appends `<style>` tags to the DOM on every invocation. This should be called once.

3. **Spacing inconsistency** — Sidebar uses `padding: 16px`, war-room uses `padding: var(--space-4)`, report-viewer uses `padding: 24px`. No standard spacing rhythm.

4. **Color inconsistency** — `--color-primary: #0078D4` is defined but many screens use their own blues (#1a73e8, #2196F3, #0d6efd).

5. **Animation mismatch** — Sidebar has no transitions. Knowledge graph has SVG transitions. War room has hover cards. No unified animation approach.

6. **Tab inconsistency** — Sidebar defines 5 tabs (chat/threat/findings/timeline/evidence). War room defines its own categorization. No shared TabType.

7. **Typography drift** — Some screens use `font-size: 13px`, others use `--font-size-sm: 12px`. No typographic scale enforcement.

8. **Button styling** — `Button.tsx` component exists but screens define their own inline button styles and click handlers.

---

## 9. Dead Code List

| File | What | Why Dead |
|------|------|----------|
| `src/webview/components/Select.tsx` | Entire component | Created but never imported anywhere. Sidebar uses native `<select>`. |
| `src/webview/stores/investigationStore.ts` | Entire store | 0 imports across all screens. Each screen uses local `createSignal()`. |
| `Select` import in war-room.tsx | Line where `Select` is imported | War room imports `Select` but never uses it in JSX. |
| `injectGlobalStyles()` call × 7 | Each screen calls it | Should be called exactly once. Causes duplicate `<style>` tags. |
| `chat:complete` listener in sidebar.tsx | Listener block | Provider NEVER sends `chat:complete`. Dead path. |
| `bounty:data` sender in PanelProvider.ts | Line ~63-65 | Sends empty `{ findings: [] }` | 
| `sireen.helloWorld` command | extension.ts | Placeholder command that just shows info message. |
| DockerSandbox.isAvailable() | DockerSandbox.ts:48 | Method exists but NEVER called by any code path. |
| `forge-stub` in two files | PoCGenerator.ts + PipelineManager.ts | Duplicated 60-line stub with minor differences. |

---

## 10. Broken Interaction List

| Interaction | Expected | Actual |
|-------------|----------|--------|
| Click bounty refresh button | Fetch real bounty data | Message sent, nobody handles it |
| Click war room session | Load investigation | Message sent, nobody handles it |
| Click war room "New Session" | Create investigation | Message sent, nobody handles it |
| Click attack workspace "Start" | Run forge pipeline | Message sent, nobody handles it |
| Click attack workspace "Stop" | Cancel running pipeline | Message sent, nobody handles it |
| Click attack workspace "Export Logs" | Export terminal output | Message sent, nobody handles it |
| Click knowledge graph "Refresh" | Reload graph data | Message sent, nobody handles it |
| Click report "Export" | Export report | Shows `showInformationMessage` placeholder |
| Click report "Open in Workspace" | Open in editor | Message sent, nobody handles it |
| Click report evidence item | Show evidence details | Message sent, nobody handles it |
| Open settings panel | Load current config | `config:get` sent, nobody responds |
| Settings "Clear" button for RPC | Clear individual setting | Calls text-based handler, may mismatch stored key |
| Create investigation in sidebar | Investigation appears in War Room | No cross-panel sync |
| Complete pipeline run | Results appear in sidebar tabs | No tab population logic |
| Run simulation from sidebar | Progress shown in UI | Pipeline runs silently in background |
| Change active color theme | Theme propagates to panels | extension.ts sends theme only to sidebar, NOT to panels |

---

## 11. Missing Features List

| Feature | Needed For | Effort |
|---------|-----------|--------|
| Global state machine | All UI state transitions | Essential |
| Cross-panel state sync | Sidebar ↔ Panel communication | Essential |
| Pipeline progress streaming | Real-time UI updates | Essential |
| Investigation persistence | Save/load across sessions | Essential |
| Bounty real data API | Functional bounty dashboard | High |
| War Room real session data | Functional session management | High |
| Knowledge graph from pipeline data | Meaningful visualization | High |
| Report viewer with real reports | Functional report export | High |
| Attack workspace with real forge | Functional forge terminal | High |
| Keyboard shortcuts (Cmd+K, Cmd+Enter) | Developer UX | Medium |
| Focus management + ARIA | Accessibility | Medium |
| Error boundaries | Graceful failure | Medium |
| Loading states for all panels | UX polish | Medium |
| Config validation (forkUrl, forgePath) | Security | Medium |
| Pipeline cancellation | User control | Medium |
| Docker sandbox availability check | Reliable Docker usage | Low |
| `config:get` handler in PanelProvider | Settings panel on open | Medium |
| `chat:stream` event from AI | Real-time chat | Medium |
| Chat message persistence | Cross-session chat history | Medium |

---

## 12. Technical Debt List

| Item | Severity | Impact |
|------|----------|--------|
| **1,287 TypeScript errors** (tsc --noEmit) | CRITICAL | Cannot verify type safety |
| 50+ `as any` casts in war-room.tsx | HIGH | Type unsafety, hides bugs |
| Zero test coverage | CRITICAL | No regression safety net |
| No ESLint/Prettier | MEDIUM | Inconsistent code style |
| No CI/CD pipeline | MEDIUM | No automated verification |
| No launch.json debug config | LOW | Manual debugging only |
| No .gitignore | LOW | Git pollution risk |
| No commit history convention | LOW | Hard to track changes |
| SolidJS JSX shim (jsx-shim.js) | MEDIUM | Non-standard setup, fragile |
| SolidJS version ^1.7.0 vs ^1.8.0 mismatch | LOW | Potential API drift |
| CSS-in-JS via string concatenation | MEDIUM | No type safety for styles |
| Duplicate forge-stub in two files | MEDIUM | Maintenance burden |
| PanelProvider.splitMessages by source | LOW | Fragile string parsing |
| SidebarProvider html template uses strings | LOW | Hard to maintain |
| PipelineManager 500+ line file | MEDIUM | Should be split |
| PanelProvider 400+ line file | MEDIUM | Should be split |

---

## 13. Production Blockers List

| # | Blocker | Reason | Phase to Fix |
|---|---------|--------|-------------|
| B1 | **No state machine** | UI cannot react to app state transitions | P1 |
| B2 | **13 orphaned messages** | Most buttons literally do nothing | P1 |
| B3 | **All data is fake** | Every panel shows sample/hardcoded data | P3 |
| B4 | **1,287 TS errors** | Cannot verify compilation correctness | P5 |
| B5 | **Pipeline → UI gap** | Pipeline runs but UI never shows results | P2 |
| B6 | **No persistence model** | Investigations lost on reload | P4 |
| B7 | **No cross-panel sync** | Sidebar and panels operate in isolation | P2 |
| B8 | **No loading/error states** | UI shows blank during operations | P1 |
| B9 | **No keyboard support** | Cannot use extension efficiently | P4 |
| B10 | **No input validation** | Shell injection risk via config | P5 |

---

## Summary

Sireen has a **solid architectural skeleton** (extension activation, provider pattern, webview factory, pipeline engine, design system) but **zero integration between layers**. The pipeline actually works end-to-end, but none of its results reach any UI component. Every webview screen is a disconnected prototype showing fake data. 13 buttons across all screens send messages that have no receiver.

The goalaif/ codebase (the predecessor) had working backend communication, real-time WebSocket streaming, and proper store persistence — all of which were lost in this rewrite.

**The project is approximately 15% complete — the scaffolding is there but the connections are missing.**

# SIREEN — Gap Analysis

> Phase 3 of Lead Engineer Mode
> Current Implementation vs Target Architecture

---

## Priority Classification

| Priority | Meaning | Action |
|----------|---------|--------|
| **P0** | Broken functionality | Must fix before any release |
| **P1** | Workflow blocker | Must fix for usable workflow |
| **P2** | UX issue | Should fix for professional feel |
| **P3** | Technical debt | Should fix for maintainability |

---

## 1. Global State Machine

| Aspect | Current | Target | Gap | Priority |
|--------|---------|--------|-----|----------|
| Existence | No global state machine exists | Shared AppStore with 8 states + transitions | Complete absence | **P0** |
| State transitions | Pipelines runs silently, no UI awareness | Every UI component reacts to state | No integration | **P0** |
| Error handling | Pipeline throws, UI stays on previous state | Error state propagated to all UI | No error flow | **P0** |
| Loading states | Each screen has local `loading` signal | Single `appState.status` drives all loading | Fragmented | **P1** |

**Files to change:** New `src/webview/stores/appStore.ts`

---

## 2. Investigation State

| Aspect | Current | Target | Gap | Priority |
|--------|---------|--------|-----|----------|
| Store definition | `investigationStore.ts` exists but unused | Shared store used by all screens | Store = dead code | **P0** |
| Cross-screen sync | Each screen manages own state | One state, all screens subscribe | No sync | **P0** |
| Persistence | `globalState` in provider, no UI hydration | UI loads from store → store syncs to storage | Half-broken | **P1** |
| Investigation CRUD | Two providers implement independently | One implementation via message bus | Duplicated | **P1** |

**Files to change:** `src/webview/stores/investigationStore.ts` (remove), `src/webview/stores/appStore.ts` (create), `src/webview/screens/sidebar.tsx`, `src/webview/screens/war-room.tsx`

---

## 3. Message Passing

| Aspect | Current | Target | Gap | Priority |
|--------|---------|--------|-----|----------|
| `bounty:refresh` | Sent — NO HANDLER | Provider responds with bounty data | Orphaned message | **P0** |
| `bounty:viewDetails` | Sent — NO HANDLER | Provider responds with details | Orphaned message | **P0** |
| `bounty:openExternal` | Sent — NO HANDLER | Provider opens URL | Orphaned message | **P0** |
| `war-room:toggle-pin` | Sent — NO HANDLER | Provider toggles pin state | Orphaned message | **P0** |
| `war-room:new-session` | Sent — NO HANDLER | Provider creates investigation | Orphaned message | **P0** |
| `war-room:select-session` | Sent — NO HANDLER | Provider loads investigation | Orphaned message | **P0** |
| `war-room:settings` | Sent — NO HANDLER | Provider opens settings panel | Orphaned message | **P0** |
| `attack:start` | Sent — NO HANDLER | Provider starts pipeline | Orphaned message | **P0** |
| `attack:stop` | Sent — NO HANDLER | Provider stops pipeline | Orphaned message | **P0** |
| `attack:exportLog` | Sent — NO HANDLER | Provider exports logs | Orphaned message | **P0** |
| `graph:refresh` | Sent — NO HANDLER | Provider returns graph data | Orphaned message | **P0** |
| `report:openEvidence` | Sent — NO HANDLER | Provider shows evidence | Orphaned message | **P0** |
| `config:get` | Sent — NO HANDLER | Provider returns config | Orphaned message | **P0** |
| `report:export` | Sent — shows info message only | Provider exports to file | Placeholder | **P0** |
| `bounty:data` | Provider sends empty `[]` | Provider sends real data from state | Placeholder | **P0** |
| `chat:complete` | Sidebar listens — NEVER SENT | Provider sends when AI stream ends | Dead code | **P1** |
| `simulation:start` | Works (triggers pipeline) | Should also stream progress | Partial | **P1** |
| `simulation:stop` | Logs only — NO cancel | Should cancel pipeline execution | Broken | **P1** |

**Files to change:** `src/providers/SidebarProvider.ts`, `src/providers/PanelProvider.ts`, `src/webview/providers/messageBus.ts` (create)

---

## 4. Pipeline → UI Bridge

| Aspect | Current | Target | Gap | Priority |
|--------|---------|--------|-----|----------|
| Pipeline execution | Works via command or `simulation:start` | Works from anywhere | OK | — |
| Progress streaming | No streaming | Real-time phase/progress to UI | Missing | **P0** |
| Log streaming | Not sent to UI | `simulation:log` events to webview | Missing | **P0** |
| Result delivery | Not sent to any webview | `simulation:result` populates findings/threat/evidence/timeline | Missing | **P0** |
| Cancel support | No cancellation | `simulation:stop` actually stops | Missing | **P1** |
| Pipeline state → UI | No connection | Pipeline phase = appStore status | Missing | **P0** |
| PipelineManager extends EventEmitter | No | PipelineBridge wraps with events | Missing | **P1** |

**Files to change:** New `src/pipeline/PipelineBridge.ts`, `src/pipeline/PipelineManager.ts`, `src/providers/SidebarProvider.ts`, `src/providers/PanelProvider.ts`

---

## 5. Sidebar Tabs

| Aspect | Current | Target | Gap | Priority |
|--------|---------|--------|-----|----------|
| Chat tab | Working (messages, send, streaming) | Working + keyboard shortcuts | Minor | **P2** |
| Threat tab | Shows "No threats yet" | Shows real threat data from pipeline | Empty placeholder | **P0** |
| Findings tab | Shows "No findings yet" | Shows real findings from pipeline | Empty placeholder | **P0** |
| Timeline tab | Shows "Timeline is empty" | Shows real events from pipeline | Empty placeholder | **P0** |
| Evidence tab | Shows "No evidence" | Shows real evidence from pipeline | Empty placeholder | **P0** |
| Tab persistence | Resets on sidebar collapse | Remembers last active tab | Missing | **P2** |

**Files to change:** `src/webview/screens/sidebar.tsx`, `src/webview/stores/appStore.ts`

---

## 6. Attack Workspace

| Aspect | Current | Target | Gap | Priority |
|--------|---------|--------|-----|----------|
| Terminal output | Empty/static UI | Real-time forge test output | Non-functional | **P0** |
| Start button | Sends `attack:start` — NO HANDLER | Starts pipeline via PipelineBridge | Broken | **P0** |
| Stop button | Sends `attack:stop` — NO HANDLER | Cancels pipeline | Broken | **P0** |
| Export button | Sends `attack:exportLog` — NO HANDLER | Exports logs to file | Broken | **P0** |
| Color coding | None | Pass/fail/info ANSI colors | Missing | **P2** |
| Phase indicator | Not shown | Shows current pipeline phase | Missing | **P1** |

**Files to change:** `src/webview/screens/attack-workspace.tsx`, `src/pipeline/PipelineBridge.ts`, `src/providers/PanelProvider.ts`

---

## 7. War Room

| Aspect | Current | Target | Gap | Priority |
|--------|---------|--------|-----|----------|
| Session data | 8 hardcoded samples | Real sessions from provider | Fake data | **P0** |
| New session button | Sends `war-room:new-session` — NO HANDLER | Creates investigation | Broken | **P0** |
| Session click | Sends `war-room:select-session` — NO HANDLER | Loads investigation | Broken | **P0** |
| Pin toggle | Sends `war-room:toggle-pin` — NO HANDLER | Toggles pin state | Broken | **P0** |
| Settings button | Sends `war-room:settings` — NO HANDLER | Opens settings panel | Broken | **P0** |
| Search/filter | Local filter on sample data | Filters real session list | Partial | **P2** |
| Stats header | Hardcoded "12 Sessions, 8 Active" | Real counts from state | Fake data | **P0** |

**Files to change:** `src/webview/screens/war-room.tsx`, `src/providers/PanelProvider.ts`

---

## 8. Knowledge Graph

| Aspect | Current | Target | Gap | Priority |
|--------|---------|--------|-----|----------|
| Graph data | 12 hardcoded nodes + 15 edges | Real nodes from pipeline threat model | Fake data | **P0** |
| Refresh button | Sends `graph:refresh` — NO HANDLER | Returns real graph data | Broken | **P0** |
| Node click | Local state update only | Sends `graph:selectNode` → provider returns details | Partial | **P1** |
| Node inspector | Shows hardcoded "Contract A" details | Shows real node data from state | Fake data | **P0** |
| Legend coloring | Hardcoded categories | Derived from real data types | Partial | **P2** |
| Filter | Local filter only | Filters backed by store queries | Partial | **P2** |

**Files to change:** `src/webview/screens/knowledge-graph.tsx`, `src/providers/PanelProvider.ts`

---

## 9. Report Viewer

| Aspect | Current | Target | Gap | Priority |
|--------|---------|--------|-----|----------|
| Report data | 150+ line SAMPLE_REPORT | Real report from pipeline result | Fake data | **P0** |
| Export button | `showInformationMessage` placeholder | Real export to file (PDF/MD/JSON) | Placeholder | **P0** |
| Open evidence | Sends `report:openEvidence` — NO HANDLER | Opens evidence in panel/editor | Broken | **P0** |
| Open in workspace | Sends `report:viewInWorkspace` — NO HANDLER | Opens in editor | Broken | **P0** |
| Empty state | Shows sample data on open | Shows "No report generated yet" | Wrong UX | **P1** |
| Loading state | None | Shows skeleton while report loads | Missing | **P2** |

**Files to change:** `src/webview/screens/report-viewer.tsx`, `src/providers/PanelProvider.ts`

---

## 10. Bounty Dashboard

| Aspect | Current | Target | Gap | Priority |
|--------|---------|--------|-----|----------|
| Bounty data | 6 hardcoded bounties | Real data from API or store | Fake data | **P1** |
| Refresh button | Sends `bounty:refresh` — NO HANDLER | Fetches fresh data | Broken | **P1** |
| View details | Sends `bounty:viewDetails` — NO HANDLER | Opens detail view | Broken | **P1** |
| External link | Sends `bounty:openExternal` — NO HANDLER | Opens platform URL | Broken | **P1** |
| Stats header | Hardcoded "$295K total" | Real stats from bounty data | Fake data | **P1** |

**Files to change:** `src/webview/screens/bounty-dashboard.tsx`, `src/providers/PanelProvider.ts`

---

## 11. Settings

| Aspect | Current | Target | Gap | Priority |
|--------|---------|--------|-----|----------|
| Config load | `config:get` sent — NO HANDLER | Provider returns config values | Broken | **P0** |
| Config save | Works | Works | OK | — |
| Config clear | Works (text-based, fragile) | Works (key-based, robust) | Fragile | **P2** |
| Danger zone | "Reset All Settings" button | Confirmation dialog + reset | Partial | **P2** |
| RPC endpoints | Add/edit/clear | Add/edit/clear | OK | — |

**Files to change:** `src/webview/screens/settings.tsx`, `src/providers/PanelProvider.ts`

---

## 12. UI/UX Consistency

| Aspect | Current | Target | Gap | Priority |
|--------|---------|--------|-----|----------|
| Design tokens | Defined in `tokens.css` | Enforced across all screens | Partial compliance | **P2** |
| CSS injection | Called in every screen | Called once at activation | Duplicated | **P1** |
| Button component | Exists in `Button.tsx` | Used by all screens | Unused in most | **P2** |
| Select component | Exists in `Select.tsx` | Never imported | Dead code | **P3** |
| Spacing | Multiple values (16px, 24px, --space-4) | Single token system | Inconsistent | **P2** |
| Colors | Multiple blues (#0078D4, #1a73e8, #2196F3) | Single `--color-primary` | Inconsistent | **P2** |
| Typography | 12px, 13px, --font-size-sm mixed | Token-based scale | Inconsistent | **P2** |
| Animations | Some screens have, some don't | Unified subtle transitions | Inconsistent | **P2** |
| Keyboard support | None | Full keyboard shortcuts | Missing | **P1** |
| Focus management | None | Tab order, focus traps | Missing | **P2** |
| Empty states | Some have text, some don't | All must guide user | Inconsistent | **P1** |
| Loading states | None | Skeleton/spinner per screen | Missing | **P1** |
| Error states | None | Toast/alert per error | Missing | **P1** |

---

## 13. Engineering Quality

| Aspect | Current | Target | Gap | Priority |
|--------|---------|--------|-----|----------|
| TypeScript errors | 1,287 | 0 | Must fix | **P1** |
| `as any` casts | 50+ in war-room alone | 0 | Must fix | **P1** |
| Test coverage | 0% | >50% for pipeline, >30% for providers | Missing | **P3** |
| ESLint/Prettier | Not configured | Configured and passing | Missing | **P3** |
| CI/CD | Not configured | GitHub Actions | Missing | **P3** |
| .gitignore | Not present | Present | Missing | **P3** |
| launch.json | Not present | Present | Missing | **P3** |
| Forge-stub duplication | Two copies | One shared import | Duplicated | **P2** |
| PipelineManager | 500+ lines | Split into orchestration + services | Monolithic | **P3** |
| PanelProvider | 400+ lines | Split into handler classes | Monolithic | **P3** |

---

## 14. Security

| Aspect | Current | Target | Gap | Priority |
|--------|---------|--------|-----|----------|
| `forkUrl` validation | None | Validate URL before `execSync` | Security risk | **P1** |
| `forgePath` validation | None | Validate path before `execSync` | Security risk | **P1** |
| `dockerImage` validation | None | Validate image name | Security risk | **P1** |
| Docker availability check | `isAvailable()` exists, never called | Check before Docker commands | Not used | **P2** |
| API key handling | Passed in Bearer header | Validate key format | Minor | **P2** |
| Rate limiting | None | Limit pipeline executions | Missing | **P3** |

---

## Summary by Priority

| Priority | Count | Key Items |
|----------|-------|-----------|
| **P0** | 25 | Missing state machine, 13 orphaned messages, all fake data, empty sidebar tabs, broken attack workspace, broken war room, broken bounty dashboard, broken settings load |
| **P1** | 16 | Missing pipeline bridge, no pipeline cancel, no loading/error/empty states, TS errors, security validation, no keyboard shortcuts |
| **P2** | 14 | Design token inconsistencies, spacing/color/typography drift, missing animations, focus management, settings clear fragility |
| **P3** | 8 | Dead Select.tsx, no tests, no linting, no CI/CD, monolithic providers, forge-stub duplication |

**Total gaps identified: 63**

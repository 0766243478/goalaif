# SIREEN — Execution Plan

> Phase 4 of Lead Engineer Mode
> Atomic Tasks — Ordered by Dependency

---

## Task Legend

```
ID: P{priority}-{nnn}
Goal: One clear outcome
Files: Maximum 5 per task
Risk: Low / Medium / High
Depends: Task IDs that must be done first
Acceptance: Measurable criteria
Test: Manual steps to verify
```

---

## PHASE A: FOUNDATION (P0)

### A-001: Create AppStore (Global State Machine)

| Field | Value |
|-------|-------|
| **Goal** | Create `src/webview/stores/appStore.ts` with full state machine, shared store slices, and reactive subscriptions |
| **Files** | `src/webview/stores/appStore.ts` (new) |
| **Risk** | Medium — new file, zero impact on existing code |
| **Depends** | None |
| **Acceptance** | Store exports: `appStore`, `AppState`, `PipelineStatus`, state transition functions, all store slices |
| **Test** | 1. Import store in test file<br>2. Call `startLoading()` → verify `status === 'researching'`<br>3. Call `setError('test')` → verify `error === 'test'`<br>4. Subscribe with `createEffect` → verify reactivity |

### A-002: Create MessageBus (Central Message Router)

| Field | Value |
|-------|-------|
| **Goal** | Create `src/webview/providers/messageBus.ts` with typed message sending, request/response correlation, logging, and error handling |
| **Files** | `src/webview/providers/messageBus.ts` (new) |
| **Risk** | Low — wrapper around existing `vscode.postMessage` |
| **Depends** | None |
| **Acceptance** | MessageBus exports `sendMessage(type, payload, expectResponse)` that returns Promise. All existing `vscode.postMessage` calls can be replaced. |
| **Test** | 1. Import messageBus in screen<br>2. Send `investigation:list`<br>3. Provider receives it<br>4. Response received in `.then()`<br>5. Timeout if no response in 30s |

### A-003: Add Orphaned Handlers — SidebarProvider

| Field | Value |
|-------|-------|
| **Goal** | Add handlers for ALL orphaned messages in SidebarProvider that belong to it |
| **Files** | `src/providers/SidebarProvider.ts` |
| **Risk** | Medium — adding message handlers to existing switch |
| **Depends** | A-001, A-002 |
| **Acceptance** | SidebarProvider handles: `chat:send` (real AI call via AIClient), `chat:stop` (cancel), `simulation:start`/`stop`, `tab:change`. Messages that belong to PanelProvider are forwarded. |
| **Test** | 1. Open sidebar<br>2. Send chat message<br>3. Verify AI responds<br>4. Hit stop → verify stream stops<br>5. Switch tab → verify `tab:data` response |

### A-004: Add Orphaned Handlers — PanelProvider

| Field | Value |
|-------|-------|
| **Goal** | Add handlers for ALL orphaned messages in PanelProvider |
| **Files** | `src/providers/PanelProvider.ts` |
| **Risk** | Medium — adding multiple handlers to existing large switch |
| **Depends** | A-001, A-002 |
| **Acceptance** | PanelProvider handles: `bounty:refresh`/`viewDetails`/`openExternal`, `war-room:*`, `attack:*`, `graph:refresh`, `report:export`/`openEvidence`/`viewInWorkspace`, `config:get`. No more unhandled messages. |
| **Test** | 1. Open each panel<br>2. Click every button<br>3. Verify provider receives each message<br>4. Verify response sent back to webview<br>5. Verify error messages for invalid payloads |

### A-005: Remove Dead Code

| Field | Value |
|-------|-------|
| **Goal** | Remove dead code identified in audit: unused Select.tsx, unused investigationStore.ts, fix duplicated CSS injection, remove `bounty:data` placeholder |
| **Files** | `src/webview/components/Select.tsx` (delete), `src/webview/stores/investigationStore.ts` (delete), all webview screens (fix CSS injection) |
| **Risk** | Low — files are dead/unused |
| **Depends** | A-001 (for store replacement) |
| **Acceptance** | No dead imports, `injectGlobalStyles()` called once (in each screen's module root), no `bounty:data` placeholder |
| **Test** | 1. Build passes<br>2. Each screen renders without error<br>3. No duplicate `<style>` tags in DOM |

### A-006: Fix Fake Loading States — Add Real Loading to Sidebar

| Field | Value |
|-------|-------|
| **Goal** | Wire sidebar loading state to AppStore so UI shows spinner during async operations |
| **Files** | `src/webview/screens/sidebar.tsx`, `src/webview/stores/appStore.ts` |
| **Risk** | Low — only affects UI state binding |
| **Depends** | A-001 |
| **Acceptance** | Sidebar shows loading spinner when `appState.status` is in a loading state. Spinner disappears when status changes. |
| **Test** | 1. Trigger `chat:send`<br>2. Verify loading appears in input area<br>3. Wait for response → loading disappears<br>4. Trigger `simulation:start` → loading in tab area |

---

## PHASE B: PIPELINE → UI BRIDGE (P0-P1)

### B-001: Create PipelineBridge (Event Streaming)

| Field | Value |
|-------|-------|
| **Goal** | Create `PipelineBridge.ts` that wraps PipelineManager with EventEmitter, streaming phase/progress/logs/results to providers |
| **Files** | `src/pipeline/PipelineBridge.ts` (new), `src/pipeline/PipelineManager.ts` (add EventEmitter) |
| **Risk** | Medium — modifies pipeline execution path |
| **Depends** | A-001 |
| **Acceptance** | PipelineBridge emits events: `phase-change`, `progress`, `log`, `result`, `error`. Providers subscribe and relay to webview. |
| **Test** | 1. Run pipeline via PipelineBridge<br>2. Verify `phase-change` events fire (hypothesis → poc → forge → parse → verify → report)<br>3. Verify `log` events contain forge output<br>4. Verify `result` event contains InvestigationReport |

### B-002: Wire Attack Workspace to PipelineBridge

| Field | Value |
|-------|-------|
| **Goal** | Replace empty terminal UI with real-time forge output from PipelineBridge |
| **Files** | `src/webview/screens/attack-workspace.tsx`, `src/providers/PanelProvider.ts` |
| **Risk** | Medium — real-time streaming to webview is new pattern |
| **Depends** | B-001 |
| **Acceptance** | Clicking "Start" runs pipeline. Terminal shows real-time forge output. "Stop" cancels. "Export" saves logs. |
| **Test** | 1. Open Attack Workspace<br>2. Click Start<br>3. Watch forge output appear line by line<br>4. Click Stop → pipeline stops<br>5. Click Export → file saved to disk |

### B-003: Wire Sidebar Findings Tab to Pipeline Results

| Field | Value |
|-------|-------|
| **Goal** | Findings tab shows real Finding[] objects from pipeline result instead of "No findings yet" |
| **Files** | `src/webview/screens/sidebar.tsx`, `src/webview/stores/appStore.ts` |
| **Risk** | Low — state routing only |
| **Depends** | B-001 |
| **Acceptance** | After pipeline completes, Findings tab displays findings from the result. Each finding shows title, severity, status. |
| **Test** | 1. Run pipeline<br>2. Switch to Findings tab<br>3. Verify findings are displayed<br>4. Verify severity badges render correctly<br>5. No findings → empty state shows "No findings yet" |

### B-004: Wire Sidebar Threat Tab to Pipeline Threat Model

| Field | Value |
|-------|-------|
| **Goal** | Threat tab shows threat nodes from pipeline hypothesis/analysis |
| **Files** | `src/webview/screens/sidebar.tsx`, `src/pipeline/PipelineManager.ts` |
| **Risk** | Low — wiring existing data to UI |
| **Depends** | B-001 |
| **Acceptance** | After pipeline, Threat tab shows threat nodes with descriptions and risk levels |
| **Test** | 1. Run pipeline<br>2. Switch to Threat tab<br>3. Verify threat nodes appear<br>4. Click node → details shown |

### B-005: Wire Sidebar Timeline Tab to Pipeline Events

| Field | Value |
|-------|-------|
| **Goal** | Timeline tab shows chronological events from pipeline execution |
| **Files** | `src/webview/screens/sidebar.tsx`, `src/pipeline/PipelineBridge.ts` |
| **Risk** | Low — routing pipeline events to UI timestamp list |
| **Depends** | B-001 |
| **Acceptance** | Timeline shows each pipeline phase with timestamp. Events are grouped by phase. |
| **Test** | 1. Run pipeline<br>2. Switch to Timeline<br>3. Verify events appear in order<br>4. Verify timestamps are correct |

### B-006: Wire Sidebar Evidence Tab to Pipeline Artifacts

| Field | Value |
|-------|-------|
| **Goal** | Evidence tab shows raw artifacts (forge logs, traces, balance diffs) from pipeline |
| **Files** | `src/webview/screens/sidebar.tsx` |
| **Risk** | Low — UI rendering of existing data |
| **Depends** | B-001 |
| **Acceptance** | Evidence tab displays artifact items. Each has type icon, copy/open buttons. |
| **Test** | 1. Run pipeline<br>2. Switch to Evidence<br>3. Verify artifacts appear<br>4. Click Copy → clipboard has content<br>5. Click Open → opens in editor |

---

## PHASE C: REMOVE SAMPLE DATA (P0-P1)

### C-001: Wire War Room to Real Sessions

| Field | Value |
|-------|-------|
| **Goal** | Replace `SAMPLE_SESSIONS` with real session data from provider/state |
| **Files** | `src/webview/screens/war-room.tsx`, `src/providers/PanelProvider.ts` |
| **Risk** | Medium — significant UI refactor to bind to store |
| **Depends** | A-001, A-004 |
| **Acceptance** | War Room shows real investigations from globalState. Stats are real counts. New session creates investigation. Click loads it. Pin toggles. |
| **Test** | 1. Open War Room<br>2. Verify sessions list matches saved investigations<br>3. Click "New Session" → investigation created<br>4. Click session → loads investigation in sidebar<br>5. Toggle pin → pin state persists on reload |

### C-002: Wire Knowledge Graph to Pipeline Data

| Field | Value |
|-------|-------|
| **Goal** | Replace `SAMPLE_NODES`/`SAMPLE_EDGES` with real threat model from pipeline |
| **Files** | `src/webview/screens/knowledge-graph.tsx`, `src/providers/PanelProvider.ts` |
| **Risk** | Medium — graph rendering depends on data shape matching |
| **Depends** | B-001 |
| **Acceptance** | Knowledge graph renders nodes from pipeline threat model. Click selects node. Inspector shows real data. |
| **Test** | 1. Run pipeline<br>2. Open Knowledge Graph<br>3. Verify nodes appear (not sample)<br>4. Click node → inspector shows real data<br>5. Refresh → graph reloads |

### C-003: Wire Report Viewer to Pipeline Reports

| Field | Value |
|-------|-------|
| **Goal** | Replace `SAMPLE_REPORT` with real InvestigationReport from pipeline |
| **Files** | `src/webview/screens/report-viewer.tsx`, `src/providers/PanelProvider.ts` |
| **Risk** | Low — data shape already matches |
| **Depends** | B-001 |
| **Acceptance** | Report Viewer shows real report data. Export saves actual content. Evidence links work. |
| **Test** | 1. Run pipeline<br>2. Open Report Viewer<br>3. Verify report shows real findings<br>4. Click Export → file saved<br>5. No report → empty state |

### C-004: Wire Settings Config Load

| Field | Value |
|-------|-------|
| **Goal** | Fix `config:get` handler so settings panel loads current values on open |
| **Files** | `src/providers/PanelProvider.ts`, `src/webview/screens/settings.tsx` |
| **Risk** | Low — adding a handler for an existing message |
| **Depends** | A-004 |
| **Acceptance** | Opening Settings loads current config values into form fields |
| **Test** | 1. Open Settings<br>2. Verify API key field shows current value<br>3. Verify model selector shows current model<br>4. Verify RPC endpoint list is populated |

### C-005: Wire Bounty Dashboard (or Mark as Future)

| Field | Value |
|-------|-------|
| **Goal** | Either connect bounty dashboard to a real data source or add a "Coming Soon" state with explanation |
| **Files** | `src/webview/screens/bounty-dashboard.tsx`, `src/providers/PanelProvider.ts` |
| **Risk** | Low — either route is straightforward |
| **Depends** | A-004 |
| **Acceptance** | If connected: shows real bounty data. If "Coming Soon": shows informative state with expected features. No fake $ amounts. |
| **Test** | 1. Open Bounty Dashboard<br>2. Verify no hardcoded sample data appears<br>3. All buttons have real handlers or clear disabled state |

---

## PHASE D: PERSISTENCE & NAVIGATION (P1-P2)

### D-001: Investigation Persistence

| Field | Value |
|-------|-------|
| **Goal** | Save/load investigations across sessions. Restore context on extension reload. |
| **Files** | `src/providers/SidebarProvider.ts`, `src/webview/stores/appStore.ts` |
| **Risk** | Medium — storage schema design affects all features |
| **Depends** | A-001, A-003 |
| **Acceptance** | Creating investigation persists to globalState. Reloading extension restores last investigation. List shows all saved. |
| **Test** | 1. Create investigation<br>2. Reload VS Code window<br>3. Verify last investigation is restored<br>4. View list → all saved investigations appear |

### D-002: Cross-Panel Navigation Sync

| Field | Value |
|-------|-------|
| **Goal** | Actions in sidebar affect panels and vice versa |
| **Files** | `src/extension.ts`, `src/providers/SidebarProvider.ts`, `src/providers/PanelProvider.ts` |
| **Risk** | Medium — requires coordination between two provider types |
| **Depends** | D-001 |
| **Acceptance** | Clicking finding in sidebar opens Report Viewer. Creating investigation in War Room activates it in sidebar. |
| **Test** | 1. Click finding in sidebar<br>2. Report Viewer opens with that finding<br>3. Close Report Viewer<br>4. Open War Room, click session<br>5. Sidebar loads that investigation |

### D-003: Keyboard Shortcuts

| Field | Value |
|-------|-------|
| **Goal** | Implement keyboard shortcuts for all major actions |
| **Files** | `src/webview/screens/sidebar.tsx`, `package.json` |
| **Risk** | Low — standard VS Code pattern |
| **Depends** | None |
| **Acceptance** | Cmd+K focuses input, Cmd+Enter sends message, Escape cancels/closes, Ctrl+Tab cycles tabs, Cmd+1-7 switches tabs |
| **Test** | 1. Focus sidebar<br>2. Cmd+K → input focused<br>3. Type message, Cmd+Enter → message sent<br>4. Escape → cancel streaming<br>5. Ctrl+Tab → next tab selected |

### D-004: Focus Management

| Field | Value |
|-------|-------|
| **Goal** | Proper tab order, focus traps in modals/panels, ARIA labels |
| **Files** | All webview screens |
| **Risk** | Medium — touches every screen |
| **Depends** | None |
| **Acceptance** | Tab order follows visual order. Modals trap focus. All interactive elements have aria-labels. |
| **Test** | 1. Tab through sidebar → logical order<br>2. Open modal → tab stays within modal<br>3. Screen reader → all elements announced |

---

## PHASE E: ENGINEERING QUALITY (P1-P3)

### E-001: Fix TypeScript Errors

| Field | Value |
|-------|-------|
| **Goal** | Reduce TS errors from 1,287 to 0 |
| **Files** | All files |
| **Risk** | High — may require type definition changes across codebase |
| **Depends** | A-005 (dead code removal reduces count) |
| **Acceptance** | `npx tsc --noEmit` returns 0 errors |
| **Test** | 1. Run `npx tsc --noEmit`<br>2. Count errors before = N<br>3. Fix systematically<br>4. Run again → 0 errors |

### E-002: Configure ESLint + Prettier

| Field | Value |
|-------|-------|
| **Goal** | Add consistent code formatting and lint rules |
| **Files** | `.eslintrc.json` (new), `.prettierrc` (new) |
| **Risk** | Low — config files only |
| **Depends** | None |
| **Acceptance** | `npx eslint src/` passes, `npx prettier --check src/` passes |
| **Test** | 1. Run ESLint → 0 errors<br>2. Run Prettier → all files formatted |

### E-003: Add Test Framework

| Field | Value |
|-------|-------|
| **Goal** | Add Jest + tests for pipeline (HonestSignal, OutputParser, ReportBuilder) |
| **Files** | `jest.config.js` (new), `src/pipeline/__tests__/` (new) |
| **Risk** | Low — no production code changes |
| **Depends** | None |
| **Acceptance** | `npx jest` runs with >50% coverage on pipeline module |
| **Test** | 1. Run `npx jest`<br>2. All tests pass<br>3. Coverage report shows >50% |

### E-004: Deduplicate Forge-Stub

| Field | Value |
|-------|-------|
| **Goal** | Create single `forge-stub.ts`, import in both PoCGenerator and PipelineManager |
| **Files** | `src/pipeline/forge-stub.ts` (new), `src/pipeline/PoCGenerator.ts`, `src/pipeline/PipelineManager.ts` |
| **Risk** | Low — mechanical refactor |
| **Depends** | None |
| **Acceptance** | Both files import from single stub. Behavior identical. |
| **Test** | 1. Run pipeline<br>2. Verify PoC generation still works<br>3. Verify forge compilation still works |

### E-005: Input Validation

| Field | Value |
|-------|-------|
| **Goal** | Validate forkUrl, forgePath, dockerImage before shell execution |
| **Files** | `src/pipeline/PipelineManager.ts`, `src/pipeline/ForgeRunner.ts`, `src/pipeline/DockerSandbox.ts` |
| **Risk** | Medium — may break existing configs with invalid values |
| **Depends** | None |
| **Acceptance** | Invalid URLs rejected. Invalid paths rejected. Invalid Docker images rejected. Clear error messages shown. |
| **Test** | 1. Set invalid forkUrl → pipeline shows error<br>2. Set invalid forgePath → pipeline shows error<br>3. Set invalid dockerImage → Docker sandbox shows error |

---

## PHASE F: POLISH (P2)

### F-001: Design Token Compliance

| Field | Value |
|-------|-------|
| **Goal** | Audit all screens for design token usage. Replace hardcoded values with `var(--token)` references. |
| **Files** | All webview screens |
| **Risk** | Low — visual only |
| **Depends** | None |
| **Acceptance** | No hardcoded colors, spacing, or typography values. All use `var(--)` tokens. |
| **Test** | 1. Visual inspection of each screen<br>2. Change theme → all screens update correctly |

### F-002: Skeleton Loading States

| Field | Value |
|-------|-------|
| **Goal** | Add skeleton/placeholder loading states for all panels |
| **Files** | All webview screens |
| **Risk** | Low — visual only |
| **Depends** | Phase A, B |
| **Acceptance** | Every async operation shows skeleton. Skeletons match final layout. |
| **Test** | 1. Trigger async operation<br>2. Verify skeleton appears<br>3. Operation completes → skeleton replaced with content |

### F-003: Smooth Transitions

| Field | Value |
|-------|-------|
| **Goal** | Add CSS transitions for tab switches, panel opens, state changes |
| **Files** | `src/webview/design-system/global.css` |
| **Risk** | Low — CSS only |
| **Depends** | None |
| **Acceptance** | Tab switches animate. Panel appears with fade. State badges transition smoothly. |
| **Test** | 1. Switch tabs → 200ms transition<br>2. Open panel → fade in<br>3. Close panel → fade out |

---

## Task Dependency Graph

```
A-001 (AppStore)
  ├── A-003 (Sidebar handlers)
  ├── A-004 (Panel handlers)
  ├── A-005 (Dead code removal)
  ├── A-006 (Loading states)
  ├── C-001 (War Room)
  └── D-001 (Persistence)
        └── D-002 (Nav sync)

A-002 (MessageBus)
  └── A-003, A-004 (uses for handler patterns)

B-001 (PipelineBridge)
  ├── B-002 (Attack Workspace)
  ├── B-003 (Findings tab)
  ├── B-004 (Threat tab)
  ├── B-005 (Timeline tab)
  ├── B-006 (Evidence tab)
  └── C-002 (Knowledge Graph)
  └── C-003 (Report Viewer)

A-004 (Panel handlers)
  ├── C-001 (War Room)
  ├── C-004 (Settings config)
  └── C-005 (Bounty)

Independent:
  D-003 (Keyboard shortcuts)
  D-004 (Focus management)
  E-001 (TS errors)
  E-002 (ESLint)
  E-003 (Tests)
  E-004 (Forge-stub)
  E-005 (Validation)
  F-001 (Design tokens)
  F-002 (Skeletons)
  F-003 (Transitions)
```

---

## Task Count by Phase

| Phase | Tasks | Est. Effort | Priority |
|-------|-------|-------------|----------|
| A: Foundation | 6 | 12-16h | P0 |
| B: Pipeline Bridge | 6 | 14-18h | P0-P1 |
| C: Remove Samples | 5 | 10-14h | P0-P1 |
| D: Persistence & Nav | 4 | 8-12h | P1-P2 |
| E: Engineering Quality | 5 | 12-16h | P1-P3 |
| F: Polish | 3 | 6-8h | P2 |
| **Total** | **29** | **62-84h** | |

---

## Execution Order

```
Week 1: A-001, A-002, A-003, A-004, A-005, A-006
         (Foundation — makes all messages work)

Week 2: B-001, B-002, B-003, B-004, B-005, B-006
         (Pipeline → UI — makes pipeline visible)

Week 3: C-001, C-002, C-003, C-004, C-005
         (Remove fake data — makes UI real)

Week 4: D-001, D-002, D-003, D-004
         (Persistence + Navigation)

Week 5: E-001 (TS errors), E-002, E-003, E-004, E-005
         (Engineering quality)

Week 6: F-001, F-002, F-003, Testing, Release Gate
         (Polish + release)
```

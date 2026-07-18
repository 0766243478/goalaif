# SIREEN — Broken Connections Analysis (Phase 2)

**Generated:** 2026-07-18  
**Method:** Systematic trace of 10 critical user actions from UI → Message → Backend → Logic → Result → UI

---

## TRACE METHODOLOGY

For each action:
1. **UI Button/Trigger** — Component + handler
2. **Message Sent** — Type + payload
3. **Message Received** — Provider handler
4. **Backend Logic** — Function called
5. **Result Produced** — Return value / side effect
6. **State Update** — Store/variable change
7. **UI Update** — Signal change → re-render

**Status Codes:** ✅ CONNECTED | ⚠️ PARTIAL | ❌ BROKEN | 🟡 SIMULATED

---

## ACTION 1: NEW INVESTIGATION

### UI Trigger
- **Component:** `sidebar.tsx` → `handleNewInvestigation()` (line 182)
- **Button:** "+" icon in header (line 233-240)

### Message Sent
```typescript
postMessage({ type: 'pipeline:start', payload: { input: { type, value, chain }, mode, chain } })
```

### Backend Handler
- **Provider:** `SidebarProvider.ts` → `handleMessage()` 
- **Case:** `'pipeline:start'` (line ~150)
- **Calls:** `this.pipelineManager.start(payload)`

### Pipeline Logic
- **File:** `PipelineManager.ts` → `start(input, mode, chain)`
- **Flow:** Creates investigation → emits `pipeline:status` for each stage
- **Stages:** hypothesis → poc_generation → poc_compilation → forge_execution → output_parsing → verification → report_generation

### Result Messages (to webview)
```
pipeline:status { stage, message, data }
pipeline:complete { report }
pipeline:error { error, stage }
```

### UI State Update
- **Sidebar:** `hasInvestigation = true`, `messages[]` updated via `chat:message`
- **War Room:** Receives `pipeline:status` → updates `currentStage`, `logs[]`, `stageProgress`
- **War Room:** On complete → `report` state set, switches to report view

### Status: ⚠️ PARTIAL
- PipelineManager exists but **AIClient not wired** (needs API key from config)
- **DockerSandbox not tested** (dockerEnabled config default: false)
- **ForgeRunner works** but needs valid forge binary path

---

## ACTION 2: START ANALYSIS (Pipeline)

### UI Trigger
- **Component:** `sidebar.tsx` → `handleSubmitInput()` (line 188)
- **Input:** Contract address or Solidity code + chain + mode

### Message Sent
```typescript
postMessage({ type: 'pipeline:start', payload: { input: { type, value, chain }, mode, chain } })
```

### Backend Handler
- Same as Action 1 — `SidebarProvider` → `pipeline:start` → `PipelineManager.start()`

### Status: ⚠️ PARTIAL
- Same gaps as Action 1
- **Critical:** No input validation on contract address format
- **Critical:** No contract source retrieval (Etherscan API key needed)

---

## ACTION 3: STOP ANALYSIS

### UI Trigger
- **Component:** `sidebar.tsx` — **NO STOP BUTTON EXISTS**
- **War Room:** `war-room.tsx` — **NO STOP BUTTON IN HEADER**

### Message Sent
- **None** — No `pipeline:stop` message type defined

### Backend Handler
- **None** — `PipelineManager` has no `stop()` method

### Status: ❌ BROKEN
- **No way to cancel running pipeline**
- Need: `pipeline:stop` message + `PipelineManager.stop()` + abort controller

---

## ACTION 4: GENERATE PoC

### UI Trigger
- **Component:** `attack-workspace.tsx` → `handleRunVector()` (line 283)
- **Button:** "Run" on each attack vector card (line 438-446)

### Message Sent
```typescript
postMessage({ type: 'attack:run', payload: { vectorId } })
```

### Backend Handler
- **Provider:** `SidebarProvider.ts` — **NO HANDLER for 'attack:run'**
- **PipelineManager:** No `runAttackVector()` method

### Status: ❌ BROKEN
- **Complete disconnect** — UI sends message, backend ignores it
- Attack vectors are **static data** in `attack-workspace.tsx` (lines 33-242)
- No connection to `PoCGenerator` or `PipelineManager`

---

## ACTION 5: RUN PoC (Forge Execution)

### UI Trigger
- **War Room:** Automatic during pipeline stage `forge_execution`

### Backend Flow
```
PipelineManager → ForgeRunner.run(testPath, config)
  → DockerSandbox.run(command) [if dockerEnabled]
  → forge test --json
  → OutputParser.parseForgeOutput(json)
  → HonestSignal.verify(result)
```

### Status: ⚠️ PARTIAL
- `ForgeRunner.ts` exists and compiles
- `OutputParser.ts` exists
- `HonestSignal.ts` exists with **correct logic**
- **BUT:** Never triggered because pipeline doesn't reach this stage (AIClient not wired)
- **DockerSandbox:** Uses `docker run --rm` but no validation of image availability

---

## ACTION 6: CANCEL PoC

### UI Trigger
- **Attack Workspace:** **NO CANCEL BUTTON** on running attack
- **War Room:** **NO CANCEL BUTTON** during forge_execution

### Status: ❌ BROKEN
- No `attack:stop` or `pipeline:stop` handlers
- No abort mechanism in `ForgeRunner` or `DockerSandbox`

---

## ACTION 7: VIEW FINDINGS

### UI Trigger
- **Sidebar:** Tab switch to "Findings" (line 324-367)
- **War Room:** View Report → Findings section

### Current State
- **Sidebar Findings Tab:** EmptyPanel — "No findings" (line 516-522)
- **War Room Report:** Shows findings from `PipelineReport` (lines 672-686)
- **Report Viewer:** Shows `SAMPLE_REPORT` static data (line 53-192)

### Message Flow
- **Pipeline complete** → `pipeline:complete` with `report.findings`
- **War Room** renders findings in report view
- **Sidebar** has **no handler** for `pipeline:complete` to populate findings tab

### Status: ❌ BROKEN (Sidebar) | ✅ CONNECTED (War Room)
- Sidebar findings tab **never populated** — no message handler
- War Room report view works but only after full pipeline

---

## ACTION 8: VIEW EVIDENCE

### UI Trigger
- **Report Viewer:** Click evidence link (line 413-419) → `report:openEvidence`
- **War Room:** Not implemented

### Message Sent
```typescript
postMessage({ type: 'report:openEvidence', payload: { url: ev.url } })
```

### Backend Handler
- **None** — No handler in `SidebarProvider` or `WarRoomProvider`

### Status: ❌ BROKEN
- Evidence links in `SAMPLE_REPORT` are `#` placeholders
- No evidence storage/retrieval system
- No `vscode.env.openExternal` call for external URLs

---

## ACTION 9: VIEW MONEY FLOW

### UI Trigger
- **War Room:** Report view → Money Flow card (line 645-669)
- **Report Viewer:** Not in sample report

### Current State
- **PipelineReport interface** has `moneyFlow` field (line 97)
- **HonestSignal** has `exploitResult.attackerProfit` (line 94-96)
- **ReportBuilder** — **NO money flow calculation implemented**

### Status: 🟡 SIMULATED
- Data structure exists but **always empty**
- No trace parsing for value transfers
- No Sankey/table visualization

---

## ACTION 10: VIEW ATTACK SIMULATION

### UI Trigger
- **Attack Workspace:** Results tab shows `output` from run (lines 500-503)
- **War Room:** Forge output in live logs + report

### Current State
- **Attack Workspace:** Simulated — `result.output` is mock string
- **War Room:** Real forge output would appear in logs during `forge_execution` stage

### Status: 🟡 SIMULATED (Attack Workspace) | ✅ CONNECTED (War Room pipeline)

---

## ACTION 11: VIEW REPORT

### UI Trigger
- **War Room:** Auto-switches to report view on `pipeline:complete`
- **Report Viewer Panel:** Command `sireen.openReportViewer` → `WarRoomProvider` creates panel

### Message Flow
- `pipeline:complete` → `WarRoom` sets `report` state → renders full report
- `open:panel` with `panel: 'report-viewer'` → `SidebarProvider` creates `WarRoomProvider` panel

### Status: ✅ CONNECTED (War Room) | ⚠️ PARTIAL (Report Viewer panel)
- Report Viewer panel shows **static SAMPLE_REPORT** only
- No connection to actual pipeline reports

---

## ACTION 12: EXPORT REPORT

### UI Trigger
- **War Room:** Copy/Export buttons (lines 837-854)
- **Report Viewer:** Export button (line 233-235)

### Messages Sent
```typescript
postMessage({ type: 'report:copy', payload: { format } })
postMessage({ type: 'report:export', payload: { format } })
```

### Backend Handler
- **None** — No handlers for `report:copy` or `report:export`

### Status: ❌ BROKEN
- No clipboard API integration
- No file save dialog (`vscode.window.showSaveDialog`)
- No format conversion (markdown/html/json/pdf/sarif)

---

## ACTION 13: SETTINGS SAVE

### UI Trigger
- **Settings:** Save button (line 300-302) → `handleSave()`

### Message Sent
```typescript
postMessage({ type: 'settings:save', payload: settings })
```

### Backend Handler
- **None** — No handler in `SidebarProvider`

### Status: ❌ BROKEN
- Settings only exist in webview local state
- No `vscode.workspace.getConfiguration().update()` calls
- No persistence across reloads

---

## ACTION 14: SETTINGS CLEAR/RESET

### UI Trigger
- **Settings:** Reset button (line 299) → `handleReset()`

### Current State
- Resets local `settings` signal to `DEFAULTS`
- **No message sent to backend**

### Status: 🟡 SIMULATED (local only)

---

## ACTION 15: WAR ROOM

### UI Trigger
- **Sidebar:** History button (line 245-248) → `open:panel` with `panel: 'war-room'`
- **Command:** `sireen.openWarRoom`

### Backend
- `SidebarProvider` → `createWarRoomPanel()` → `WarRoomProvider` instance
- `WarRoomProvider` listens for `pipeline:status`, `pipeline:complete`, `pipeline:error`

### Status: ✅ CONNECTED (Panel creation) | ⚠️ PARTIAL (Session management)
- Panel creates correctly
- **No session persistence** — `sessions` array in provider but never saved/loaded
- **No pin/unpin** — `war-room:toggle-pin` message not handled

---

## ACTION 16: KNOWLEDGE GRAPH

### UI Trigger
- **Command:** Not exposed in package.json commands
- **Panel:** Not created by any provider

### Current State
- **Static sample graph** in `knowledge-graph.tsx` (lines 31-72)
- **No backend connection** — `graph:analyze`, `graph:export` messages not handled
- **No real contract analysis** → graph generation

### Status: 🟡 SIMULATED (Static only)

---

## ACTION 17: BOUNTY DASHBOARD

### UI Trigger
- **Command:** Not in package.json
- **Panel:** Not created by any provider

### Current State
- **Static mock data** in `bounty-dashboard.tsx` (lines 46-138)
- **No API integration** — `bounty:refresh`, `bounty:open`, `bounty:viewSubmission` not handled
- **No authentication** for platforms (Immunefi, Code4rena, etc.)

### Status: 🟡 SIMULATED (Static only)

---

## ACTION 18: OPEN EXTERNAL LINK (Bounty/Report)

### UI Trigger
- **Bounty Dashboard:** View button (line 360-362) → `bounty:open` with URL
- **Report Viewer:** Evidence links (line 413-419) → `report:openEvidence`

### Backend Handler
- **None** for either message type

### Status: ❌ BROKEN
- Need: `vscode.env.openExternal(vscode.Uri.parse(url))`

---

## SUMMARY MATRIX

| Action | UI → Msg | Msg → Backend | Backend Logic | Backend → UI | UI Update | Overall |
|--------|----------|---------------|---------------|--------------|-----------|---------|
| New Investigation | ✅ | ✅ | ⚠️ | ✅ | ✅ | ⚠️ PARTIAL |
| Start Analysis | ✅ | ✅ | ⚠️ | ✅ | ✅ | ⚠️ PARTIAL |
| **Stop Analysis** | ❌ | ❌ | ❌ | ❌ | ❌ | **BROKEN** |
| Generate PoC | ✅ | ❌ | ❌ | ❌ | ❌ | **BROKEN** |
| Run PoC (Forge) | N/A | ✅ | ✅ | ✅ | ✅ | ⚠️ PARTIAL* |
| Cancel PoC | ❌ | ❌ | ❌ | ❌ | ❌ | **BROKEN** |
| View Findings | ✅ | ❌ | ⚠️ | ✅ | ❌ | **BROKEN** (Sidebar) |
| View Evidence | ✅ | ❌ | ❌ | ❌ | ❌ | **BROKEN** |
| View Money Flow | ✅ | ⚠️ | ❌ | ⚠️ | ⚠️ | **SIMULATED** |
| View Attack Sim | ✅ | 🟡 | 🟡 | 🟡 | 🟡 | **SIMULATED** |
| View Report | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ CONNECTED |
| Export Report | ✅ | ❌ | ❌ | ❌ | ❌ | **BROKEN** |
| Settings Save | ✅ | ❌ | ❌ | ❌ | ❌ | **BROKEN** |
| Settings Reset | 🟡 | ❌ | 🟡 | 🟡 | 🟡 | **SIMULATED** |
| War Room | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ PARTIAL |
| Knowledge Graph | ❌ | ❌ | ❌ | ❌ | ❌ | **SIMULATED** |
| Bounty Dashboard | ❌ | ❌ | ❌ | ❌ | ❌ | **SIMULATED** |
| Open External | ✅ | ❌ | ❌ | ❌ | ❌ | **BROKEN** |

---

## CRITICAL MISSING MESSAGE HANDLERS (Backend)

### In `SidebarProvider.ts` — Add handlers for:
```typescript
// Attack Workspace
case 'attack:run': return this.handleAttackRun(payload);
case 'attack:stop': return this.handleAttackStop(payload);
case 'attack:refresh': return this.handleAttackRefresh();
case 'attack:copyResult': return this.handleAttackCopyResult(payload);
case 'attack:saveCustom': return this.handleAttackSaveCustom(payload);

// Bounty
case 'bounty:refresh': return this.handleBountyRefresh();
case 'bounty:open': return this.handleBountyOpen(payload);
case 'bounty:viewSubmission': return this.handleBountyViewSubmission(payload);

// Graph
case 'graph:analyze': return this.handleGraphAnalyze(payload);
case 'graph:export': return this.handleGraphExport(payload);
case 'graph:focusNode': return this.handleGraphFocusNode(payload);
case 'graph:openNode': return this.handleGraphOpenNode(payload);

// Report
case 'report:copy': return this.handleReportCopy(payload);
case 'report:export': return this.handleReportExport(payload);
case 'report:openEvidence': return this.handleReportOpenEvidence(payload);

// Settings
case 'settings:save': return this.handleSettingsSave(payload);
case 'settings:load': return this.handleSettingsLoad();  // Already partially works
case 'settings:export': return this.handleSettingsExport();
case 'settings:import': return this.handleSettingsImport();

// Pipeline control
case 'pipeline:stop': return this.handlePipelineStop();

// External
case 'open:external': return this.handleOpenExternal(payload);
```

### In `WarRoomProvider.ts` — Add handlers for:
```typescript
case 'war-room:toggle-pin': return this.handleTogglePin(payload);
case 'war-room:new-session': return this.handleNewSession();
case 'war-room:select-session': return this.handleSelectSession(payload);
case 'war-room:settings': return this.handleOpenSettings();
```

---

## PRIORITY FIX ORDER

1. **Pipeline Stop/Cancel** — Safety critical (runaway processes)
2. **Attack Workspace → Backend** — Core feature disconnect
3. **Settings Persistence** — User configuration loss
4. **Report Export/Copy** — Deliverable generation
5. **Evidence/External Links** — Usability
6. **Sidebar Findings Population** — Data visibility
7. **Knowledge Graph Backend** — Analysis feature
8. **Bounty Dashboard API** — External integration
9. **Money Flow Calculation** — Honest Signal requirement
10. **Session Persistence** — War Room UX

---

## SIMULATED vs REAL — HONEST ASSESSMENT

| Feature | Real Backend | Simulated Frontend | Notes |
|---------|--------------|-------------------|-------|
| Pipeline Execution | ✅ PipelineManager | ✅ War Room | AIClient not wired |
| PoC Generation | ✅ PoCGenerator | ❌ Attack Workspace | Disconnected |
| Forge Execution | ✅ ForgeRunner | ✅ War Room logs | Docker untested |
| Output Parsing | ✅ OutputParser | ✅ War Room | Works if forge runs |
| Honest Signal | ✅ Logic complete | ✅ War Room report | Needs real data |
| Report Building | ✅ ReportBuilder | ✅ War Room | Template partial |
| Attack Vectors | ❌ | ✅ Static data | 7 vectors hardcoded |
| Bounty Programs | ❌ | ✅ Static data | 6 programs hardcoded |
| Knowledge Graph | ❌ | ✅ Static data | 15 nodes hardcoded |
| Settings | ❌ | ✅ Local state | No persistence |
| Money Flow | ❌ | ✅ UI exists | No calculation |

---

## NEXT PHASE ACTION ITEMS

### Phase 3: `_run_poc` Bulletproof
- [ ] Add `PipelineManager.stop()` with AbortController
- [ ] Add `pipeline:stop` message handler
- [ ] Implement compilation retry with auto-fix (max 3 attempts)
- [ ] Distinct states: GENERATED → COMPILE_FAILED → COMPILED → EXECUTION_FAILED → EXECUTED → REPRODUCED/NOT_REPRODUCED

### Phase 4: Honest Signal
- [ ] Enforce all 6 conditions for `confirmed = true`
- [ ] Report states: Hypothesis → Suspected → PoC Generated → PoC Compiled → PoC Executed → Exploit Reproduced → Confirmed
- [ ] Never mark confirmed without forge trace verification

### Phase 7: State Machine
- [ ] Investigation states: IDLE → ANALYZING → HYPOTHESIS_FOUND → GENERATING_POC → COMPILING → AUTO_FIXING → RUNNING_FORGE → VERIFYING → CONFIRMED/NOT_CONFIRMED → MONEY_FLOW → REPORT_READY
- [ ] UI reflects actual backend state (no fake progress)

---

*End of Phase 2 Analysis*
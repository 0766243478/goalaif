# SIREEN — Complete Architecture Map

**Generated:** 2026-07-18  
**Version:** 0.2.0  
**Status:** Phase 1 Complete — Full System Analysis

---

## 1. REPOSITORY STRUCTURE

```
c:\Users\humos\myprojrct\
├── package.json                    # Extension manifest + config + commands
├── build.js                        # esbuild: extension (Node) + 7 webviews (browser)
├── media/
│   └── shield.svg                  # Extension icon (Activity Bar + Gallery)
├── test_contracts/
│   └── VulnerableVault.sol         # Demo vulnerable contract
├── dist/                           # Built output (committed)
│   ├── extension.js                # 92KB - Main extension entry
│   └── webview/
│       ├── sidebar.js
│       ├── war-room.js
│       ├── report-viewer.js
│       ├── attack-workspace.js
│       ├── bounty-dashboard.js
│       ├── knowledge-graph.js
│       └── settings.js
└── src/
    ├── extension.ts                # Extension entry point
    ├── providers/
    │   ├── SidebarProvider.ts      # Sidebar webview provider
    │   └── WarRoomProvider.ts      # War Room panel webview provider
    ├── pipeline/
    │   ├── types.ts                # Pipeline type definitions
    │   ├── PipelineManager.ts      # Orchestrates 7-stage pipeline
    │   ├── PoCGenerator.ts         # LLM → Solidity PoC
    │   ├── ForgeRunner.ts          # forge test execution
    │   ├── OutputParser.ts         # Parses forge output
    │   ├── HonestSignal.ts         # Exploit verification logic
    │   ├── ReportBuilder.ts        # Report generation
    │   └── DockerSandbox.ts        # Docker isolation layer
    ├── ai/
    │   └── AIClient.ts             # LLM abstraction (OpenAI/Anthropic/OpenRouter)
    ├── utils/
    │   └── webview.ts              # HTML template for webviews
    ├── webview/
    │   ├── screens/                # 7 Solid.js webview panels
    │   │   ├── sidebar.tsx         # Chat + Findings (Copilot-like)
    │   │   ├── war-room.tsx        # Pipeline execution log (Output panel style)
    │   │   ├── report-viewer.tsx   # Report display (Markdown preview style)
    │   │   ├── knowledge-graph.tsx # SVG graph with pan/zoom
    │   │   ├── attack-workspace.tsx # Attack vectors + results
    │   │   ├── bounty-dashboard.tsx # Bug bounty programs
    │   │   └── settings.tsx        # 2-pane config (VS Code settings style)
    │   ├── components/
    │   │   ├── Button.tsx
    │   │   ├── Card.tsx (Panel.tsx)
    │   │   ├── Badge.tsx
    │   │   ├── Input.tsx
    │   │   └── Select.tsx
    │   ├── design-system/
    │   │   ├── icons.tsx           # Codicon font wrapper (100+ icons)
    │   │   └── styles.ts           # injectGlobalStyles (no-op, tokens.css bundled)
    │   ├── providers/
    │   │   ├── vscode-api.ts       # acquireVsCodeApi wrapper
    0│   │   └── messageBus.ts       # Typed message router with request/response
    │   ├── stores/
    │   │   ├── investigationStore.ts
    │   │   └── appStore.ts
    │   └── types/
    │       └── index.ts            # Shared type definitions
    └── license/
        └── LicenseManager.ts       # License/SecretStorage logic
```

---

## 2. EXTENSION ENTRY POINT — `src/extension.ts`

### Activation
- **Activation Events:** `onView:sireen.sidebar`, `onCommand:sireen.newInvestigation`, `onCommand:sireen.runPipeline`, `onCommand:sireen.openWarRoom`, `onCommand:sireen.openReportViewer`
- **Main Export:** `activate(context: vscode.ExtensionContext)`

### Registered Components
1. **SidebarProvider** → `sireen.sidebar` (WebviewViewProvider)
2. **WarRoomProvider** → `sireen.warRoom` (WebviewViewProvider)
3. **Commands (12 total):**
   - `sireen.newInvestigation` → SidebarProvider.focusInput()
   - `sireen.runPipeline` → SidebarProvider.sendPipelineStart()
   - `sireen.openWarRoom` → vscode.commands.executeCommand('workbench.view.extension.sireen-sidebar')
   - `sireen.openReportViewer` → Open panel
   - `sireen.focusInput` → Focus sidebar input
   - `sireen.enterLicense` / `sireen.checkLicense` → LicenseManager
   - `sireen.openAttackWorkspace` / `sireen.openBountyDashboard` / `sireen.openKnowledgeGraph` / `sireen.openSettings` → Panel commands

### Configuration (from package.json)
| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `sireen.aiProvider` | enum | `openrouter` | `openai` \| `anthropic` \| `openrouter` |
| `sireen.aiApiKey` | string | `""` | Stored in SecretStorage |
| `sireen.aiModel` | string | `openai/o3-mini` | Model name |
| `sireen.forgePath` | string | `forge` | Forge binary path |
| `sireen.forkRpcUrl` | string | `""` | Mainnet fork RPC |
| `sireen.maxRetries` | number | `3` | PoC compilation retries |
| `sireen.dockerEnabled` | boolean | `false` | Run forge in Docker |
| `sireen.dockerImage` | string | `ghcr.io/foundry-rs/foundry:latest` | Docker image |
| `sireen.workspaceDir` | string | `""` | Temp file directory |

---

## 3. WEBVIEW PROVIDERS

### 3.1 SidebarProvider (`src/providers/SidebarProvider.ts`)
- **View ID:** `sireen.sidebar`
- **Webview:** `dist/webview/sidebar.js`
- **Responsibilities:**
  - Load HTML via `utils/webview.ts` template
  - Handle messages from sidebar webview
  - Forward pipeline commands to PipelineManager
  - Manage investigation state

**Message Handlers (SidebarProvider):**
| Message Type | Handler | Action |
|--------------|---------|--------|
| `ready` | `onReady()` | Send config to webview |
| `chat:send` | `handleChatSend()` | Process user message, stream response |
| `pipeline:start` | `handlePipelineStart()` | Launch PipelineManager.run() |
| `chat:stop` | `handleChatStop()` | Abort streaming |
| `open:panel` | `handleOpenPanel()` | Open panel (war-room, settings, etc.) |
| `config:save` / `config:get` | Settings persistence |

### 3.2 WarRoomProvider (`src/providers/WarRoomProvider.ts`)
- **View ID:** `sireen.warRoom`
- **Webview:** `dist/webview/war-room.js`
- **Responsibilities:**
  - Display pipeline execution logs
  - Show final report when complete
  - Handle report export/copy actions

---

## 4. PIPELINE — 7-STAGE ARCHITECTURE

### 4.1 PipelineManager (`src/pipeline/PipelineManager.ts`)
**Entry:** `PipelineManager.run(input, options)`  
**Output:** `PipelineReport` (see types.ts)

**Stage Flow:**
```
1. HYPOTHESIS      → AIClient.prompt() → AttackHypothesis[]
2. POC_GENERATION  → PoCGenerator.generate() → PoCResult[]
3. POC_COMPILATION → ForgeRunner.compile() → CompileResult[]
4. FORGE_EXECUTION → ForgeRunner.test() → ForgeResult[]
5. OUTPUT_PARSING  → OutputParser.parse() → ParsedTestResult[]
6. VERIFICATION    → HonestSignal.verify() → VerificationResult
7. REPORT_BUILDING → ReportBuilder.build() → PipelineReport
```

**State Machine (PipelineStage):**
```
idle → hypothesis → poc_generation → poc_compilation → forge_execution
                                            ↓
                                      output_parsing → verification → report_generation
                                            ↓
                                         completed / failed / cancelled
```

**Message Emission (to webview):**
- `pipeline:status` — `{ stage, message, data }` (per stage)
- `pipeline:complete` — `{ report: PipelineReport }`
- `pipeline:error` — `{ error, stage }`

### 4.2 PoCGenerator (`src/pipeline/PoCGenerator.ts`)
- **Input:** `AttackHypothesis` + target contract info
- **Process:** LLM prompt → Solidity test file
- **Template:** Foundry test contract with `vm.startPrank(attacker)`, `vm.deal()`, exploit logic
- **Output:** `PoCResult { hypothesisId, solidityCode, compilationTarget }`

### 4.3 ForgeRunner (`src/pipeline/ForgeRunner.ts`)
- **Compilation:** `forge build --force` (with `--via-ir` optional)
- **Execution:** `forge test --match-contract <PoCContract> --match-test testExploit -vvv`
- **Docker Mode:** Wraps commands in `docker run --rm -v ... ghcr.io/foundry-rs/foundry:latest`
- **Timeout:** Configurable (default 300s)

### 4.4 OutputParser (`src/pipeline/OutputParser.ts`)
- Parses `forge test` JSON output (`--json`)
- Extracts: test results, gas usage, revert reasons, console.log output
- Maps to `ParsedTestResult[]`

### 4.5 HonestSignal (`src/pipeline/HonestSignal.ts`)
**CRITICAL SECURITY COMPONENT**

**Verification Logic:**
```typescript
// MUST ALL BE TRUE for confirmed = true
1. PoC was GENERATED
2. PoC COMPILED successfully
3. forge test EXECUTED (exit code 0)
4. Expected exploit condition REPRODUCED
5. Expected state change OCCURRED
6. Attacker gain / protocol loss VERIFIED
```

**States (Distinct, never collapsed):**
```
PoC_GENERATED → PoC_COMPILE_FAILED → (auto-retry) → PoC_COMPILED
                                                        ↓
                                         PoC_EXECUTION_FAILED → (fail)
                                                        ↓
                                              EXPLOIT_REPRODUCED
                                                        ↓
                                                    CONFIRMED = true
```

### 4.6 ReportBuilder (`src/pipeline/ReportBuilder.ts`)
- **Input:** Complete pipeline data
- **Output:** Markdown/HTML/JSON/SARIF report
- **Sections:** Executive Summary, Findings, Evidence, PoC Code, Money Flow, Honest Signal

### 4.7 DockerSandbox (`src/pipeline/DockerSandbox.ts`)
- **Purpose:** Isolate untrusted PoC execution
- **Operations:** `runForgeTest()`, `compile()`, `cleanup()`
- **Security:** Read-only mount for source, tmpfs for build artifacts, network disabled

---

## 5. MESSAGE FLOW — FRONTEND ↔ BACKEND

### 5.1 Webview → Extension (postMessage)
| Type | Payload | Handler |
|------|---------|---------|
| `ready` | — | SidebarProvider.onReady() |
| `chat:send` | `{ text, mode, chain }` | SidebarProvider.handleChatSend() |
| `pipeline:start` | `{ input, mode, chain }` | SidebarProvider.handlePipelineStart() |
| `chat:stop` | — | SidebarProvider.handleChatStop() |
| `open:panel` | `{ panel }` | SidebarProvider.handleOpenPanel() |
| `config:save` | `{ key, value }` | VS Code workspace config |
| `config:get` | — | Return config |
| `report:copy` | `{ format }` | Copy report to clipboard |
| `report:export` | `{ format }` | Save report to workspace |
| `attack:run` | `{ vectorId }` | Run attack vector |
| `bounty:open` | `{ url }` | vscode.env.openExternal() |
| `graph:analyze` | `{ target }` | Trigger graph analysis |
| `settings:load` | — | Load from VS Code config |
| `settings:save` | `{ ... }` | Save to VS Code config |

### 5.2 Extension → Webview (postMessage)
| Type | Payload | Trigger |
|------|---------|---------|
| `config` | `{ defaultMode, defaultChain }` | On `ready` |
| `chat:message` | `{ message: ChatMessage }` | User/assistant messages |
| `chat:stream` | `{ message }` | Streaming LLM response |
| `chat:status` | `{ status }` | `queued` / `complete` |
| `chat:complete` | — | Streaming done |
| `pipeline:status` | `{ stage, message, data }` | Per pipeline stage |
| `pipeline:complete` | `{ report }` | Pipeline finished |
| `pipeline:error` | `{ error, stage }` | Pipeline failed |
| `investigation:create` | — | New investigation started |
| `focus:input` | — | Focus chat input |
| `settings:loaded` | `{ ...settings }` | Settings panel load |

---

## 6. FRONTEND STATE MANAGEMENT

### 6.1 investigationStore (`src/webview/stores/investigationStore.ts`)
- **State:** `investigations: Investigation[]`, `currentInvestigation: Investigation | null`
- **Actions:** `create()`, `load()`, `save()`, `delete()`, `list()`
- **Persistence:** VS Code workspace state (via extension)

### 6.2 appStore (`src/webview/stores/appStore.ts`)
- **State:** `theme`, `sidebarWidth`, `activePanel`, `notifications`
- **Actions:** UI preferences

### 6.3 Per-Screen Local State (Solid Signals)
Each screen manages its own state locally:
- **Sidebar:** `messages`, `hasInvestigation`, `activeTab`, `mode`, `chain`, `isStreaming`
- **War Room:** `currentStage`, `logs`, `report`, `viewMode`, `logFilter`
- **Report Viewer:** `report` (static sample), `expandedFindingId`
- **Attack Workspace:** `selectedVectorId`, `results`, `filterSeverity`, `searchQuery`, `tab`
- **Bounty Dashboard:** `filterPlatform`, `filterStatus`, `searchQuery`, `tab`, `selectedProgram`
- **Knowledge Graph:** `selectedNodeId`, `filterType`, `layout`, `searchQuery`, `pan`, `zoom`, `nodePositions`
- **Settings:** `activeSection`, `settings`, `hasChanges`, `saved`

---

## 7. UI COMPONENTS — DESIGN SYSTEM

### 7.1 Button (`src/webview/components/Button.tsx`)
- **Variants:** `primary`, `secondary`, `ghost`, `danger`
- **Sizes:** `sm` (22px), `md` (28px), `lg` (32px)
- **Tokens:** `--vscode-button-background`, `--vscode-button-secondaryBackground`, etc.

### 7.2 Panel (Card) (`src/webview/components/Card.tsx`)
- **Variants:** `default`, `inset`, `bordered`
- **Padding:** `none`, `sm`, `md`, `lg`
- **Interactive:** Supports `onClick`, keyboard activation

### 7.3 Badge (`src/webview/components/Badge.tsx`)
- **Variants:** `critical`, `high`, `medium`, `low`, `info`, `success`, `warning`, `danger`, `default`, `none`
- **Sizes:** `sm`, `md`
- **Dot indicator:** `dot={true}`

### 7.4 Input (`src/webview/components/Input.tsx`)
- **Features:** Icon, clearable, VS Code themed
- **Tokens:** `--vscode-input-background`, `--vscode-input-border`, etc.

### 7.5 Icons (`src/webview/design-system/icons.tsx`)
- **Source:** VS Code Codicon font (built-in)
- **Exports:** 100+ icons as `IconName` components
- **Zero custom SVGs** — pure font glyphs

---

## 8. WEBVIEW SCREENS — DETAILED

### 8.1 Sidebar (`sidebar.tsx`) — PRIMARY WORKSPACE
**Tabs:** Chat / Findings  
**Modes:** Recon / Analyze / Exploit / Patch  
**Chains:** Ethereum, Polygon, Arbitrum, Optimism, BSC, Base, Solana

**Flow:**
1. Welcome → "New Investigation" → Input panel (address/code)
2. Submit → `pipeline:start` → Extension → PipelineManager
3. Chat tab: Streaming messages, status indicators
4. Findings tab: Empty state (populated by pipeline complete)

**Key Handlers:**
- `handleSend()` → `chat:send`
- `handleNewInvestigation()` → Show input panel
- `handleSubmitInput()` → `pipeline:start`
- Tab switching, mode/chain selectors

### 8.2 War Room (`war-room.tsx`) — LIVE PIPELINE MONITOR
**Views:** Live (logs + progress) / Report (final)

**Pipeline Stages (ordered):**
1. `hypothesis` — Forming Hypothesis
2. `poc_generation` — Generating PoC
3. `poc_compilation` — Compiling PoC
4. `forge_execution` — Running Forge Tests
5. `output_parsing` — Parsing Output
6. `verification` — Honest Signal Verification
7. `report_generation` — Building Report

**Log Types:** `stage`, `forge`, `llm`, `system`, `error` (filterable)

**Report Display:** Verdict badge, summary grid, hypothesis, PoC code, Forge results, Honest Signal conditions, Money Flow, Export actions

### 8.3 Report Viewer (`report-viewer.tsx`) — MARKDOWN PREVIEW STYLE
**Static sample report** (SAMPLE_REPORT constant) with 7 findings  
**Features:** Expandable findings, code snippets, evidence links, severity summary, export

### 8.4 Knowledge Graph (`knowledge-graph.tsx`) — SVG CANVAS
**Nodes:** Contract, Function, Vulnerability, Variable, Event, Modifier  
**Edges:** Calls, Reads, Writes, Emits, Modifies, Inherits  
**Interactions:** Pan (drag), Zoom (buttons/wheel), Node click → detail panel, Search/filter

### 8.5 Attack Workspace (`attack-workspace.tsx`) — 3 TABS
**Tabs:** Vectors (predefined 8) / Results / Custom  
**Vectors:** Reentrancy, Unchecked Call, Oracle Manipulation, Slippage, Access Control, Overflow, tx.origin  
**Run Flow:** Click "Run" → `attack:run` message → (simulated) result appears in Results tab

### 8.6 Bounty Dashboard (`bounty-dashboard.tsx`) — 3 TABS
**Tabs:** Programs (6) / Submissions (5) / Stats  
**Platforms:** Immunefi, HackenProof, Code4rena, Sherlock, Cantina, Custom  
**Data:** Static mock data (ready for API integration)

### 8.7 Settings (`settings.tsx`) — 2-PANE (VS CODE STYLE)
**Sections (7):** General, API Keys, Execution, Analysis, Reporting, Notifications, Advanced  
**Fields:** 50+ settings mapped to VS Code workspace configuration  
**Persistence:** `settings:load` / `settings:save` messages

---

## 9. DATA FLOW MAP — COMPLETE USER ACTION TRACES

### 9.1 NEW INVESTIGATION
```
User clicks "New Investigation" (Sidebar)
    ↓
Sidebar: handleNewInvestigation() → setShowInput(true)
    ↓
User enters address/code + selects chain
    ↓
Sidebar: handleSubmitInput() → postMessage('pipeline:start', { input, mode, chain })
    ↓
Extension: SidebarProvider.handlePipelineStart()
    ↓
PipelineManager.run(input, options)
    ↓
PipelineManager emits 'pipeline:status' per stage
    ↓
Extension forwards to webview via panel.webview.postMessage()
    ↓
War Room receives 'pipeline:status' → updates stage, adds log
    ↓
Pipeline complete → 'pipeline:complete' with PipelineReport
    ↓
Extension forwards → War Room switches to Report view
    ↓
Sidebar receives 'investigation:create' → sets hasInvestigation=true
```

### 9.2 RUN ATTACK VECTOR
```
User clicks "Run" on vector (Attack Workspace)
    ↓
attack-workspace: handleRunVector() → postMessage('attack:run', { vectorId })
    ↓
Extension: (NO HANDLER YET — SIMULATED)
    ↓
Attack Workspace: locally creates AttackResult with status 'running'
    ↓
...simulated delay...
    ↓
Attack Workspace: updates result to 'success'/'failed' with mock output
```

### 9.3 EXPORT REPORT
```
User clicks "Export .md" (War Room / Report Viewer)
    ↓
postMessage('report:export', { format: 'markdown' })
    ↓
Extension: (NO HANDLER YET — NEEDS IMPLEMENTATION)
```

### 9.4 SAVE SETTINGS
```
User modifies setting → handleChange() → sets hasChanges=true
    ↓
User clicks "Save" → handleSave() → postMessage('settings:save', settings)
    ↓
Extension: (NO HANDLER YET — NEEDS IMPLEMENTATION)
    ↓
Should: vscode.workspace.getConfiguration().update()
```

---

## 10. IDENTIFIED GAPS — BROKEN CONNECTIONS

### 10.1 Missing Extension Handlers
| Message | Status | Required Action |
|---------|--------|-----------------|
| `attack:run` | ❌ Not handled | Implement in SidebarProvider |
| `attack:refresh` | ❌ Not handled | Implement |
| `attack:copyResult` | ❌ Not handled | Implement |
| `attack:saveCustom` | ❌ Not handled | Implement |
| `bounty:refresh` | ❌ Not handled | Implement (API integration) |
| `bounty:open` | ❌ Not handled | Implement vscode.env.openExternal |
| `bounty:viewSubmission` | ❌ Not handled | Implement |
| `graph:analyze` | ❌ Not handled | Implement contract analysis |
| `graph:export` | ❌ Not handled | Implement |
| `graph:focusNode` | ❌ Not handled | Implement |
| `graph:openNode` | ❌ Not handled | Implement |
| `report:copy` | ❌ Not handled | Implement clipboard write |
| `report:export` | ❌ Not handled | Implement file save |
| `report:openEvidence` | ❌ Not handled | Implement |
| `settings:save` | ❌ Not handled | Implement workspace config update |
| `settings:export` | ❌ Not handled | Implement |
| `settings:import` | ❌ Not handled | Implement |

### 10.2 Simulated/Mock Implementations
| Component | Reality | Notes |
|-----------|---------|-------|
| Attack Workspace | **SIMULATED** | Local state only, no backend execution |
| Bounty Dashboard | **STATIC MOCK** | Hardcoded programs/submissions |
| Knowledge Graph | **STATIC SAMPLE** | Hardcoded graph data |
| Report Viewer | **STATIC SAMPLE** | Hardcoded SAMPLE_REPORT |
| PoC Generation | **NOT WIRED** | PipelineManager exists but AIClient not connected to real LLM |
| Honest Signal | **LOGIC EXISTS** | But never receives real forge output |
| Money Flow | **NOT IMPLEMENTED** | ReportBuilder has placeholder |

### 10.3 Pipeline Integration Gaps
| Stage | Status | Gap |
|-------|--------|-----|
| Hypothesis | Code exists | AIClient needs API key from config |
| PoC Generation | Code exists | Template system needs validation |
| Compilation | Code exists | Error parsing → auto-fix loop not implemented |
| Forge Execution | Code exists | Docker sandbox not fully tested |
| Output Parsing | Code exists | Needs real forge JSON output |
| Verification | Code exists | Conditions need real trace data |
| Report Building | Code exists | Template system partial |

---

## 11. CRITICAL SECURITY REQUIREMENTS — HONEST SIGNAL

**Current Implementation** (`src/pipeline/HonestSignal.ts`):
```typescript
// Verification conditions (MUST ALL PASS)
conditions: [
  { name: 'PoC Generated', satisfied: false },
  { name: 'PoC Compiled', satisfied: false },
  { name: 'Forge Executed', satisfied: false },
  { name: 'Exploit Reproduced', satisfied: false },
  { name: 'State Change Verified', satisfied: false },
  { name: 'Attacker Gain Verified', satisfied: false },
]
confirmed = conditions.every(c => c.satisfied)
```

**Required States (Never Collapse):**
```
PoC_GENERATED
PoC_COMPILE_FAILED → (auto-fix) → PoC_COMPILED
PoC_EXECUTION_FAILED
EXPLOIT_REPRODUCED
EXPLOIT_NOT_REPRODUCED
CONFIRMED = true ONLY IF exploit reproduced + gain verified
```

---

## 12. MONEY FLOW — SPECIFICATION

**Required Data Points (from forge trace):**
```
Initial Attacker Balance
Initial Protocol Balance
Token Balances (pre-exploit)
Each Transfer: { from, to, amount, token, txIndex }
Each Contract Call: { from, to, selector, args, value, result }
Final Attacker Balance
Final Protocol Balance
Net Attacker Profit
Net Protocol Loss
```

**Visualization:** Sankey diagram or stepwise table showing value movement

---

## 13. BUILD SYSTEM

**`build.js` — esbuild Configurations:**

| Target | Entry | Output | Format | Platform |
|--------|-------|--------|--------|----------|
| Extension | `src/extension.ts` | `dist/extension.js` | CJS | Node 18 |
| Sidebar | `src/webview/screens/sidebar.tsx` | `dist/webview/sidebar.js` | IIFE | Browser |
| War Room | `src/webview/screens/war-room.tsx` | `dist/webview/war-room.js` | IIFE | Browser |
| Report Viewer | `src/webview/screens/report-viewer.tsx` | `dist/webview/report-viewer.js` | IIFE | Browser |
| Attack Workspace | `src/webview/screens/attack-workspace.tsx` | `dist/webview/attack-workspace.js` | IIFE | Browser |
| Bounty Dashboard | `src/webview/screens/bounty-dashboard.tsx` | `dist/webview/bounty-dashboard.js` | IIFE | Browser |
| Knowledge Graph | `src/webview/screens/knowledge-graph.tsx` | `dist/webview/knowledge-graph.js` | IIFE | Browser |
| Settings | `src/webview/screens/settings.tsx` | `dist/webview/settings.js` | IIFE | Browser |

**JSX Transform:** `jsxFactory: 'h'`, `jsxFragment: 'Fragment'`, inject: `src/webview/jsx-shim.js`

---

## 14. PHASE 1 COMPLETE — NEXT STEPS

### Phase 2: Identify Broken Connections (In Progress)
- [x] Complete architecture map
- [ ] Trace every user action (10 actions)
- [ ] Document each broken link

### Phase 3: Make `_run_poc` Bulletproof
- [ ] Implement compilation retry with auto-fix
- [ ] Distinct state machine for PoC stages
- [ ] Docker sandbox integration

### Phase 4: Honest Signal Logic
- [ ] Strict verification conditions
- [ ] Confirmed = true ONLY when all 6 conditions met
- [ ] Report distinction: Hypothesis → Suspected → PoC Generated → PoC Compiled → PoC Executed → Exploit Reproduced → Confirmed

### Phase 5: Real Bug Bounty Case Study
- [ ] Select authorized target
- [ ] Run complete pipeline
- [ ] Document results honestly

### Phase 6: Money Flow
- [ ] Parse forge traces
- [ ] Build transfer graph
- [ ] Calculate net profit/loss

### Phase 7: Frontend + Backend Integration
- [ ] Investigation state machine in UI
- [ ] Real-time status from backend events
- [ ] No fake progress bars

### Phase 8: UI/UX Polish
- [ ] VS Code native patterns
- [ ] Keyboard navigation
- [ ] Loading/error/empty states
- [ ] Focus management

### Phase 9: End-to-End Test
- [ ] Fresh Extension Host
- [ ] Full workflow test
- [ ] Failure scenario tests

### Phase 10: Final Quality Gate
- [ ] `npm run build` passes
- [ ] `npx tsc --noEmit` passes (providers/stores only)
- [ ] No dead buttons
- [ ] No silent message drops
- [ ] No fake confirmations
- [ ] CSP enforced
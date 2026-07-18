# SIREEN — Complete UI/UX Design Specification (Part 2)

## 16. TRANSFORM INTO SIREEN

### 16.1 Overview

This section transforms Kilo Code's UX into **Sireen** — an Interactive Security Copilot for Web3 Researchers.

**The core shift:** Kilo Code is about *building*. Sireen is about *understanding and securing*.

| Kilo Code | Sireen |
|-----------|--------|
| Code generation | Vulnerability discovery |
| File editing | Protocol analysis |
| Terminal commands | Exploit simulation |
| Task automation | Threat modeling |
| Mode: Architect/Code/Debug | Mode: Recon/Analyze/Exploit/Patch |
| Sessions are coding tasks | Sessions are security investigations |
| Output: working code | Output: findings, proofs, patches |
| AI is a coding coworker | AI is an elite security researcher |

### 16.2 Sireen Design Philosophy

**"Working beside an elite security engineer" means:**

1. **The AI thinks like an attacker.** It doesn't just explain vulnerabilities — it demonstrates them with proof-of-concept exploits. It shows the attack path, not just the bug.

2. **Evidence is first-class.** Every finding is backed by evidence: transaction traces, code paths, execution flows. The interface makes evidence visible and explorable.

3. **The workspace is an investigation desk.** Not a chat window. You have pins, evidence boards, exploit simulations running in the background, and a security timeline.

4. **Speed means iteration speed.** Finding a vulnerability requires trying 20 things quickly. The interface must not slow down rapid hypothesis testing.

5. **Trust is earned through transparency.** Every analysis step is visible. Every conclusion is traceable. The AI shows its reasoning, not just its answers.

### 16.3 Sireen Layout Architecture

```
VS Code Window
├── Activity Bar (VS Code native)
│   └── Sireen shield icon → activates sidebar
│
├── Sidebar (Primary) — Webview
│   ├── Investigation Header
│   │   ├── Protocol name / contract address
│   │   ├── Risk score (color-coded badge)
│   │   ├── Investigation status (Active / Paused / Complete)
│   │   └── Duration / findings count
│   ├── Workspace Tabs
│   │   ├── [Chat] — AI conversation
│   │   ├── [Threat Model] — Attack graph / data flow
│   │   ├── [Findings] — Vulnerability report
│   │   ├── [Timeline] — Security event timeline
│   │   └── [Evidence] — Raw data, traces, proofs
│   ├── Active Tab Content (varies by tab)
│   └── Input Area (always visible)
│       ├── Context selector (protocol/contract scope)
│       ├── Mode selector (Recon/Analyze/Exploit/Patch)
│       ├── Textarea with @references to findings
│       └── Toolbar: [Attach Trace] [Add Evidence] [Run Query] [Send]
│
├── Live Attack Workspace (Tab Panel)
│   ├── Simulation Terminal
│   ├── Exploit Editor
│   └── Network Monitor
│
├── Knowledge Graph Panel (Tab Panel)
│   ├── Entity nodes (contracts, functions, attackers, tokens)
│   ├── Edge types (calls, transfers, vulnerabilities)
│   └── Interactive graph visualization
│
├── Findings Report (Tab Panel)
│   ├── Executive Summary
│   ├── Vulnerability List (severity-sorted)
│   ├── Proof of Concept for each
│   └── Patch Recommendations
│
└── Bug Bounty Dashboard (Tab Panel)
    ├── Active bounties
    ├── Submission status
    ├── Payout history
    └── Scope documentation
```

### 16.4 Sireen Screen Specifications

#### 16.4.1 Welcome Screen (Investigation Start)

**Purpose:** Begin a new security investigation. Connect to a protocol, load a contract, or import audit artifacts.

```
┌─────────────────────────────────┐
│  [Sireen Shield Logo]           │
│  "What are we securing today?" │
│                                 │
│  ┌─────────────────────────┐    │
│  │ Quick Actions            │    │
│  │ 🔍 Analyze a contract    │    │
│  │ 🔬 Audit a protocol      │    │
│  │ 🎯 Hunt for bounties     │    │
│  │ 📋 Review existing code  │    │
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │ Recent Investigations    │    │
│  │ ● Uniswap V4 Audit      │    │
│  │   Found: 3 critical      │    │
│  │ ● Aave flash loan       │    │
│  │   PoC in progress        │    │
│  │ ● New Bounty: EigenLayer│    │
│  │   5 days remaining       │    │
│  └─────────────────────────┘    │
│                                 │
│  Target: [Contract Address...]  │
│  Chain: [Ethereum ▼]            │
│  Mode: [Recon ▼]               │
└─────────────────────────────────┘
```

**States:**
- **First time:** Logo + tagline. Quick actions only. "Connect your wallet" prompt.
- **Returning:** Recent investigations listed by date. Active ones tagged.
- **Loading:** Skeleton UI.
- **Error:** "Failed to load investigations. Check RPC connection. [Retry]"
- **No wallet:** "Connect a Web3 wallet to interact with on-chain contracts."

#### 16.4.2 Investigation Chat Screen

**Purpose:** Primary work surface. Communicate with the security AI. Review findings, exploit proofs, and analysis in real-time.

```
┌─────────────────────────────────┐
│  HEADER                         │
│  [← Back] Uniswap V4 Audit      │
│  ⚠ Risk: HIGH   3 findings      │
│  0x1234...abcd  [Ethereum]      │
│  Status: ● Active  Time: 23m    │
├─────────────────────────────────┤
│  WORKSPACE TABS                  │
│  [💬 Chat] [🌐 Threat Map]      │
│  [📋 Findings] [⏱ Timeline]    │
│  [📎 Evidence]                  │
├─────────────────────────────────┤
│  MESSAGE LIST                   │
│                                 │
│  ┌── USER ──────────────────┐   │
│  │ "Analyze the flash loan  │   │
│  │  function for reentrancy" │   │
│  └──────────────────────────┘   │
│                                 │
│  ┌── SIREEN ────────────────┐   │
│  │ Running static analysis   │   │
│  │ on flashLoan()...         │   │
│  └──────────────────────────┘   │
│                                 │
│  ▼ Tool: static_analyze        │
│  🔍 Function: flashLoan()      │
│  📄 contracts/LendingPool.sol  │
│  [Expanded: Shows control flow] │
│                                 │
│  ┌── SIREEN ────────────────┐   │
│  │ I found a potential       │   │
│  │ reentrancy vulnerability  │   │
│  │ in the flashLoan()        │   │
│  │ function:                 │   │
│  │                           │   │
│  │ The callback to the       │   │
│  │ borrower occurs BEFORE    │   │
│  │ the balance update.       │   │
│  └──────────────────────────┘   │
│                                 │
│  ┌── FINDING ──────────────┐   │
│  │ 🔴 Critical              │   │
│  │ Reentrancy in flashLoan()│   │
│  │                          │   │
│  │ Path:                    │   │
│  │ flashLoan() →            │   │
│  │   _execute() →           │   │
│  │     borrower.call() →    │   │
│  │       [reenter] →        │   │
│  │   _updateBalance() [too  │   │
│  │   late]                  │   │
│  │                          │   │
│  │ [Generate PoC] [View     │   │
│  │  Trace] [Suggest Patch]  │   │
│  └──────────────────────────┘   │
│                                 │
│  ▼ Tool: generate_exploit      │
│  ⚡ Simulating reentrancy       │
│  [Live output streaming]        │
│                                 │
│  ┌── EXPLOIT PROOF ─────────┐   │
│  │ ✅ Simulation: SUCCESS    │   │
│  │  Drained: 100 ETH         │   │
│  │                          │   │
│  │ ```solidity               │   │
│  │ contract Attack {         │   │
│  │   function attack() {     │   │
│  │     lendingPool.flash...  │   │
│  │   }                       │   │
│  │   receive() {             │   │
│  │     lendingPool.flash...  │   │
│  │   }                       │   │
│  │ }                         │   │
│  │ ```                       │   │
│  │                          │   │
│  │ [Add to Findings]        │   │
│  │ [View Transaction]       │   │
│  │ [Copy PoC]               │   │
│  └──────────────────────────┘   │
│                                 │
├─────────────────────────────────┤
│  INPUT AREA                     │
│  Scope: [flashLoan() ▼]         │
│  Mode: [Analyze ▼]             │
│  ┌─────────────────────────┐    │
│  │ @finding:CVE-001         │    │
│  │ "What's the fix?"        │    │
│  │ @contract:LendingPool    │    │
│  └─────────────────────────┘    │
│  [📎 Trace] [🧪 Test] [▶ Send]│
└─────────────────────────────────┘
```

**Key differences from Kilo Code:**
- **Context selector** (Scope) replaces mode selector. It defines the investigation target.
- **Findings appear as structured cards**, not text. Each finding has severity, path, and actions.
- **Exploit simulations** are live-streamed terminal output, not static text.
- **Evidence attachments** (traces, transactions) are first-class content types.
- **Workspace tabs** let you switch between chat, threat map, findings, timeline, and evidence without losing context.

#### 16.4.3 Threat Map Screen

**Purpose:** Visualize the attack surface as an interactive graph. Understand data flow, trust boundaries, and attack paths.

```
┌──────────────────────────────────────────────┐
│ 🔍 Threat Map: flashLoan() Flow              │
│                                              │
│                ┌─────────────┐               │
│                │  Borrower   │               │
│                │  (External) │               │
│                └──────┬──────┘               │
│                       │ call()               │
│                       ▼                      │
│  ┌──────────┐  ┌─────────────┐  ┌──────────┐│
│  │  Oracle  │◄─│ LendingPool │─►│  Vault   ││
│  │  Price   │  │ flashLoan() │  │  Reserve ││
│  └──────────┘  └──┬──┬───────┘  └──────────┘│
│                   │  │                       │
│            ┌──────┘  └──────┐               │
│            ▼                 ▼               │
│  ┌──────────────┐  ┌──────────────┐         │
│  │  swap()      │  │  withdraw()  │         │
│  │  [Uniswap]   │  │  [Token]     │         │
│  └──────────────┘  └──────────────┘         │
│                                              │
│  Legend: 🔴 Vulnerability  🟡 Warning        │
│          🟢 Safe  🔵 External               │
│                                              │
│  [Filter by severity] [Zoom] [Export]        │
└──────────────────────────────────────────────┘
```

**States:**
- **Loading:** "Building threat model..."
- **Empty:** "No threat model yet. Analyze a function to generate one."
- **Interactive:** Graph is zoomable, pannable. Click nodes for details. Click edges for data flow.
- **Error:** "Failed to generate threat model. [Retry]"

**Interactions:**
- Click a node → Shows inline details panel (function signature, risks, related findings).
- Click an edge → Shows data flow details (what data moves, trust level).
- Drag to pan. Scroll to zoom.
- Hover → Highlights connected nodes and edges.
- Filter by severity → Greys out low-risk nodes.
- "Focus on path" → Centers the graph on an attack path.

#### 16.4.4 Findings Screen

**Purpose:** Structured vulnerability report. Severity-sorted, with evidence, PoC, and patch recommendations.

```
┌──────────────────────────────────────────────┐
│ 📋 Findings Report                           │
│                                              │
│ Summary: 1 Critical | 2 High | 3 Medium |    │
│          2 Low | 1 Informational             │
│                                              │
│ ┌── 🔴 Critical ──────────────────────────┐  │
│ │ Reentrancy in flashLoan()               │  │
│ │ LendingPool.sol:124                     │  │
│ │                                          │  │
│ │ Path: flashLoan → _execute → borrower   │  │
│ │       .call → [reenter] → _updateBal    │  │
│ │                                          │  │
│ │ Status: [Unverified] [Verify]           │  │
│ │                         [Generate PoC]  │  │
│ │                         [Suggest Patch] │  │
│ │                         [Dismiss]       │  │
│ └──────────────────────────────────────────┘  │
│                                              │
│ ┌── 🟠 High ─────────────────────────────┐  │
│ │ Price Manipulation via Oracle           │  │
│ │ OracleAdapter.sol:56                    │  │
│ │ Status: [Verified] [View PoC]          │  │
│ │                         [View Patch]   │  │
│ └──────────────────────────────────────────┘  │
│                                              │
│ ┌── 🟡 Medium ───────────────────────────┐  │
│ │ Missing Access Control on withdraw()    │  │
│ │ Vault.sol:89                            │  │
│ └──────────────────────────────────────────┘  │
│                                              │
│ [Export Report] [Submit to Bounty] [Share]   │
└──────────────────────────────────────────────┘
```

**Each finding card shows:**
- Severity badge (color + label)
- Title (descriptive, not generic)
- File + line number (clickable)
- Attack path (text or visual)
- Status badge (Unverified / Verified / Fixed / Dismissed)
- Action buttons (context-specific)

**States:**
- **Empty:** "No findings yet. Start an analysis to discover vulnerabilities."
- **Loading:** "Loading findings..."
- **Filtered:** "Showing 3 of 9 findings. [Clear filter]"

#### 16.4.5 Timeline Screen

**Purpose:** Sequence diagram of security-relevant events. Transactions, state changes, attack steps.

```
┌──────────────────────────────────────────────┐
│ ⏱ Security Timeline                          │
│                                              │
│ ─── Block 19543281 ──────────────────────────│
│  │                                           │
│  ├─◈ Deploy LendingPool                        │
│  │                                           │
│  ├─◈ Set Oracle: 0xabc... → 0xdef...          │
│  │                                           │
│  ├─◈ flashLoan() called                      │
│  │  ├─ _execute()                            │
│  │  ├─ borrower.call()  ← REENTRY POINT      │
│  │  │  └─ flashLoan() [reentered]            │
│  │  │     ├─ _execute()                      │
│  │  │     └─ borrower.call()                 │
│  │  └─ _updateBalance() [state corrupted]    │
│  │                                           │
│  ├─◈ flashLoan() returns: 100 ETH drained     │
│  │                                           │
│ ─── Analysis ─────────────────────────────────│
│  │                                           │
│  └─🔴 Finding: Reentrancy confirmed           │
│                                              │
│  [Filter by type] [Pin event] [Export]       │
└──────────────────────────────────────────────┘
```

**States:**
- **Empty:** "No events recorded. Run an analysis to populate the timeline."
- **Loading:** "Reconstructing timeline..."
- **Error:** "Failed to build timeline. [Retry]"

#### 16.4.6 Evidence Screen

**Purpose:** Raw evidence repository. Transaction traces, code snippets, storage snapshots, execution logs.

```
┌──────────────────────────────────────────────┐
│ 📎 Evidence Locker                           │
│                                              │
│ 🔍 Search evidence...                        │
│                                              │
│ ┌── Transaction Traces ──────────────────┐   │
│ │ 0xabcd...ef01  flashLoan() reentrancy  │   │
│ │ Block: 19543281  Gas: 892,341          │   │
│ │ [View Trace] [Copy TX] [Pin]           │   │
│ │                                          │   │
│ │ [Raw] [Decoded] [Visual] ← trace view   │   │
│ └──────────────────────────────────────────┘   │
│                                              │
│ ┌── Storage Snapshots ────────────────────┐   │
│ │ Slot 0x05: Balance mapping (before)     │   │
│ │ Slot 0x05: Balance mapping (after)      │   │
│ │ Diff: 100 ETH discrepancy               │   │
│ │ [Compare] [Copy] [Pin]                  │   │
│ └──────────────────────────────────────────┘   │
│                                              │
│ ┌── Code Analysis ────────────────────────┐   │
│ │ LendingPool.sol:flashLoan()             │   │
│ │                                          │   │
│ │ Highlighted reentrancy path              │   │
│ │ Lines 124-145                           │   │
│ │ [Open in Editor] [Copy] [Pin]           │   │
│ └──────────────────────────────────────────┘   │
│                                              │
│ Pinned: 3 items                              │
└──────────────────────────────────────────────┘
```

**States:**
- **Empty:** "No evidence collected. Run analysis to gather evidence."
- **Loading:** "Loading evidence..."
- **Pinned view:** Filtered to show only pinned evidence items.

#### 16.4.7 Bug Bounty Dashboard

**Purpose:** Track active bug bounties, submissions, and earnings.

```
┌──────────────────────────────────────────────┐
│ 🎯 Bug Bounty Dashboard                      │
│                                              │
│ ┌── Active Bounties ──────────────────────┐  │
│ │ ● Immunefi: EigenLayer                  │  │
│ │   Scope: AVS contracts                  │  │
│ │   Rewards: Up to $250,000               │  │
│ │   Deadline: 5 days                      │  │
│ │   [Investigate] [View Scope]            │  │
│ │                                          │  │
│ │ ● Hats Finance: Lido V3                 │  │
│ │   Scope: Withdrawal queue               │  │
│ │   Rewards: $50,000                      │  │
│ │   Deadline: 12 days                     │  │
│ │   [Investigate] [View Scope]            │  │
│ └──────────────────────────────────────────┘  │
│                                              │
│ ┌── Submissions ──────────────────────────┐  │
│ │ ● Reentrancy in LendingPool             │  │
│ │   Submitted: Mar 15                     │  │
│ │   Status: Under Review                  │  │
│ │   Reward: Pending                       │  │
│ │                                          │  │
│ │ ● Oracle Manipulation                   │  │
│ │   Submitted: Mar 10                     │  │
│ │   Status: ✅ Accepted                   │  │
│ │   Reward: $15,000                       │  │
│ └──────────────────────────────────────────┘  │
│                                              │
│ Total Earned: $47,500                        │
└──────────────────────────────────────────────┘
```

#### 16.4.8 Live Attack Workspace

**Purpose:** Interactive exploitation environment. Run simulations, write exploit code, monitor network.

```
┌──────────────────────────────────────────────┐
│ 🧪 Live Attack Workspace                     │
│                                              │
│ Tabs: [Simulation] [Exploit Editor] [Network]│
│                                              │
│ ┌── Simulation Terminal ──────────────────┐  │
│ │ $ sireen exploit run reentrancy         │  │
│ │                                         │  │
│ │ [Simulating] Attacking LendingPool...   │  │
│ │ [Step 1/5] Deploy attack contract...   │  │
│ │ [Step 2/5] Fund with 100 ETH...         │  │
│ │ [Step 3/5] Call flashLoan()...          │  │
│ │ [Step 4/5] Reenter via receive()...     │  │
│ │ [Step 5/5] Withdraw drained funds...    │  │
│ │                                         │  │
│ │ ✅ Exploit successful                   │  │
│ │ Drained: 100 ETH                        │  │
│ │ TX: 0xabcd...ef01                       │  │
│ └──────────────────────────────────────────┘  │
│                                              │
│ [Start Fork] [Reset Fork] [Speed: 1x ▼]      │
└──────────────────────────────────────────────┘
```

### 16.5 Sireen Component Specifications

#### 16.5.1 Finding Card

```typescript
// Visual properties
border-left: 4px solid var(--severity-color)
border-radius: 8px
padding: 12px 16px
margin: 8px 0
background: var(--vscode-sideBar-background)

// Severity colors
critical: #ff0000 or #dc2626
high: #ff6b00 or #ea580c
medium: #ffd000 or #ca8a04
low: #3b82f6
informational: #6b7280

// Elements
- Severity badge (colored pill, uppercase)
- Finding title (bold, descriptive)
- Location (file:line, clickable, opens in editor)
- Attack path (bullet list of contract interactions)
- Status badge (Unverified / Verified / Fixed / Dismissed)
- Actions row:
  [Verify] [Generate PoC] [Suggest Patch] [Dismiss]
  [View Trace] [Add Note] [Share]
```

**States:**
- **New:** Pulsing border for 2 seconds.
- **Unverified:** Grey status badge.
- **Verified:** Green checkmark + "Verified" badge.
- **Fixed:** Strikethrough title, green "Fixed" badge.
- **Dismissed:** Faded opacity, "Dismissed" badge.
- **Selected:** Highlighted background.

#### 16.5.2 Threat Graph Node

```typescript
// Types of nodes
contract:    [📄 ContractName]   → blue, rounded rect
function:    [🔧 functionName()] → small, grey pill
attacker:    [🎭 Attacker]       → red, diamond
token:       [💰 TokenName]      → green, circle
oracle:      [📡 OracleName]     → yellow, hexagon
user:        [👤 User]           → blue, circle

// Interactions
- Click: Select node. Show detail panel.
- Double-click: Zoom to node.
- Hover: Highlight connected edges.
- Drag: Reposition node.
- Right-click: Context menu (Copy, Focus on path, Expand).
```

**States:**
- **Default:** Normal rendering with label.
- **Selected:** Glow effect + bold border.
- **Highlighted:** Connected to hovered node.
- **Dimmed:** Not relevant to current focus.
- **Has finding:** Red badge overlay.
- **Has warning:** Yellow badge overlay.

#### 16.5.3 Exploit Simulation Block

```typescript
// Visual properties
background: var(--vscode-terminal-background)
color: var(--vscode-terminal-foreground)
font-family: var(--vscode-editor-font-family)
border-radius: 8px
padding: 12px
border: 1px solid var(--vscode-widget-border)

// Elements
- Header: "⚡ Simulating: [exploit name]"
- Step list with progress:
  [✓] Step 1: Deploy contract
  [▶] Step 2: Fund with ETH  ← current
  [ ] Step 3: Call function
  [ ] Step 4: Exploit
- Live output streaming (monospace)
- Status indicator (Running / Success / Failed)
- Duration
- Actions: [Stop] [Rerun] [Copy Output] [Save as PoC]
```

**States:**
- **Idle:** Not started. Grey.
- **Running:** Green progress bar. Steps update in real-time.
- **Success:** Green checkmark. Shows drained amount / result.
- **Failed:** Red X. Shows error. [Debug] button.
- **Cancelled:** Grey. "Stopped" badge.

#### 16.5.4 Evidence Attachment

```typescript
// Visual properties
border: 1px solid var(--vscode-widget-border)
border-radius: 6px
padding: 6px 10px
display: inline-flex
align-items: center
gap: 6px

// Types
trace:   [🔗 TX_HASH] Transaction trace
code:    [📄 File] Code snippet
log:     [📝 Log] Event log entry
storage: [💾 Slot] Storage snapshot
image:   [🖼️ Name] Screenshot/diagram

// Actions
- Remove (×) button
- Click to preview
- Drag to reorder
```

#### 16.5.5 Timeline Event

```typescript
// Visual properties
border-left: 2px solid var(--event-type-color)
padding-left: 12px
margin: 4px 0

// Event types
transaction: blue
state_change: yellow
finding: red
analysis_step: grey

// Elements
- Timestamp (block number or relative time)
- Icon (per type)
- Title
- Detail (expandable on click)
- Pin button
```

#### 16.5.6 Vulnerability Path

```typescript
// Visual properties
display: flex
align-items: center
gap: 4px
font-family: monospace
font-size: 12px

// Elements
functionName() → contractName.function() → [REENTRY POINT] → ...
- Each step is a clickable chip
- Arrow (→) between steps
- Danger icons at vulnerability points
```

### 16.6 Sireen Navigation Model

#### Primary Navigation

The **workspace tabs** (below the header) are the primary navigation within an investigation:

```
[💬 Chat] [🌐 Threat Map] [📋 Findings] [⏱ Timeline] [📎 Evidence]
```

These are always visible. They define the current mode of investigation.

#### Secondary Navigation

Within each tab:
- **Chat:** Scroll through messages (virtualized).
- **Threat Map:** Pan/zoom the graph. Click nodes to drill in.
- **Findings:** Scroll severity-sorted list. Click to expand.
- **Timeline:** Scroll chronological events. Filter by type.
- **Evidence:** Scroll items. Filter by pinned/type.

#### Cross-Session Navigation

Between investigations:
- **Sidebar header** has a hamburger menu → Investigation list.
- **Agent Manager equivalent** → "War Room" — list all active/past investigations.

#### Sireen Keyboard Shortcuts

| Action | Shortcut | Context |
|--------|----------|---------|
| Focus input | `Ctrl+Shift+A` | Any Sireen panel |
| Cycle investigation mode | `Ctrl+.` | Any Sireen panel |
| Next finding | `Ctrl+Shift+↓` | Findings tab |
| Previous finding | `Ctrl+Shift+↑` | Findings tab |
| Open threat map | `Ctrl+Shift+T` | Any Sireen panel |
| Open findings | `Ctrl+Shift+F` | Any Sireen panel |
| Run simulation | `Ctrl+Enter` | When exploit selected |
| Add to evidence | `Ctrl+Shift+E` | When finding selected |
| Quick search | `Ctrl+F` | Investigation scope |
| New investigation | `Ctrl+N` | Any Sireen panel |

### 16.7 Sireen State Management

```
State Layers:
┌─────────────────────────────────────────┐
│  Global State                            │
│  - Connected chain (Ethereum, Polygon…)  │
│  - Wallet connection                     │
│  - Active investigation ID               │
│  - RPC endpoint status                   │
│  - Configuration (audit settings)        │
├─────────────────────────────────────────┤
│  Investigation State                     │
│  - Target contract/protocol              │
│  - Findings array (severity-sorted)      │
│  - Threat graph (nodes + edges)          │
│  - Timeline events                       │
│  - Evidence locker items                 │
│  - Messages + AI stream                  │
│  - Running simulations                   │
├─────────────────────────────────────────┤
│  UI State                                │
│  - Active workspace tab                  │
│  - Selected finding                      │
│  - Selected graph node                   │
│  - Expanded/collapsed evidence           │
│  - Input draft text                      │
│  - Timeline filters                      │
│  - Graph zoom/pan position              │
├─────────────────────────────────────────┤
│  Simulation State                        │
│  - Active simulation status              │
│  - Forked chain state                    │
│  - Exploit execution steps               │
│  - Gas/cost tracking                     │
│  - Simulation logs                       │
└─────────────────────────────────────────┘
```

### 16.8 Sireen AI Interaction Model

The Sireen AI behaves like an **elite security researcher**:

**Capabilities:**
- **Static analysis:** Review Solidity/Vyper/Rust code for vulnerabilities.
- **Dynamic analysis:** Simulate transactions, trace execution.
- **Exploit generation:** Write PoC exploit contracts.
- **Patch generation:** Suggest and write fix code.
- **Threat modeling:** Build attack graphs and data flow diagrams.
- **Timeline reconstruction:** Reconstruct attack sequences from on-chain data.

**Response format:**
```
1. Thought process (collapsible reasoning)
2. Action (tool call with evidence)
3. Finding (structured card if vulnerability found)
4. Recommendation (next steps)
```

**Special AI interactions:**
- **"Show me the attack path":** AI builds a visual path through the contract.
- **"Can you exploit this?":** AI launches a live simulation.
- **"What's the fix?":** AI suggests + writes patch code.
- **"Is this known?":** AI checks against known vulnerability databases.
- **"Compare with [protocol]":** AI compares security posture with similar protocols.

### 16.9 Sireen Visual Design

#### 16.9.1 Color System

Sireen uses VS Code theme tokens as the base, with additional security-specific colors:

```css
/* Severity colors (used for findings, badges, indicators) */
--severity-critical: #dc2626  /* Red */
--severity-high: #ea580c      /* Orange */
--severity-medium: #ca8a04    /* Yellow */
--severity-low: #3b82f6       /* Blue */
--severity-info: #6b7280      /* Grey */

/* Security-specific */
--exploit-success: #16a34a    /* Green */
--simulation-running: #2563eb /* Blue */
--threat-highlight: #dc2626   /* Red glow for active threats */
--safe-indicator: #22c55e     /* Green for safe operations */

/* Brand */
--sireen-primary: #6366f1     /* Indigo — trust, security */
--sireen-accent: #818cf8      /* Lighter indigo */
--sireen-shield: #4f46e5      /* Shield icon color */
```

#### 16.9.2 Iconography

Sireen uses a combination of:
- **VS Code Codicons** for standard UI actions.
- **Security-themed custom icons**:
  - Shield (logo and status)
  - Bug (vulnerability finding)
  - Graph node (threat model)
  - Lightning (exploit simulation)
  - Clock (timeline)
  - File with magnifying glass (evidence)
  - Target (bounty)
  - Lock/Unlock (security state)

#### 16.9.3 Typography

Same as Kilo Code (VS Code fonts) with one addition:
- **Monospace for all code, traces, and simulation output.**
- **Severity labels** use bold uppercase with tracking (letter-spacing: 0.05em).

#### 16.9.4 Animations

| Element | Animation | Purpose |
|---------|-----------|---------|
| Finding card appearance | Slide in from right, fade | New discovery alert |
| Threat graph node highlight | Pulsing glow ring | Active selection |
| Simulation running | Stepped progress bars | Execution progress |
| Severity badge | Subtle color pulse | Urgency signaling |
| Evidence pin | Spring animation | Confirmation feedback |
| Timeline scroll | Smooth scroll via CSS | Reading continuity |
| Risk score change | Number flip animation | Score transition |

### 16.10 Sireen User Flow (Complete Journey)

#### Investigation Flow

```
1. User opens Sireen from Activity Bar (shield icon)
2. Welcome screen appears
3. User pastes a contract address or selects "Analyze a contract"
4. User selects chain (Ethereum) and clicks "Start Investigation"
5. Sidebar opens with:
   - Header showing target address, chain, empty findings count
   - Chat tab active
   - AI greeting: "I've loaded contract 0xabcd... Let me start with a surface-level analysis."
6. AI runs: slither_analyze, check_etherscan, check_known_vulnerabilities
   → Tool call blocks show running status
7. AI reports initial findings:
   - "This contract has 3 dependencies. I found 2 external calls in flashLoan()."
   - Finding card appears for each potential issue
8. User asks: "Show me the reentrancy path"
   → AI switches to Threat Map tab
   → Graph builds showing the attack path
9. User asks: "Can you exploit this?"
   → AI switches to Live Attack Workspace
   → Simulation terminal opens
   → AI writes and runs PoC
   → Shows: "Successfully drained 100 ETH"
10. AI suggests patch
    → Opens diff view in editor
    → Shows proposed changes
11. User adds finding to report
    → Finding verified, added to actionable list
12. User submits to bug bounty
    → Opens submission dialog
    → Fills details from findings
    → Links PoC
13. Investigation paused. User saves and closes.
14. Later: User reopens investigation from recent list.
    → State restored. Timeline, findings, evidence all preserved.
```

### 16.11 Sireen Component Hierarchy

```
<App>
  <ThemeProvider>                    ← VS Code theme + Sireen tokens
    <ChainProvider>                  ← RPC connection, chain state
      <InvestigationProvider>        ← current investigation state
        <InvestigationContainer>     ← main layout
          <InvestigationHeader />    ← target, risk score, status
          <WorkspaceTabs />          ← Chat, Threat Map, Findings, etc.
          <ActiveTabContent>         ← switches based on active tab
            <ChatTab>
              <MessageList>
                <UserMessage />
                <SireenMessage>
                  <StreamingAnalysis />
                  <FindingCard />
                  <ExploitSimulation />
                  <ThreatGraphEmbedded />
                  <EvidenceAttachment />
                  <ToolCallBlock />
                </SireenMessage>
              </MessageList>
            </ChatTab>
            <ThreatMapTab>
              <GraphToolbar />
              <InteractiveGraph />
              <NodeDetailPanel />
            </ThreatMapTab>
            <FindingsTab>
              <FindingsSummary />
              <FindingList>
                <FindingCard />
              </FindingList>
              <FindingDetailPanel />
            </FindingsTab>
            <TimelineTab>
              <TimelineFilter />
              <TimelineList>
                <TimelineEvent />
              </TimelineList>
            </TimelineTab>
            <EvidenceTab>
              <EvidenceToolbar />
              <EvidenceGrid>
                <EvidenceCard />
              </EvidenceGrid>
              <EvidencePreview />
            </EvidenceTab>
          </ActiveTabContent>
          <InvestigationInput>
            <ScopeSelector />
            <ModeSelector />
            <Textarea />
            <AttachmentBar />
            <Toolbar />
          </InvestigationInput>
        </InvestigationContainer>
      </InvestigationProvider>
    </ChainProvider>
  </ThemeProvider>
</App>
```

### 16.12 Sireen Architecture

#### Technology Stack (Same as Kilo Code + additions)

| Layer | Technology | Purpose |
|-------|-----------|---------|
| UI Framework | Solid.js | Reactive UI |
| Graph Visualization | D3.js or vis-network | Threat map rendering |
| Terminal | xterm.js | Simulation terminal |
| EVM Simulation | Custom (via CLI) | Exploit execution |
| Static Analysis | Slither integration | Contract analysis |
| Markdown | marked | Report rendering |
| Virtualization | virtua | Message list performance |

#### VS Code Integration Points

| Point | What Sireen Contributes |
|-------|------------------------|
| `activitybar` | Sireen shield icon |
| `views` | Sidebar + investigation panel |
| `commands` | New Investigation, Run Analysis, Generate PoC, Submit Finding |
| `keybindings` | All Sireen-specific shortcuts |
| `menus` | Editor context: "Analyze with Sireen", Terminal: "Trace with Sireen" |
| `configuration` | RPC endpoints, audit settings, wallet config |

#### Sireen CLI Integration

```
Sireen Extension (VS Code)    Sireen CLI (local/remote)
┌──────────────────────┐     ┌──────────────────────┐
│ Webview UI           │◄───►│ Analysis Engine       │
│ Investigation Manager│     │ ├── Static Analyzer   │
│ Evidence Store       │     │ ├── Dynamic Simulator │
│ Threat Model Renderer│     │ ├── Exploit Generator │
│                      │     │ ├── Patch Generator   │
│                      │     │ └── Knowledge Graph   │
└──────────────────────┘     └──────────────────────┘
         │                            │
         │ RPC                        │ Forge/Foundry
         ▼                            ▼
┌──────────────────────┐     ┌──────────────────────┐
│ Blockchain (EVM)     │     │ Local Fork (Anvil)    │
└──────────────────────┘     └──────────────────────┘
```

### 16.13 Performance Optimizations (Sireen)

All Kilo Code optimizations apply + Sireen-specific:

1. **Threat graph virtualization:** Large graphs (>1000 nodes) use canvas rendering, not DOM.
2. **Lazy evidence loading:** Evidence items load on scroll (infinite scroll).
3. **Simulation in worker:** Exploit simulations run in a Web Worker to not block UI.
4. **Finding deduplication:** Similar findings are grouped to prevent list explosion.
5. **Cached analysis results:** Static analysis results cached per contract version.
6. **Pagination of timeline:** Timeline loads in blocks (50 events at a time).

### 16.14 Sireen UX Decisions

| Decision | Rationale |
|----------|-----------|
| **Workspace tabs instead of single chat** | Security investigations have multiple facets (chat, graph, findings, timeline, evidence). Tabs allow context switching without losing state. |
| **Findings as structured cards** | Vulnerabilities have severity, path, status, and actions. Text is insufficient. Cards enable scanning, filtering, and action. |
| **Attack graph visualization** | Complex relationships between contracts, functions, and attackers are impossible to describe linearly. A graph is the natural representation. |
| **Live exploit simulation** | A theoretical vulnerability is not credible. A working PoC proves the finding. In-browser simulation makes verification instant. |
| **Evidence locker** | Security research requires collecting and organizing evidence. A dedicated locker with pinning is essential for report writing. |
| **Timeline reconstruction** | Understanding how an attack happened requires seeing the sequence. A timeline maps events to state changes. |
| **Scope selector in input** | Users need to constrain AI analysis to specific functions or contracts. The scope selector makes this explicit. |
| **Severity-based color coding** | Security professionals scan by severity. Color coding enables rapid triage. |
| **Forked chain per investigation** | Isolated execution environment prevents conflicts between exploit simulations. |

### 16.15 Things to Keep Exactly (for Sireen)

1. **Single-column chat layout** for the conversation tab.
2. **Fixed input area** always visible at the bottom.
3. **Collapsible tool call blocks** with expand/collapse animation.
4. **VS Code theme integration** via CSS custom properties.
5. **Virtualized message list** for performance.
6. **Real-time streaming** of AI responses.
7. **Right-aligned user, left-aligned AI** messages.
8. **Keyboard shortcuts** for all major actions.
9. **Markdown rendering** with syntax-highlighted code blocks.
10. **Context menu integration** (right-click to analyze).
11. **Session persistence** to disk.
12. **Separate webviews** for major panels.

### 16.16 Things to Improve (for Sireen)

1. **Message pinning** — Pin critical findings or evidence items to the top of the chat.
2. **Search within investigation** — Full-text search across all tabs.
3. **Finding notes** — Add researcher notes to any finding.
4. **Export investigation** — Export as PDF report or JSON data.
5. **Customizable welcome screen** — Add favorite protocols or bounty programs.
6. **Multi-chain investigations** — Analyze contracts across chains simultaneously.
7. **Collaboration** — Share investigations with team members.
8. **Finding templates** — Predefined finding formats for common vulnerability types.
9. **Integration with GitHub issues** — Create issues from findings.
10. **Dashboard analytics** — Stats on findings, severity distribution, audit velocity.

---

## END OF DESIGN SPECIFICATION

This document contains everything needed to build the Sireen Web3 Security Copilot interface. An engineering agent should be able to implement the complete UI using ONLY this document as a reference, without referring back to the Kilo Code source code.

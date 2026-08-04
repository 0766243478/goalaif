# SIREEN — Native VS Code Extension Redesign

> **Status:** Design document — awaiting approval before implementation.
> **Author:** Principal Product Designer / VS Code Extension Architect
> **Date:** 2026-08-01
> **Mission:** Make SIREEN feel like it shipped with VS Code. The user should forget it's built with React.

---

## Phase 1 — UX Audit: Why SIREEN Feels Like a Website

### The Core Problem

SIREEN is architecturally a **React SPA embedded in a single webview view**. It ships its own:

- Custom router (`state.activeView` switches between 10 "pages")
- Custom sidebar (`LeftSidebar.tsx`, 48px, 10 icon buttons)
- Custom right panel (`RightPanel.tsx`, chat + reasoning tabs)
- Custom bottom panel (`BottomPanel.tsx`, logs)
- Custom design tokens (`--sireen-*`, hardcoded hex in `styles.css`)
- Custom button system (`.btn-primary`, `.btn-secondary`, `.btn-ghost`)
- Custom card system (`.card`, `.card-header`, `.card-body`)
- Custom badge system (`.badge`, `.badge-critical`, etc.)

This is a **website architecture**, not an IDE extension architecture.

### Evidence (from source)

| Symptom | Evidence | Why it feels like a website |
|---|---|---|
| **Ignores the user's VS Code theme** | `styles.css` defines `--sireen-void: #04060B` etc. — hardcoded dark theme. A user on a light theme sees a dark island. | VS Code native panels adapt to the theme. SIREEN doesn't. |
| **Custom sidebar duplicates the Activity Bar** | `LeftSidebar.tsx` renders 10 icon buttons for navigation. VS Code already has the Activity Bar for this. | Two sidebars = confusion. The user sees VS Code's Activity Bar *and* SIREEN's mini-sidebar. |
| **"Pages" instead of views** | `viewComponents` map routes `overview → OverviewView`, `chat → ChatView`, etc. Each is a full "page" with a title, subtitle, and content. | Native VS Code views are lists/trees, not pages with hero titles. |
| **Marketing-style hero text** | `OverviewView`: `<div style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>SIREEN</div>` + subtitle "Open a smart contract to begin analysis." | This is landing-page copy, not IDE chrome. |
| **Dashboard widgets** | `OverviewView` renders a 2×2 grid of stat cards (Findings, Exploits, Memory, Risk Score) with huge numbers. | IDEs use dense lists, not stat dashboards. |
| **Oversized buttons** | `.btn-primary` has `padding: 8px 12px`, `letter-spacing: 0.05em`, uppercase, glow on hover. | Native VS Code buttons are compact, sentence-case, no glow. |
| **Website spacing** | Views use `padding: 12px 16px`, `marginBottom: 16px` between sections. | Native VS Code density is ~4-8px. SIREEN is 2-4× too spacious. |
| **Two design systems** | Main views use `--sireen-*` CSS vars; HackerMode uses hardcoded `#0D1117` hex. | Looks like two different products stitched together. |
| **Custom font stack** | `body { font-family: var(--font-mono) }` — JetBrains Mono for *everything*, even UI labels. | VS Code uses the system UI font for chrome, monospace only for code. |
| **No native integration** | No Tree Views, no View Actions, no Status Bar items, no CodeLens integration with the sidebar, no Quick Picks. | SIREEN ignores the entire native extension surface. |

### The Verdict

SIREEN is a **product website pretending to be a VS Code extension**. It builds its own browser-like shell inside a webview instead of using VS Code's native containers, views, and theme tokens.

---

## Phase 2 — Competitive Comparison

### How native VS Code extensions actually work

Based on the [official VS Code UX Guidelines](https://code.visualstudio.com/api/ux-guidelines/overview) and the [webview-view-sample](https://github.com/microsoft/vscode-extension-samples/tree/main/webview-view-sample):

| Principle | VS Code Guideline | SIREEN's Current Behavior |
|---|---|---|
| **Prefer Tree Views** | "Use a Tree View for displaying data" | Uses custom React cards/lists |
| **Limit webview views** | "Limit the use of custom Webview Views" | One giant webview view does everything |
| **Theme everything** | "Ensure all elements in the view are themeable" — use `var(--vscode-*)` tokens | Uses `--sireen-*` hardcoded tokens |
| **Use product icons** | "Use built-in product icons to fit in alongside native UI" | Uses lucide-react (custom icon set) |
| **Views are draggable** | Views can be moved to Secondary Sidebar / Panel | SIREEN's single webview can't be split |
| **Welcome views for empty states** | Use Welcome Views with links, not buttons | Uses custom `EmptyState` component with buttons |
| **View Actions in toolbar** | Expose actions on the View Toolbar | No view toolbar — actions are inline buttons |
| **Don't use tree items as buttons** | "Don't use Tree View Items as buttons to fire Commands" | N/A (no tree views) |

### Reference products analyzed

| Product | Layout | Why it feels native |
|---|---|---|
| **GitHub Copilot Chat** | Single webview view in sidebar/panel. Chat is the whole UI. No custom sidebar, no "pages". Uses `--vscode-*` tokens. | It's a chat surface, not a dashboard. Compact. Theme-aware. |
| **Cursor** | Chat panel + inline edits. No custom navigation chrome. Lives in the panel/sidebar like a native view. | One job per surface. No website shell. |
| **Cline / Roo Code / Kilo** | Single chat-style webview view. Activity happens in the chat transcript. File changes shown as collapsible diffs. | Conversation is the UI. No dashboards. |
| **Continue** | Chat view + small autocomplete. Uses native tokens. | Minimal chrome, maximum content. |
| **VS Code Explorer** | Tree View. Dense. Keyboard-navigable. No cards. | The gold standard for density. |
| **VS Code Problems** | Flat list of diagnostics. Click to navigate. No "overview page". | Information-first, no marketing. |
| **VS Code Testing** | Tree of tests. Status icons. Inline actions. | Tree, not dashboard. |
| **VS Code Source Control** | Tree of changes. Inline input for commit. Action icons in toolbar. | Input + tree, no cards. |
| **VS Code Debug** | Tree of variables. Toolbar actions. Watch expressions as list. | Inspector, not widgets. |

### The common principle

> **Every successful VS Code extension uses the minimum amount of custom UI.** They use Tree Views for data, webview views only for chat/rich interaction, and they inherit the VS Code theme via `var(--vscode-*)` tokens. None of them build a "dashboard".

---

## Phase 3 — New Information Architecture

### Current IA (website-style)

```
SIREEN (single webview)
├── Overview (dashboard with stat cards)
├── Findings (list page)
├── Chat (page)
├── Attack Workspace (page)
├── Exploits (page)
├── Memory (page)
├── Notes (page)
├── Tasks (page)
├── Simulation (page)
└── Settings (page)
```

**Problem:** 10 pages, each with a title + subtitle + content. This is a website sitemap.

### New IA (native VS Code-style)

Split SIREEN into **multiple native views** in one View Container, plus a webview view only for chat.

```
Sireen (View Container — Activity Bar)
├── Chat                    [webview view] — the only webview
├── Findings                [tree view]   — native Tree View
├── Exploits                [tree view]   — native Tree View
├── Investigation           [tree view]   — Notes + Tasks merged
└── Memory                  [tree view]   — native Tree View
```

Plus:
- **Status Bar items** — connection status, sandbox status, audit progress
- **CodeLens** — already exists, keep it
- **Problems panel integration** — findings appear as diagnostics (already partially done via `SireenDiagnostics`)
- **Command Palette** — all actions accessible via `Ctrl+Shift+P`
- **Editor context menu** — "Audit Selection", "Exploit Selection" (already exists)

### Why this is better

| Old | New | Benefit |
|---|---|---|
| 1 webview with 10 pages | 4 tree views + 1 chat webview | Each view is draggable, themeable, keyboard-navigable |
| Custom sidebar for nav | VS Code Activity Bar handles nav | One less layer of chrome |
| Dashboard overview | No overview — Findings view *is* the overview | Removes the marketing page |
| Settings page | Native VS Code Settings | Users find settings where they expect |
| Simulation page | Status Bar item + Command | Sandbox is an action, not a destination |

### The Investigation Workflow (guided by the UI)

The Findings tree view naturally guides the user through the workflow:

```
Contract (open in editor)
  ↓ CodeLens: "Audit" / "Exploit"
Understanding (chat shows AI thinking)
  ↓
Evidence (Findings tree populates)
  ↓
Attack Surface (Findings tree, grouped by function)
  ↓
Scenarios (each finding expandable → "Generate PoC")
  ↓
Simulation (Status Bar shows "Running Forge…")
  ↓
PoC (Exploits tree shows confirmed/unconfirmed)
  ↓
Verification (Finding → "Generate Patch")
  ↓
Report (Command Palette: "Sireen: Generate Report")
```

The user never "navigates to a page". They work in the editor, and the tree views update around them.

---

## Phase 4 — New Navigation System

### Current Navigation (broken)

- Custom 48px sidebar with 10 icons
- Click icon → `dispatch({ type: 'SET_VIEW', view: '...' })`
- No keyboard shortcuts
- No breadcrumbs
- No relationship to VS Code's Activity Bar

### New Navigation (native)

```
┌─────────────────────────────────────────────────────┐
│  VS Code Activity Bar                               │
│  ┌────┐                                              │
│  │Explorer│  ┌────┐                                 │
│  │Search  │  │Sireen│  ← SIREEN View Container      │
│  │Source  │  └────┘                                 │
│  │Debug   │                                           │
│  │Testing │                                           │
│  │  Sireen│  ← single Activity Bar icon             │
│  └────┘                                              │
└─────────────────────────────────────────────────────┘
                    │
                    ↓
┌─────────────────────────────────────────────────────┐
│  Primary Sidebar (Sireen View Container)            │
│  ┌──────────────────────────────────────────────┐   │
│  │ CHAT          FINDINGS    EXPLOITS   ▤ ▤ ▤  │   │ ← view headers (tabs)
│  └──────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────┐   │
│  │                                              │   │
│  │  (selected view content)                    │   │
│  │                                              │   │
│  └──────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────┐   │
│  │  View Toolbar: [↻] [⚙] [⋯]                  │   │ ← view actions
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

- **Activity Bar**: One SIREEN icon (already exists). Clicking opens the View Container.
- **View headers**: Native VS Code view tabs — Chat, Findings, Exploits, Investigation, Memory. User can collapse/expand each, drag to Secondary Sidebar, drag to Panel.
- **View Toolbar**: Native action icons per view (refresh, filter, settings, more).
- **Status Bar**: `Sireen: Connected` (left), `Sireen: Audit running 2/4` (right, with progress bar).
- **Command Palette**: `Sireen: Audit Selection`, `Sireen: Generate Report`, etc.
- **Keyboard**: `Ctrl+Shift+G` → Findings, `Ctrl+Shift+E` → Exploits (or rely on native `Ctrl+Q` view switching).

### Navigation principles

1. **No custom sidebar** — VS Code's Activity Bar is the only sidebar.
2. **No "pages"** — each view is a list/tree, not a page with a title.
3. **No view transitions** — views swap instantly (native behavior).
4. **Everything is a command** — every action works from the Command Palette.
5. **The editor is the hero** — SIREEN's views are secondary; the user's code is primary.

---

## Phase 5 — Redesigned Screens

### Screen 1: Chat (webview view — the only webview)

**Current:** A full "page" with "Chat" title, subtitle, starter questions, message list, input.

**New:** A pure chat surface. No title. No subtitle. Just messages + input. Like Copilot Chat.

```
┌─────────────────────────────────────┐
│                                     │
│  [user] How does the withdraw fn    │
│         handle reentrancy?          │
│                                     │
│  [sireen] The withdraw function     │
│  makes an external call before      │
│  updating the balance…              │
│  ┌─────────────────────────────┐   │
│  │ contract Vault {            │   │
│  │   function withdraw() {     │   │
│  │     ...                     │   │
│  │   }                         │   │
│  │ }                           │   │
│  └─────────────────────────────┘   │
│  [Jump to finding] [Generate PoC]  │ ← inline action links
│                                     │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │
│  ┌─────────────────────────────────┐│
│  │ Ask, /analyze, /exploit…   [↵] ││ ← input, no label
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

- **No "Chat" title** — the view header already says "Chat".
- **No starter question buttons** — use a Welcome View (native) when empty.
- **Inline action links** — not big buttons. Links navigate to findings/exploits.
- **Thinking indicator** — compact single line: `⠋ Analyzing withdraw function…`
- **Slash commands** — autocomplete dropdown (keep current, it's good).

### Screen 2: Findings (native Tree View)

**Current:** A page with "Findings" title, search bar, severity filter buttons, then a list of cards.

**New:** A native Tree View. Grouped by severity. Each finding is a tree item.

```
▼ Critical (2)
    ◉ Reentrancy in withdraw()        Vault.sol:42
    ◁ Unchecked transfer() return     Vault.sol:78
▼ High (3)
    ◉ Integer overflow in deposit()   Vault.sol:15
    ◁ Missing access control          Vault.sol:90
    ◁ Stale price oracle               Oracle.sol:12
▶ Medium (1)
▶ Low (0)
```

- **Tree items** — click navigates to the code (already works via `sireen.findings.jumpTo`).
- **Severity groups** — collapsible tree nodes with counts.
- **Inline icons** — `◉` confirmed, `◁` unconfirmed.
- **View Toolbar** — filter icon (toggles severity filters via Quick Pick), refresh, collapse all.
- **Context menu** — right-click a finding: "Generate PoC", "Generate Patch", "Dismiss", "Copy as report".
- **No search bar** — use native `Ctrl+Shift+F` filter (Tree Views support built-in filtering).
- **No cards** — tree items are one line each. Dense.

### Screen 3: Exploits (native Tree View)

**Current:** A page with "Exploits" title, then cards with PoC code blocks.

**New:** A native Tree View. Each exploit is a tree item, expandable to show PoC.

```
▼ Confirmed (1)
  ▼ Reentrancy drain — Vault.withdraw()
      PoC: reentrancy_exploit.sol        [Run] [Report]
      Forge: ✓ Passed (2 tests)
      Impact: Funds drainable
▶ Unconfirmed (1)
    Integer overflow — not reproducible
```

- **Expandable tree items** — click ▶ to expand PoC details.
- **Inline action buttons** — `[Run]` re-runs the PoC, `[Report]` generates a report.
- **Forge output** — shown as a collapsible child node, monospace.
- **No CodeBlock component** — use native tree item with monospace font.

### Screen 4: Investigation (native Tree View — merges Notes + Tasks)

**Current:** Two separate pages — Notes (textarea) and Tasks (list with checkboxes).

**New:** One Tree View. Notes and tasks are research artifacts, grouped together.

```
▼ Tasks (3)
    ☐ Verify reentrancy guard on withdraw()
    ☐ Check all external calls in deposit()
    ☑ Read the audit report from Euler hack
▼ Notes (1)
    ▼ Withdraw function assumptions
        - Assumes balance > 0 (unverified)
        - Assumes no reentrancy (WRONG)
        - External call to msg.sender
```

- **Tasks** — checkbox tree items. Click to toggle.
- **Notes** — expandable tree items. Click to open in a native webview editor (or inline edit).
- **Add task** — View Toolbar `+` icon, or right-click → "Add Task".
- **No textarea** — notes open in a proper editor tab for editing (native `vscode.window.openTextDocument`).

### Screen 5: Memory (native Tree View)

**Current:** A page with "Memory" title, collection tabs, search, then cards.

**New:** A native Tree View. Grouped by collection.

```
▼ patterns (12)
    reentrancy-vulnerability     94%
    unchecked-transfer           87%
    integer-overflow             76%
▶ tactics (8)
▶ fixes (5)
▶ templates (3)
```

- **Collection groups** — collapsible.
- **Search** — native Tree View filter (`Ctrl+Shift+F` in the view).
- **Click** — opens the memory entry in a tooltip or editor.
- **No cards** — one line per entry.

### Screen 6: Settings — REMOVED

**Current:** A page with API key, RPC endpoint, connection status.

**New:** Use native VS Code Settings. Contribute configuration settings via `contributes.configuration`.

```jsonc
// In VS Code Settings UI:
"sireen.apiKey": ""           // sensitive — use `scope: machine`
"sireen.rpcUrl": "https://eth.llamarpc.com"
"sireen.defaultModel": "anthropic/claude-3.5-sonnet"
"sireen.autoAuditOnOpen": false
```

- **No settings page** — users find it in native Settings (`Ctrl+,`).
- **API key** — stored in VS Code SecretStorage, not a text field.
- **Connection status** — moved to Status Bar.

### Screen 7: Simulation — REMOVED as a page

**Current:** A page with sandbox status, RPC input, log.

**New:** Sandbox is an action, not a destination.

- **Start sandbox** — Command Palette: `Sireen: Start Sandbox`, or Status Bar item click.
- **Sandbox status** — Status Bar item: `$(beaker) Sandbox: Ready` / `$(beaker) Sandbox: Offline`.
- **Simulation log** — goes to the VS Code Output channel (`Sireen` output channel), not a custom panel.
- **RPC URL** — a setting, not an input on a page.

### Screen 8: Overview — REMOVED

**Current:** A dashboard with stat cards.

**New:** No overview. The Findings view *is* the overview. When there are no findings, the Findings view shows a Welcome View (native):

```
No findings yet

Audit a contract to discover vulnerabilities:
  → Audit current file
  → Audit selection

Right-click any .sol file → "Sireen: Audit This Code"
```

- **Welcome View** — native VS Code feature (`viewsWelcome` contribution).
- **Links, not buttons** — per VS Code guidelines.
- **No stat cards** — the counts are in the tree group headers (`Critical (2)`).

### Screen 9: Attack Workspace — MERGED into Chat

**Current:** A separate page with exploit idea input, target function, execute button, PoC result, money flow.

**New:** Attack Workspace is a *mode* of the Chat view, not a separate destination.

- When the user right-clicks code → "Sireen: Try to Exploit This", the Chat view opens with the code context attached.
- The user types their exploit hypothesis in the chat input.
- The AI responds with the PoC inline (as a code block in the chat).
- Money flow renders inline in the chat as an SVG.
- The PoC result becomes an entry in the Exploits tree view.

**No separate "Attack Workspace" page.** The chat *is* the workspace.

---

## Phase 6 — Unified Design System

### Principle

> **Do not invent a design system. Inherit VS Code's.**

SIREEN's design system should be a **thin semantic layer** over VS Code's theme tokens. This guarantees theme compatibility (light, dark, high-contrast) and native feel.

### Color Tokens

Replace ALL `--sireen-*` variables with VS Code native tokens:

```css
:root {
  /* === Surfaces === */
  --sireen-bg: var(--vscode-sideBar-background);
  --sireen-surface: var(--vscode-editor-background);
  --sireen-raised: var(--vscode-list-hoverBackground);
  --sireen-border: var(--vscode-panel-border);
  --sireen-border-focus: var(--vscode-focusBorder);

  /* === Text === */
  --sireen-text-primary: var(--vscode-foreground);
  --sireen-text-secondary: var(--vscode-descriptionForeground);
  --sireen-text-muted: var(--vscode-disabledForeground);
  --sireen-text-ghost: var(--vscode-comments);

  /* === Severity (semantic — maps to VS Code where possible) === */
  --sireen-critical: var(--vscode-errorForeground);
  --sireen-critical-bg: var(--vscode-errorBackground);
  --sireen-high: var(--vscode-errorForeground);
  --sireen-medium: var(--vscode-editorWarning-foreground);
  --sireen-low: var(--vscode-editorInfo-foreground);
  --sireen-info: var(--vscode-editorInfo-foreground);

  /* === Brand (SIREEN identity — only for accents) === */
  --sireen-amber: var(--sireen-brand, #F59E0B);  /* fallback only */
  --sireen-green: var(--vscode-testing-iconPassed);
  --sireen-purple: var(--vscode-symbolIcon-function-foreground);

  /* === Fonts === */
  --sireen-font-ui: var(--vscode-font-family);
  --sireen-font-mono: var(--vscode-editor-font-family);

  /* === Sizes === */
  --sireen-font-size: var(--vscode-font-size);       /* typically 13px */
  --sireen-font-size-sm: calc(var(--vscode-font-size) - 1px);  /* 12px */
  --sireen-font-size-xs: calc(var(--vscode-font-size) - 2px);  /* 11px */

  /* === Spacing (VS Code uses ~4px base) === */
  --sireen-space-1: 2px;
  --sireen-space-2: 4px;
  --sireen-space-3: 8px;
  --sireen-space-4: 12px;
  --sireen-space-6: 16px;

  /* === Radius (VS Code uses ~2-4px) === */
  --sireen-radius-sm: 2px;
  --sireen-radius-md: 3px;
  --sireen-radius-lg: 4px;
}
```

**Key change:** `--sireen-amber` is the *only* custom brand color. Everything else inherits the user's theme. A user on a light theme sees a light SIREEN. A user on high-contrast sees high-contrast SIREEN.

### Typography

| Element | Current | New |
|---|---|---|
| Body | `--font-mono` (JetBrains Mono) 12px | `var(--vscode-font-family)` 13px |
| Code | `--font-mono` 12px | `var(--vscode-editor-font-family)` 13px |
| Labels | uppercase, `letter-spacing: 0.05em` | sentence-case, no letter-spacing |
| Titles | `--text-xl` (16px) bold | **removed** — no page titles |
| Stats | `--text-2xl` (20px) bold | **removed** — no stat cards |

### Spacing

| Element | Current | New |
|---|---|---|
| View padding | `12px 16px` | `0` (tree views have no padding) |
| Section gap | `16px` | `4px` (tree item gap) |
| Card padding | `12px` | **removed** (no cards) |
| Button padding | `8px 12px` | `4px 8px` (compact) |

### Components

| Component | Current | New |
|---|---|---|
| **Card** | `.card` with header/body | **removed** — use tree items |
| **Button** | `.btn-primary` (amber, glow, uppercase) | `.sireen-action` (compact, sentence-case, no glow) |
| **Badge** | `.badge-critical` etc. | `.sireen-severity` (uses `--vscode-errorForeground`) |
| **Input** | `.input` (custom) | `var(--vscode-input-*)` tokens |
| **EmptyState** | custom component | native Welcome View |
| **CodeBlock** | custom with copy button | native tree item / chat code block |
| **AuditProgressBar** | custom amber bar | Status Bar progress + inline `⠋` spinner |
| **ThinkingIndicator** | custom with dots | compact single line: `⠋ Analyzing…` |

### Icons

- **Remove lucide-react** for navigation/chrome — use VS Code product icons (`$(beaker)`, `$(bug)`, `$(shield)`, etc.) via Tree View item icons.
- **Keep lucide-react** only inside the chat webview for inline message actions (where product icons aren't available).
- This reduces bundle size and makes SIREEN's tree views use the same icons as native VS Code.

### Animations

| Animation | Current | New |
|---|---|---|
| Page fade-in | `animate-fade-in` 0.2s | **removed** (native views don't animate) |
| Button hover | `translateY(-1px)` + glow | `background` change only (native) |
| Spinner | custom `animate-spin` | native `$(loading~spin)` codicon |
| Thinking dots | `typingDot` 1.4s | `⠋` braille spinner (text-based, 1 line) |
| Card hover | border-color change | **removed** (no cards) |

**Rule:** Animations only for loading states. No decorative motion.

### Status Indicators

| Indicator | Current | New |
|---|---|---|
| Connection | sidebar icon (Wifi/WifiOff) | Status Bar: `$(radio-tower) Sireen: Connected` |
| Sandbox | Settings page badge | Status Bar: `$(beaker) Sandbox: Ready` |
| Audit progress | custom amber bar in views | Status Bar: `$(sync~spin) Sireen: 2/4 phases` |
| Severity | colored badges | tree item icons: `$(error)`, `$(warning)`, `$(info)` |

---

## Phase 7 — Implementation Plan (after approval)

### Architecture changes

1. **`package.json`** — contribute 4 Tree Views + 1 webview view + Welcome Views + Status Bar items + configuration settings.
2. **Tree View providers** — `FindingsTreeProvider`, `ExploitsTreeProvider`, `InvestigationTreeProvider`, `MemoryTreeProvider` (implement `TreeDataProvider`).
3. **Chat webview** — strip to pure chat (remove title, starter buttons, custom chrome). Use `--vscode-*` tokens.
4. **Status Bar** — `createStatusBarItem` for connection, sandbox, audit progress.
5. **Settings** — `contributes.configuration` for API key, RPC URL, model. Use `SecretStorage` for the key.
6. **Output channel** — `vscode.window.createOutputChannel('Sireen')` for logs (replaces BottomPanel).
7. **Welcome Views** — `viewsWelcome` for empty Findings/Exploits/Memory views.
8. **Remove** — `LeftSidebar`, `RightPanel`, `BottomPanel`, `CopilotLayout`, `OverviewView`, `SettingsView`, `SimulationView`, `ProtocolMode`, dead components, `.patched` files, `theme.ts`.

### Migration path

| Step | What | Risk |
|---|---|---|
| 1 | Add Tree View providers + `package.json` contributions | Low — additive |
| 2 | Add Status Bar items + Output channel | Low — additive |
| 3 | Add `contributes.configuration` settings | Low — additive |
| 4 | Rewrite Chat webview to use `--vscode-*` tokens | Medium — visual change |
| 5 | Migrate Findings/Exploits/Memory/Investigation to Tree Views | High — data flow change |
| 6 | Remove old layout components + dead code | Low — cleanup |
| 7 | Remove custom sidebar, right panel, bottom panel | High — architecture change |
| 8 | Add Welcome Views | Low — additive |

### What stays

- `store/` (reducer + state) — keep, but slim down (remove `activeView`, `rightPanelOpen`, etc.)
- `hooks/useMessageBus` — keep, but simplify (chat only)
- `components/ChatInput` — keep (slash commands are good)
- `components/ChatMessage` — keep, restyle with `--vscode-*`
- `components/CodeBlock` — keep for chat
- `messaging/MessageRouter` — keep, extend for tree view refresh
- `api/backendClient` — keep
- `editor/` (CodeLens, diagnostics, hover, code actions) — keep, excellent
- `commands/` — keep, extend

### What goes

- `layouts/` (all 4 files) — replaced by native views
- `views/OverviewView`, `SettingsView`, `SimulationView` — removed
- `views/FindingsView`, `ExploitsView`, `MemoryView`, `ResearchNotesView`, `TasksView` — replaced by Tree Views
- `ProtocolMode/` — dead code, remove
- `components/ActionButton`, `PipelineProgress`, `FindingsList` — dead, remove
- `components/PoCResultPanel`, `MoneyFlowVisualizer`, `AgentLog`, `MemoryPanel` — merge into chat/Exploits tree
- `components/AuditProgressBar`, `ThinkingIndicator`, `EmptyState`, `SeverityBadge`, `SearchInput`, `VirtualList` — replaced by native
- `theme.ts` — dead, remove
- all `.patched` files — remove
- `styles.css` — rewrite to thin `--vscode-*` layer

---

## Success Criteria Checklist

- [ ] A user on a light theme sees a light SIREEN (no hardcoded dark colors)
- [ ] No custom sidebar — VS Code Activity Bar is the only navigation
- [ ] No "pages" with titles and subtitles
- [ ] No dashboard, no stat cards
- [ ] Findings/Exploits/Memory are Tree Views (dense, keyboard-navigable)
- [ ] Chat is the only webview view, and it uses `--vscode-*` tokens
- [ ] Settings are in native VS Code Settings
- [ ] Logs go to an Output channel, not a custom panel
- [ ] Status Bar shows connection, sandbox, audit progress
- [ ] Every action is in the Command Palette
- [ ] Empty states are Welcome Views with links
- [ ] No decorative animations
- [ ] No lucide icons in tree views (use product icons)
- [ ] Bundle size drops (less custom UI code)
- [ ] A VS Code user immediately believes SIREEN is native

---

## Approval

> **This document is the design blueprint. No code will be written until the architecture is approved.**
>
> Please review Phases 3-6 (Information Architecture, Navigation, Screens, Design System) and confirm:
> 1. The shift from "single webview SPA" to "4 Tree Views + 1 chat webview" is approved.
> 2. The removal of Overview, Settings, and Simulation as separate screens is approved.
> 3. The merge of Attack Workspace into Chat is approved.
> 4. The migration from `--sireen-*` hardcoded tokens to `--vscode-*` native tokens is approved.
>
> Once approved, implementation begins with Step 1 (additive Tree View providers + `package.json`).

# SIREEN — Complete UI/UX Design Specification

> **Based on:** Reverse Engineering of Kilo Code v7.4.1 VS Code Extension
> **Purpose:** This document serves as the single source of truth for building the Sireen Web3 Security Copilot interface. An engineering agent must be able to build the entire UI using ONLY this document.
> **Design Philosophy:** "Working beside an elite security engineer" — not "chatting with ChatGPT."

---

## TABLE OF CONTENTS

1. [Overall Philosophy](#1-overall-philosophy)
2. [Layout Architecture](#2-layout-architecture)
3. [Navigation System](#3-navigation-system)
4. [Every Screen](#4-every-screen)
5. [Component Library](#5-component-library)
6. [State Management](#6-state-management)
7. [User Flow](#7-user-flow)
8. [AI Interaction Model](#8-ai-interaction-model)
9. [Visual Design System](#9-visual-design-system)
10. [VS Code Integration](#10-vs-code-integration)
11. [Architecture](#11-architecture)
12. [Performance](#12-performance)
13. [UX Decisions & Rationale](#13-ux-decisions--rationale)
14. [Keep Exactly](#14-keep-exactly)
15. [Improve](#15-improve)
16. [Transform into Sireen](#16-transform-into-sireen)

---

## 1. OVERALL PHILOSOPHY

### 1.1 Design Philosophy of Kilo Code

Kilo Code's design philosophy is built on three core principles:

**1. The AI is a coworker, not a chat bot.**
- Every layout decision frames the AI as a collaborative partner sharing your workspace.
- The AI's actions appear alongside your code — not in a separate window.
- The AI has agency: it plans, edits, debugs, and runs commands. The interface reflects this by showing tool calls, thinking steps, and file edits as first-class citizens, not text.

**2. Speed is a feature.**
- The interface feels fast because it is non-blocking. Messages stream in real-time. Tool calls update as they execute. You never wait for a full response.
- Keyboard shortcuts for every major action. No mouse required for power users.
- Lazy loading, virtualization, and debouncing are built into the architecture.

**3. Clean means minimal cognitive load.**
- Visual hierarchy is flat. There are no nested menus, no deep navigation.
- Every screen shows exactly what you need for the current context.
- The design uses VS Code's native theme tokens, so it never feels foreign.
- Messages, tool calls, diffs, and errors each have distinct visual treatments — you can scan a conversation visually.

### 1.2 User Problems Solved

| Problem | Solution |
|---------|----------|
| AI coding tools feel like chat interfaces, not development tools | Framed as a sidebar panel within the IDE. AI actions render as structured UI (file diffs, tool calls, command outputs) not just text. |
| Hard to understand what the AI is doing | Streaming message display with real-time token rendering. Collapsible tool calls showing input/output. Thinking indicator during reasoning. |
| No visibility into AI's decision process | Tool calls render with expandable details. Each file edit shows a diff. Terminal commands show live output. |
| Managing multiple conversations is chaotic | Session management with history, search, and tab-based navigation in Agent Manager. |
| Context switching between AI and code is slow | Inline editing with accept/reject. Diff viewer integrated. Quick context menu actions (explain, fix, improve). |

### 1.3 Why It Feels Fast

- **Streaming:** The AI response renders character by character. No loading spinners for text.
- **Optimistic UI:** When the user sends a message, it appears immediately in the chat. No round-trip wait.
- **Virtualized lists:** Chat messages are virtualized. Thousands of messages render as fast as ten.
- **Debounced input:** The chat input area handles rapid typing without re-renders.
- **Lazy-loaded panels:** The Agent Manager, Diff Viewer, and Marketplace are separate webviews. They load on demand.
- **CSS animations:** Expand/collapse animations for tool calls use CSS transitions (GPU-accelerated).

### 1.4 Why It Feels Clean

- **Single-column chat:** No multi-column layouts. Left-to-right, top-to-bottom reading flow.
- **Consistent spacing:** 8px grid system. Every margin, padding, and gap is a multiple of 4px.
- **Minimal chrome:** No toolbar, no status bar within the webview. The header is thin.
- **Color is semantic:** Accent color is used sparingly — only for active states, buttons, and key indicators.
- **Typography hierarchy:** Message text, tool names, file paths, and metadata each have distinct sizes/weights.

### 1.5 Why It Feels Like an AI Coworker

- The AI has a **name** and **icon** in the chat header.
- The AI's responses appear in styled bubbles with a distinct background from user messages.
- The AI shows its **work** — not just its answers. Tool calls, file edits, and terminal commands are visible and interactive.
- The AI has **modes** (Architect, Coder, Debugger) that change its behavior, just like a human switching roles.
- The AI can be **interrupted** — clicking a different message or sending a new message cancels the current generation.

---

## 2. LAYOUT ARCHITECTURE

### 2.1 Overall Layout Structure

Kilo Code uses a **single-webview-per-panel** architecture. Each major view is a separate VS Code webview, loaded independently.

```
VS Code Window
├── Activity Bar (VS Code native)
│   └── Kilo Code icon → activates sidebar
├── Sidebar (Webview View)
│   └── Kilo Code SidebarProvider
│       ├── Header (thin strip with buttons)
│       ├── Chat Area (virtualized scrollable list)
│       │   ├── Welcome Screen (when no session active)
│       │   ├── Message List (user + AI messages)
│       │   │   ├── User Message Bubble
│       │   │   ├── AI Message Bubble (streaming)
│       │   │   ├── Tool Call Block (collapsible)
│       │   │   ├── File Edit Block (with diff link)
│       │   │   ├── Terminal Command Block
│       │   │   ├── Error Card
│       │   │   └── Thinking Indicator
│       │   └── Loading / Typing Indicator
│       ├── Chat Input Area (bottom)
│       │   ├── Mode Selector (dropdown)
│       │   ├── Model Selector (dropdown)
│       │   ├── Textarea (auto-resizing)
│       │   ├── Image Attachment Preview
│       │   ├── Toolbar Buttons
│       │   └── Send Button
│       └── Task Timeline (optional, in header)
├── Editor Tab (Webview Panel)
│   └── Kilo Code TabPanel — independent chat session
├── Agent Manager (Webview Panel)
│   ├── Sessions List (collapsible sidebar within)
│   ├── Chat Area (per-session)
│   ├── Terminal (embedded xterm)
│   └── Diff Panel (toggleable)
├── Diff Viewer (Webview Panel)
│   ├── File Tree (changed files)
│   ├── Diff Editor (side-by-side or unified)
│   └── Review Controls
├── Marketplace (Webview Panel)
│   ├── Category Filters
│   ├── Search
│   ├── Item Cards (grid)
│   └── Item Detail Modal
└── KiloClaw (Webview Panel)
    ├── Session Chat
    └── Input Area
```

### 2.2 Sidebar Layout (Primary Interface)

The sidebar is where most interaction happens. It has three vertical sections:

```
┌─────────────────────────────────┐
│  HEADER                         │  ~40px
│  [New+] [History] [Agents] [KC] │
│  [Market] [Profile] [Settings]  │
├─────────────────────────────────┤
│                                 │
│  CHAT AREA                      │  flex: 1 (scrollable)
│  - Virtualized message list     │
│  - Streams content in real-time │
│  - Auto-scrolls to bottom       │
│  - Collapsible tool calls       │
│  - Clickable file references    │
│  - Code blocks with copy btn    │
│  - Mermaid diagrams rendered    │
│  - Error cards with retry       │
│                                 │
│  ┌─────────────────────────┐    │
│  │ TASK TIMELINE (optional)│    │  collapsed by default
│  │ Graph of task progress  │    │
│  └─────────────────────────┘    │
│                                 │
├─────────────────────────────────┤
│  INPUT AREA                     │  auto-height
│  [Mode ▼] [Model ▼]            │
│  ┌─────────────────────────┐    │
│  │ Textarea (auto-resize)   │    │
│  │ @mentions support        │    │
│  │ /slash commands          │    │
│  │ Image paste/drop support │    │
│  └─────────────────────────┘    │
│  [📎] [🎤] [🧹] [Send ▶]       │
└─────────────────────────────────┘
```

### 2.3 Agent Manager Layout

The Agent Manager is a full tab panel. It has a left sidebar + main area + optional terminal/diff.

```
┌──────────────────────────────────────────────────────┐
│ HEADER: [Sessions ▼] [Terminal] [Diff] [Shortcuts]  │
├──────────┬───────────────────────────────────────────┤
│ SESSIONS │  CHAT / TERMINAL / DIFF                   │
│ LIST     │                                           │
│          │  Tab: [Chat] [Terminal] [Diff]            │
│ ┌──────┐ │                                           │
│ │Today │ │  Chat area (same as sidebar)              │
│ │  ●   │ │                                           │
│ │  ●   │ │  Or:                                       │
│ │  ●   │ │                                           │
│ ├──────┤ │  Embedded xterm terminal                  │
│ │Prev  │ │                                           │
│ │  ●   │ │  Or:                                       │
│ │  ●   │ │                                           │
│ └──────┘ │  Diff panel (side-by-side)                │
│          │                                           │
│ [+ New]  │                                           │
└──────────┴───────────────────────────────────────────┘
```

### 2.4 Key Layout Rules

1. **The input area is always visible** at the bottom. Never hidden, never behind a scroll.
2. **The chat area scrolls independently.** The header and input are fixed.
3. **Messages fill available width.** No sidebars within messages.
4. **Tool calls collapse to single-line rows** by default. Expand on click.
5. **Code blocks have a fixed max-height** (500px) with a "Show more" link.
6. **The session list in Agent Manager** is collapsible (hamburger menu toggle).

---

## 3. NAVIGATION SYSTEM

### 3.1 Navigation Model

Kilo Code uses a **hub-and-spoke** navigation model:

- **Hub:** The sidebar chat is the primary interface. All other panels are spokes.
- **Spokes:** Agent Manager, Diff Viewer, Marketplace, KiloClaw, Settings, Profile, History.

### 3.2 How Users Navigate

| Action | Method | Clicks | Shortcut |
|--------|--------|--------|----------|
| Start new task | Header "+" button or `New Task` command | 1 | Ctrl+Shift+A (focus chat) |
| Open history | Header history icon | 1 | — |
| Open Agent Manager | Header agents icon | 1 | Ctrl+Shift+M |
| Open KiloClaw | Header KiloClaw icon | 1 | — |
| Open Marketplace | Header marketplace icon | 1 | — |
| View profile | Header profile icon | 1 | — |
| Open settings | Header settings icon | 1 | — |
| Switch sessions (AM) | Arrow keys or click | 1 | Ctrl+Alt+↑/↓ |
| Switch tabs (AM) | Tab bar or arrow keys | 1 | Ctrl+Alt+←/→ |
| Cycle agent mode | — | 0 | Ctrl+. |
| Focus chat input | — | 0 | Ctrl+Shift+A |
| Toggle auto-approve | — | 0 | Ctrl+Alt+A |
| New worktree (AM) | — | 0 | Ctrl+N |
| Search (AM) | — | 0 | Ctrl+F |
| Toggle diff (AM) | — | 0 | Ctrl+D |
| Close tab (AM) | — | 0 | Ctrl+W |

### 3.3 Context Menus

**Editor context menu** (right-click in code):
```
Kilo Code
├── Explain Code       → sends selected code with "explain this"
├── Fix Code           → sends selected code with "fix issues in this"
├── Improve Code       → sends selected code with "improve this"
└── Add to Context     → adds selection as context (pins it)
```

**Terminal context menu** (right-click in terminal):
```
Kilo Code
├── Add Terminal Content to Context
├── Fix This Command
└── Explain This Command
```

### 3.4 Tab Navigation (Agent Manager)

The Agent Manager uses a **top tab bar** similar to VS Code's editor tabs:

- Each session gets a tab.
- Tabs show: session name, close button (×), optional sandbox icon.
- Tabs can be reordered (drag and drop using `@thisbeyond/solid-dnd`).
- Jump to tab position using Ctrl+1 through Ctrl+9.
- New tab: Ctrl+T.
- Close tab: Ctrl+W.

### 3.5 Session Navigation (Agent Manager)

Sessions are organized in a **collapsible sidebar list** within the Agent Manager:

- Grouped by date: "Today", "Yesterday", "Previous 7 Days", "Older".
- Each session shows: title (auto-generated from conversation), first message snippet, timestamp.
- Click to select → loads chat in the main area.
- Arrow keys: Ctrl+Alt+↑/↓ to navigate between sessions.
- Sessions can be moved to worktrees.
- Sessions can be forked.

### 3.6 Keyboard-First Design

Every major action has a keyboard shortcut. The philosophy is:
- **Power users never need a mouse** for common operations.
- **Discoverability** via the Keyboard Shortcuts panel (Ctrl+Shift+/ in Agent Manager).
- **Consistency** with VS Code conventions (Ctrl+W to close, Ctrl+F to search).

---

## 4. EVERY SCREEN

### 4.1 Welcome Screen (Empty State)

**Purpose:** First impression. Onboard new users. Quick access to recent sessions.

**Displayed:**
```
┌─────────────────────────────────┐
│  [Logo]                         │
│  "What do you want to build?"   │
│                                 │
│  ┌─────────────────────────┐    │
│  │ Quick start suggestions │    │
│  │ "Build a web server…"   │    │
│  │ "Explain this project…" │    │
│  │ "Refactor my code…"     │    │
│  └─────────────────────────┘    │
│                                 │
│  Recent Sessions (if any)       │
│  ┌─────────────────────────┐    │
│  │ ● Fix login bug         │    │
│  │ ● Add API endpoint      │    │
│  │ ● Refactor auth flow    │    │
│  └─────────────────────────┘    │
│                                 │
│  Model: [Kilo Auto ▼]          │
│  Mode: [Coder ▼]               │
└─────────────────────────────────┘
```

**States:**
- **First-time user:** No recent sessions. Show logo, tagline, and quick start suggestions.
- **Returning user:** Show recent sessions as clickable cards below the prompt area.
- **Loading:** Skeleton UI with placeholder shapes.
- **Error:** "Failed to load. [Retry]" with error details.

**Interactions:**
- Click a suggestion → prefills the input area.
- Click a recent session → opens that session.
- Start typing → input area focuses.

### 4.2 Chat Screen (Active Session)

**Purpose:** Primary work surface. Communicate with AI, review responses, iterate.

**Displayed:**
```
┌─────────────────────────────────┐
│  HEADER                         │
│  [← Back] Session Name    [...] │
│  Mode: [Coder ▼] Cost: $0.02   │
├─────────────────────────────────┤
│  MESSAGE LIST (virtualized)     │
│                                 │
│  ┌── USER ──────────────────┐   │
│  │ "Add error handling to   │   │
│  │  the login function"     │   │
│  │  [edit] [delete] 10:32AM │   │
│  └──────────────────────────┘   │
│                                 │
│  ┌── AI ────────────────────┐   │
│  │ Let me look at the       │   │
│  │ current login function…  │   │
│  └──────────────────────────┘   │
│                                 │
│  ▼ Tool: read_file             │
│  📁 src/auth/login.tsx          │
│  [Expanded: shows file content] │
│                                 │
│  ▼ Tool: edit_file             │
│  📝 src/auth/login.tsx         │
│  [+12 -3] [Show Diff]          │
│                                 │
│  ┌── AI ────────────────────┐   │
│  │ I've added error         │   │
│  │ handling. Here's what    │   │
│  │ changed…                 │   │
│  │                           │   │
│  │ ```typescript             │   │
│  │ try {                     │   │
│  │   await login(email,pw)  │   │
│  │ } catch (err) {           │   │
│  │   showError(err.message)  │   │
│  │ }                         │   │
│  │ ```                       │   │
│  └──────────────────────────┘   │
│                                 │
│  ┌── TOOL ERROR ────────────┐   │
│  │ ⚠ Command failed: npm    │   │
│  │   "Package not found"    │   │
│  │ [Retry] [Fix command]    │   │
│  └──────────────────────────┘   │
│                                 │
│  ┌── THINKING ──────────────┐   │
│  │ 🤔 Analyzing the         │   │
│  │    error pattern…        │   │
│  └──────────────────────────┘   │
│                                 │
├─────────────────────────────────┤
│  INPUT AREA                     │
│  Mode: [Coder ▼] Model:[... ▼] │
│  ┌─────────────────────────┐    │
│  │ Type a message…          │    │
│  │ @file.ts mentions        │    │
│  │ /slash commands          │    │
│  └─────────────────────────┘    │
│  [📎] [🎤] [🧹] [▶ Send]      │
└─────────────────────────────────┘
```

**States:**

| State | Appearance |
|-------|-----------|
| **Idle** | Input enabled. No messages streaming. |
| **Streaming** | AI message renders char by char. Input disabled. Typing indicator visible. |
| **Thinking** | Thinking bubble with "Analyzing…" text. Stops when first tool call or response text appears. |
| **Executing tool** | Tool call block shows spinner + "Running…". Output streams in. |
| **Awaiting approval** | Permission request card with [Approve] [Deny] buttons. |
| **Error** | Red error card with message and action buttons. |
| **Interrupted** | Last AI message shows "Stopped" badge. Input re-enabled. |

### 4.3 Agent Manager Screen

**Purpose:** Manage multiple sessions, worktrees, terminals, and diffs in one place.

**Layout:** Left sidebar (session list) + Main area (tabs: Chat/Terminal/Diff).

**Session List (Left Sidebar):**
```
┌─────────────────────┐
│ 🔍 Search sessions  │
│                     │
│ ▼ Today             │
│  ● Fix login bug    │
│  ● Add API route    │
│  ● Refactor auth    │
│                     │
│ ▼ Yesterday         │
│  ● Setup CI/CD      │
│  ● Write tests      │
│                     │
│ [+ New Session]     │
└─────────────────────┘
```

**Main Area Tabs:**
```
┌────────────────────────────────────────┐
│ [Chat] [Terminal] [Diff] [Run Script]  │
├────────────────────────────────────────┤
│                                        │
│  Chat: Same as sidebar chat            │
│                                        │
│  Terminal: Embedded xterm              │
│  ┌────────────────────────────────┐    │
│  │ $ npm run build               │    │
│  │ Building... done              │    │
│  │ $ _                           │    │
│  └────────────────────────────────┘    │
│                                        │
│  Diff: Side-by-side file comparison    │
│  ┌──────────┬─────────────────────┐    │
│  │ Files    │ src/auth/login.tsx   │    │
│  │ ──────── │  - old code         │    │
│  │ login.tsx│  + new code         │    │
│  │ api.ts   │  ← changes          │    │
│  └──────────┴─────────────────────┘    │
└────────────────────────────────────────┘
```

**States:**
- **Empty:** "No sessions yet. Create a new session to get started."
- **Loading:** Skeleton rows in session list.
- **Collapsed:** Sessions list hidden (hamburger toggle). Only main area visible.
- **Error:** "Failed to load sessions. [Retry]"

### 4.4 Diff Viewer Screen

**Purpose:** Review code changes made by the AI before accepting.

**Layout:** File tree (left) + Diff view (right).

```
┌──────────────────────────────────────────┐
│ Diff: Feature branch → main              │
│ [Accept All] [Reject All] [Close]        │
├──────────────┬───────────────────────────┤
│ Changed (3)  │ ┌─── login.tsx ────────┐  │
│ ● login.tsx  │ │ - old code here      │  │
│ ● api.ts     │ │ + new code here      │  │
│ ● types.d.ts │ │                      │  │
│              │ │ ╔═══════════════╗     │  │
│              │ │ ║  +12 -3       ║     │  │
│              │ │ ╚═══════════════╝     │  │
│              │ └───────────────────────┘  │
│              │                           │
│              │ [← Prev] [Next →]         │
└──────────────┴───────────────────────────┘
```

**States:**
- **Loading:** "Loading diff…"
- **No changes:** "No changes to review."
- **Empty diff (no selection):** "Select a file to view its diff."
- **Error:** "Failed to load diff. [Retry]"

### 4.5 Marketplace Screen

**Purpose:** Discover and install MCP servers, agents, skills, and extensions.

```
┌──────────────────────────────────────────┐
│ 🔍 Search marketplace...    [Categories] │
│                                          │
│ Category: [All] [Agents] [MCP] [Skills] │
│                                          │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐     │
│ │Card  │ │Card  │ │Card  │ │Card  │     │
│ │Icon  │ │Icon  │ │Icon  │ │Icon  │     │
│ │Name  │ │Name  │ │Name  │ │Name  │     │
│ │Desc  │ │Desc  │ │Desc  │ │Desc  │     │
│ │[Install]│[Installed]│[Install]│[Install]│
│ └──────┘ └──────┘ └──────┘ └──────┘     │
│                                          │
│                                  [Page 1]│
└──────────────────────────────────────────┘
```

### 4.6 Settings Screen

**Purpose:** Configure Kilo Code behavior, models, API keys, autocomplete, etc.

**Layout:** Tabbed settings panel.

```
┌──────────────────────────────────────────┐
│ Settings                                  │
│ [General] [Models] [Autocomplete] [More] │
├──────────────────────────────────────────┤
│                                          │
│ General Settings                         │
│ ┌─────────────────────────────────────┐  │
│ │ Font Size:        [13 ▲▼]          │  │
│ │ Language:         [English ▼]      │  │
│ │ Auto-Approve:     [Toggle]         │  │
│ │ Max Cost Alert:   [$0.00]          │  │
│ │ Browser Auto:     [Toggle]         │  │
│ │ Attention Sounds: [Toggle]         │  │
│ │ Show Task Timeline:[Toggle]        │  │
│ └─────────────────────────────────────┘  │
│                                          │
└──────────────────────────────────────────┘
```

### 4.7 Profile Screen

**Purpose:** View account details, balance, Kilo Pass status.

```
┌──────────────────────────────────────────┐
│ Profile                                   │
│                                          │
│ ┌─────────────────────────────────────┐  │
│ │ 👤 username@email.com              │  │
│ │ Balance: $5.23                     │  │
│ │ Kilo Pass: Active                  │  │
│ │                                    │  │
│ │ [Manage Account] [Sign Out]        │  │
│ └─────────────────────────────────────┘  │
│                                          │
│ Usage History                            │
│ ┌─────────────────────────────────────┐  │
│ │ Today:      $0.42                   │  │
│ │ This week:  $2.15                   │  │
│ │ This month: $8.90                   │  │
│ └─────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

### 4.8 History Screen

**Purpose:** Browse all past sessions organized by date.

```
┌──────────────────────────────────────────┐
│ History                                   │
│                                          │
│ 🔍 Search sessions...                    │
│                                          │
│ ▼ Today                                  │
│  ● Fix login redirect    10:30 AM  $0.05│
│  ● Add user profile page  9:15 AM  $0.12│
│                                          │
│ ▼ Yesterday                              │
│  ● Setup CI/CD pipeline   4:20 PM  $0.08│
│  ● Refactor auth module   2:00 PM  $0.15│
│                                          │
│ ▼ Last Week                              │
│  ● Write unit tests        Mon    $0.22 │
│  ● Initial project setup   Sun    $0.45 │
└──────────────────────────────────────────┘
```

---

## 5. COMPONENT LIBRARY

### 5.1 Message Bubble (User)

```typescript
// Visual properties
background: var(--vscode-input-background)  // uses VS Code theme
border-radius: 8px 12px 12px 12px
padding: 8px 12px
max-width: 85%
align-self: flex-end  // right-aligned
font-size: var(--vscode-font-size)

// Elements
- Avatar (user icon, top-right)
- Message text (markdown rendered)
- Timestamp (bottom-right, muted)
- File attachments (as chips below text)
- Image previews (thumbnail grid)
- Edit button (hover)
- Delete button (hover)
```

**States:**
- **Sent:** Normal appearance.
- **Streaming (N/A):** User messages don't stream.
- **Editing:** Textarea replaces rendered markdown. Cancel/Save buttons.
- **Error:** Red border, "Failed to send" message, [Retry] button.

### 5.2 Message Bubble (AI)

```typescript
// Visual properties
background: var(--vscode-textBlockQuote-background)
border-radius: 12px 12px 12px 8px
padding: 8px 12px
max-width: 85%
align-self: flex-start  // left-aligned
font-size: var(--vscode-font-size)

// Elements
- Avatar (Kilo logo, top-left)
- Message text (markdown rendered)
- Code blocks with syntax highlighting (Shiki)
- Copy button (hover on code blocks)
- Timestamp (when done streaming)
- Continue/Stop indicator
- Token usage (optional, collapsed)
- Feedback buttons (thumbs up/down, optional)
```

**States:**
- **Streaming:** Cursor animation at end of text. Text appears character by character.
- **Complete:** Full message with timestamp.
- **Interrupted:** "Stopped" badge. Partial content visible.
- **Error:** "Failed to generate response" with [Retry] button.

### 5.3 Tool Call Block

```typescript
// Visual properties
background: var(--vscode-sideBar-background)
border: 1px solid var(--vscode-widget-border)
border-radius: 8px
margin: 4px 0
overflow: hidden

// Collapsed view (default)
▶ Tool: read_file
📁 path/to/file.ts

// Expanded view
▼ Tool: read_file
📁 path/to/file.ts
────────────────────
<file content here>
────────────────────
Status: ✓ Completed in 0.3s
[Copy output]

// Elements
- Chevron icon (expand/collapse)
- Tool name with icon
- File path (if applicable)
- Status badge (Running, Completed, Failed)
- Duration
- Input arguments (JSON)
- Output/result (expandable)
- Copy button
```

**States:**
- **Pending:** Grey, "Waiting..."
- **Running:** Spinner animation, "Running..."
- **Completed:** Green checkmark, duration.
- **Failed:** Red X, error message, [Retry] button.
- **Expand/collapse:** Animated with CSS transition (height, opacity).

### 5.4 File Edit Block

```typescript
// Visual properties
border: 1px solid var(--vscode-diffEditor-insertedLineBackground, transparent)
border-radius: 8px
padding: 8px 12px
background: var(--vscode-sideBar-background)

// Elements
📝 filename.ts  [+12 -3]  [Show Diff]
- File icon (language-aware using VS Code file icons)
- Additions/Deletions count
- "Show Diff" button → opens diff viewer
- "Accept" button (inline)
- "Reject" button (inline)
```

**States:**
- **Pending:** Grey, "Pending edit..."
- **Applied:** Green, "✓ Applied"
- **Accepted:** Filled green checkmark.
- **Rejected:** Faded, strikethrough.
- **Error:** Red, "Failed to apply. [Retry]"

### 5.5 Terminal Command Block

```typescript
// Visual properties
background: var(--vscode-terminal-background)
color: var(--vscode-terminal-foreground)
font-family: var(--vscode-editor-font-family)
border-radius: 8px
padding: 8px 12px

// Elements
$ command text
│ output line 1
│ output line 2
Exit code: 0

// Actions
- [Rerun] button
- [Copy] button
```

**States:**
- **Running:** Blinking cursor after command.
- **Completed:** Output shown. Exit code.
- **Failed:** Red exit code. Error output.
- **Waiting approval:** [Approve] [Deny] buttons.

### 5.6 Permission Request Card

```typescript
// Visual properties
border: 1px solid var(--vscode-inputValidation-warningBorder)
border-radius: 8px
padding: 12px
background: var(--vscode-inputValidation-warningBackground)

// Elements
🔐 Kilo wants to run: npm install express
Path: /project/
[Approve] [Approve Always in this Workspace] [Deny]
[Auto-approve these commands? ⚙]
```

**States:**
- **Waiting:** Both buttons enabled. Pulsing border.
- **Approved:** Green border, "Approved" badge.
- **Denied:** Grey border, "Denied" badge.
- **Auto-approved:** No card shown. Silent approval.

### 5.7 Thinking Indicator

```typescript
// Visual properties
background: transparent
padding: 8px 12px
font-style: italic
opacity: 0.7

// Elements
🤔 Analyzing the request...
   ── ── ── (animated dots)
```

**States:**
- **Thinking:** Animated dots cycling.
- **Done:** Fades out when first output appears.
- **Extended thinking:** Shows reasoning effort indicator.

### 5.8 Error Card

```typescript
// Visual properties
border: 1px solid var(--vscode-inputValidation-errorBorder)
border-radius: 8px
padding: 12px
background: var(--vscode-inputValidation-errorBackground)

// Elements
⚠ Error title
Error message (detailed, monospace if technical)
[Retry] [Show Details] [Copy Error]
```

**States:**
- **Error:** Red card with message.
- **Retrying:** Spinner, "Retrying..."
- **Resolved:** Green border, "Resolved" badge.

### 5.9 Session Card (Welcome / History)

```typescript
// Visual properties
border-radius: 8px
padding: 12px
hover: background-lighten
cursor: pointer

// Elements
● Session title (auto-generated)
First few words of first message...
10:30 AM  •  $0.05
```

**States:**
- **Default:** Neutral background.
- **Hover:** Slightly lighter background.
- **Selected:** Accent border.
- **Active (has unread):** Bold title, blue dot.

### 5.10 Mode Selector

```typescript
// Visual properties
display: inline-flex
border-radius: 4px
padding: 2px 8px
font-size: 12px

// Elements
[ Coder ▼ ] or [ Plan ▼ ] or [ Debug ▼ ]

// Dropdown options
- Coder            (write and edit code)
- Architect        (plan and design)
- Debugger         (find and fix bugs)
- Custom modes…    (user-created)
```

**States:**
- **Closed:** Shows current mode.
- **Open:** Dropdown list with all modes.
- **Hover:** Highlight on hovered option.

### 5.11 Model Selector

```typescript
// Visual properties
display: inline-flex
border-radius: 4px
padding: 2px 8px
font-size: 12px

// Elements
[ Kilo Auto ▼ ]   ← sparkle icon for Auto

// Dropdown panel (larger, searchable)
🔍 Search models...
── Popular ──
  Kilo Auto ⭐          ← recommended
  Claude Sonnet 4.6
  GPT-5.5
── All Models ──
  ... (scrollable list)
[Show more providers →]
```

**States:**
- **Closed:** Shows current model.
- **Open:** Scrollable dropdown with search.
- **Loading:** "Loading models…" spinner.
- **Error:** "Failed to load models. [Retry]"

### 5.12 Button Variants

| Variant | Purpose | Visual |
|---------|---------|--------|
| **Primary** | Main action (Send, Approve) | Filled accent color |
| **Secondary** | Alternative action (Retry, Cancel) | Outlined / Ghost |
| **Icon** | Toolbar actions | 24x24 icon, no label |
| **Danger** | Destructive action (Delete) | Red text/outline |
| **Link** | Navigation | Text only, underline on hover |

**States:** Default, Hover, Active, Disabled, Loading (spinner).

### 5.13 Input Components

**Chat Textarea:**
- Auto-resizing (2-8 lines).
- `@file` mentions → autocomplete dropdown with file paths.
- `/` slash commands → command dropdown.
- Image paste/drop support.
- Formatted text preview (basic markdown).

**Search Input:**
- Used in Agent Manager and Marketplace.
- Clear button (×) when text is present.
- Debounced (300ms) search.
- Results update as user types.

---

## 6. STATE MANAGEMENT

### 6.1 State Architecture

Kilo Code uses a **Solid.js store-based** state architecture with **provider pattern** for context.

```
State Layers:
┌─────────────────────────────────────────┐
│  Global State                            │
│  - Theme (VS Code token integration)     │
│  - Connection status                     │
│  - Active session ID                     │
│  - Configuration (settings)             │
├─────────────────────────────────────────┤
│  Session State                           │
│  - Messages array                        │
│  - Current streaming message             │
│  - Tool calls in flight                  │
│  - Session metadata                      │
│  - Model / Mode selection                │
├─────────────────────────────────────────┤
│  UI State                                │
│  - Panel visibility                      │
│  - Scroll position                       │
│  - Expanded/collapsed tool calls         │
│  - Input draft text                      │
│  - Image attachments pending             │
│  - Model picker open/closed             │
├─────────────────────────────────────────┤
│  View State                              │
│  - Agent Manager: active tab             │
│  - Agent Manager: session list expanded  │
│  - Diff Viewer: active file             │
│  - Marketplace: search/category          │
│  - Settings: active tab                  │
└─────────────────────────────────────────┘
```

### 6.2 Key State Stores

**Chat Store:**
```
- messages: Message[]
- currentStreamingMessage: Message | null
- isStreaming: boolean
- isThinking: boolean
- activeToolCalls: ToolCall[]
- inputDraft: string
- attachments: Attachment[]
- selectedModel: string
- selectedMode: string
```

**Session Store:**
```
- sessions: Session[]
- activeSessionId: string | null
- sessionHistory: Map<DateGroup, Session[]>
- searchQuery: string
```

**UI Store:**
```
- expandedToolCalls: Set<string>
- expandedSections: Set<string>
- scrollPositions: Map<string, number>
- activeTab: string
- panelVisibility: Map<string, boolean>
```

### 6.3 State Persistence

| Data | Storage | Persistence |
|------|---------|-------------|
| Session messages | `.opencode/sessions/` (filesystem) | Disk |
| Configuration | VS Code `globalState` + `workspaceState` | Disk |
| UI preferences (model picker expanded) | `globalState` | Disk |
| Last used model | `globalState` | Disk |
| Input drafts | Per-session cache | Memory (cleared on session delete) |
| Scroll positions | Memory | Session only |
| Expanded tool calls | Memory | Session only |

### 6.4 State Transitions

**Message lifecycle:**
```
User sends → message added to list (optimistic)
  → AI responds → streaming message appears
  → AI calls tool → tool call block appears (running)
  → Tool completes → tool call updates (completed)
  → AI continues → more streaming text
  → AI finishes → streaming stops, timestamp added
```

**Session lifecycle:**
```
Create → empty chat
  → Send first message → first exchange
  → Continue conversation → more messages
  → Save session → persisted to disk
  → Close session → unloaded from memory
  → Reopen session → loaded from disk
  → Delete session → removed from disk
```

---

## 7. USER FLOW

### 7.1 Complete User Journey

#### Phase 1: First Launch

```
1. User opens VS Code
2. User clicks Kilo Code icon in Activity Bar
3. Sidebar opens → Welcome Screen shown
4. Welcome Screen shows:
   - Kilo Code logo
   - "What do you want to build?"
   - Quick start suggestions
   - Model: Kilo Auto (default)
   - Mode: Coder (default)
5. User optionally selects Model/Mode
6. User types a message
```

#### Phase 2: Sending a Message

```
1. User types in the textarea (auto-resizing)
2. User can @mention files (autocomplete appears)
3. User can paste images (thumbnail preview appears)
4. User can type /slash commands (dropdown appears)
5. User clicks Send (or press Enter)
6. Message appears immediately in the chat (right-aligned)
7. Input area clears
8. AI typing indicator appears
```

#### Phase 3: AI Responds

```
1. Thinking indicator shows ("Analyzing...")
2. AI sends a tool call: read_file
   → Tool call block appears (collapsed, shows "Running...")
3. AI sends first text tokens
   → Message bubble appears, text streams in
4. AI sends another tool call: edit_file
   → Tool call block appears
5. Tool completes
   → Tool call shows "✓ Completed" with diff summary
6. AI continues streaming text
7. User sees the response forming in real-time
```

#### Phase 4: Reviewing Changes

```
1. AI proposes file edits
2. Each edit shows: filename, +/- count, [Show Diff]
3. User clicks [Show Diff]
4. Diff Viewer webview opens
5. Shows side-by-side comparison
6. User scrolls through changes
7. User can accept individual changes or all
8. User closes diff viewer
```

#### Phase 5: Managing Sessions

```
1. User opens Agent Manager (Ctrl+Shift+M)
2. Sees all sessions grouped by date
3. Clicks a session to resume it
4. Sees the full conversation history
5. Can switch between Chat/Terminal/Diff tabs
6. Can create new worktree for experimental changes
7. Can fork a session from any point
```

#### Phase 6: Completion

```
1. AI signals task complete
2. Optionally shows completion notification (if panel is hidden)
3. User reviews all changes
4. User approves changes
5. User can start a new task
```

### 7.2 Decision Tree for AI Interaction

```
User sends message
├── AI requires tool execution?
│   ├── Yes → Show permission request (if not auto-approved)
│   │   ├── User approves → Execute tool
│   │   └── User denies → AI receives denial, adapts
│   └── No → AI generates text response
├── AI requires browsing?
│   ├── Yes → Browser session starts (if enabled)
│   │   ├── Screenshots taken
│   │   └── Results fed back to AI
│   └── No → Continue text response
├── AI finishes response
│   ├── More steps needed? → Loop back
│   └── Task complete? → Done
└── User interrupts?
    ├── Yes → Cancel generation, re-enable input
    └── No → Continue streaming
```

---

## 8. AI INTERACTION MODEL

### 8.1 Streaming Architecture

The AI response is a **stream of events** from the backend:

```
Event types:
- text:        "Adding error handling..."
- tool_start:  { tool: "read_file", input: { path: "..." } }
- tool_output: { tool: "read_file", output: "..." }
- text:        "I've updated the file."
- tool_start:  { tool: "edit_file", input: { ... } }
- tool_output: { tool: "edit_file", output: "..." }
- finish:      { reason: "complete" }
```

Each event type maps to a UI component:

| Event | UI Component | Behavior |
|-------|-------------|----------|
| `text` | AI Message Bubble | Appends text character by character |
| `tool_start` | Tool Call Block | Creates collapsed block, shows "Running..." |
| `tool_output` | Tool Call Block | Updates block with output, marks "Completed" |
| `tool_error` | Tool Call Block (Error) | Shows error state, [Retry] button |
| `permission_request` | Permission Card | Blocks execution until approved/denied |
| `finish` | — | Stops streaming, adds timestamp, shows token usage |

### 8.2 Thinking Indicator

- Shown when the AI is reasoning before responding.
- Animated dots with cycling opacity.
- Text updates periodically ("Analyzing your code...", "Checking dependencies...").
- Disappears when first text or tool call appears.
- For extended thinking (reasoning models), shows a progress-like indicator.

### 8.3 Tool Call Visualization

Each tool call is rendered as a **collapsible card**:

**Collapsed view:**
```
▶ Tool: read_file
📁 src/utils/helpers.ts
```

**Expanded view:**
```
▼ Tool: read_file                Status: ✓ 0.3s
📁 src/utils/helpers.ts
─────────────────────────────────
<file content>
─────────────────────────────────
[Copy Output]
```

**Special tool renderings:**
- `edit_file`: Shows +/- diff counts, "Show Diff" link
- `terminal`: Shows command + live output (xterm-like)
- `browser`: Shows screenshot thumbnail
- `subagent`: Shows subagent session link

### 8.4 Conversation Memory

- Messages are persisted to disk (`.opencode/sessions/`).
- Session metadata includes: title, model, mode, timestamps, token usage.
- When reopening a session, the full message history is loaded.
- Sessions can be searched by title or content.
- Message editing (planned): edit a user message and re-run from that point.

### 8.5 Task Planning

- In Plan mode, the AI creates structured plans.
- Plans can be exported as `.md` files to `/plans/`.
- Plan mode ends with an "Implement" / "Keep refining" choice panel.
- Other modes (Coder, Debug) don't require explicit plans.

### 8.6 Mode System

Agents/Modes change the AI's behavior:

| Mode | Behavior | Use Case |
|------|----------|----------|
| **Coder** | Full coding capabilities. Can edit files, run commands. | General development |
| **Architect** | Designs solutions, writes plans. Limited file editing. | Planning and design |
| **Debugger** | Focused on finding and fixing bugs. | Troubleshooting |
| **Custom** | User-defined modes with custom prompts. | Specific workflows |

The mode selector is always visible in the input area. Users can cycle modes with `Ctrl+.`.

---

## 9. VISUAL DESIGN SYSTEM

### 9.1 Theme System

Kilo Code uses VS Code's native CSS custom properties for theming:

```css
/* VS Code theme tokens used directly */
--vscode-editor-background
--vscode-editor-foreground
--vscode-sideBar-background
--vscode-sideBar-foreground
--vscode-input-background
--vscode-input-foreground
--vscode-input-border
--vscode-button-background
--vscode-button-foreground
--vscode-button-hoverBackground
--vscode-textBlockQuote-background
--vscode-widget-border
--vscode-focusBorder
--vscode-inputValidation-errorBorder
--vscode-inputValidation-errorBackground
--vscode-inputValidation-warningBorder
--vscode-inputValidation-warningBackground
--vscode-diffEditor-insertedLineBackground
--vscode-diffEditor-removedLineBackground
--vscode-terminal-background
--vscode-terminal-foreground
--vscode-list-hoverBackground
--vscode-list-activeSelectionBackground
--vscode-list-activeSelectionForeground
```

Additionally, Kilo UI defines its own design tokens (from the `@kilocode/kilo-ui` package):

```css
--background-base
--text-base
--accent-primary
--border-subtle
```

**Theme modes:**
- **Kilo VS Code** (default): Inherits VS Code theme tokens.
- **Kilo** (standalone): Internal theme with dark/light variants.

### 9.2 Spacing System

Based on a **4px grid**:

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | 4px | Tight padding, icon gaps |
| `--space-2` | 8px | Button padding, card padding |
| `--space-3` | 12px | Message padding |
| `--space-4` | 16px | Section gaps |
| `--space-5` | 20px | Chat gap between messages |
| `--space-6` | 24px | Panel padding |
| `--space-8` | 32px | Large section gaps |

### 9.3 Typography

Kilo Code uses VS Code's font settings:

```css
/* UI text */
font-family: var(--vscode-font-family)         /* system UI font */
font-size: var(--vscode-font-size)              /* default: 13px */
font-weight: var(--vscode-font-weight)

/* Code blocks */
font-family: var(--vscode-editor-font-family)   /* monospace */
font-size: var(--vscode-editor-font-size)       /* default: 14px */
```

**Type scale:**
| Element | Size | Weight |
|---------|------|--------|
| Heading 1 | 18px | 600 |
| Heading 2 | 15px | 600 |
| Heading 3 | 13px | 600 |
| Body | 13px | 400 |
| Small / Meta | 11px | 400 |
| Code | editor font size | 400 |

### 9.4 Icon System

Kilo Code uses:
- **VS Code Codicons** for UI actions (add, search, settings, gear, etc.)
- **Custom branded icon font** (`kilo-icon-font.woff2`) for the Kilo logo.
- File icons inherited from VS Code's language icon system.

Icon sizes:
- Toolbar icons: 16x16px
- Message action icons: 14x14px
- Status indicators: 12x12px
- File icons: 16x16px

### 9.5 Borders & Radius

| Element | Radius | Border |
|---------|--------|--------|
| Message bubbles | 8-12px | None |
| Cards | 8px | 1px solid var(--border-subtle) |
| Buttons | 4px | 1px solid transparent |
| Input fields | 4px | 1px solid |
| Dropdowns | 4px | 1px solid |
| Tool call blocks | 8px | 1px solid |
| Code blocks | 4px | None |

### 9.6 Shadows / Elevation

Uses VS Code theme shadows:
```css
box-shadow: 0 2px 8px var(--vscode-widget-shadow)
```

Applied to:
- Dropdown menus
- Modal dialogs
- Tooltips
- Context menus

### 9.7 Hover & Focus Effects

| Element | Hover | Focus |
|---------|-------|-------|
| Buttons | Background lighten | Focus ring (2px solid accent) |
| Session cards | Background lighten | — |
| Tool calls | Border highlight | — |
| Links | Underline | — |
| Clickable rows | Background lighten | — |

### 9.8 Animations & Transitions

| Element | Animation | Duration | Easing |
|---------|-----------|----------|--------|
| Tool call expand/collapse | Height + opacity transition | 200ms | ease-in-out |
| Message streaming | Character reveal | real-time | — |
| Thinking dots | Opacity cycling | 1s loop | ease-in-out |
| Dropdown open | Fade + slight scale | 150ms | ease-out |
| Hover state | Background color | 150ms | ease |
| Tab switch | Fade | 150ms | ease |
| Permission card pulse | Border color | 2s loop | ease-in-out |

### 9.9 Color Usage Rules

- **Accent color** (VS Code button background): Used sparingly for primary actions.
- **Green**: Success, completed, added lines.
- **Red**: Error, failed, removed lines.
- **Yellow/Orange**: Warnings, pending, attention needed.
- **Blue**: Links, information, AI indicators.
- **Grey**: Metadata, timestamps, disabled states.

---

## 10. VS CODE INTEGRATION

### 10.1 Extension Contribution Points

| Point | What Kilo Code Contributes |
|-------|---------------------------|
| `activitybar` | Kilo Code icon in Activity Bar |
| `views` | Sidebar webview (`kilo-code.SidebarProvider`) |
| `commands` | 40+ commands (new task, history, settings, etc.) |
| `keybindings` | 30+ keyboard shortcuts |
| `menus` | Editor context menu, terminal context menu, SCM menu |
| `configuration` | 20+ user-configurable settings |
| `icons` | Custom Kilo logo icon font |

### 10.2 Webview Architecture

Each panel is a separate **webview**:

| Panel | Webview Type | Route |
|-------|-------------|-------|
| Sidebar Chat | `WebviewView` (sidebar) | `kilo-code.SidebarProvider` |
| Tab Chat | `WebviewPanel` (editor tab) | `kilo-code.new.TabPanel` |
| Agent Manager | `WebviewPanel` | `kilo-code.new.AgentManagerPanel` |
| Diff Viewer | `WebviewPanel` | `kilo-code.new.DiffPanel` |
| Marketplace | `WebviewPanel` | — |
| KiloClaw | `WebviewPanel` | — |

### 10.3 Message Passing (Extension ↔ Webview)

```
Extension (Node.js)           Webview (Solid.js)
┌──────────────┐             ┌──────────────────┐
│              │  postMessage │                  │
│  ServerManager◄────────────►│  Chat Components │
│  CLI Bridge  │             │  State Stores    │
│  File System │             │  UI Components   │
│  VS Code API │             │                  │
└──────────────┘             └──────────────────┘
     │                              │
     │ CLI Process                  │
     ▼                              │
┌──────────┐                       │
│ Kilo CLI │────────────────────────┘
│ (sandbox)│  Events via SSE
└──────────┘
```

**Message types:**
- `config`: Settings from VS Code → webview
- `session:list`, `session:open`, `session:save`: Session management
- `chat:send`: User message → backend
- `chat:stream`: AI response tokens → webview
- `tool:start`, `tool:output`, `tool:error`: Tool execution events
- `permission:request`, `permission:response`: Permission flow
- `model:list`, `model:change`: Model management
- `theme:change`: VS Code theme → webview

### 10.4 Editor Integration

- **Inline autocomplete:** Provides code suggestions as you type (via VS Code's inline completion API).
- **Code actions:** Context menu has Explain, Fix, Improve, Add to Context.
- **SCM integration:** Commit message generation button in source control input.
- **Diff editor:** Opens VS Code's native diff editor for change review.
- **File references:** Clickable file paths in chat messages open files in editor.

### 10.5 Terminal Integration

- **Command generation:** Generate terminal commands from natural language.
- **Command explanation:** Explain what a terminal command does.
- **Error fixing:** Fix a failed terminal command.
- **Terminal context:** Add terminal output to AI context.

### 10.6 Status Bar & Notifications

- **Task completion notification:** VS Code toast when task completes (panel hidden).
- **Permission request notification:** Warning toast when AI needs input.
- **Output channel:** Dedicated "Kilo Code" output channel for logs.
- **Account balance:** Shown in VS Code's account menu area.

---

## 11. ARCHITECTURE

### 11.1 Technology Stack

| Layer | Technology |
|-------|-----------|
| UI Framework | Solid.js (v1.9.11) |
| Build | esbuild + esbuild-plugin-solid |
| Styling | CSS custom properties (VS Code theme tokens) |
| State Management | Solid.js stores + context providers |
| Virtualization | `virtua` (virtual scroller) |
| Drag & Drop | `@thisbeyond/solid-dnd` |
| Markdown | `marked` |
| Syntax Highlighting | Shiki (web worker) |
| Diagrams | Mermaid |
| Math | KaTeX |
| Terminal | xterm.js (@xterm/xterm) |
| Fuzzy Search | fuzzysort |
| Diff Engine | `diff` + `@pierre/diffs` |

### 11.2 Component Hierarchy

```
<App>
  <ThemeProvider>            ← provides CSS vars, theme context
    <ConnectionProvider>     ← WebSocket/SSE connection to CLI
      <ConfigProvider>       ← VS Code settings
        <SessionProvider>    ← active session state
          <ChatContainer>    ← main layout
            <ChatHeader />  ← mode, model, cost, actions
            <MessageList>   ← virtualized
              <WelcomeScreen />   ← or
              <MessageGroup>
                <UserMessage />
                <AIMessage>
                  <StreamingText />
                  <ToolCallBlocks>
                    <ToolCallCard />
                    <FileEditCard />
                    <TerminalCard />
                  </ToolCallBlocks>
                  <ErrorCard />
                  <ThinkingIndicator />
                </AIMessage>
              </MessageGroup>
            </MessageList>
            <ChatInput>
              <ModeSelector />
              <ModelSelector />
              <Textarea />
              <AttachmentPreview />
              <InputToolbar />
            </ChatInput>
          </ChatContainer>
        </SessionProvider>
      </ConfigProvider>
    </ConnectionProvider>
  </ThemeProvider>
</App>
```

### 11.3 Folder Structure (from knip.json)

```
webview-ui/
├── agent-manager/
│   └── index.tsx
├── diff-viewer/
│   └── index.tsx
├── diff-virtual/
│   └── index.tsx
├── kiloclaw/
│   └── index.tsx
├── marketplace/
│   └── index.tsx
├── src/
│   ├── index.tsx          ← main entry
│   ├── components/        ← shared UI components
│   ├── stores/            ← Solid.js stores
│   ├── providers/         ← context providers
│   ├── hooks/             ← custom hooks
│   ├── styles/            ← CSS files
│   │   ├── chat.css
│   │   └── ...
│   └── utils/             ← helpers
└── pierre-worker.ts       ← background worker
```

### 11.4 Event Flow

```
User types message
  → ChatInput component captures submit
  → Calls sessionStore.sendMessage(text)
  → store sends message via ConnectionProvider
  → Extension receives message via postMessage
  → Extension forwards to CLI process (stdin)
  → CLI processes through AI model
  → CLI emits events via SSE
  → Extension receives events
  → Extension posts events to webview
  → Webview connection handler processes events
  → ChatStore updates messages/streaming state
  → Solid.js reactivity updates UI components
  → Components re-render affected parts only
```

---

## 12. PERFORMANCE

### 12.1 Virtualization

- **Message list** uses `virtua` virtual scroller.
- Only visible messages + a small buffer are rendered in the DOM.
- Thousands of messages can be in a session without performance impact.
- This is the single most important performance optimization.

### 12.2 Lazy Loading

- **Webviews loaded on demand:** Each panel (Agent Manager, Diff Viewer, Marketplace) is a separate webview loaded only when opened.
- **Syntax highlighting** runs in a Web Worker (`shiki-worker.js`), off the main thread.
- **Model catalog** loaded on demand (not on startup for the sidebar, but the model picker expanded default preloads).
- **Session list** in Agent Manager loads sessions lazily.

### 12.3 Caching

- **Model list** cached in memory during session.
- **Last used model** persisted in `globalState`.
- **File content** cached per tool call to avoid re-reads.
- **Theme tokens** inherited from VS Code (no additional CSS loading).

### 12.4 Debouncing & Batching

- **Search inputs** debounced at 300ms.
- **Scroll position saves** debounced.
- **Typing in chat input** doesn't trigger any backend calls.
- **Attachment processing** done synchronously on drop/paste (no batching needed).

### 12.5 Streaming Optimizations

- **Character-by-character rendering** uses efficient DOM updates (not full re-renders).
- **Tool call updates** update only the specific tool block, not the entire message.
- **Concurrent tool execution** updates are batched per-event.

### 12.6 Memory Management

- **Input drafts cleared** on session delete to free memory.
- **Image attachments** freed when no longer needed.
- **Session data loaded from disk** only when session is active.
- **Unsaved prompt text** not retained across session switches.

---

## 13. UX DECISIONS & RATIONALE

### 13.1 Why Is the Chat Single-Column?

**Decision:** Messages flow in a single vertical column. No split panes, no side panels in the chat.

**Rationale:**
- Reading flows top-to-bottom. This is natural and requires no cognitive parsing.
- Multi-column layouts require users to scan left-to-right, which breaks reading flow.
- Single column works at any sidebar width (VS Code sidebar can be narrow).
- It forces simplicity — no complex grid layouts needed.

**Could it be improved?** Not for this use case. Single-column chat is the right choice.

### 13.2 Why Are Tool Calls Collapsible by Default?

**Decision:** Tool calls show as single-line rows with a chevron. Expand on click.

**Rationale:**
- The AI's reasoning text is the primary output. Tool calls are supporting evidence.
- Showing full tool inputs/outputs would dominate the chat and hide the narrative.
- Users scan for what the AI did, not how it did it. The collapsed row tells them: "read_file", "edit_file".
- Power users can expand to see details. The information is not hidden, just compressed.

**Could it be improved?** Yes. Add a visual indicator of tool complexity (e.g., a progress bar for long-running tools).

### 13.3 Why Is the Input Always Visible?

**Decision:** The textarea and send button are always pinned at the bottom.

**Rationale:**
- The user's primary action is typing. Never make the user scroll to find the input.
- It creates a consistent mental model: conversation above, composition below.
- Research shows fixed input areas reduce cognitive load in chat interfaces.

**Could it be improved?** The input area could collapse to an icon when the user scrolls up in very long conversations, like mobile chat apps do.

### 13.4 Why Are Messages Right-Aligned (User) and Left-Aligned (AI)?

**Decision:** User messages are right-aligned. AI messages are left-aligned.

**Rationale:**
- Creates a clear visual distinction between who said what.
- Follows the standard chat UI convention (iMessage, WhatsApp, etc.).
- Makes the conversation scannable — you can find your messages by looking right.

**Could it be improved?** Some users prefer top-to-bottom with labels. Offer alignment as a setting.

### 13.5 Why Use VS Code Theme Tokens Instead of a Custom Theme?

**Decision:** CSS custom properties from VS Code are used directly.

**Rationale:**
- Zero configuration needed. The extension automatically matches any VS Code theme.
- No theme switching UI to build. VS Code handles it.
- Users who've customized their IDE keep that customization.
- Accessibility: respects VS Code's high-contrast themes.

**Could it be improved?** No. This is the correct architectural decision for a VS Code extension.

### 13.6 Why Separate Webviews per Panel?

**Decision:** Each major view (sidebar, Agent Manager, diff, marketplace) is a separate webview.

**Rationale:**
- Independent lifecycle. Closing the marketplace doesn't affect the chat.
- Memory efficiency. Unused webviews can be disposed.
- Isolation. A crash in the diff view doesn't affect the chat.
- Separate bundles. Smaller initial load per view.

**Could it be improved?** Yes — shared component code at the architecture level (there is via `@kilocode/kilo-ui`).

### 13.7 Why Is the Agent Manager a Separate Panel (Not the Sidebar)?

**Decision:** Session management is a separate webview panel, not part of the main sidebar.

**Rationale:**
- The sidebar is focused on the current conversation. Adding session management would clutter it.
- Session management requires a different layout (list + detail), which needs more space.
- Users who want quick sessions use the sidebar. Users who need multi-session management use the Agent Manager.

**Could it be improved?** The sidebar could show a mini session list in a collapsible section.

### 13.8 Why Auto-Approve?

**Decision:** Users can enable auto-approve to skip permission prompts.

**Rationale:**
- Power users who trust the AI don't want to click "Approve" 50 times.
- Permission prompts interrupt flow. Auto-approve keeps the user in the zone.
- The work style setting (Human-in-the-loop vs. Autonomous) lets users choose their comfort level.

**Could it be improved?** Per-command-type auto-approve (e.g., auto-approve reads but require approval for writes).

### 13.9 Why Show Token Usage and Cost?

**Decision:** Cost and token usage are displayed in the session header.

**Rationale:**
- Users need to be aware of spending, especially with pay-per-token models.
- It builds trust. Transparency about usage prevents bill shock.
- Power users optimize prompts based on token usage feedback.

**Could it be improved?** Show per-message cost breakdown, not just session total.

### 13.10 Why Is There a Welcome Screen?

**Decision:** When no session is active, show a branded welcome screen, not an empty chat.

**Rationale:**
- First impressions matter. A blank input invites typing but doesn't guide.
- The welcome screen shows: logo (branding), suggestions (onboarding), recent sessions (recovery).
- It communicates capability before the user types anything.

**Could it be improved?** Let users customize the welcome screen suggestions.

---

## 14. KEEP EXACTLY

The following design decisions and implementations should be preserved exactly:

1. **Single-column chat layout.** Don't change this.

2. **Fixed input area at the bottom.** Always visible.

3. **Collapsible tool call blocks.** Expand on click, collapsed by default.

4. **VS Code theme integration.** Use native CSS custom properties. Don't build a custom theme.

5. **Separate webviews per major panel.** Sidebar, Agent Manager, Diff Viewer, Marketplace.

6. **Virtualized message list.** Don't remove virtualization.

7. **Real-time streaming of AI responses.** Character-by-character rendering.

8. **Right-aligned user messages, left-aligned AI messages.**

9. **Collapsible session list** in Agent Manager.

10. **Keyboard shortcuts for every major action.** Ctrl+Shift+A, Ctrl+., Ctrl+Shift+M, etc.

11. **Message persistence to disk** (`.opencode/sessions/`).

12. **Permission request flow** with Approve/Deny/Auto-approve.

13. **Mode/Model selector** in the input area (not in a separate settings panel).

14. **Markdown rendering** with syntax-highlighted code blocks and copy buttons.

15. **Error cards** with retry actions rather than silent failures.

16. **Session grouping by date** in history and Agent Manager.

17. **Drag-and-drop image support** in chat input (with Shift+Drop workaround).

18. **Context menu actions** (Explain, Fix, Improve, Add to Context).

19. **Thinking indicator** during AI reasoning.

20. **Tab-based navigation** in Agent Manager.

---

## 15. IMPROVE

These are areas where the Kilo Code UX could be improved:

1. **Pin/unpin important messages.** Allow users to pin key AI responses to the top of the chat for quick reference.

2. **Search within a session.** Currently, you can search sessions, but not within a single long conversation.

3. **Message bookmarks.** Let users bookmark specific messages or tool outputs for later reference.

4. **Per-message cost breakdown.** Show the cost of each AI response, not just the session total.

5. **Session export.** Export a session as Markdown or JSON.

6. **Customizable welcome screen.** Let users change the quick suggestions.

7. **Split-view for side-by-side chat and diff.** Instead of opening a separate panel, show diff inline or in a split pane.

8. **Input area shortcuts.** Show available shortcuts (like @mentions, /commands) as a small reference panel.

9. **Conversation branching.** Visualize how sessions fork from each other in the Agent Manager.

10. **Tool call keyboard navigation.** Use arrow keys to navigate between tool call blocks when one has focus.

11. **Hibernation of inactive sessions.** Automatically unload session data for sessions not accessed in 24h.

12. **Swipe-to-delete** on session list items (for touch/tablet users).

13. **Multi-model conversations.** Use different models for different parts of the same conversation.

---

## 16. TRANS
# SIREEN — Design System & UX Reference

> **Version:** 1.0.0
> **Status:** Official Design Reference
> **Purpose:** Single source of truth for all Sireen product design decisions. Every AI agent and human developer building Sireen MUST follow this document.
> **Design Philosophy:** *"Working beside an elite security engineer"* — not "chatting with ChatGPT." The interface is an investigation desk, not a chat window.

---

## TABLE OF CONTENTS

**Part 0 — Product Fundamentals**
- 0.1 Product Identity
- 0.2 Design Philosophy
- 0.3 Target Users
- 0.4 Design Principles
- 0.5 The Researcher Workflow

**Part 1 — Design Tokens**
- 1.1 Color System
- 1.2 Typography
- 1.3 Spacing & Grid
- 1.4 Elevation & Shadows
- 1.5 Border Radius
- 1.6 Animation & Motion
- 1.7 Z-Index System
- 1.8 Breakpoints
- 1.9 Iconography

**Part 2 — Layout Architecture**
- 2.1 Workspace Structure
- 2.2 Sidebar Layout
- 2.3 Main Content Area
- 2.4 Panel System
- 2.5 Webview Architecture

**Part 3 — Navigation**
- 3.1 Information Architecture
- 3.2 Primary Navigation
- 3.3 Secondary Navigation
- 3.4 Cross-Session Navigation
- 3.5 Keyboard Shortcuts

**Part 4 — Screen Specifications**
- 4.1 Welcome Screen (Investigation Start)
- 4.2 Investigation Chat
- 4.3 Threat Map
- 4.4 Findings
- 4.5 Timeline
- 4.6 Evidence Locker
- 4.7 Live Attack Workspace
- 4.8 Simulation Viewer
- 4.9 Report Viewer
- 4.10 Bug Bounty Dashboard
- 4.11 War Room (Session Manager)
- 4.12 Settings

**Part 5 — Component Library**
- 5.1 Finding Card
- 5.2 Threat Graph Node
- 5.3 Exploit Simulation Block
- 5.4 Evidence Attachment
- 5.5 Timeline Event
- 5.6 Vulnerability Path
- 5.7 Message Bubbles
- 5.8 Tool Call Block
- 5.9 Attack Hypothesis Card
- 5.10 Status Badge
- 5.11 Severity Badge
- 5.12 Buttons
- 5.13 Input Components
- 5.14 Selectors
- 5.15 Permission Card
- 5.16 Error Card
- 5.17 Thinking Indicator
- 5.18 Progress & Streaming Indicators
- 5.19 Empty State
- 5.20 Loading Skeleton
- 5.21 Toast & Notification
- 5.22 Panel Container
- 5.23 Investigation Header
- 5.24 Workspace Tabs

**Part 6 — AI Interaction Model**
- 6.1 Streaming Architecture
- 6.2 Response Format
- 6.3 Tool Call Visualization
- 6.4 Thinking & Reasoning
- 6.5 Permission Flow
- 6.6 Interruption Model
- 6.7 Evidence Presentation

**Part 7 — State Management**
- 7.1 State Layers
- 7.2 Store Definitions
- 7.3 State Persistence Strategy
- 7.4 State Transitions
- 7.5 Universal Screen States

**Part 8 — User Flows**
- 8.1 Complete Investigation Journey
- 8.2 Quick Recon Flow
- 8.3 Exploit Development Flow
- 8.4 Reporting Flow
- 8.5 Bounty Hunting Flow

**Part 9 — Accessibility**
- 9.1 Keyboard Navigation
- 9.2 Focus Management
- 9.3 Screen Reader Support
- 9.4 Color Contrast
- 9.5 Reduced Motion
- 9.6 High Contrast Mode

**Part 10 — Performance**
- 10.1 Rendering Strategy
- 10.2 Virtualization
- 10.3 Lazy Loading
- 10.4 Caching Strategy
- 10.5 Streaming Optimizations
- 10.6 Memory Management

**Part 11 — UX Decisions & Rationale**

---

## PART 0 — PRODUCT FUNDAMENTALS

### 0.1 Product Identity

**Sireen is NOT an "AI Smart Contract Auditor."**

Sireen is an **AI-native Offensive Security Workspace** — the environment where elite Web3 security researchers collaborate with AI to discover, validate, and report vulnerabilities.

| Category | Sireen's Identity |
|----------|-------------------|
| **What it does** | Vulnerability discovery, exploit development, security validation |
| **How it works** | AI-assisted threat modeling, simulation, and evidence collection |
| **Who it's for** | Professional white-hat hackers and security researchers |
| **Output** | Verified findings, proof-of-concept exploits, security patches, audit reports |

**The core shift from AI coding tools:**
- Code generation → Vulnerability discovery
- File editing → Protocol analysis
- Terminal commands → Exploit simulation
- Task automation → Threat modeling
- Coding modes → Investigation modes (Recon/Analyze/Exploit/Patch)
- Sessions are coding tasks → Sessions are security investigations
- Output: working code → Output: findings, proofs, patches
- AI is a coding coworker → AI is an elite security researcher

### 0.2 Design Philosophy

**"Working beside an elite security engineer" means:**

1. **The AI thinks like an attacker.** It doesn't just explain vulnerabilities — it demonstrates them with proof-of-concept exploits. It shows the attack path, not just the bug.

2. **Evidence is first-class.** Every finding is backed by evidence: transaction traces, code paths, execution flows. The interface makes evidence visible and explorable.

3. **The workspace is an investigation desk.** Not a chat window. You have pins, evidence boards, exploit simulations running in the background, and a security timeline.

4. **Speed means iteration speed.** Finding a vulnerability requires trying 20 things quickly. The interface must not slow down rapid hypothesis testing.

5. **Trust is earned through transparency.** Every analysis step is visible. Every conclusion is traceable. The AI shows its reasoning, not just its answers.

### 0.3 Target Users

| User Type | Primary Need | How Sireen Serves Them |
|-----------|-------------|----------------------|
| **Professional Web3 White Hat Hacker** | Find critical vulnerabilities before black hats do | Rapid recon → exploit simulation → validated PoC |
| **Security Researcher** | Understand protocol security deeply | Threat maps, data flow analysis, attack path exploration |
| **Protocol Security Engineer** | Verify their own protocol's security | Continuous audit workflows, patch validation |
| **Audit Company Analyst** | Produce thorough audit reports | Evidence collection, structured findings, report generation |
| **Advanced Solidity Developer** | Write secure contracts from the start | Real-time vulnerability feedback during development |

### 0.4 Design Principles

1. **The researcher always stays in control.** AI assists. AI never replaces. Every AI action requires human validation before it becomes part of the final finding.

2. **The interface must reduce thinking overhead.** The user should never wonder "What do I click next?" The UI should naturally guide the workflow from recon → analysis → exploitation → reporting.

3. **Every click must reduce uncertainty.** Every screen answers a question. Every component has a purpose. If a UI element doesn't help the researcher make a decision, it doesn't belong.

4. **Evidence is more important than confidence.** Never hide reasoning. Always show evidence. A confident AI with no evidence is noise. A cautious AI with transaction traces is valuable.

5. **The interface should feel calm.** Not noisy. Not crowded. Large whitespace. Minimal distractions. Security research is already high-stress. The interface should be the calm center.

6. **One action, one purpose.** Every screen should have one primary objective. Every screen must define: Loading, Empty, Active, Error, Offline, Streaming, and Completed states.

### 0.5 The Researcher Workflow

Sireen's entire information architecture is designed around this workflow:

```
Open Repository
    ↓
Understand Protocol
    ↓
Map Architecture
    ↓
Generate Attack Hypotheses
    ↓
Select Investigation
    ↓
Run Simulation
    ↓
Validate Evidence
    ↓
Generate PoC
    ↓
Judge Finding
    ↓
Generate Report
    ↓
Export
```

Each step maps to a primary workspace tab. The interface guides users through this journey without forcing a rigid linear path — researchers can jump between steps as needed.

---

## PART 1 — DESIGN TOKENS

### 1.1 Color System

Sireen uses VS Code theme tokens as the base layer, with security-specific semantic tokens on top. This ensures Sireen always matches the user's VS Code theme while adding the specialized colors needed for security work.

#### Base Tokens (VS Code Theme)

```css
/* These are inherited directly from VS Code. Never set them explicitly. */
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
--vscode-widget-shadow
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
--vscode-badge-background
--vscode-badge-foreground
```

#### Semantic Severity Tokens

```css
/* Severity — used for findings, badges, indicators */
--severity-critical: #dc2626        /* Red — Immediate attention */
--severity-high: #ea580c            /* Orange — Requires verification */
--severity-medium: #ca8a04          /* Yellow — Potential issue */
--severity-low: #3b82f6             /* Blue — Informational */
--severity-info: #6b7280            /* Grey — Note, no action needed */
--severity-none: #6b7280            /* Grey — No severity assigned */
```

#### Semantic Status Tokens

```css
/* Investigation status */
--status-active: #22c55e            /* Green — Investigation in progress */
--status-paused: #ca8a04            /* Yellow — Investigation paused */
--status-complete: #3b82f6          /* Blue — Investigation complete */
--status-draft: #6b7280             /* Grey — Not yet started */

/* Finding lifecycle */
--finding-unverified: #6b7280       /* Grey — Awaiting verification */
--finding-verified: #16a34a         /* Green — Human-verified */
--finding-fixed: #16a34a            /* Green — Fix confirmed */
--finding-dismissed: #4b5563        /* Dark grey — Dismissed, reduced opacity */
--finding-disputed: #ca8a04         /* Yellow — Under dispute */
```

#### Security-Specific Tokens

```css
/* Execution outcomes */
--exploit-success: #16a34a          /* Green — Exploit succeeded */
--exploit-failed: #dc2626           /* Red — Exploit failed */
--simulation-running: #2563eb       /* Blue — Simulation in progress */
--simulation-idle: #6b7280          /* Grey — Awaiting execution */

/* Threat indicators */
--threat-critical: #dc2626          /* Red — Active critical threat */
--threat-high: #ea580c              /* Orange — High risk */
--threat-mitigated: #16a34a         /* Green — Threat neutralized */
--safe-indicator: #22c55e           /* Green — Safe/validated operation */

/* Brand */
--sireen-primary: #6366f1           /* Indigo — Trust, security, enterprise */
--sireen-accent: #818cf8            /* Light indigo — Interactive elements */
--sireen-shield: #4f46e5            /* Deep indigo — Logo/shield icon */
--sireen-surface: rgba(99, 102, 241, 0.08)  /* Subtle brand background */
```

#### Semantic Application Tokens

```css
/* These map abstract roles to actual colors for consistency */
--app-brand: var(--sireen-primary);
--app-accent: var(--sireen-accent);
--app-link: var(--sireen-accent);
--app-surface: var(--vscode-sideBar-background);
--app-border: var(--vscode-widget-border);
--app-text: var(--vscode-editor-foreground);
--app-text-muted: color-mix(in srgb, var(--app-text) 60%, transparent);
--app-danger: var(--severity-critical);
--app-warning: var(--severity-medium);
--app-success: var(--exploit-success);
--app-info: var(--severity-low);

/* Interactive states */
--app-hover: var(--vscode-list-hoverBackground);
--app-selected: var(--vscode-list-activeSelectionBackground);
--app-selected-text: var(--vscode-list-activeSelectionForeground);
--app-focus-ring: var(--vscode-focusBorder);
```

#### Color Application Rules

1. **Never use raw hex colors in components.** Always use semantic tokens.
2. **Severity colors are reserved for findings, badges, and threat indicators only.** Never use severity colors for UI chrome.
3. **Green is for confirmed success only** (exploit succeeded, finding verified). Never use green for "pending" or "in progress."
4. **Red is for confirmed critical findings only.** Never use red for warnings or informational items.
5. **Brand colors (indigo) are used sparingly** — logo, primary CTAs, active tab indicators.
6. **Dark mode first.** All tokens are designed for dark backgrounds. Light mode support uses the same token names but with different VS Code theme values.

### 1.2 Typography

#### Font Families

```css
/* UI text — inherits from VS Code for consistency */
--font-ui: var(--vscode-font-family);                    /* System UI font */
--font-ui-size: var(--vscode-font-size, 13px);            /* Default: 13px */
--font-ui-weight: var(--vscode-font-weight, 400);

/* Code/monospace — used for code, traces, simulation output */
--font-mono: var(--vscode-editor-font-family, 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace);
--font-mono-size: var(--vscode-editor-font-size, 14px);
```

#### Type Scale

```css
/* Heading scale — used for screen titles, section headers */
--text-h1: 22px;                  /* Screen title */
--text-h2: 18px;                  /* Section header */
--text-h3: 15px;                  /* Card title, panel header */
--text-h4: 13px;                  /* Subsection, group label */

/* Body scale */
--text-body: 13px;                /* Default body text */
--text-body-large: 14px;          /* Emphasized body text */
--text-body-small: 12px;          /* Metadata, secondary info */

/* Code scale */
--text-code: var(--font-mono-size);  /* Inline code, file paths */
--text-code-small: 12px;             /* Trace output, logs */

/* UI scale */
--text-label: 11px;               /* Badge text, tab labels, severity labels */
--text-label-uppercase: 11px;     /* Uppercase labels with tracking */
--text-caption: 10px;             /* Timestamps, status indicators */
```

#### Font Weights

```css
--weight-regular: 400;
--weight-medium: 500;
--weight-semibold: 600;
--weight-bold: 700;
```

#### Typography Rules

1. **JetBrains Mono is preferred for monospace** but falls through to VS Code's editor font to respect user preference.
2. **Severity labels** use bold uppercase with `letter-spacing: 0.05em`.
3. **File paths** always use monospace font, even in UI labels.
4. **Timestamps** use the caption size (10px) with muted opacity.
5. **Code blocks** in messages use the monospace font at the editor font size.
6. **Headings should never exceed 22px.** Sireen is a workspace, not a marketing site. Large headings waste vertical space.

### 1.3 Spacing & Grid

Sireen uses an **8-point spacing system** with a **4px micro-unit** for fine adjustments.

#### Base Unit

```
Micro-unit: 4px (used only for borders, compact padding, and icon gaps)
Base unit:   8px (used for all spacing decisions)
```

#### Spacing Scale

```css
--space-0: 0px;
--space-0\.5: 4px;        /* Micro spacing: icon gaps, tight borders */
--space-1: 8px;            /* Base unit: button padding, compact card padding */
--space-1\.5: 12px;        /* Message padding, card inner padding */
--space-2: 16px;           /* Panel padding, section gaps */
--space-3: 24px;           /* Large section gaps, card margins */
--space-4: 32px;           /* Section separation, modal padding */
--space-5: 40px;           /* Major section gaps */
--space-6: 48px;           /* Page content padding */
--space-8: 64px;           /* Extra-large separation */
```

#### Grid System

```css
/* Content width constraints */
--content-max-width: 800px;          /* Single-column chat max width */
--panel-min-width: 280px;            /* Minimum sidebar/panel width */
--panel-max-width: 480px;            /* Maximum sidebar/panel width */
--graph-canvas-min: 400px;           /* Minimum threat map area */
```

#### Spacing Rules

1. **All margins, paddings, and gaps MUST be a multiple of 4px.**
2. **Use 8px increments for layout spacing.** Use 4px only for borders, compact buttons, and icon gaps.
3. **Messages in chat have 20px gap between them** (space-2.5, but standardized as 16px minimum with 20px preferred).
4. **Panel padding is 16px** (space-2).
5. **Card inner padding is 12px** (space-1.5).
6. **Button padding: 6px 12px** (compact) or **8px 16px** (standard).
7. **Never hardcode spacing values.** Always use the spacing scale.

### 1.4 Elevation & Shadows

Sireen uses elevation to create depth hierarchy. Higher elevation elements appear above lower ones.

```css
/* Elevation scale */
--elevation-none: none;
--elevation-low: 0 1px 2px rgba(0, 0, 0, 0.2);           /* Cards, tool calls */
--elevation-medium: 0 2px 8px rgba(0, 0, 0, 0.25);        /* Dropdowns, popovers */
--elevation-high: 0 4px 16px rgba(0, 0, 0, 0.3);          /* Modals, dialogs */
--elevation-tooltip: 0 4px 12px rgba(0, 0, 0, 0.35);      /* Tooltips */
--elevation-glow-critical: 0 0 12px rgba(220, 38, 38, 0.4);   /* Critical finding glow */
--elevation-glow-success: 0 0 12px rgba(22, 163, 74, 0.4);    /* Success glow */
--elevation-glow-brand: 0 0 12px rgba(99, 102, 241, 0.3);     /* Brand element glow */
```

#### Elevation Rules

1. **Cards use --elevation-low.** Only raised on hover/interaction.
2. **Dropdown menus use --elevation-medium.**
3. **Modal dialogs use --elevation-high.**
4. **Critical findings get a subtle red glow** to draw attention without breaking the design.
5. **Never use elevation on flat surfaces** (panels, sidebars, input areas).
6. **Shadows use `var(--vscode-widget-shadow)`** when theme-appropriate, with fallback to the elevation scale.
7. **Glow effects are reserved for findings and simulation results** — never for UI chrome.

### 1.5 Border Radius

```css
--radius-none: 0px;
--radius-sm: 4px;             /* Buttons, inputs, badges, small elements */
--radius-md: 6px;             /* Evidence attachments, small cards */
--radius-lg: 8px;             /* Cards, tool call blocks, panels, messages */
--radius-xl: 12px;            /* AI message bubbles (left side) */
--radius-full: 9999px;        /* Pills, avatars, severity badges */
```

#### Radius Rules

1. **User messages: radius-none top-right, radius-lg all others.**
2. **AI messages: radius-none top-left, radius-lg all others.** (Mirrors user messages)
3. **Cards: radius-lg** (8px).
4. **Buttons: radius-sm** (4px).
5. **Severity badges: radius-full** (pill shape).
6. **Never use radius-xl (12px) for UI elements that need to look button-like.** Reserved for message bubbles.

### 1.6 Animation & Motion

Animations in Sireen communicate state. They never decorate.

#### Duration Scale

```css
--duration-instant: 0ms;
--duration-fast: 100ms;        /* Hover states, micro-interactions */
--duration-normal: 200ms;      /* Expand/collapse, panel transitions */
--duration-slow: 300ms;        /* Modal enter/exit, page transitions */
--duration-streaming: 0ms;     /* AI text streaming (real-time) */
```

#### Easing Functions

```css
--ease-default: cubic-bezier(0.4, 0, 0.2, 1);       /* Standard material ease */
--ease-enter: cubic-bezier(0, 0, 0.2, 1);            /* Elements entering */
--ease-exit: cubic-bezier(0.4, 0, 1, 1);             /* Elements exiting */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);    /* Spring-like (pins, confirms) */
```

#### Animation Map

| Element | Animation | Duration | Easing | Purpose |
|---------|-----------|----------|--------|---------|
| Finding card appearance | Slide in from right + fade | 300ms | ease-enter | New discovery alert |
| Finding card pulse (new) | Border color pulse | 2s loop | ease-default | Urgency for unread findings |
| Tool call expand/collapse | Height + opacity | 200ms | ease-default | Progressive disclosure |
| Threat graph node highlight | Pulsing glow ring | 1.5s loop | ease-default | Active selection |
| Simulation step progress | Stepped progress bar | 300ms per step | ease-default | Execution progress |
| Evidence pin | Spring scale (1→1.1→1) | 300ms | ease-spring | Confirmation feedback |
| Timeline scroll | Smooth scroll via CSS | — | ease-default | Reading continuity |
| Risk score change | Number flip animation | 200ms | ease-default | Score transition |
| Tab switch | Fade content | 150ms | ease-default | Context switch |
| Hover state | Background color | 100ms | ease-default | Interactive feedback |
| Permission card | Subtle border pulse | 2s loop | ease-default | Awaiting user action |
| Streaming cursor | Blinking caret | 1s loop | step-end | AI actively writing |
| Empty state icon | Subtle float/lift | 3s loop | ease-in-out | Gentle attention |

#### Motion Rules

1. **All animations must be CSS transitions or CSS animations.** Never use JavaScript for animation (except for streaming text).
2. **Animations must respect `prefers-reduced-motion`.** Replace animated transitions with instant transitions.
3. **Never animate for decoration.** Every animation must communicate: loading, state change, success, failure, or new content.
4. **Streaming text uses efficient DOM updates** (character-by-character appending, not full re-renders).
5. **Tool call collapse/expand is GPU-accelerated** (use `transform` and `opacity` only).
6. **Maximum animation duration is 300ms** (except looping indicators).

### 1.7 Z-Index System

```css
--z-base: 0;
--z-sticky: 100;              /* Sticky headers, pinned elements */
--z-dropdown: 200;            /* Dropdown menus, selectors */
--z-popover: 300;             /* Popovers, tooltips, context menus */
--z-modal-backdrop: 400;      /* Modal backdrops */
--z-modal: 500;               /* Modal dialogs */
--z-toast: 600;               /* Toast notifications */
--z-loading-overlay: 700;     /* Full-screen loading overlay */
```

#### Z-Index Rules

1. **Never use z-index values outside the defined scale.**
2. **Modals always have a backdrop** that covers the entire viewport.
3. **Toast notifications sit above modals** so users see notifications even when a modal is open.
4. **Dropdowns within modals** need z-index between the modal and its backdrop.

### 1.8 Breakpoints

```css
--bp-mobile: 480px;            /* Small mobile */
--bp-tablet: 768px;            /* Tablet */
--bp-desktop: 1024px;          /* Desktop minimum */
--bp-desktop-wide: 1440px;     /* Wide desktop */
```

#### Responsive Strategy

1. **Desktop-first.** All layouts are designed for 1024px+ screens.
2. **Tablet (768-1024px):** Sidebar collapses to icon-only. Panels stack vertically.
3. **Mobile (<768px):** Single-column layout. Input area has larger touch targets.
4. **The desktop experience is the priority.** Security research happens on large screens.

### 1.9 Iconography

#### Icon Family

Sireen uses **VS Code Codicons** for all standard UI actions. These are supplemented by security-specific icons for domain concepts.

#### Icon Sizes

```css
--icon-xs: 12px;          /* Status indicators, inline badges */
--icon-sm: 14px;          /* Message actions, metadata icons */
--icon-md: 16px;          /* Toolbar buttons, list item icons */
--icon-lg: 20px;          /* Tab icons, navigation icons */
--icon-xl: 24px;          /* Empty state illustrations, feature icons */
```

#### Icon Vocabulary (Security-Specific)

| Concept | Icon | Context |
|---------|------|---------|
| Shield | `$(shield)` | Logo, safe operations |
| Bug | `$(bug)` | Vulnerability finding |
| Graph/Network | `$(graph)` | Threat map, protocol map |
| Lightning | `$(lightning)` | Exploit simulation |
| Clock/History | `$(history)` | Timeline |
| Search/Eye | `$(search)` or `$(eye)` | Evidence locker |
| Target | `$(target)` | Bug bounty |
| Lock/Unlock | `$(lock)` | Security state |
| Warning | `$(warning)` | Threats, cautions |
| Check | `$(check)` | Verified, success |
| X/Close | `$(close)` | Dismiss, failed |
| Terminal | `$(terminal)` | Simulation console |
| File/Code | `$(file-code)` | Source code, findings |
| Pin | `$(pin)` | Pinned evidence |
| Fork | `$(git-branch)` | Forked chain, parallel investigation |
| Report | `$(book)` | Audit report |

#### Iconography Rules

1. **Use thin/outline icons only.** No filled icons except for active states.
2. **Icons always have semantic meaning.** Never use icons purely for decoration.
3. **Tab icons are 20px** (--icon-lg).
4. **Button icons are 16px** (--icon-md) with 4px gap from text.
5. **Never resize icons manually.** Use the defined size scale.
6. **Severity icons** (bug, warning, etc.) inherit the severity color.

---

## PART 2 — LAYOUT ARCHITECTURE

### 2.1 Workspace Structure

Sireen uses a **single-webview-per-panel** architecture. Each major view is a separate VS Code webview, loaded independently.

```
VS Code Window
├── Activity Bar (VS Code native)
│   └── Sireen shield icon → activates sidebar
│
├── Sidebar (Primary) — Webview
│   ├── Investigation Header
│   │   ├── Protocol name / contract address
│   │   ├── Risk score (color-coded badge)
│   │   ├── Investigation status (Active/Paused/Complete)
│   │   └── Duration / findings count
│   ├── Workspace Tabs
│   │   ├── [Chat] — AI conversation
│   │   ├── [Threat Map] — Attack graph / data flow
│   │   ├── [Findings] — Vulnerability report
│   │   ├── [Timeline] — Security event timeline
│   │   └── [Evidence] — Raw data, traces, proofs
│   ├── Active Tab Content (varies by tab)
│   └── Input Area (always visible)
│       ├── Scope selector (protocol/contract/function)
│       ├── Mode selector (Recon/Analyze/Exploit/Patch)
│       ├── Auto-resizing textarea with @references
│       └── Toolbar: [Attach Trace] [Attach Evidence] [Send]
│
├── Live Attack Workspace (Webview Panel)
│   ├── Simulation Terminal
│   ├── Exploit Editor
│   └── Network Monitor
│
├── Knowledge Graph Panel (Webview Panel)
│   ├── Threat Map (full-screen graph)
│   └── Node inspection panel
│
├── Report Viewer (Webview Panel)
│   ├── Executive Summary
│   ├── Vulnerability List
│   ├── PoC Viewer
│   └── Export Controls
│
├── War Room (Webview Panel)
│   ├── Investigation list
│   ├── Cross-investigation search
│   └── Bulk operations
│
└── Bug Bounty Dashboard (Webview Panel)
    ├── Active bounties
    ├── Submission status
    └── Earnings tracker
```

### 2.2 Sidebar Layout (Primary Interface)

The sidebar is where most interaction happens. It has four vertical zones:

```
┌─────────────────────────────────┐
│  INVESTIGATION HEADER            │  ~48px (fixed)
│  [← Back] Protocol Name         │
│  ⚠ Risk: HIGH  3 findings       │
│  0x1234...abcd [Ethereum]       │
│  Status: ● Active  Time: 23m    │
├─────────────────────────────────┤
│  WORKSPACE TABS                  │  ~36px (fixed)
│  [💬 Chat] [🕸️ Map] [📋 Findings]│
│  [⏱️ Timeline] [📎 Evidence]    │
├─────────────────────────────────┤
│                                 │
│  ACTIVE TAB CONTENT              │  flex: 1 (scrollable)
│  (varies by active tab)         │
│                                 │
│  ┌─────────────────────────┐    │
│  │ Virtualized message     │    │
│  │ list or graph canvas    │    │
│  │ or findings scroll      │    │
│  └─────────────────────────┘    │
│                                 │
├─────────────────────────────────┤
│  INPUT AREA                     │  auto-height (min ~120px)
│  Scope: [flashLoan() ▼]        │
│  Mode: [Analyze ▼]             │
│  ┌─────────────────────────┐    │
│  │ Auto-resizing textarea   │    │
│  │ @references              │    │
│  │ Image paste/drop support │    │
│  └─────────────────────────┘    │
│  [📎 Trace] [🧪 Test] [▶ Send]│
└─────────────────────────────────┘
```

#### Layout Rules

1. **The investigation header is always visible** — shows what you're working on.
2. **Workspace tabs are always visible** — switch between facets of the investigation.
3. **The input area is always visible** at the bottom. Never hidden, never behind scroll.
4. **The active tab content scrolls independently.** Header, tabs, and input are fixed.
5. **Messages fill available width.** No sidebars within messages.
6. **Tool calls collapse to single-line rows** by default. Expand on click.
7. **Code blocks have a fixed max-height (500px)** with "Show more" link.

### 2.3 Main Content Area

The main content area (outside the sidebar) hosts specialized panels that need more screen space:

| Panel | Opens When | Purpose |
|-------|-----------|---------|
| Live Attack Workspace | User launches a simulation | Full terminal + editor for exploit dev |
| Knowledge Graph (Full) | User clicks "Expand Graph" | Large-format threat map interaction |
| Report Viewer | User views/edits the report | Full report with all findings |
| War Room | User clicks "All Investigations" | Multi-session management |
| Bug Bounty Dashboard | User clicks "Bounties" | Bounty tracking and submission |

These panels open as VS Code editor tabs (WebviewPanel), not within the sidebar.

### 2.4 Panel System

Panels follow consistent conventions:

```css
/* Panel chrome */
--panel-header-height: 36px;          /* Tab bar height */
--panel-toolbar-height: 40px;         /* Toolbar height */
--panel-padding: var(--space-2);      /* 16px content padding */

/* Panel header */
background: var(--vscode-editor-background);
border-bottom: 1px solid var(--app-border);
```

#### Panel Toolbar Pattern

```
┌──────────────────────────────────────────┐
│ [Tab 1] [Tab 2] [Tab 3]    [Actions...]   │  ~36px
├──────────────────────────────────────────┤
│ ┌─ Toolbar ────────────────────────────┐ │
│ │ [Action] [Action]    🔍 Search...    │ │  ~40px (optional)
│ └───────────────────────────────────────┘ │
│                                            │
│ Content area (scrollable)                  │
│                                            │
└──────────────────────────────────────────┘
```

### 2.5 Webview Architecture

| Panel | Webview Type | Route | Load Strategy |
|-------|-------------|-------|---------------|
| Sidebar Chat | `WebviewView` (sidebar) | `sireen.SidebarProvider` | Always loaded |
| Attack Workspace | `WebviewPanel` (editor tab) | `sireen.AttackWorkspace` | On demand |
| Knowledge Graph | `WebviewPanel` (editor tab) | `sireen.KnowledgeGraph` | On demand |
| Report Viewer | `WebviewPanel` (editor tab) | `sireen.ReportViewer` | On demand |
| War Room | `WebviewPanel` (editor tab) | `sireen.WarRoom` | On demand |
| Bounty Dashboard | `WebviewPanel` (editor tab) | `sireen.BountyDashboard` | On demand |
| Settings | `WebviewPanel` (editor tab) | `sireen.Settings` | On demand |

---

## PART 3 — NAVIGATION

### 3.1 Information Architecture

Sireen's IA maps directly to the researcher workflow:

```
┌─────────────────────────────────────────────────────┐
│                   SIREEN SYSTEM                      │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌─────────────┐  ┌──────────────────────────────┐  │
│  │ SIDEBAR     │  │ WORKSPACE TABS                │  │
│  │ (Context)   │  │ (Investigation Facets)        │  │
│  │             │  │                                │  │
│  │ Header      │  │ Chat      ← Primary interaction│  │
│  │  - Protocol │  │ Threat Map ← Architecture view │  │
│  │  - Risk     │  │ Findings  ← Results            │  │
│  │  - Status   │  │ Timeline  ← Sequence           │  │
│  │             │  │ Evidence  ← Raw data           │  │
│  │ Input       │  │                                │  │
│  │  - Scope    │  │ FULL PANELS (Separate webviews)│  │
│  │  - Mode     │  │                                │  │
│  │  - Textarea │  │ Attack Workspace ← Simulation  │  │
│  │  - Send     │  │ Knowledge Graph ← Full map     │  │
│  └─────────────┘  │ Report Viewer  ← Output        │  │
│                    │ War Room       ← Sessions      │  │
│                    │ Bounty Dashboard ← Bounties    │  │
│                    └──────────────────────────────┘  │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │ GLOBAL NAVIGATION                            │   │
│  │ Activity Bar: [Sireen Shield]                │   │
│  │ Editor Context: Right-click → "Analyze with  │   │
│  │                 Sireen"                      │   │
│  │ Terminal Context: "Trace with Sireen"        │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### 3.2 Primary Navigation

The **workspace tabs** (below the investigation header) are the primary navigation within an investigation:

```
[💬 Chat] [🕸️ Threat Map] [📋 Findings] [⏱ Timeline] [📎 Evidence]
```

These are always visible. They define the current mode of investigation.

| Tab | Icon | Purpose | When to Use |
|-----|------|---------|-------------|
| Chat | `$(comment-discussion)` | AI conversation, primary interaction | Default. All investigation starts here. |
| Threat Map | `$(graph)` | Attack graph visualization | Understanding architecture, data flow, attack paths |
| Findings | `$(bug)` | Structured vulnerability list | Reviewing, sorting, verifying findings |
| Timeline | `$(history)` | Security event chronology | Understanding sequence of events, attack reconstruction |
| Evidence | `$(eye)` | Raw evidence repository | Collecting traces, proofs, storage snapshots |

#### Tab Behavior

1. **Clicking a tab switches the active content** below the tab bar.
2. **The active tab has an accent-colored indicator line** (2px bottom border).
3. **Tab content is preserved** when switching away and back (no reload).
4. **Findings tab shows a badge** with the count of unverified findings.
5. **Evidence tab shows a badge** with the count of newly added evidence.
6. **Tabs cannot be reordered or closed.**

### 3.3 Secondary Navigation

Within each tab, navigation follows content-appropriate patterns:

| Tab | Navigation Pattern | Scroll Behavior |
|-----|-------------------|-----------------|
| Chat | Vertical message list (virtualized) | Auto-scrolls to bottom on new messages. Manual scroll up loads history. |
| Threat Map | Pan/zoom canvas. Click nodes to drill in. | Canvas coordinates, not document scroll. |
| Findings | Vertical severity-sorted list. Click to expand. | Standard scroll. Collapsed default. |
| Timeline | Vertical chronological list. Filter by type/severity. | Standard scroll, load more on scroll. |
| Evidence | Grid or list view. Filter by type/pinned. | Infinite scroll. Search/filter at top. |

### 3.4 Cross-Session Navigation

Between investigations:

1. **"← Back" button in investigation header** → Returns to Welcome screen.
2. **"War Room" from header menu** → Opens full session manager (separate webview).
3. **Recent investigations on Welcome screen** → Quick resume.
4. **Cmd+N / Ctrl+N** → New investigation.

### 3.5 Keyboard Shortcuts

#### Global Shortcuts

| Action | Shortcut | Context |
|--------|----------|---------|
| Focus input | `Ctrl+Shift+A` | Any Sireen panel |
| New investigation | `Ctrl+N` | Any Sireen panel |
| Toggle sidebar | `Ctrl+Shift+S` | Any Sireen panel |
| Quick search | `Ctrl+F` | Within active tab |
| War Room | `Ctrl+Shift+M` | Any Sireen panel |

#### Workspace Tab Shortcuts

| Action | Shortcut |
|--------|----------|
| Open Chat tab | `Ctrl+Shift+1` |
| Open Threat Map tab | `Ctrl+Shift+2` |
| Open Findings tab | `Ctrl+Shift+3` |
| Open Timeline tab | `Ctrl+Shift+4` |
| Open Evidence tab | `Ctrl+Shift+5` |
| Next tab | `Ctrl+Tab` |
| Previous tab | `Ctrl+Shift+Tab` |

#### Investigation Shortcuts

| Action | Shortcut | Context |
|--------|----------|---------|
| Cycle investigation mode | `Ctrl+.` | Any tab |
| Next finding | `Ctrl+Shift+↓` | Findings tab |
| Previous finding | `Ctrl+Shift+↑` | Findings tab |
| Generate PoC | `Ctrl+Enter` | When finding selected |
| Verify finding | `Ctrl+Shift+V` | When finding selected |
| Add to evidence | `Ctrl+Shift+E` | When finding/message selected |
| Run simulation | `Ctrl+Enter` | When exploit selected |
| Accept suggestion | `Ctrl+Shift+Y` | When AI suggests code |
| Reject suggestion | `Ctrl+Shift+N` | When AI suggests code |

#### Keyboard Navigation Rules

1. **Every major action must have a keyboard shortcut.**
2. **Power users should never need a mouse** for common operations.
3. **Discoverability:** Keyboard Shortcuts panel available via `Ctrl+Shift+/` in War Room.
4. **Consistency with VS Code conventions:** `Ctrl+W` to close, `Ctrl+F` to search, `Ctrl+N` for new.

---

## PART 4 — SCREEN SPECIFICATIONS

### 4.1 Welcome Screen (Investigation Start)

**Purpose:** Begin a new security investigation. Connect to a protocol, load a contract, or import audit artifacts.

**One primary CTA:** Start Investigation.

```
┌─────────────────────────────────┐
│  [Sireen Shield Logo]           │
│  "What are we securing today?" │
│                                 │
│  ┌─────────────────────────┐    │
│  │ Quick Actions            │    │
│  │ Analyze a contract       │    │
│  │ Audit a protocol         │    │
│  │ Hunt for bounties        │    │
│  │ Review existing code     │    │
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

#### States

| State | Appearance | Behavior |
|-------|-----------|----------|
| **First time** | Logo + tagline. Quick actions only. "Connect your wallet" prompt as muted banner. | No recent investigations. Wallet prompt is dismissible. |
| **Returning** | Recent investigations listed by date (descending). Active ones have green status dot. | Click any investigation to resume exactly where you left off. |
| **Loading** | Skeleton UI: 3 placeholder rows for recent investigations. Logo pulses subtly. | Auto-loads recent investigations from disk. |
| **Error** | Red banner: "Failed to load investigations. Check RPC connection. [Retry]" | Error state for storage read failure or RPC connection failure. |
| **No wallet** | Persistent banner (dismissible): "Connect a Web3 wallet to interact with on-chain contracts." | Banner appears at top of screen, below header. |
| **Offline** | "You appear to be offline. Some features require network connectivity." | Quick actions that require network show disabled state with tooltip. |

### 4.2 Investigation Chat

**Purpose:** Primary work surface. Communicate with the security AI. Review findings, exploit proofs, and analysis in real-time.

**One primary CTA:** Send a message or command to the AI.

```
┌─────────────────────────────────┐
│  HEADER                         │
│  [← Back] Uniswap V4 Audit      │
│  ⚠ Risk: HIGH   3 findings      │
│  0x1234...abcd  [Ethereum]      │
│  Status: ● Active  Time: 23m    │
├─────────────────────────────────┤
│  WORKSPACE TABS                  │
│  [💬 Chat] [🕸️ Map] [📋 Findings]│
│  [⏱️ Timeline] [📎 Evidence]    │
├─────────────────────────────────┤
│  MESSAGE LIST (virtualized)      │
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
│  └──────────────────────────┘   │
│                                 │
│  ┌── FINDING ──────────────┐   │
│  │ 🔴 Critical              │   │
│  │ Reentrancy in flashLoan()│   │
│  │                          │   │
│  │ Path: flashLoan →        │   │
│  │ _execute → borrower.call │   │
│  │ → [reenter] → _updateBal│   │
│  │                          │   │
│  │ [Generate PoC] [View     │   │
│  │  Trace] [Suggest Patch]  │   │
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

#### States

| State | Appearance | Behavior |
|-------|-----------|----------|
| **Idle** | Input enabled. No messages streaming. Welcome or last message visible. | Ready for user input. |
| **Streaming** | AI message renders char by char. Input disabled. Typing indicator visible. | Cannot send new message until streaming completes or is interrupted. |
| **Thinking** | Thinking indicator with periodic text updates ("Analyzing control flow..."). | Stops when first text token or tool call appears. |
| **Executing tool** | Tool call block shows spinner + "Running...". Output streams in. | Multiple tool calls can execute concurrently. Each shows its own progress. |
| **Awaiting approval** | Permission request card with [Approve] [Deny] buttons. Pulsing border. | Blocks further execution until user responds. |
| **Error** | Red error card with message and action buttons. | Error at message level or tool level. Tool errors show retry. |
| **Interrupted** | Last AI message shows "Stopped" badge. Input re-enabled. | User clicked stop or sent new message. Partial content preserved. |
| **Empty** | Welcome screen shown instead of messages. | No conversation yet. |

### 4.3 Threat Map

**Purpose:** Visualize the attack surface as an interactive graph. Understand data flow, trust boundaries, and attack paths.

**One primary CTA:** Explore the graph — click nodes, inspect edges.

```
┌──────────────────────────────────────────────┐
│ 🕸️ Threat Map: flashLoan() Flow              │
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
│  [Filter by severity] [Zoom to Fit] [Export] │
└──────────────────────────────────────────────┘
```

#### States

| State | Appearance | Behavior |
|-------|-----------|----------|
| **Loading** | "Building threat model..." with progress steps (Analyzing functions → Mapping calls → Identifying risks). | Skeleton canvas with pulsing nodes appearing sequentially. |
| **Empty** | "No threat model yet. Analyze a function in Chat to generate one." | Illustration of a simple graph with one node. "Start Analysis" quick action button. |
| **Interactive** | Full graph rendered. Zoom: 50%-200%. Pan enabled. | Nodes and edges rendered. Click, hover, drag all active. |
| **Error** | "Failed to generate threat model. [Retry]" | Error details collapsible. Retry regenerates. |
| **Filtered** | "Showing 5 of 12 nodes. [Clear filter]" | Nodes not matching filter are dimmed (not hidden) to maintain spatial context. |

#### Interactions

| Interaction | Result |
|-------------|--------|
| Click node | Opens inline detail panel: function signature, risks, related findings count, code link |
| Click edge | Shows data flow details: what data moves, trust level, call type |
| Hover node | Highlights connected nodes + edges. All others dim to 30% opacity. |
| Hover edge | Thickens edge, shows call type label |
| Drag node | Repositions node (manual layout override) |
| Scroll | Zoom in/out (centered on cursor) |
| Pan | Drag empty canvas space |
| Filter by severity | Nodes without matching severity dim |
| "Focus on path" | Centers + zooms on selected attack path, dims unrelated nodes |
| Double-click node | Opens source code in editor at relevant line |
| Right-click node | Context menu: [Copy Name] [Focus Path] [View Code] [Add Note] |

### 4.4 Findings

**Purpose:** Structured vulnerability report. Severity-sorted, with evidence, PoC, and patch recommendations.

**One primary CTA:** Verify or act on a finding.

```
┌──────────────────────────────────────────────┐
│ 📋 Findings Report                           │
│                                              │
│ Summary: 1 Critical | 2 High | 3 Medium |   │
│          2 Low | 1 Informational             │
│                                              │
│ [Filter: All ▼] [Sort: Severity ▼]          │
│                                              │
│ ┌── 🔴 CRITICAL ─────────────────────────┐  │
│ │ Reentrancy in flashLoan()              │  │
│ │ LendingPool.sol:124                    │  │
│ │ Status: ● Unverified                   │  │
│ │                                          │  │
│ │ Path: flashLoan → _execute → borrower   │  │
│ │       .call → [reenter] → _updateBal    │  │
│ │                                          │  │
│ │ [Verify] [Generate PoC] [Suggest Patch]  │  │
│ │          [View Trace] [Dismiss]         │  │
│ └──────────────────────────────────────────┘  │
│                                              │
│ ┌── 🟠 HIGH ─────────────────────────────┐  │
│ │ Price Manipulation via Oracle          │  │
│ │ OracleAdapter.sol:56                   │  │
│ │ Status: ● Verified   PoC: Ready       │  │
│ │                                          │  │
│ │ [View PoC] [View Patch] [Add Note]      │  │
│ └──────────────────────────────────────────┘  │
│                                              │
│ ┌── 🟡 MEDIUM ───────────────────────────┐  │
│ │ Missing Access Control on withdraw()   │  │
│ │ Vault.sol:89                            │  │
│ │ Status: ◌ Dismissed                     │  │
│ └──────────────────────────────────────────┘  │
│                                              │
│ [Export Report] [Submit to Bounty] [Share]   │
└──────────────────────────────────────────────┘
```

#### States

| State | Appearance | Behavior |
|-------|-----------|----------|
| **Empty** | "No findings yet. Start an analysis in Chat to discover vulnerabilities." | Illustration of a shield with checkmark. "Start Analysis" quick action. |
| **Loading** | Skeleton list: 3-4 placeholder cards with pulsing severity bars. | Loading from storage or analysis engine. |
| **Populated** | Severity-sorted list of finding cards. Summary at top. | First finding accepted from chat renders here. |
| **Filtered** | "Showing 3 of 9 findings. [Clear filter]" | Filter by severity, status, or search text. |
| **Error** | "Failed to load findings. [Retry]" | Corruption or storage error. |

#### Finding Card Depth

Each finding card expands to show:
1. **Collapsed:** Severity badge, title, location, status, attack path (truncated), action buttons.
2. **Expanded:** Full attack path visualization, affected code with highlighting, PoC embed or link, patch diff preview, evidence attachments, researcher notes.
3. **Full detail:** Opens the finding in a dedicated sub-panel or inline section with all evidence, PoC execution results, patch code, and related timeline events.

### 4.5 Timeline

**Purpose:** Sequence diagram of security-relevant events. Transactions, state changes, attack steps.

**One primary CTA:** Understand the sequence of events.

```
┌──────────────────────────────────────────────┐
│ ⏱ Security Timeline                          │
│                                              │
│ [Filter: All Events ▼]                       │
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

#### States

| State | Appearance | Behavior |
|-------|-----------|----------|
| **Empty** | "No events recorded. Run an analysis to populate the timeline." | Simple timeline axis with no events. "Run Analysis" action. |
| **Loading** | "Reconstructing timeline..." with placeholder events appearing one by one. | Animated event insertion as they're discovered. |
| **Populated** | Chronological event list with block/analysis separators. | Events grouped by block or analysis session. Expandable. |
| **Filtered** | "Showing 8 of 24 events. [Clear filter]" | Filter by event type, severity, or participant. |
| **Error** | "Failed to build timeline. [Retry]" | Data corruption or incomplete chain data. |

#### Event Types

| Type | Icon | Color | Indentation |
|------|------|-------|-------------|
| Transaction | `$(arrow-right)` | Blue | Level 0 (block-level) |
| State change | `$(database)` | Yellow | Level 1 (nested under tx) |
| Function call | `$(call)` | Cyan | Level 1 (nested under tx) |
| Re-entry point | `$(warning)` | Red | Level 2 (nested under call) |
| Finding | `$(bug)` | Red | Level 0 (analysis section) |
| Analysis step | `$(beaker)` | Grey | Level 0 (analysis section) |
| Evidence captured | `$(file)` | Grey | Level 1 (nested under step) |

#### Interactions

- **Click event** → Expand/collapse details (transaction data, state diff, code involved).
- **Pin event** → Adds to pinned evidence collection.
- **Filter by type** → Only show selected event types.
- **"Focus on attack path"** → Highlights events in the attack chain, dims others.
- **Hover event** → Shows timestamp + brief detail tooltip.

### 4.6 Evidence Locker

**Purpose:** Raw evidence repository. Transaction traces, code snippets, storage snapshots, execution logs.

**One primary CTA:** Collect, organize, and review evidence.

```
┌──────────────────────────────────────────────┐
│ 📎 Evidence Locker                           │
│                                              │
│ 🔍 Search evidence...     [All Types ▼]     │
│                                              │
│ Pinned: 3 items                              │
│ ┌── 📌 Reentrancy Trace ─────────────────┐  │
│ │ TX: 0xabcd...ef01                   │  │
│ │ Type: Transaction Trace               │  │
│ │ [Unpin] [View] [Copy Ref]             │  │
│ └────────────────────────────────────────┘  │
│                                              │
│ ┌── Transaction Traces ──────────────────┐   │
│ │ 0xabcd...ef01  flashLoan() reentrancy  │   │
│ │ Block: 19543281  Gas: 892,341          │   │
│ │ [View Trace] [Copy TX] [Pin]           │   │
│ │                                          │   │
│ │ [Raw] [Decoded] [Visual] ← trace view   │   │
│ └──────────────────────────────────────────┘   │
│                                              │
│ ┌── Code Snippets ────────────────────────┐   │
│ │ LendingPool.sol:flashLoan()            │   │
│ │ Lines 124-145                          │   │
│ │ [View in Editor] [Copy] [Pin]          │   │
│ └──────────────────────────────────────────┘   │
│                                              │
│ Total: 12 items | Pinned: 3                   │
└──────────────────────────────────────────────┘
```

#### Evidence Types

| Type | Icon | Description |
|------|------|-------------|
| Transaction trace | `$(link)` | Full transaction trace with call stack |
| Code snippet | `$(file-code)` | Highlighted code segment |
| Event log | `$(note)` | Raw or decoded event log entry |
| Storage snapshot | `$(database)` | Slot-level storage state (before/after) |
| Execution result | `$(output)` | Simulation or execution output |
| Screenshot | `$(image)` | UI or diagram screenshot |
| Note | `$(comment)` | Researcher's manual note |

#### States

| State | Appearance | Behavior |
|-------|-----------|----------|
| **Empty** | "No evidence collected. Run analysis to gather evidence." | Empty grid with icon. Quick action to run analysis. |
| **Loading** | Skeleton grid with placeholder cards. | Loading from storage. |
| **Populated** | Evidence cards in grid (default) or list view. | Grouped by type. Sortable by date/type/relevance. |
| **Pinned view** | Filter toggle showing only pinned items. | "Showing 3 pinned items. [Show all]" |
| **Search results** | "Found 5 results for 'reentrancy'. [Clear]" | Real-time search filtering. |
| **Preview open** | Split view: list + preview panel. | Click evidence card to open preview. |

### 4.7 Live Attack Workspace

**Purpose:** Interactive exploitation environment. Run simulations, write exploit code, monitor network.

**One primary CTA:** Execute or debug an exploit simulation.

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
│ │ [✓] Step 1/5: Deploy attack contract   │  │
│ │ [▶] Step 2/5: Fund with 100 ETH        │  │
│ │ [ ] Step 3/5: Call flashLoan()         │  │
│ │ [ ] Step 4/5: Reenter via receive()    │  │
│ │ [ ] Step 5/5: Withdraw drained funds   │  │
│ │                                         │  │
│ │ ✅ Exploit successful                   │  │
│ │ Drained: 100 ETH                        │  │
│ │ TX: 0xabcd...ef01                       │  │
│ └──────────────────────────────────────────┘  │
│                                              │
│ [Start Fork] [Reset Fork] [Speed: 1x ▼]      │
│ [Save as PoC] [Add to Findings]             │
└──────────────────────────────────────────────┘
```

#### States

| State | Appearance | Behavior |
|-------|-----------|----------|
| **Idle** | "Ready. Start a simulation to begin." | Terminal shows welcome message. All controls enabled. |
| **Initializing** | "Starting forked chain..." with progress. | Anvil/Hardhat node starting. Shows RPC URL when ready. |
| **Running** | Terminal output streaming. Steps updating in real-time. | Live output in terminal. Progress bar for steps. |
| **Success** | Green result banner. Shows drained amount, TX hash. | "Save as PoC" and "Add to Findings" buttons active. |
| **Failed** | Red error banner. Shows error details. | [Debug] button opens exploit editor at relevant line. [Rerun] button. |
| **Cancelled** | "Simulation stopped." Grey banner. | Partial output preserved for inspection. |
| **Error** | "Fork crashed: [error]. [Restart Fork]" | Chain state corrupted. Requires restart. |

### 4.8 Simulation Viewer

**Purpose:** Detailed view of simulation execution. Shows step-by-step execution with state context.

**One primary CTA:** Inspect simulation results.

```
┌──────────────────────────────────────────────┐
│ ⚡ Simulation: Reentrancy Exploit             │
│                                              │
│ Status: ✅ Success     Duration: 3.2s         │
│                                              │
│ ┌── Execution Trace ──────────────────────┐  │
│ │                                         │  │
│ │ Step 1: Deploy AttackContract           │  │
│ │   Address: 0xdead...beef               │  │
│ │   Gas: 124,532                         │  │
│ │                                         │  │
│ │ Step 2: Fund with 100 ETH              │  │
│ │   Balance: 100 ETH                     │  │
│ │                                         │  │
│ │ Step 3: Call flashLoan()               │  │
│ │   ├─ Amount: 1000 ETH                  │  │
│ │   ├─ _execute()                        │  │
│ │   └─ borrower.call()  ← ATTACK POINT   │  │
│ │                                         │  │
│ │ Step 4: Reenter via receive()          │  │
│ │   ├─ flashLoan() [reentered]           │  │
│ │   ├─ Drained: 100 ETH                  │  │
│ │   └─ Balance: 1100 ETH (should be 0)  │  │
│ │                                         │  │
│ │ Step 5: Withdraw                       │  │
│ │   └─ Transferred to attacker: 100 ETH  │  │
│ │                                         │  │
│ └──────────────────────────────────────────┘  │
│                                              │
│ State Diff:                                   │
│ ┌─────────────────────────────────────────┐   │
│ │ Slot 0x05: 0 → 100 (balance drained)   │   │
│ │ Slot 0x12: 0xabcd → 0xdead (owner)     │   │
│ └─────────────────────────────────────────┘   │
│                                              │
│ [Copy Trace] [Save as PoC] [Add to Evidence] │
└──────────────────────────────────────────────┘
```

### 4.9 Report Viewer

**Purpose:** Full audit report with executive summary, finding details, PoCs, and patches.

**One primary CTA:** Export or submit the report.

```
┌──────────────────────────────────────────────┐
│ 📄 Audit Report: Uniswap V4                  │
│                                              │
│ ┌── Executive Summary ────────────────────┐  │
│ │ Protocol: Uniswap V4                    │  │
│ │ Scope: LendingPool, OracleAdapter, Vault│  │
│ │ Total Findings: 8 (1C, 2H, 3M, 1L, 1I) │  │
│ │ Risk Level: HIGH                        │  │
│ │                                          │  │
│ │ "We identified a critical reentrancy     │  │
│ │  vulnerability in flashLoan()..."       │  │
│ └──────────────────────────────────────────┘  │
│                                              │
│ ┌── Findings ─────────────────────────────┐  │
│ │ 🔴 C-01 Reentrancy in flashLoan()      │  │
│ │ 🔴 C-02 Oracle Manipulation            │  │
│ │ 🟠 H-01 Missing Access Control         │  │
│ │ 🟡 M-01 Unchecked Return Value         │  │
│ └──────────────────────────────────────────┘  │
│                                              │
│ [Export PDF] [Export JSON] [Submit Bounty]   │
│ [Share] [Print]                               │
└──────────────────────────────────────────────┘
```

#### Report Sections

1. **Executive Summary** — Overview, risk score, key findings summary.
2. **Scope** — Files, contracts, functions analyzed.
3. **Findings** — Full finding list with severity, status, details.
4. **Proofs of Concept** — Exploit code for each verified finding.
5. **Patch Recommendations** — Fix code for each finding.
6. **Appendices** — Full transaction traces, storage snapshots, methodology.

### 4.10 Bug Bounty Dashboard

**Purpose:** Track active bug bounties, submissions, and earnings.

**One primary CTA:** Investigate a new bounty or check submission status.

```
┌────────────────────────────────------------------------------+
� ?? Bug Bounty Dashboard                      �
�                                              �
� +-- Active Bounties ----------------------+  �
� � ? Immunefi: EigenLayer                  �  �
� �   Scope: AVS contracts                  �  �
� �   Rewards: Up to ,000               �  �
� �   Deadline: 5 days                      �  �
� �   [Investigate] [View Scope]            �  �
� �                                          �  �
� � ? Hats Finance: Lido V3                 �  �
� �   Scope: Withdrawal queue               �  �
� �   Rewards: ,000                      �  �
� �   Deadline: 12 days                     �  �
� �   [Investigate] [View Scope]            �  �
� +------------------------------------------+  �
�                                              �
� +-- Submissions --------------------------+  �
� � ? Reentrancy in LendingPool             �  �
� �   Submitted: Mar 15                     �  �
� �   Status: Under Review                  �  �
� �   Reward: Pending                       �  �
� �                                          �  �
� � ? Oracle Manipulation                   �  �
� �   Submitted: Mar 10                     �  �
� �   Status: ? Accepted                   �  �
� �   Reward: ,000                       �  �
� +------------------------------------------+  �
�                                              �
� Total Earned: ,500                        �
+----------------------------------------------+
\\\

#### States

| State | Appearance | Behavior |
|-------|-----------|----------|
| **Empty** | "No active bounties. Connect a bounty platform to get started." | Quick action to connect Immunefi/Hats/etc. |
| **Loading** | Skeleton cards for bounties and submissions. | Loading from API. |
| **Populated** | Active bounties listed with deadlines. Submissions with status. | Clicking [Investigate] starts a new investigation for that bounty. |
| **Error** | "Failed to load bounties. Check connection. [Retry]" | API or authentication error. |

### 4.11 War Room (Session Manager)

**Purpose:** Manage multiple investigations, browse past sessions, fork investigations.

**One primary CTA:** Browse, search, or resume investigations.

\\\
+----------------------------------------------+
� ??? War Room                                   �
�                                              �
� ?? Search investigations...                  �
�                                              �
� +-- Active (3) ---------------------------+  �
� � ? Uniswap V4 Audit                      �  �
� �   Status: ? PoC in progress             �  �
� �   8 findings | 23m elapsed              �  �
� � [Resume] [Fork] [Close]                 �  �
� �                                          �  �
� � ? EigenLayer Bounty                     �  �
� �   Status: ?? Recon phase                �  �
� �   2 findings | 12m elapsed              �  �
� � [Resume] [Fork] [Close]                 �  �
� +------------------------------------------+  �
�                                              �
� +-- Paused (2) ---------------------------+  �
� � ? Aave Flash Loan Analysis             �  �
� �   Status: ? Paused                     �  �
� �   5 findings | Saved 2h ago            �  �
� � [Resume] [Export] [Delete]             �  �
� +------------------------------------------+  �
�                                              �
� +-- Completed (5) -----------------------+  �
� � ? Lido V3 Audit                        �  �
� �   Status: ? Report exported            �  �
� �   12 findings | 3 critical             �  �
� � [View Report] [Reopen] [Export]        �  �
� +------------------------------------------+  �
�                                              �
� [+ New Investigation]                        �
+----------------------------------------------+
\\\

#### States

| State | Appearance | Behavior |
|-------|-----------|----------|
| **Empty** | "No investigations yet. Start your first investigation." | New Investigation CTA prominently shown. |
| **Loading** | Skeleton list with grouped placeholders. | Loading investigations from storage. |
| **Populated** | Investigations grouped by status (Active/Paused/Completed). | Click to resume. Hover for quick actions. |
| **Searching** | Filtered results. "Found 3 matching 'Uniswap'." | Real-time filtering across all investigations. |
| **Error** | "Failed to load investigations. [Retry]" | Storage or serialization error. |

### 4.12 Settings

**Purpose:** Configure Sireen behavior, RPC endpoints, API keys, wallet.

**One primary CTA:** Configure or update a setting.

\\\
+----------------------------------------------+
� ?? Settings                                   �
�                                              �
� [General] [Chains] [API Keys] [Wallet] [About]�
�                                              �
� +-- General ------------------------------+  �
� � Default Chain:    [Ethereum ?]         �  �
� � Default Mode:     [Recon ?]            �  �
� � Auto-Save:        [Toggle] ON          �  �
� � Telemetry:        [Toggle] OFF         �  �
� � Theme:            [Match VS Code ?]    �  �
� � Language:         [English ?]          �  �
� +------------------------------------------+  �
�                                              �
� +-- RPC Endpoints ------------------------+  �
� � Ethereum:    [https://eth.llamarpc.com]�  �
� � Polygon:     [https://polygon.rpc.com] �  �
� � Optimism:    [https://opt.rpc.com]     �  �
� �                                        �  �
� � [+ Add Custom RPC]                     �  �
� +------------------------------------------+  �
�                                              �
� +-- Keyboard Shortcuts -------------------+  �
� � Focus Input:        Ctrl+Shift+A       �  �
� � New Investigation:  Ctrl+N             �  �
� � Quick Search:       Ctrl+F             �  �
� � [View All Shortcuts]                    �  �
� +------------------------------------------+  �
+----------------------------------------------+
\\\

---

## PART 5 � COMPONENT LIBRARY

### 5.1 Finding Card

**Purpose:** Display a single vulnerability finding with severity, context, and actions.

**User problem solved:** Findings need to be scannable by severity, actionable with one click, and expandable for full detail.

**Interaction model:** Collapsed by default. Click to expand. Actions available in both states.

\\\	ypescript
// Visual properties
border-left: 4px solid var(--severity-color)
border-radius: var(--radius-lg)
padding: var(--space-1\.5) var(--space-2)
margin: var(--space-1) 0
background: var(--app-surface)
transition: all var(--duration-normal) var(--ease-default)

// Severity colors (applied to border-left)
--severity-color: var(--severity-critical)  /* or */
--severity-color: var(--severity-high)      /* or */
--severity-color: var(--severity-medium)    /* or */
--severity-color: var(--severity-low)       /* or */
--severity-color: var(--severity-info)

// Collapsed layout
+-----------------------------------------+
� [?? CRITICAL] Reentrancy in flashLoan() �
� LendingPool.sol:124         ? Unverified�
� flashLoan ? _execute ? borrower.call�   �
� [Verify] [Generate PoC] [Suggest Patch] �
+-----------------------------------------+

// Expanded layout (additional content)
� Attack Path:                              �
� flashLoan() ? _execute() ? borrower.call()�
� ? [REENTER] ? _updateBalance()            �
�                                           �
� Affected Code (LendingPool.sol:124-145):  �
� \\\solidity                              �
� function flashLoan() {                    �
�   _execute();  // callback before update  �
�   _updateBalance();  // too late         �
� }                                         �
� \\\                                      �
�                                           �
� Evidence: [2 attachments] [View All]      �
� Notes: [Add Note]                         �
\\\

#### States

| State | Appearance | Behavior |
|-------|-----------|----------|
| **New** | Pulsing border-left for 2 seconds. Subtle glow. | Auto-dismisses pulse after 2s. |
| **Collapsed** | Single row with severity, title, location, status, truncated path. | Click to expand. Action buttons always visible. |
| **Expanded** | Full attack path, code snippet, evidence list. | Click collapse or click outside to collapse. |
| **Unverified** | Grey status badge. | Default state for new findings. |
| **Verified** | Green checkmark + "Verified" badge. | Human has confirmed the finding. |
| **Fixed** | Strikethrough title. Green "Fixed" badge. | Patch has been applied and verified. |
| **Dismissed** | 50% opacity. "Dismissed" badge. | Finding was false positive or out of scope. |
| **Selected** | Highlighted background + subtle left-border glow. | Focused state for keyboard navigation. |
| **Loading** | Skeleton variant with pulsing severity bar. | Used while finding details load. |

#### Future Scalability

- Finding cards can group sub-findings (e.g., 3 variants of reentrancy)
- Custom severity levels per protocol
- Integration with CVE database for known vulnerability matching
- Collaborative annotations and discussion threads

### 5.2 Threat Graph Node

**Purpose:** Represent an entity (contract, function, attacker, token) in the threat map.

**User problem solved:** Complex contract interactions need a visual, navigable representation.

**Interaction model:** Click to select/inspect. Hover to highlight connections.

\\\	ypescript
// Node types and their visual representation
contract:    [?? ContractName]   ? blue, rounded rect
function:    [?? functionName()] ? small, grey pill
attacker:    [?? Attacker]       ? red, diamond
token:       [?? TokenName]      ? green, circle
oracle:      [?? OracleName]     ? yellow, hexagon
user:        [?? User]           ? blue, circle

// Base node styling
border-radius: var(--radius-md) or shape-specific
padding: var(--space-1) var(--space-1\.5)
font-size: var(--text-body-small)
font-family: var(--font-mono)
cursor: pointer
transition: all var(--duration-fast) var(--ease-default)
\\\

#### States

| State | Appearance | Behavior |
|-------|-----------|----------|
| **Default** | Normal rendering with label. Standard opacity. | Clickable, hoverable. |
| **Selected** | Glow effect + bold border (2px var(--app-accent)). | Detail panel opens with node info. |
| **Highlighted** | Brighter fill. Connected edges emphasized. | Triggered by hovering over connected node. |
| **Dimmed** | 30% opacity. Not relevant to current focus. | Filtered out or not in current attack path. |
| **Has finding** | Red badge overlay with count. | One or more vulnerabilities found in this node. |
| **Has warning** | Yellow badge overlay. | Potential issue identified (not confirmed). |
| **Loading** | Pulsing skeleton shape. | Node data still loading. |

### 5.3 Exploit Simulation Block

**Purpose:** Show live exploit simulation progress with step-by-step execution.

**User problem solved:** Users need to see simulation progress and understand what's happening at each step.

**Interaction model:** Streaming output in terminal-like block. Steps update in real-time.

\\\	ypescript
// Visual properties
background: var(--vscode-terminal-background)
color: var(--vscode-terminal-foreground)
font-family: var(--font-mono)
font-size: var(--text-code-small)
border-radius: var(--radius-lg)
padding: var(--space-1\.5)
border: 1px solid var(--app-border)

// Elements
Header: ? Simulating: [exploit name]
Step list with progress:
  [?] Step 1: Deploy contract     (completed)
  [?] Step 2: Fund with ETH       (current)
  [ ] Step 3: Call function       (pending)
  [ ] Step 4: Exploit             (pending)
Live output streaming (monospace)
Status indicator
Duration
Actions: [Stop] [Rerun] [Copy Output] [Save as PoC]
\\\

#### States

| State | Appearance | Behavior |
|-------|-----------|----------|
| **Idle** | Grey. "Ready to simulate." | Start button only. |
| **Queued** | "Waiting in queue..." with position indicator. | Waiting for other simulations to complete. |
| **Running** | Green progress bar. Steps update in real-time. Terminal output streams. | Stop button available. |
| **Success** | Green checkmark. Shows drained amount / result. | Save as PoC and Add to Findings buttons appear. |
| **Failed** | Red X. Shows error message. | Debug button opens editor at relevant line. Rerun button. |
| **Cancelled** | Grey. "Stopped" badge. | Partial output preserved. Rerun available. |

### 5.4 Evidence Attachment

**Purpose:** Show attached evidence items inline in messages, findings, or the evidence locker.

**User problem solved:** Evidence needs to be compact, scannable, and actionable.

**Interaction model:** Click to preview. Inline display with type icon and metadata.

\\\	ypescript
// Visual properties
border: 1px solid var(--app-border)
border-radius: var(--radius-md)
padding: var(--space-0\.5) var(--space-1)
display: inline-flex
align-items: center
gap: var(--space-0\.5)
font-size: var(--text-body-small)
transition: all var(--duration-fast) var(--ease-default)

// Types and their icons
trace:   [?? TX_HASH] Transaction trace
code:    [?? File] Code snippet
log:     [?? Log] Event log entry  
storage: [?? Slot] Storage snapshot
image:   [??? Name] Screenshot/diagram
note:    [?? Note] Researcher note
result:  [? Result] Execution output

// Actions
- Remove (�) button (when editable)
- Click to preview in evidence viewer
- Drag to reorder (when in evidence locker)
- Copy reference link
\\\

### 5.5 Timeline Event

**Purpose:** Display a single event in the security timeline.

**User problem solved:** Events need to show type, context, and relationship to other events at a glance.

**Interaction model:** Click to expand/collapse details. Pin to evidence.

\\\	ypescript
// Visual properties
border-left: 2px solid var(--event-type-color)
padding-left: var(--space-1\.5)
margin: var(--space-0\.5) 0
font-size: var(--text-body-small)

// Event type colors
transaction:  var(--severity-low)      /* Blue */
state_change: var(--severity-medium)   /* Yellow */
function_call: var(--severity-info)    /* Cyan */
reentry:      var(--severity-critical) /* Red */
finding:      var(--severity-critical) /* Red */
analysis:     var(--severity-info)     /* Grey */

// Layout
? 0xabcd...ef01          [Pin] [Copy]
  +- Deploy LendingPool
  +- Set Oracle: 0xabc...
  +- flashLoan() called
  �  +- _execute()
  �  +- borrower.call() ? REENTRY
  +- Finding: Reentrancy confirmed
\\\

### 5.6 Vulnerability Path

**Purpose:** Show the chain of function calls that leads to a vulnerability.

**User problem solved:** Attack paths are complex graphs. A linear clickable representation makes them understandable.

**Interaction model:** Click any step to navigate to source code.

\\\	ypescript
// Visual properties
display: flex
align-items: center
gap: var(--space-0\.5)
font-family: var(--font-mono)
font-size: var(--text-code-small)
flex-wrap: wrap

// Elements
[flashLoan()] ? [_execute()] ? [borrower.call()] ? ?? [REENTRY] ? [_updateBalance()]

// Each step is a clickable chip:
border-radius: var(--radius-sm)
padding: 2px 8px
background: var(--app-surface)
border: 1px solid var(--app-border)
cursor: pointer

// Vulnerability point (??):
color: var(--severity-critical)
font-weight: var(--weight-bold)

// Arrow between steps:
color: var(--app-text-muted)
margin: 0 4px
\\\

### 5.7 Message Bubbles

#### User Message

\\\	ypescript
background: var(--vscode-input-background)
border-radius: var(--radius-lg) var(--radius-lg) var(--radius-lg) var(--radius-none)
padding: var(--space-1) var(--space-1\.5)
max-width: 85%
align-self: flex-end
font-size: var(--text-body)

// Elements
- Avatar (user icon, top-right, 20px)
- Message text (markdown rendered, no extra formatting)
- Timestamp (bottom-right, --text-caption, muted)
- File attachments (as evidence chips below text)
- Image previews (thumbnail grid, max 3 visible)
- Edit button (hover only)
- Delete button (hover only)
\\\

#### AI Message

\\\	ypescript
background: var(--vscode-textBlockQuote-background)
border-radius: var(--radius-lg) var(--radius-lg) var(--radius-none) var(--radius-lg)
padding: var(--space-1) var(--space-1\.5)
max-width: 85%
align-self: flex-start
font-size: var(--text-body)

// Elements
- Avatar (Sireen shield, top-left, 20px)
- Message text (markdown rendered)
- Code blocks with syntax highlighting + copy button
- Embedded Finding Cards, Tool Calls, Evidence, Simulations
- Timestamp (when done streaming)
- Feedback buttons (thumbs up/down, collapsed by default)
\\\

#### States (both)

| State | User Message | AI Message |
|-------|-------------|------------|
| **Sent** | Normal appearance | Normal appearance |
| **Streaming** | N/A | Cursor animation at end. Character-by-character reveal. |
| **Complete** | Timestamp visible | Full message, timestamp, optional feedback buttons |
| **Interrupted** | N/A | "Stopped" badge. Partial content preserved. |
| **Editing** | Textarea replaces rendered text. Cancel/Save. | N/A |
| **Error** | Red border, "Failed to send" | "Failed to generate" with [Retry] |

### 5.8 Tool Call Block

**Purpose:** Show AI tool execution with expandable details.

**User problem solved:** Users need to see what tools the AI is using without cluttering the conversation.

**Interaction model:** Collapsed by default (single line). Click chevron to expand.

\\\	ypescript
// Visual properties
background: var(--app-surface)
border: 1px solid var(--app-border)
border-radius: var(--radius-lg)
margin: var(--space-1) 0
overflow: hidden
transition: all var(--duration-normal) var(--ease-default)

// Collapsed view (default)
? ?? Tool: static_analyze
?? contracts/LendingPool.sol

// Expanded view
? ?? Tool: static_analyze        Status: ? 0.3s
?? contracts/LendingPool.sol
-----------------------------
Input: { function: "flashLoan" }
-----------------------------
Output: Found 2 external calls...
-----------------------------
[Copy Output]
\\\

#### States

| State | Appearance |
|-------|-----------|
| **Pending** | Grey. "Waiting..." No duration. |
| **Running** | Spinner animation. "Running..." Duration counting up. |
| **Completed** | Green checkmark. Duration shown. Output visible when expanded. |
| **Failed** | Red X. Error message. [Retry] button. |
| **Collapsed** | Single line. Chevron right. |
| **Expanded** | Full details. Chevron down. |

### 5.9 Attack Hypothesis Card

**Purpose:** Display an AI-generated hypothesis about a potential attack vector.

**User problem solved:** AI should suggest attack vectors for the researcher to validate, not just report findings.

**Interaction model:** Card with accept/reject/refine actions.

\\\	ypescript
// Visual properties
border: 1px dashed var(--severity-medium)
border-radius: var(--radius-lg)
padding: var(--space-1\.5) var(--space-2)
background: var(--app-surface)

// Elements
?? Hypothesis: Oracle Price Manipulation
Confidence: 75%
Attack Vector:
  1. Manipulate ETH/USD price via flash loan
  2. Call swap() with inflated price
  3. Drain excess tokens

Evidence:
  - Oracle uses spot price (no TWAP)
  - swap() uses oracle directly
  - No price check after swap

[Validate] [Refine] [Dismiss] [View Attack Path]
\\\

### 5.10 Status Badge

**Purpose:** Show the lifecycle status of a finding or investigation.

\\\	ypescript
// Visual properties
display: inline-flex
align-items: center
gap: var(--space-0\.5)
padding: 2px 8px
border-radius: var(--radius-full)
font-size: var(--text-label)
font-weight: var(--weight-medium)
letter-spacing: 0.02em

// Status variants
? Unverified    bg: var(--finding-unverified) 20%    text: var(--finding-unverified)
? Verified      bg: var(--finding-verified) 20%      text: var(--finding-verified)
? Fixed         bg: var(--finding-fixed) 20%         text: var(--finding-fixed) (strikethrough title)
? Dismissed     bg: var(--finding-dismissed) 20%     text: var(--finding-dismissed) (50% opacity parent)
? Disputed      bg: var(--finding-disputed) 20%      text: var(--finding-disputed)
? Active        bg: var(--status-active) 20%         text: var(--status-active)
? Paused        bg: var(--status-paused) 20%         text: var(--status-paused)
? Complete      bg: var(--status-complete) 20%       text: var(--status-complete)
\\\

### 5.11 Severity Badge

**Purpose:** Show the severity level of a finding at a glance.

\\\	ypescript
// Visual properties
display: inline-flex
align-items: center
gap: var(--space-0\.5)
padding: 2px 10px
border-radius: var(--radius-full)
font-size: var(--text-label-uppercase)
font-weight: var(--weight-bold)
letter-spacing: 0.05em
text-transform: uppercase

// Severity variants
CRITICAL      bg: var(--severity-critical) 15%    text: var(--severity-critical)    border: var(--severity-critical) 30%
HIGH          bg: var(--severity-high) 15%        text: var(--severity-high)        border: var(--severity-high) 30%
MEDIUM        bg: var(--severity-medium) 15%      text: var(--severity-medium)      border: var(--severity-medium) 30%
LOW           bg: var(--severity-low) 15%         text: var(--severity-low)         border: var(--severity-low) 30%
INFO          bg: var(--severity-info) 15%        text: var(--severity-info)        border: var(--severity-info) 30%
\\\

### 5.12 Buttons

| Variant | Purpose | Visual |
|---------|---------|--------|
| **Primary** | Main CTA (Send, Approve, Start Investigation) | Filled --app-accent background. White text. |
| **Secondary** | Alternative action (Retry, Cancel, Preview) | Outlined: 1px solid --app-border. Transparent bg. |
| **Ghost** | Low emphasis (Add Note, Copy, Pin) | No border. Transparent bg. Text only. |
| **Icon** | Toolbar actions | 32x32px. Icon only at --icon-md. Ghost bg. |
| **Danger** | Destructive (Delete, Dismiss, Reject) | Red text/border. Transparent bg. |
| **Link** | Navigation (View PoC, Open in Editor) | Text only. --app-link color. Underline on hover. |

**States:** Default, Hover, Active, Disabled (40% opacity), Loading (spinner replaces icon).

**Sizes:**
- **Compact:** 28px height. 6px 12px padding. --text-body-small.
- **Standard:** 32px height. 8px 16px padding. --text-body.
- **Large:** 40px height. 10px 20px padding. --text-body-large.

### 5.13 Input Components

#### Chat Textarea

\\\	ypescript
// Visual properties
background: var(--vscode-input-background)
color: var(--vscode-input-foreground)
border: 1px solid var(--vscode-input-border)
border-radius: var(--radius-sm)
padding: var(--space-1) var(--space-1\.5)
font-size: var(--text-body)
font-family: var(--font-ui)
line-height: 1.5
resize: none

// Behavior
- Auto-resizing (2-8 lines visible, scrolls after 8)
- @mentions ? autocomplete dropdown (findings, contracts, functions)
- /commands ? slash command menu
- Image paste/drop ? inline thumbnail preview
- Enter to send. Shift+Enter for newline.
\\\

#### Search Input

\\\	ypescript
background: var(--vscode-input-background)
border: 1px solid var(--vscode-input-border)
border-radius: var(--radius-sm)
padding: var(--space-0\.5) var(--space-1)
font-size: var(--text-body)
padding-left: 28px  // icon space

// Behavior
- Clear button (�) when text is present
- Debounced at 300ms
- Placeholder text: context-appropriate
\\\

### 5.14 Selectors

#### Scope Selector

\\\	ypescript
// Visual properties
display: inline-flex
align-items: center
gap: var(--space-0\.5)
padding: 2px 8px
border-radius: var(--radius-sm)
font-size: var(--text-body-small)
font-family: var(--font-mono)
background: var(--app-surface)
border: 1px solid var(--app-border)
cursor: pointer

// Dropdown options
- Entire protocol
- Specific contract
- Specific function
- Custom scope (text input)
\\\

#### Mode Selector

\\\	ypescript
// Visual properties
display: inline-flex
align-items: center
gap: var(--space-0\.5)
padding: 2px 8px
border-radius: var(--radius-sm)
font-size: var(--text-body-small)
background: var(--app-surface)
border: 1px solid var(--app-accent)
color: var(--app-accent)
cursor: pointer

// Modes
?? Recon     � Surface-level analysis, understand the protocol
?? Analyze   � Deep dive, find vulnerabilities
? Exploit   � Develop and test PoC exploits
??? Patch     � Generate and validate fixes
\\\

### 5.15 Permission Card

**Purpose:** Request user approval for AI actions (running commands, writing files, submitting transactions).

\\\	ypescript
border: 1px solid var(--vscode-inputValidation-warningBorder)
border-radius: var(--radius-lg)
padding: var(--space-1\.5)
background: var(--vscode-inputValidation-warningBackground)

?? Sireen wants to run: forge test --match-path test/Exploit.t.sol
Path: /projects/uniswap-v4-audit/

[Approve] [Approve Always in this Workspace] [Deny]
[Configure Auto-approve Rules ?]
\\\

#### States

| State | Appearance |
|-------|-----------|
| **Waiting** | Pulsing border. Buttons enabled. |
| **Approved** | Green border. "Approved" badge. |
| **Denied** | Grey border. "Denied" badge. |
| **Auto-approved** | Not shown. Silent approval. |

### 5.16 Error Card

\\\	ypescript
border: 1px solid var(--vscode-inputValidation-errorBorder)
border-radius: var(--radius-lg)
padding: var(--space-1\.5)
background: var(--vscode-inputValidation-errorBackground)

? Error Title
Detailed error message (technical details in monospace if applicable)
[Retry] [Show Details] [Copy Error]
\\\

#### States

| State | Appearance |
|-------|-----------|
| **Error** | Red card. Full message. |
| **Retrying** | Spinner. "Retrying..." |
| **Resolved** | Green border. "Resolved" badge. Auto-dismisses after 3s. |

### 5.17 Thinking Indicator

**Purpose:** Show that the AI is reasoning before responding.

\\\	ypescript
background: transparent
padding: var(--space-1) var(--space-1\.5)
font-style: italic
opacity: 0.7
font-size: var(--text-body)

?? Analyzing the contract structure...
   Analyzing function calls...
   Checking for known vulnerability patterns...
\\\

#### States

| State | Appearance |
|-------|-----------|
| **Thinking** | Animated dots cycling. Text updates periodically. |
| **Extended thinking** | Reasoning effort progress bar (for deep reasoning models). |
| **Done** | Fades out when first output appears. |

### 5.18 Progress & Streaming Indicators

#### Streaming Cursor

\\\css
/* Blinking caret at end of AI message text */
width: 2px
height: 1em
background: var(--app-accent)
animation: blink 1s step-end infinite

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
\\\

#### Progress Bar (Simulation)

\\\css
height: 4px
background: var(--app-border)
border-radius: var(--radius-full)
overflow: hidden

/* Fill */
.simulation-progress-fill {
  height: 100%
  background: var(--simulation-running)
  transition: width var(--duration-normal) var(--ease-default)
}
\\\

#### Loading Spinner

\\\css
width: 16px
height: 16px
border: 2px solid var(--app-border)
border-top-color: var(--app-accent)
border-radius: 50%
animation: spin 0.6s linear infinite
\\\

### 5.19 Empty State

**Purpose:** Guide users when a screen has no content.

\\\	ypescript
// Visual properties
display: flex
flex-direction: column
align-items: center
justify-content: center
padding: var(--space-6) var(--space-2)
text-align: center
gap: var(--space-2)

// Elements
- Large icon (--icon-xl, muted color)
- Title (--text-h3, muted)
- Description (--text-body, muted)
- CTA button (optional, primary variant)
\\\

#### Empty State Messages

| Screen | Title | Description | CTA |
|--------|-------|-------------|-----|
| Chat | "Start an investigation" | "Analyze a contract or protocol to begin." | [Analyze Contract] |
| Threat Map | "No threat model yet" | "Ask the AI to analyze a function to generate one." | [Start Analysis] |
| Findings | "No findings yet" | "Run an analysis to discover vulnerabilities." | [Run Analysis] |
| Timeline | "No events recorded" | "Run an analysis to populate the timeline." | [Run Analysis] |
| Evidence | "No evidence collected" | "Run analysis to start gathering evidence." | [Run Analysis] |
| War Room | "No investigations" | "Start your first security investigation." | [New Investigation] |
| Bounties | "No active bounties" | "Connect a bounty platform to get started." | [Connect Platform] |

### 5.20 Loading Skeleton

**Purpose:** Show placeholder content while data loads.

\\\css
/* Base skeleton style */
.skeleton {
  background: linear-gradient(
    90deg,
    var(--app-surface) 25%,
    var(--app-hover) 50%,
    var(--app-surface) 75%
  )
  background-size: 200% 100%
  animation: shimmer 1.5s ease-in-out infinite
  border-radius: var(--radius-sm)
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
\\\

**Skeleton variants:** Message row, finding card, graph node, evidence card, timeline event, session card.

### 5.21 Toast & Notification

**Purpose:** Show non-blocking status updates.

\\\	ypescript
// Visual properties
background: var(--vscode-editor-background)
border: 1px solid var(--app-border)
border-radius: var(--radius-lg)
padding: var(--space-1) var(--space-1\.5)
box-shadow: var(--elevation-medium)
z-index: var(--z-toast)
font-size: var(--text-body-small)

// Types
? Simulation complete � 100 ETH drained
? Analysis failed � RPC connection error
?? Investigation saved
?? Low disk space � cache cleaning recommended
\\\

**Position:** Bottom-right corner. Stacks vertically (max 3 visible). Auto-dismisses after 5s (success/info) or persists (error/warning).

### 5.22 Panel Container

**Purpose:** Consistent wrapper for webview panels.

\\\css
.panel {
  background: var(--vscode-editor-background);
  height: 100%;
  display: flex;
  flex-direction: column;
}

.panel-header {
  height: var(--panel-header-height);
  display: flex;
  align-items: center;
  padding: 0 var(--space-2);
  border-bottom: 1px solid var(--app-border);
  font-size: var(--text-body-small);
  font-weight: var(--weight-medium);
  gap: var(--space-1);
}

.panel-toolbar {
  height: var(--panel-toolbar-height);
  display: flex;
  align-items: center;
  padding: 0 var(--space-2);
  gap: var(--space-1);
  border-bottom: 1px solid var(--app-border);
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--panel-padding);
}
\\\

### 5.23 Investigation Header

\\\	ypescript
// Visual properties
height: 48px (fixed)
display: flex
align-items: center
padding: 0 var(--space-2)
gap: var(--space-1)
border-bottom: 1px solid var(--app-border)
font-size: var(--text-body-small)

// Layout
[? Back] [Protocol Name] [Risk Badge] [Findings Count] [spacer] [Status] [Duration]

// Risk badge
padding: 2px 8px
border-radius: var(--radius-full)
font-size: var(--text-label)
font-weight: var(--weight-bold)
text-transform: uppercase

// Risk levels
CRITICAL: bg: var(--severity-critical) 20%  text: var(--severity-critical)
HIGH:     bg: var(--severity-high) 20%      text: var(--severity-high)
MEDIUM:   bg: var(--severity-medium) 20%    text: var(--severity-medium)
LOW:      bg: var(--severity-low) 20%       text: var(--severity-low)
NONE:     not shown
\\\

### 5.24 Workspace Tabs

\\\	ypescript
// Visual properties
height: 36px (fixed)
display: flex
align-items: center
gap: 0
border-bottom: 1px solid var(--app-border)
padding: 0 var(--space-1)

// Tab item
display: flex
align-items: center
gap: var(--space-0\.5)
padding: 0 var(--space-1\.5)
height: 100%
font-size: var(--text-body-small)
color: var(--app-text-muted)
cursor: pointer
border-bottom: 2px solid transparent
transition: all var(--duration-fast) var(--ease-default)

// Active tab
color: var(--app-text)
border-bottom-color: var(--app-accent)

// Tab badge
background: var(--app-accent)
color: white
border-radius: var(--radius-full)
padding: 0 6px
font-size: var(--text-caption)
font-weight: var(--weight-bold)
\\\

---

## PART 6 � AI INTERACTION MODEL

### 6.1 Streaming Architecture

The AI response is a stream of events from the backend:

\\\
Event types:
- text:        "Checking flashLoan() for reentrancy..."
- tool_start:  { tool: "static_analyze", input: { function: "flashLoan" } }
- tool_output: { tool: "static_analyze", output: "Found 2 external calls..." }
- finding:     { severity: "critical", title: "Reentrancy in flashLoan()", ... }
- simulation:  { status: "running", step: 2, message: "Deploying attack contract..." }
- evidence:    { type: "trace", tx: "0xabcd...", ... }
- finish:      { reason: "complete", usage: { ... } }
\\\

Each event type maps to a UI component:

| Event | UI Component | Behavior |
|-------|-------------|----------|
| 	ext | AI Message Bubble | Appends text character by character |
| 	ool_start | Tool Call Block | Creates collapsed block, shows "Running..." |
| 	ool_output | Tool Call Block | Updates block with output, marks "Completed" |
| 	ool_error | Tool Call Block (Error) | Shows error state, [Retry] button |
| inding | Finding Card | Slides in from right, severity-colored border |
| simulation | Exploit Simulation Block | Live streaming terminal output |
| evidence | Evidence Attachment | Appears inline in message |
| permission_request | Permission Card | Blocks execution until approved/denied |
| inish | � | Stops streaming, adds timestamp, token usage |

### 6.2 Response Format

Every AI response follows a consistent structure:

\\\
1. Thought process (collapsible reasoning, visible on hover/expand)
2. Action (tool call with evidence, streamed)
3. Finding (structured card if vulnerability discovered)
4. Recommendation (next steps for the researcher)
\\\

### 6.3 Tool Call Visualization

Each tool call renders as a collapsible card (see 5.8 for full spec).

Special tool renderings:
- static_analyze: Shows function name, file path, control flow preview
- generate_exploit: Shows exploit code with syntax highlighting, compile status
- 
un_simulation: Live terminal output with step progress
- suggest_patch: Shows diff view with add/remove counts
- check_known_vulns: Shows categorized results by severity

### 6.4 Thinking & Reasoning

- Shown when AI is reasoning before responding
- Animated dots with cycling opacity (CSS only)
- Text updates periodically ("Analyzing control flow...", "Checking dependencies...", etc.)
- Disappears when first text token or tool call appears
- For extended reasoning (deep analysis), shows a progress-like indicator

### 6.5 Permission Flow

\\\
AI needs to execute action
+-- Action requires approval?
�   +-- No ? Execute immediately
�   +-- Yes ? Show Permission Card
�       +-- User approves ? Execute
�       +-- User denies ? AI receives denial, adapts approach
�       +-- Auto-approved (settings) ? Not shown, silent execution
+-- Action completes ? Update UI
\\\

### 6.6 Interruption Model

Users can interrupt the AI at any time:

1. **Click stop button** (appears in header while AI is responding) ? Cancels current generation. Partial content preserved.
2. **Send new message** ? Cancels current generation. New message becomes the active context.
3. **Switch investigation** ? Confirms: "Switch investigation? Current analysis will be cancelled."

### 6.7 Evidence Presentation

When the AI presents evidence, it must follow these rules:
1. **Always show the source** (transaction hash, code location, block number)
2. **Provide multiple views** (raw ? decoded ? visual toggle for traces)
3. **Make evidence actionable** (copy, pin, attach to finding buttons)
4. **Show state before/after** for state-changing events

---

## PART 7 � STATE MANAGEMENT

### 7.1 State Layers

\\\
+-----------------------------------------+
�  Global State                            �
�  - Connected chain(s)                    �
�  - Wallet connection                     �
�  - Active investigation ID               �
�  - RPC endpoint status                   �
�  - Configuration (audit settings)       �
+-----------------------------------------�
�  Investigation State                     �
�  - Target contract/protocol              �
�  - Findings array (severity-sorted)      �
�  - Threat graph (nodes + edges)          �
�  - Timeline events                       �
�  - Evidence locker items                 �
�  - Messages + AI stream                  �
�  - Running simulations                   �
+-----------------------------------------�
�  UI State                                �
�  - Active workspace tab                  �
�  - Selected finding                      �
�  - Selected graph node                   �
�  - Expanded/collapsed items              �
�  - Input draft text                      �
�  - Timeline filters                      �
�  - Graph zoom/pan position              �
+-----------------------------------------�
�  Simulation State                        �
�  - Active simulation status              �
�  - Forked chain state                    �
�  - Exploit execution steps               �
�  - Gas/cost tracking                     �
�  - Simulation logs                       �
+-----------------------------------------+
\\\

### 7.2 Store Definitions

**Chat Store:**
\\\	ypescript
- messages: Message[]
- currentStreamingMessage: Message | null
- isStreaming: boolean
- isThinking: boolean
- activeToolCalls: ToolCall[]
- inputDraft: string
- attachments: Attachment[]
- selectedScope: string
- selectedMode: InvestigationMode
\\\

**Investigation Store:**
\\\	ypescript
- findings: Finding[]
- threatGraph: { nodes: Node[], edges: Edge[] }
- timelineEvents: TimelineEvent[]
- evidenceItems: EvidenceItem[]
- status: InvestigationStatus
- riskScore: RiskLevel
- duration: number
\\\

**UI Store:**
\\\	ypescript
- activeTab: WorkspaceTab
- expandedFindingIds: Set<string>
- expandedToolCallIds: Set<string>
- selectedNodeId: string | null
- pinnedEvidenceIds: Set<string>
- scrollPositions: Map<string, number>
\\\

**Simulation Store:**
\\\	ypescript
- status: SimulationStatus
- currentStep: number
- totalSteps: number
- logs: string[]
- result: SimulationResult | null
- forkedChain: { rpcUrl: string, blockNumber: number }
\\\

### 7.3 State Persistence Strategy

| Data | Storage | Persistence |
|------|---------|-------------|
| Messages | Filesystem (.sireen/investigations/) | Disk |
| Findings | Filesystem (.sireen/investigations/) | Disk |
| Threat graph | Filesystem (.sireen/investigations/) | Disk |
| Timeline | Filesystem (.sireen/investigations/) | Disk |
| Evidence | Filesystem (.sireen/investigations/) | Disk |
| Configuration | VS Code globalState + workspaceState | Disk |
| UI preferences | globalState | Disk |
| Input drafts | Per-investigation cache | Memory |
| Scroll positions | Memory | Session only |
| Expanded/collapsed | Memory | Session only |

### 7.4 State Transitions

**Message lifecycle:**
\\\
User sends ? message added to list (optimistic)
  ? AI responds ? streaming message appears
  ? AI calls tool ? tool call block appears (running)
  ? Tool completes ? tool call updates (completed)
  ? AI continues ? more streaming text
  ? AI presents finding ? finding card appears
  ? AI finishes ? streaming stops, timestamp added
\\\

**Investigation lifecycle:**
\\\
Create ? welcome screen
  ? Start investigation ? init state
  ? Send first message ? first exchange
  ? Continue analysis ? accumulate findings, evidence
  ? Save investigation ? persisted to disk
  ? Close investigation ? unloaded from memory
  ? Reopen investigation ? loaded from disk
  ? Complete investigation ? marked complete
  ? Delete investigation ? removed from disk
\\\

### 7.5 Universal Screen States

Every screen must define these states:

| State | Purpose | Example Appearance |
|-------|---------|-------------------|
| **Loading** | Content is being fetched | Skeleton UI or progress indicator |
| **Empty** | No content exists yet | Empty state with illustration + CTA |
| **Active** | Content is loaded and interactive | Full rendering of the screen |
| **Error** | Something went wrong | Error card with message + retry |
| **Offline** | Network unavailable | Banner with offline notice |
| **Streaming** | Content is being received in real-time | Streaming indicators, partial content |
| **Completed** | All content has been received | Full content, completion indicators |

---

## PART 8 � USER FLOWS

### 8.1 Complete Investigation Journey

\\\
1. User opens Sireen from Activity Bar (shield icon)
2. Welcome screen appears with quick actions
3. User pastes contract address or selects "Analyze a contract"
4. User selects chain (Ethereum) and clicks "Start Investigation"
5. Sidebar opens with:
   - Header showing target address, chain, empty findings count
   - Chat tab active
   - AI greeting: "I've loaded contract 0xabcd... Let me start with surface-level analysis."
6. AI runs: static_analyze, check_etherscan, check_known_vulnerabilities
   ? Tool call blocks show running status
7. AI reports initial findings:
   - Finding card appears for each potential issue
   - User can verify, dismiss, or request PoC
8. User asks: "Show me the reentrancy path"
   ? AI switches to Threat Map tab
   ? Graph builds showing the attack path
9. User asks: "Can you exploit this?"
   ? Live Attack Workspace opens (separate webview panel)
   ? Simulation terminal opens with progress
   ? Shows: "Successfully drained 100 ETH"
10. AI suggests patch
    ? Shows diff view in chat
11. User adds finding to report
    ? Finding verified, added to actionable list
12. User exports report
    ? Report viewer opens with all findings, PoCs, patches
13. Investigation saved. User closes.
14. Later: User reopens from recent list.
    ? State restored. Timeline, findings, evidence all preserved.
\\\

### 8.2 Quick Recon Flow

\\\
1. User pastes contract address
2. AI immediately runs surface-level analysis
3. Shows: contract name, compiler version, dependency count, external call count
4. Flags: known vulnerability matches, license issues, unusual patterns
5. Presents: risk score (Low/Medium/High/Critical)
6. User decides: Deep dive or move to next target
\\\

### 8.3 Exploit Development Flow

\\\
1. Finding identified and verified
2. User clicks "Generate PoC"
3. AI writes exploit contract in Solidity
4. Shows code with syntax highlighting
5. User reviews code
6. User clicks "Run Simulation"
7. Attack Workspace opens
8. Forked chain starts (anvil/hardhat)
9. Exploit deploys and executes
10. Result: Success/Fail with details
11. User saves as PoC
12. PoC linked to finding in report
\\\

### 8.4 Reporting Flow

\\\
1. User opens Report Viewer
2. Executive Summary auto-generated from findings
3. User reviews and edits summary
4. Findings are pre-populated from investigation
5. User verifies each finding, adds notes
6. PoCs and patches are embedded
7. User exports as PDF or JSON
8. Optional: Submit to bounty platform
\\\

### 8.5 Bounty Hunting Flow

\\\
1. User opens Bounty Dashboard
2. Browses active bounties from connected platforms
3. Clicks "Investigate" on a bounty
4. New investigation starts with bounty scope pre-configured
5. User hunts for vulnerabilities
6. Finds + verifies a vulnerability
7. Generates PoC
8. Submits finding via dashboard
9. Tracks submission status
10. On acceptance: reward tracked in earnings
\\\

---

## PART 9 � ACCESSIBILITY

### 9.1 Keyboard Navigation

1. **All interactive elements must be focusable** via Tab key.
2. **Tab order follows visual order** (left-to-right, top-to-bottom).
3. **Focus indicators must be visible** (2px solid --app-focus-ring with 2px offset).
4. **Never remove focus outlines** unless providing a better focus indicator.
5. **All actions must have keyboard shortcuts** (see 3.5).
6. **Arrow key navigation** within lists (findings, timeline, evidence).

### 9.2 Focus Management

1. **When a modal opens,** focus moves to the first interactive element inside the modal.
2. **When a modal closes,** focus returns to the element that triggered it.
3. **When a finding card expands,** focus stays on the card header.
4. **After sending a message,** focus returns to the textarea.
5. **Trapping focus** inside modals and dropdowns (Tab cycles within, Escape closes).

### 9.3 Screen Reader Support

1. **All icons must have aria-labels** or descriptive text.
2. **Status changes must be announced** via aria-live regions:
   - "polite" for finding arrivals, simulation progress
   - "assertive" for errors, permission requests
3. **Finding cards** use role="article" with aria-label describing severity and title.
4. **Tab panels** use proper role="tablist", role="tab", role="tabpanel" with aria-selected.
5. **Loading states** use aria-busy="true".
6. **Streaming content** uses aria-live="polite" on the message container.

### 9.4 Color Contrast

1. **All text must meet WCAG AA standards** (4.5:1 for normal text, 3:1 for large text).
2. **Severity colors are used as indicators, not primary text.** Text labels accompany all color-coded indicators.
3. **Status dots have text labels** (not just color).
4. **Finding severity is indicated by:** color + icon + text label (never color alone).

### 9.5 Reduced Motion

1. **All animations respect prefers-reduced-motion: reduce.**
2. **Replace animated transitions** with instant (0ms) transitions.
3. **Remove pulsing/looping animations** (finding card pulse, thinking dots, streaming cursor).
4. **Keep opacity changes** (essential for state communication).

### 9.6 High Contrast Mode

1. **Sireen respects VS Code's high-contrast themes** automatically (via CSS custom properties).
2. **Ensure border contrast** in high-contrast mode for cards and panels.
3. **Severity indicators include text labels** (not just color borders).
4. **Focus indicators are always high-contrast.**

---

## PART 10 � PERFORMANCE

### 10.1 Rendering Strategy

1. **Solid.js** for reactive UI with fine-grained updates (no virtual DOM).
2. **CSS animations** for all motion (GPU-accelerated).
3. **Avoid inline styles** � use CSS classes for dynamic styling.
4. **Minimize DOM nodes** � virtual scrolling for long lists.

### 10.2 Virtualization

1. **Message list** uses virtual scroller (virtua). Only visible messages + buffer rendered.
2. **Findings list** virtualized when >20 items.
3. **Timeline events** loaded in blocks of 50. Virtualized scrolling.
4. **Evidence locker** uses infinite scroll with virtualized grid.
5. **Threat graph** uses canvas rendering for >100 nodes (DOM fallback for <100).

### 10.3 Lazy Loading

1. **Webviews loaded on demand:** Attack Workspace, Knowledge Graph, Report Viewer, War Room, Bounty Dashboard.
2. **Syntax highlighting** runs in a Web Worker (off main thread).
3. **Model/RPC lists** loaded on demand, cached in memory.
4. **Evidence items** load metadata first, full content on click.
5. **Investigation list** (on welcome screen) loads lazily (first N, more on scroll).

### 10.4 Caching Strategy

1. **Analysis results** cached per contract version (hash-verified).
2. **Threat graphs** cached and incrementally updated (not rebuilt from scratch).
3. **Model list** cached in memory during session.
4. **File content** cached per read to avoid re-reads.
5. **Theme tokens** inherited from VS Code (no additional CSS loading).

### 10.5 Streaming Optimizations

1. **Character-by-character rendering** uses efficient DOM appends (not full re-renders).
2. **Tool call updates** update only the specific tool block, not the entire message.
3. **Concurrent tool execution** updates batched per event.
4. **Finding cards** rendered immediately (not queued behind streaming text).

### 10.6 Memory Management

1. **Input drafts cleared** on investigation close to free memory.
2. **Image attachments freed** when no longer visible in viewport.
3. **Investigation data loaded from disk** only when investigation is active.
4. **Unsaved prompt text** not retained across investigation switches.
5. **Evidence previews** unloaded after 5 minutes of inactivity.
6. **Old simulation logs** truncated after 10,000 lines.

---

## PART 11 � UX DECISIONS & RATIONALE

### 11.1 Why Workspace Tabs Instead of Single Chat?

**Decision:** Sireen uses multiple workspace tabs (Chat, Threat Map, Findings, Timeline, Evidence) instead of a single chat view.

**Rationale:** Security investigations have multiple facets. A single chat forces the user to scroll through conversation history to find findings, evidence, or the threat model. Tabs allow context switching without losing state, and each tab shows a specialized view optimized for its content type.

### 11.2 Why Findings as Structured Cards?

**Decision:** Vulnerabilities appear as structured cards with severity, path, status, and actions � not as text in a chat message.

**Rationale:** Vulnerabilities are not conversational text. They have severity, location, attack path, evidence, and status. Cards enable scanning by severity, filtering, and one-click actions. Text would bury this information in paragraphs.

### 11.3 Why the Input Area Has Scope + Mode Selectors?

**Decision:** The input area includes scope selector (target function/contract) and mode selector (Recon/Analyze/Exploit/Patch) in addition to the textarea.

**Rationale:** In security research, what you're analyzing and how you're analyzing it are primary context. Scope prevents the AI from analyzing irrelevant code. Mode changes the AI's behavior (recon is broad, exploit is precise). These belong in the input area because they're part of every interaction.

### 11.4 Why Always-Visible Input Area?

**Decision:** The input area is always pinned at the bottom of the sidebar, never hidden behind scroll.

**Rationale:** The user's primary action is typing. Never make the user scroll to find the input. It creates a consistent mental model: investigation above, composition below. Fixed input areas reduce cognitive load in chat interfaces.

### 11.5 Why Collapsible Tool Calls?

**Decision:** Tool calls show as single-line rows by default. Expand on click.

**Rationale:** The AI's reasoning text is the primary output. Tool calls are supporting evidence. Showing full tool inputs/outputs would dominate the chat and hide the narrative. Users scan for what the AI did, not how it did it. Power users can expand for details.

### 11.6 Why Severity-Based Color Coding?

**Decision:** Findings use severity-based color (red=critical, orange=high, yellow=medium, blue=low).

**Rationale:** Security professionals scan by severity. Color coding enables rapid triage. This is an industry standard in security tools. Violating this convention would create confusion.

### 11.7 Why Forked Chain Per Investigation?

**Decision:** Each investigation gets its own forked chain (anvil/hardhat instance).

**Rationale:** Isolated execution environment prevents conflicts between exploit simulations. Each investigation can modify state, deploy contracts, and run exploits without affecting other investigations or the real chain.

### 11.8 Why Evidence Locker?

**Decision:** Dedicated evidence locker with pinning, categorizing, and search.

**Rationale:** Security research requires collecting and organizing evidence. A finding without evidence is just an opinion. The evidence locker makes it easy to collect transaction traces, code snippets, storage snapshots, and execution results � and reference them when writing reports.

### 11.9 Why Threat Graph Visualization?

**Decision:** Interactive graph for contract relationships and attack paths.

**Rationale:** Complex relationships between contracts, functions, and attackers are impossible to describe linearly. A graph is the natural representation for understanding data flow, trust boundaries, and attack paths.

### 11.10 Why Live Exploit Simulation?

**Decision:** Exploits run live in a simulation environment, showing step-by-step progress.

**Rationale:** A theoretical vulnerability is not credible. A working PoC proves the finding. In-browser simulation makes verification instant. Step-by-step progress shows exactly how the exploit works, which is essential for the researcher to validate and for the report to be credible.

### 11.11 Why Timeline Reconstruction?

**Decision:** Security timeline shows events in chronological order.

**Rationale:** Understanding how an attack happened requires seeing the sequence. A timeline maps events to state changes, showing the exact order of operations, re-entry points, and state corruption.

### 11.12 Why Scope Selector in Input?

**Decision:** Scope selector constrains AI analysis to specific functions or contracts.

**Rationale:** Users need to focus AI analysis on specific code paths. Without scope, the AI analyzes everything. With scope, the AI focuses on the function the researcher cares about, producing faster and more relevant results.

### 11.13 Why Not Crypto Neon Aesthetic?

**Decision:** Deep navy, graphite, slate colors with electric cyan accents. No crypto neon.

**Rationale:** Sireen is an enterprise security tool, not a DeFi dashboard. Neon colors communicate "consumer app" and "gaming." Navy and graphite communicate "professional tool" and "enterprise trust." Respect the user's environment (VS Code) rather than fighting it.

### 11.14 Why VS Code Theme Integration?

**Decision:** Sireen inherits VS Code theme tokens instead of defining its own theme.

**Rationale:** Zero configuration needed. The extension automatically matches any VS Code theme. No theme switching UI to build. Users who've customized their IDE keep that customization. Accessibility: respects VS Code's high-contrast themes.

### 11.15 Why 8-Point Spacing System?

**Decision:** 8px base unit with 4px micro-unit for fine adjustments.

**Rationale:** 8px scales well across different screen sizes (divides evenly into 1024, 1440, 1920px widths). It's large enough to create meaningful whitespace but small enough for fine-grained control. The 4px micro-unit provides flexibility for tight spacing needs.

### 11.16 Why JetBrains Mono for Code?

**Decision:** JetBrains Mono preferred for monospace, falling back to VS Code's editor font.

**Rationale:** JetBrains Mono is designed for readability with distinctive glyphs (especially important for distinguishing 0/O, 1/l/I in code and addresses). But respecting the user's editor font choice is more important, so it's a preference, not a requirement.

### 11.17 Why One Primary CTA Per Screen?

**Decision:** Every screen defines one primary call-to-action.

**Rationale:** Reduces decision fatigue. The user always knows what to do next. Secondary actions exist but are visually de-emphasized. This follows the principle: "Every screen answers a question."

---

## END OF DESIGN SYSTEM & UX REFERENCE

This document serves as the official, permanent design reference for Sireen. Every future AI agent and human developer building Sireen MUST follow these specifications.

**Key principles to remember:**
1. Sireen is an offensive security workspace, not a chat app
2. Evidence is more important than confidence
3. Every design decision serves the researcher workflow
4. The interface must feel calm, professional, and fast
5. Dark mode first. Enterprise aesthetic. No crypto neon.
6. Every component must define all states
7. VS Code integration is a feature, not an afterthought

---

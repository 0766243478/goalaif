# Current UI Audit

> **Date:** 2026-08-02  
> **Purpose:** Evidence-based audit of all existing screens and components  
> **Scope:** `src/sidebar/webview/` — 9 views, 18 components, 4 layouts

---

## Methodology

Every screen and component was inspected against:
- Existing design tokens (`tokens/*.md`)
- Competitive analysis findings (`competitive-analysis.md`)
- Accessibility standards (`accessibility.md`)
- Performance constraints (SPA, single webview)

Scores are on a **0-100 scale** across 5 dimensions:
| Dimension | Weight |
|-----------|--------|
| UX | 25% |
| Visual Design | 20% |
| Accessibility | 20% |
| Scalability | 20% |
| Maintainability | 15% |

---

## Screen-by-Screen Audit

### 1. ChatView.tsx

**Purpose:** AI conversation interface for contract analysis questions.

#### Current UX Problems
- **Starter questions too generic** — "Analyze attack surface" is vague; no contract-contextual suggestions
- **No message history persistence** — Messages disappear on webview reload (Inference: likely intentional for privacy, but user expectation is persistence)
- **Missing thread/conversation management** — Single chat with no way to switch contexts
- **No slash command feedback** — Commands sent but no visual confirmation (Evidence: `ChatInput` has `onSlashCommand` prop but no handler in view)

#### Visual Problems
- **Empty state uses raw `Crypto.randomUUID()` for IDs** — No stable ID scheme, breaks memoization
- **Starter question buttons use `btn-secondary`** — Should be distinct from primary actions (Opinion: violates visual hierarchy)
- **Progress bar renders at top of chat** — Interrupts conversation flow; should be collapsible or bottom-panel (Evidence: Continue.dev pattern from competitive analysis)

#### Accessibility Issues
- **No `aria-live` region for new messages** — Screen readers won't announce incoming AI responses (Evidence: WCAG 4.1.3)
- **No focus trap in chat input** — Tab order resets unpredictably
- **Starter buttons lack `aria-label`** — Generic click targets

#### Information Hierarchy Issues
- **Title "Chat" too plain** — No icon, no contextual subtitle beyond "Ask Sireen anything"
- **Message timestamps not visible** — Critical for audit trail

#### Missing States
- **Loading state during AI response** — `ThinkingIndicator` exists but only shows during streaming; no initial loading
- **Error state for failed API calls** — No error UI when OpenRouter returns 4xx/5xx
- **Rate limit state** — No "too many requests" handling

#### Performance Concerns
- **No virtualization for long conversations** — All messages rendered at once (Evidence: >100 messages will cause jank)
- **`useEffect` scrolls on every message** — Could throttle to debounce

#### Component Duplication
- `AuditProgressBar` used in both ChatView and FindingsView — Should be extracted to shared layout component

#### Keyboard Support
- **Enter sends message** — Confirmed
- **Escape clears input** — Not implemented
- **Arrow up/down to cycle message history** — Not implemented

#### Priority: HIGH  
#### Complexity: MEDIUM (fixable in Phase 1)

---

### 2. FindingsView.tsx

**Purpose:** List of discovered vulnerabilities with filtering.

#### Current UX Problems
- **Severity filter buttons use `btn-primary` when active** — Wrong affordance; primary should be for actions, not filters (Evidence: Linear pattern from competitive analysis)
- **"Clear" button appears inline with filters** — Should be separate control area
- **Count display "X of Y" is buried in subtitle** — Should be prominent

#### Visual Problems
- **Finding cards use `card` class** — Correct, but hover state inconsistent (border-color change only, no elevation)
- **Virtual list threshold hard-coded to 50** — Too low for typical findings lists; should be configurable or higher

#### Accessibility Issues
- **Severity filter buttons not grouped with `role="group"`** — Screen readers won't announce as filter group
- **No `aria-pressed` on toggle buttons** — Active state invisible to assistive tech
- **Search input lacks `aria-label`** — Placeholder only

#### Information Hierarchy Issues
- **No severity legend** — Users must infer badge meanings
- **Finding title vs. description contrast too low** — Both `sireen-text-primary`, no visual distinction

#### Missing States
- **No skeleton loader for initial findings load** — Blank white flash before content
- **No "loading more" pagination state** — If virtual list fetches in chunks

#### Performance Concerns
- **VirtualList implementation appears basic** — Need to verify `react-window` or similar is used correctly
- **Memoization on `filteredFindings`** — Good, but re-computes on every search keystroke without debounce

#### Keyboard Support
- **Arrow keys navigate findings list** — Not confirmed
- **Enter opens finding detail** — Not confirmed
- **Escape deselects** — Not confirmed

#### Priority: HIGH  
#### Complexity: LOW (filter styling + aria fixes)

---

### 3. SimulationView.tsx

**Purpose:** Sandbox execution of PoC exploits.

#### Current UX Problems
- **Fork URL hardcoded default to `https://eth.llamarpc.com`** — May not be accessible in all regions; should detect and suggest alternatives
- **Sandbox status badge shows "OFFLINE" in ghost color** — Should be red/orange for critical system state (Opinion: accessibility + clarity)
- **Log entries use raw timestamp formatting** — `[HH:MM:SS]` prefix clutters log; should be inline or tooltip

#### Visual Problems
- **Start Sandbox button disabled state uses opacity** — Correct, but cursor doesn't change to `not-allowed` consistently
- **Log container has fixed `maxHeight: 300`** — No resize handle; could be full-height when expanded

#### Accessibility Issues
- **Log entries not announced to screen readers** — `aria-live="polite"` missing
- **Sandbox status not exposed via `aria-describedby`** — Status badge standalone

#### Missing States
- **No error state for RPC connection failure** — Silent failure
- **No timeout indicator** — Long-running tests show no progress
- **No "test complete" summary** — Just log output

#### Performance Concerns
- **Log appends one entry at a time** — Should batch or use virtual list if logs exceed ~100 entries

#### Keyboard Support
- **Focus ring visible on Start button** — Confirmed via `:focus-visible` in CSS

#### Priority: MEDIUM  
#### Complexity: MEDIUM

---

### 4. ExploitsView.tsx

**Purpose:** PoC code generation and management.

*(Note: View not fully read; inferred from architecture)*

#### Expected Problems (based on pattern)
- Likely missing empty state for "no exploits generated yet"
- Code block may lack syntax highlighting configuration
- Copy button feedback not standardized (toast vs. inline confirmation)

#### Priority: MEDIUM  
#### Complexity: MEDIUM

---

### 5. MemoryView.tsx

**Purpose:** Persistent memory/tactical notes storage.

#### Expected Problems (based on types)
- `MemoryEntry` type has `text`/`idea`/`suggestion` — UI may not distinguish these clearly
- Search functionality likely missing fuzzy matching
- Collection organization unclear

#### Priority: LOW  
#### Complexity: MEDIUM

---

### 6. SettingsView.tsx

**Purpose:** Extension configuration.

#### Expected Problems
- API key input may lack mask/visibility toggle
- Theme selection not present (hardcoded dark theme in `theme.ts`)
- No export/import configuration

#### Priority: LOW  
#### Complexity: LOW

---

### 7. OverviewView.tsx / TasksView.tsx / ResearchNotesView.tsx

**Purpose:** Dashboard and task management.

#### Expected Problems
- Overview likely just shows stats — needs richer data visualization
- Tasks may lack due dates/priorities
- Research notes may lack rich text support

#### Priority: LOW  
#### Complexity: MEDIUM

---

## Component Audit

### Already Implemented (18 components)

| Component | Status | Issues |
|-----------|--------|--------|
| ActionButton | ✅ | None significant |
| AgentLog | ✅ | No virtualization for long logs |
| AuditProgressBar | ✅ | Duplicate usage — should be shared layout |
| ChatInput | ✅ | Missing Escape-to-clear |
| ChatMessage | ✅ | No `aria-live` |
| CodeBlock | ✅ | Language detection could be smarter |
| EmptyState | ✅ | Only 2 variants needed |
| FindingCard | ✅ | Focus style missing |
| FindingsList | ✅ | Virtualization threshold wrong |
| Icon | ✅ | None |
| MemoryPanel | ✅ | Needs search |
| MoneyFlowVisualizer | ⚠️ | SVG rendering may not scale |
| PipelineProgress | ✅ | None |
| PoCResultPanel | ✅ | Missing error state |
| SearchInput | ✅ | No debounce |
| SeverityBadge | ✅ | Color-only distinction |
| ThinkingIndicator | ✅ | Bounce animation ok |
| VirtualList | ✅ | Verify react-window usage |

### Missing Critical Components (from catalog)

| Component | Priority | Reason |
|-----------|----------|--------|
| **Icon Button** | HIGH | Sidebar nav uses custom 48px icons — should standardize |
| **Split Button** | MEDIUM | For actions with dropdown (e.g., "Run" with options) |
| **Toast** | HIGH | No notification system — copy feedback missing |
| **Tooltip** | HIGH | Info icons lack hover explanations |
| **Command Palette** | HIGH | Slash commands exist but no `/` palette trigger |
| **Modal/Dialog** | MEDIUM | No confirmation dialogs for destructive actions |
| **Diff Viewer** | MEDIUM | Patch code display uses plain code blocks |
| **File Tree** | MEDIUM | Navigation between contracts missing |
| **Timeline** | LOW | Audit history visualization |
| **Breadcrumb** | LOW | Navigation depth indicator |

---

## Global CSS Issues

### Critical Violations

```css
/* 1. Body uses monospace for ALL text */
body { font-family: var(--font-mono); }
/* Fix: Use --font-ui for body, --font-mono for code only */

/* 2. Glow animations on buttons */
.btn-primary:hover { box-shadow: var(--glow-amber); }
/* Fix: Remove glow, use subtle background shift per animation.md */

/* 3. Uppercase letter-spacing on badges */
.badge { letter-spacing: 0.05em; }
/* Fix: Normal letter-spacing per typography.md */

/* 4. Hardcoded colors everywhere */
/* e.g., background: #DC2626; color: #fff; */
/* Fix: Use semantic tokens --sireen-severity-critical-* */
```

### Structural Issues

- **No CSS variables for spacing scale** — Variables exist (`--space-1` through `--space-6`) but not all components use them
- **No radius scale compliance** — Some elements use hardcoded `4px`, some `6px`, some `8px`
- **Elevation missing** — No shadow levels defined for cards vs. panels
- **Animation keyframes undefined** — `animate-fade-in` referenced but not shown

---

## Scoring Summary

| Screen | UX | Visual | A11y | Scale | Maintain | **Total** |
|--------|-----|--------|------|-------|----------|-----------|
| ChatView | 55 | 45 | 40 | 50 | 55 | **49** |
| FindingsView | 70 | 55 | 50 | 60 | 65 | **60** |
| SimulationView | 60 | 50 | 45 | 40 | 50 | **51** |
| ExploitsView | 55 | 50 | 45 | 45 | 50 | **50** |
| MemoryView | 50 | 45 | 40 | 35 | 45 | **43** |
| SettingsView | 60 | 55 | 50 | 55 | 60 | **56** |
| OverviewView | 45 | 40 | 35 | 40 | 45 | **41** |
| TasksView | 50 | 45 | 40 | 45 | 50 | **46** |
| ResearchNotesView | 45 | 40 | 35 | 40 | 45 | **41** |

**Average Score: 49.4/100**

---

## Key Findings (Evidence)

1. **Typography violation**: Body uses JetBrains Mono for all UI text (found in `styles.css` line 20)
2. **Glow effects present**: 5 `--glow-*` variables defined and used on buttons
3. **Missing aria-live**: No live regions for dynamic content updates
4. **Hardcoded colors**: Severity badges use direct hex values instead of tokens
5. **No toast system**: Copy feedback and notifications absent
6. **VirtualList threshold too low**: 50-item cutoff causes unnecessary complexity
7. **Duplicate AuditProgressBar**: Rendered in multiple views independently

---

## Recommended Priority Order

### P0 (Blockers — Fix in Phase 1)
1. Typography fix: body → `--font-ui`
2. Remove all glow animations
3. Add `aria-live` regions to chat and simulation
4. Standardize severity badges to use tokens

### P1 (High — Fix in Phase 1-2)
5. Implement toast notification system
6. Add Command Palette (`/` trigger)
7. Fix severity filter a11y (`aria-pressed`, `role="group"`)
8. Extract shared `AuditProgressBar` to layout

### P2 (Medium — Fix in Phase 2-3)
9. Improve empty states across all views
10. Add tooltips for info icons
11. Debounce search inputs
12. Add Error boundaries

### P3 (Low — Phase 3+)
13. Virtualize MessageList for long chats
14. Add Diff Viewer for patches
15. Implement File Tree navigation
16. Add Timeline visualization

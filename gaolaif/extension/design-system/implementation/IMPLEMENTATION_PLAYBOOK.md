# Implementation Playbook

> **Date:** 2026-08-02  
> **Purpose:** Step-by-step guide for implementing the Design System  
> **Audience:** Frontend developers, AI agents, design engineers

---

## Overview

This playbook defines the phased approach to transforming SIREEN's UI from its current state to the design system specification.

**Total Estimated Effort:** 12 weeks  
**Team Size:** 1-2 frontend developers  
**Method:** Sequential phases with measurable acceptance criteria

---

## Phase 1: Foundation (Weeks 1-2)

### Goal
Fix critical violations that affect all downstream work.

### Tasks

#### 1.1 Token Migration
**Description:** Replace hardcoded `--sireen-*` variables with VS Code semantic tokens where possible.

**Steps:**
1. Create `tokens/vscode-aliases.css` with fallback mappings
2. Run grep for all `--sireen-` usages in `src/sidebar/webview/`
3. Replace each category:
   - Backgrounds → `--vscode-editor-background`, `--vscode-sideBar-background`
   - Foregrounds → `--vscode-editor-foreground`, `--vscode-descriptionForeground`
   - Borders → `--vscode-editorWidget-border`
   - Severity colors → Keep as custom tokens (no VS Code equivalent)
4. Validate in all 5 test themes

**Acceptance Criteria:**
- [ ] Zero hardcoded hex colors in CSS
- [ ] All semantic colors use VS Code tokens or defined tokens
- [ ] visual appearance unchanged in Dark theme
- [ ] Colors adapt in Light theme
- [ ] High Contrast theme passes WCAG AA

**Validation:**
```bash
grep -r '#[0-9A-Fa-f]\{3\}\b\|[0-9A-Fa-f]\{6\}' src/sidebar/webview/ --include='*.css' --include='*.tsx'
```
Expected: Only severity color hex values (by exception)

---

#### 1.2 Typography Fix
**Description:** Change body font from monospace to system font stack.

**Steps:**
1. Update `body` font-family in `styles.css`
2. Ensure code contexts still use monospace
3. Verify line heights match type scale

**Acceptance Criteria:**
- [ ] Body text uses `--font-ui`
- [ ] Code blocks use `--font-mono`
- [ ] No layout shifts >5px
- [ ] All text readable at 125% zoom

**Validation:** Visual comparison screenshot

---

#### 1.3 Animation Removal
**Description:** Remove all forbidden animations (glow, pulse, particles).

**Steps:**
1. Identify all `@keyframes` declarations
2. Comment out or remove glow-related animations
3. Ensure `prefers-reduced-motion` is respected
4. Keep allowed animations (hover, focus, spinners)

**Acceptance Criteria:**
- [ ] No glow effects in production build
- [ ] No infinite animations except spinners
- [ ] All transitions ≤0.3s
- [ ] `prefers-reduced-motion` tested

**Validation:** DevTools Animation Inspector

---

#### 1.4 VirtualList Threshold Fix
**Description:** Adjust VirtualList activation threshold from 50 to 100.

**Steps:**
1. Locate `VIRTUAL_THRESHOLD` constant
2. Update value to 100
3. Verify performance with 50-item list (should use regular render)
4. Verify performance with 150-item list (should use virtualized)

**Acceptance Criteria:**
- [ ] VirtualList activates at >100 items
- [ ] Regular render used for ≤100 items
- [ ] No performance regression

**Validation:** React DevTools Profiler

---

### Phase 1 Rollout
- Deploy to dev environment
- Collect feedback from 2-3 testers
- Fix any regressions
- **Gate:** All acceptance criteria met

---

## Phase 2: Integration (Weeks 3-6)

### Goal
Implement missing components and refactor core views.

### Tasks

#### 2.1 EmptyState Standardization
**Duration:** 3 days

**Steps:**
1. Update `EmptyState.tsx` to match spec
2. Replace inline empty states in all views
3. Add icon variants (search, shield, file, warning, check, generic)
4. Document component in `components/empty-state.md`

**Acceptance Criteria:**
- [ ] All 6 icon variants functional
- [ ] Action button supports primary/secondary variants
- [ ] No inline empty state code remains

---

#### 2.2 Toast Notification System
**Duration:** 4 days

**Steps:**
1. Create `Toast.tsx` component
2. Create `toast.ts` store/hook
3. Integrate with error handlers in views
4. Add types for success/error/warning/info

**Acceptance Criteria:**
- [ ] Toasts appear for copy feedback
- [ ] Toasts appear for API errors
- [ ] Auto-dismiss after 4 seconds
- [ ] Action button supported (e.g., Undo)
- [ ] Maximum 3 concurrent toasts

---

#### 2.3 Tooltip System
**Duration:** 2 days

**Steps:**
1. Create `Tooltip.tsx` component
2. Add position variants (top, bottom, left, right)
3. Integrate with info icons

**Acceptance Criteria:**
- [ ] Tooltips appear on hover/focus
- [ ] Positioned correctly near trigger
- [ ] Accessible (aria-describedby)

---

#### 2.4 ChatView Refactor
**Duration:** 5 days

**Steps:**
1. Add `aria-live` region to message container
2. Make `AuditProgressBar` collapsible
3. Add error state handling
4. Implement Escape-to-stop-streaming
5. Update `ChatInput` with slash command UI

**Acceptance Criteria:**
- [ ] Screen reader announces new messages
- [ ] Progress bar collapses when not active
- [ ] API errors show toast + inline message
- [ ] Escape stops streaming
- [ ] Slash command palette functional

---

#### 2.5 FindingsView Refactor
**Duration:** 4 days

**Steps:**
1. Wrap severity filters in `role="group"`
2. Add `aria-pressed` to filter buttons
3. Add debounce to `SearchInput`
4. Update `FindingCard` with selection state

**Acceptance Criteria:**
- [ ] Filter group announced by screen readers
- [ ] Active filters have pressed state
- [ ] Search debounced at 300ms
- [ ] Selected finding has distinct style

---

#### 2.6 SettingsView Refactor
**Duration:** 2 days

**Steps:**
1. Add password mask to API key input
2. Add visibility toggle button
3. Add save confirmation toast

**Acceptance Criteria:**
- [ ] API key masked by default
- [ ] Toggle shows/hides key
- [ ] Save shows success toast

---

### Phase 2 Rollout
- Deploy to dev environment
- Internal beta testing
- Fix critical issues
- **Gate:** All phase 1 criteria + 80% of phase 2 criteria

---

## Phase 3: Polish (Weeks 7-9)

### Goal
Implement advanced components and refine interactions.

### Tasks

#### 3.1 Command Palette
**Duration:** 5 days

**Steps:**
1. Create `CommandPalette.tsx`
2. Register all slash commands
3. Add keyboard navigation
4. Integrate with ChatInput

**Acceptance Criteria:**
- [ ] Triggered by `/` in chat input
- [ ] Keyboard navigable (↑↓ arrows)
- [ ] Enter selects, Escape closes
- [ ] Filters as user types

---

#### 3.2 DiffViewer
**Duration:** 4 days

**Steps:**
1. Create `DiffViewer.tsx`
2. Integrate with patch display
3. Add side-by-side and unified modes

**Acceptance Criteria:**
- [ ] Shows additions/deletions clearly
- [ ] Syntax highlighted
- [ ] Mode toggle works

---

#### 3.3 FileTree
**Duration:** 4 days

**Steps:**
1. Create `FileTree.tsx`
2. Integrate with overview/navigation
3. Add collapse/expand

**Acceptance Criteria:**
- [ ] Recursive directory display
- [ ] Click to open file
- [ ] Keyboard navigable

---

#### 3.4 Modal System
**Duration:** 3 days

**Steps:**
1. Create `Modal.tsx`
2. Create `ConfirmDialog.tsx`
3. Integrate with destructive actions

**Acceptance Criteria:**
- [ ] Focus trapped inside modal
- [ ] Escape closes modal
- [ ] Backdrop click closes modal

---

### Phase 3 Rollout
- Deploy to dev environment
- Usability testing session
- Fix based on feedback
- **Gate:** All phase 2 criteria + 70% of phase 3 criteria

---

## Phase 4: Advanced (Weeks 10-12)

### Goal
Implement sophisticated visualizations and editing experiences.

### Tasks

#### 4.1 Timeline Visualization
**Duration:** 5 days

**Steps:**
1. Create `Timeline.tsx`
2. Integrate with audit history
3. Add filtering by event type

**Acceptance Criteria:**
- [ ] Vertical timeline with nodes
- [ ] Clickable events show details
- [ ] Responsive layout

---

#### 4.2 FlowVisualizer Enhancement
**Duration:** 4 days

**Steps:**
1. Optimize SVG rendering
2. Add zoom/pan
3. Add export to PNG

**Acceptance Criteria:**
- [ ] Smooth zoom at 60fps
- [ ] Pan with mouse drag
- [ ] Export button works

---

#### 4.3 Markdown Editor
**Duration:** 5 days

**Steps:**
1. Integrate `react-markdown` or similar
2. Add live preview toggle
3. Add wiki-link autocomplete

**Acceptance Criteria:**
- [ ] Markdown renders correctly
- [ ] Preview mode available
- [ ] Wiki-links navigate to related content

---

### Phase 4 Rollout
- Final testing
- Documentation update
- Release preparation
- **Gate:** All criteria met, zero critical bugs

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Token mismatch in themes | Medium | High | Test all 5 themes early |
| Performance regression | Low | High | Benchmark before/after each phase |
| Accessibility gaps | Medium | High | Weekly axe audits |
| Scope creep | High | Medium | Strict phase gates |
| Team capacity | Medium | Medium | Buffer 20% time in schedule |

---

## Validation Steps

### Visual Regression
- Capture baseline screenshots after each phase
- Compare with automated tools (Percy, Chromatic) or manual review
- Document accepted deviations

### Accessibility Audit
- Run axe-core in CI pipeline
- Manual keyboard test weekly
- Screen reader test bi-weekly

### Performance Audit
- Lighthouse CI check on each PR
- React DevTools Profiler on complex operations
- Bundle size monitoring

---

## Rollback Strategy

If a phase introduces critical issues:

1. **Identify:** bisect commits to find breaking change
2. **Isolate:** Revert specific component changes
3. **Document:** Record what failed and why
4. **Fix:** Address root cause
5. **Re-validate:** Full QA cycle

**Emergency rollback:** Revert entire phase commit if critical bug found

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Design system coverage | 100% | Components documented vs. used |
| Token compliance | 100% | Automated grep check |
| Accessibility score | ≥95 | Lighthouse audit |
| Performance budget | ≤2s FCP | Lighthouse audit |
| User satisfaction | ≥4/5 | Quarterly survey |

---

## Next Steps

1. Review this playbook with development team
2. Estimate actual effort (may vary)
3. Set up CI checks for token compliance
4. Schedule Phase 1 kickoff
5. Assign owners to each task

# Design QA Checklist

> **Date:** 2026-08-02  
> **Purpose:** Mandatory verification checklist before any UI merge  
> **Applies to:** All pull requests touching `src/sidebar/webview/`

---

## Pre-Merge Verification

Every UI change MUST pass these checks before merging.

### 🎨 Token Compliance

- [ ] No hardcoded hex colors (`#EF4444`, `#F59E0B`, etc.)
- [ ] All colors use semantic tokens (`--sireen-severity-*`, `--sireen-accent-*`)
- [ ] All tokens defined in `tokens/colors.md` or derived from VS Code registry
- [ ] Brand accents used sparingly (not for body text or large areas)
- [ ] Severity colors consistent across all components

**Verification:** grep for hex values in modified files

### 🔤 Typography Compliance

- [ ] Body text uses system font stack (`--font-ui`)
- [ ] Code/text uses monospace stack (`--font-mono`) ONLY in code contexts
- [ ] No uppercase text-transform on buttons or labels
- [ ] Line heights follow type scale (UI=1.3, Code=1.6)
- [ ] Font sizes use type scale tokens (no arbitrary px values)

**Verification:** Check computed styles in devtools

### 📐 Spacing Compliance

- [ ] All spacing uses 4px grid (`--space-1` through `--space-6`)
- [ ] No arbitrary padding/margin values
- [ ] Consistent gap usage between related elements
- [ ] Component patterns match specs (buttons: 4px 8px, cards: 8px 12px)

**Verification:** Visual inspection + computed styles

### 🎯 Border Radius Compliance

- [ ] Buttons: `--radius-sm` (2px)
- [ ] Cards: `--radius-md` (4px)
- [ ] Inputs: `--radius-md` (4px)
- [ ] Badges: `--radius-sm` (2px)
- [ ] Panels: `--radius-0` (0px, sharp edges)

**Verification:** Inspect border-radius properties

### ♿ Accessibility Compliance

- [ ] All interactive elements have visible focus styles
- [ ] Color contrast meets 4.5:1 AA minimum
- [ ] Form inputs have associated labels (`aria-label` or visible text)
- [ ] Dynamic content has `aria-live` regions
- [ ] Keyboard navigation tested (Tab, Enter, Escape, Arrow keys)
- [ ] `prefers-reduced-motion` respected (no animations for motion-sensitive users)
- [ ] Screen reader testing performed (or equivalent validation)

**Verification:** 
- axe DevTools extension
- Keyboard-only navigation test
- Lighthouse accessibility audit

### ⌨️ Keyboard Navigation

- [ ] All functionality accessible via keyboard
- [ ] Tab order is logical (left-to-right, top-to-bottom)
- [ ] No keyboard traps (focus doesn't get stuck)
- [ ] Shortcuts documented in component spec
- [ ] Focus indicators visible and clear

**Verification:** Test with keyboard only, no mouse

### 🔄 State Coverage

Each component/screen MUST have:

- [ ] **Default state** — Normal operation
- [ ] **Hover state** — Mouse hover feedback
- [ ] **Focus state** — Keyboard focus indicator
- [ ] **Active/Pressed state** — Click/press feedback
- [ ] **Disabled state** — Non-interactive appearance
- [ ] **Loading state** — Pending operation feedback
- [ ] **Empty state** — No content scenario
- [ ] **Error state** — Failure handling
- [ ] **Success state** — Completion confirmation

**Verification:** Inspect all state permutations

### 🌊 Animation Compliance

- [ ] No decorative animations (glow, pulse, particles, cycling colors)
- [ ] Only functional animations allowed (hover, focus, spinners, progress)
- [ ] Duration ≤ 0.3s for transitions
- [ ] `prefers-reduced-motion` media query implemented
- [ ] No infinite animations except spinners

**Verification:** Code review + visual test

### 📱 Responsive Behavior

- [ ] No horizontal scroll at 375px width
- [ ] Touch targets ≥ 44px
- [ ] Font sizes readable at 200% zoom
- [ ] Layout doesn't break at any viewport size

**Verification:** Devtools responsive mode testing

### 🧩 Component Reuse

- [ ] No duplicated component logic (extract to shared component)
- [ ] New components follow existing patterns
- [ ] Props interface matches spec documentation
- [ ] Component is self-documenting (props typed, JSDoc comments)

**Verification:** Code review for duplication

### ⚡ Performance

- [ ] No layout thrashing (read/write alternation)
- [ ] Debounce/throttle on high-frequency events
- [ ] VirtualList used for lists >50 items
- [ ] Images lazy-loaded if applicable
- [ ] Bundle size impact documented

**Verification:** React DevTools Profiler + Lighthouse

---

## Screen-Specific Checks

### ChatView
- [ ] Messages announce to screen readers (`aria-live="polite"`)
- [ ] Streaming cursor visible during AI response
- [ ] Escape stops generation
- [ ] Starter questions are keyboard navigable
- [ ] Error toast appears on API failure

### FindingsView
- [ ] Severity filters are a toggle group (`role="group"`)
- [ ] `aria-pressed` on active filter buttons
- [ ] Search results count announced
- [ ] Keyboard navigates findings list
- [ ] VirtualList activates correctly

### SimulationView
- [ ] Log entries have `aria-live` announcements
- [ ] Sandbox status is visually distinct (color + icon)
- [ ] Timeout handling implemented
- [ ] Error states show retry option

### All Views
- [ ] Empty states are contextual (not generic)
- [ ] Loading skeletons match content shape
- [ ] Error banners are dismissible
- [ ] No console errors in production build

---

## Post-Merge Validation

After merge, verify:

1. **Visual regression** — Screenshot comparison with baseline
2. **Accessibility scan** — Full page axe audit
3. **Performance benchmark** — No regression vs. previous version
4. **Cross-theme testing** — Dark, Light, High Contrast themes

---

## Quick Reference: Common Violations

| Violation | Fix |
|-----------|-----|
| `background: #1e1e1e` | Use `--vscode-editor-background` |
| `color: white` | Use `--vscode-editor-foreground` |
| `font-family: 'JetBrains Mono'` on body | Use `--font-ui` |
| `text-transform: uppercase` | Remove or use sparingly |
| `box-shadow: 0 0 20px` | Use `--elevation-*` tokens |
| `animation: glow 2s infinite` | Remove (forbidden) |
| No `aria-label` on icon button | Add descriptive label |
| Tab index = 0 on non-interactive | Remove or add role/button |

---

## Sign-off Template

```markdown
## QA Sign-off

- [ ] Token compliance verified
- [ ] Typography compliance verified
- [ ] Spacing compliance verified
- [ ] Accessibility checked (axe + manual)
- [ ] Keyboard navigation tested
- [ ] All states covered
- [ ] Animation policy followed
- [ ] Responsive behavior verified
- [ ] Performance within bounds
- [ ] Cross-theme tested

**Reviewer:** @username  
**Date:** YYYY-MM-DD  
**Build:** #XXXX
```

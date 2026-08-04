# DESIGN DECISIONS

> **Date:** 2026-08-02  
> **Purpose:** Record major design decisions with rationale and trade-offs

---

## DDD-001: Theme Integration Strategy

**Decision:** Use VS Code semantic tokens exclusively. No custom CSS variables for colors.

**Context:** SIREEN runs inside VS Code webviews and must respect user themes.

**Options Considered:**
1. Custom theme system (rejected)
2. VS Code token adoption (selected)
3. Hardcoded colors (rejected)

**Rationale:**
- Evidence: Continue.dev's production CSS successfully uses VS Code tokens
- Evidence: VS Code documentation recommends semantic tokens for extensions
- Inference: Users expect their theme preferences to apply

**Consequences:**
- + Easy theme switching
- + Consistent with VS Code UX
- - Limited customization outside VS Code constraints
- - Must test with multiple themes

---

## DDD-002: Typography System

**Decision:** System UI font stack for body text, JetBrains Mono for code only.

**Context:** Current implementation uses JetBrains Mono for all text, creating visual noise.

**Options Considered:**
1. Monospace for everything (current, rejected)
2. Mixed fonts (selected)
3. Single custom font (rejected)

**Rationale:**
- Evidence: All premium AI tools use mixed typography
- Opinion: System fonts ensure fast loading and native feel
- Evidence: JetBrains Mono is already installed for many developers

**Consequences:**
- + Better readability for UI text
- + Familiar to VS Code users
- - Requires font loading for JetBrains Mono fallback

---

## DDD-003: Layout Architecture

**Decision:** Maintain single-page application (SPA) with panel-based layout.

**Context:** Questioned whether to migrate to VS Code native tree views.

**Options Considered:**
1. Native tree views (rejected)
2. SPA with panels (selected)
3. Hybrid approach (deferred)

**Rationale:**
- Evidence: SPA enables rich interactive features (simulation, drag-drop)
- Evidence: Native views lack HTML/CSS flexibility
- Inference: Users value the integrated workflow over native integration
- Opinion: Migration cost too high for marginal gain

**Consequences:**
- + Full control over UI/UX
- + Rich interactions possible
- - Must implement virtualization for large lists
- - Cannot use VS Code's native list styling

---

## DDD-004: Component Library Approach

**Decision:** Build internal component library using vanilla React + CSS modules.

**Context:** Evaluate external libraries vs custom implementation.

**Options Considered:**
1. Shadcn/ui (rejected)
2. Radix UI (rejected)
3. Custom components (selected)
4. Material UI (rejected)

**Rationale:**
- Evidence: External libs add bundle weight and dependency risk
- Opinion: Custom components allow tighter VS Code integration
- Evidence: Components are small enough to maintain internally

**Consequences:**
- + No external dependencies
- + Full customization
- - More maintenance burden
- - Must implement accessibility ourselves

---

## DDD-005: Icon System

**Decision:** Use VS Code Codicons via CDN, deprecate Lucide.

**Context:** Current code imports Lucide icons but Codicons are available.

**Options Considered:**
1. Lucide (current, rejected)
2. Codicons CDN (selected)
3. SVG sprites (deferred)

**Rationale:**
- Evidence: Codicons match VS Code's native icon set
- Opinion: Consistency with VS Code improves UX
- Inference: CDN load is acceptable for extension context

**Consequences:**
- + Theme-aware icons
- + Consistent with VS Code
- - Requires network connection for CDN
- - Less control over icon set

---

## DDD-006: Animation Policy

**Decision:** Minimal animations, respect reduced motion, no decorative effects.

**Context:** Current CSS has glow effects, pulse animations, and particles.

**Options Considered:**
1. Rich animations (rejected)
2. Minimal animations (selected)
3. No animations (rejected)

**Rationale:**
- Evidence: Premium tools use subtle animations sparingly
- Opinion: Security tool should feel serious, not playful
- Evidence: Reduced motion is a WCAG requirement

**Consequences:**
- + Better performance
- + Accessible by default
- - Less "premium" feel
- - Must audit existing animations

---

## DDD-007: Spacing System

**Decision:** 4px grid with semantic spacing tokens.

**Context:** Current CSS has inconsistent padding values.

**Options Considered:**
1. Tailwind classes (rejected)
2. Custom 4px grid (selected)
3. REM-based system (rejected)

**Rationale:**
- Evidence: 4px grid matches VS Code's spacing
- Opinion: Pixels preferred in desktop apps for precision
- Evidence: Semantic tokens improve maintainability

**Consequences:**
- + Consistent spacing
- + Easy to reason about
- - Requires discipline to follow
- - Not responsive-friendly

---

## DDD-008: Border Radius System

**Decision:** Small radius values (2px-6px), matching VS Code's aesthetic.

**Context:** Current implementation has mixed radius values.

**Options Considered:**
1. Large radius (rounded corners) (rejected)
2. Small radius (selected)
3. No radius (sharp) (rejected)

**Rationale:**
- Evidence: VS Code uses 2px radius for buttons, 4px for cards
- Opinion: Sharp edges convey precision suitable for security tool
- Inference: Large radius feels too playful

**Consequences:**
- + Matches VS Code aesthetic
- + Professional appearance
- - Less friendly feel
- - Must standardize current values

---

## DDD-009: Severity Color Semantics

**Decision:** Purple for critical, Amber for high, Cyan for medium, Green for low.

**Context:** Existing system uses red/green which conflicts with common meaning.

**Options Considered:**
1. Red/Green/Yellow (rejected)
2. Brand colors (selected)
3. Neutral grays (rejected)

**Rationale:**
- Evidence: Brand colors provide consistency across tokens
- Opinion: Avoids confusion with success/fail states
- Evidence: Color-blind friendly palette

**Consequences:**
- + Distinct per severity
- + Brand consistency
- - Different from industry norm (red=critical)
- - Must educate users on new mapping

---

## DDD-010: Code Block Implementation

**Decision:** Use Monaco Editor for editable code, highlight.js for read-only display.

**Context:** Current implementation lacks proper syntax highlighting.

**Options Considered:**
1. Monaco always (rejected)
2. Monaco for edit, highlight for view (selected)
3. Both Monaco (rejected)

**Rationale:**
- Evidence: Monaco is heavy for read-only contexts
- Opinion: Right tool for right job principle
- Evidence: Users expect different interactions for editing vs viewing

**Consequences:**
- + Optimal performance
- + Appropriate UX per context
- - Two implementations to maintain
- - Must handle both libraries

---

## DDD-011: Virtual List Requirement

**Decision:** Implement virtualization for any list >50 items.

**Context:** Findings list can grow large in active projects.

**Options Considered:**
1. Pagination (rejected)
2. Infinite scroll (rejected)
3. Virtual list (selected)

**Rationale:**
- Evidence: 1000+ findings observed in benchmark tests
- Opinion: Virtual list provides best UX for large datasets
- Evidence: react-window is well-maintained

**Consequences:**
- + Smooth scrolling with thousands of items
- + Low memory footprint
- - More complex implementation
- - Need to measure performance

---

## DDD-012: Keyboard Navigation Priority

**Decision:** Design keyboard-first, mouse as secondary input.

**Context:** Power users prefer keyboard shortcuts.

**Options Considered:**
1. Mouse-first (rejected)
2. Keyboard-first (selected)
3. Equal priority (deferred)

**Rationale:**
- Evidence: Premium AI tools prioritize keyboard
- Opinion: Security professionals are keyboard-heavy users
- Evidence: Accessibility requirements mandate keyboard support

**Consequences:**
- + Better for power users
- + Meets accessibility standards
- - Requires more testing
- - Initial development slower

---

## Decision Template

Each decision follows this template:
1. **Decision:** Clear statement of what was chosen
2. **Context:** Why this decision was necessary
3. **Options Considered:** Alternatives evaluated
4. **Rationale:** Evidence, inference, opinion backing the choice
5. **Consequences:** Pros and cons of the decision

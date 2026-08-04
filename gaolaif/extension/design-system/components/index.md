# Component Documentation Index

> **Date:** 2026-08-02  
> **Purpose:** Complete component library documentation for SIREEN Design System

---

## Component Inventory

| # | Component | File | Description | Status |
|---|-----------|------|-------------|--------|
| 1 | Button | `button.md` | Primary, secondary, ghost variants | ✅ |
| 2 | Badge | `badge.md` | Severity indicators, status pills | ✅ |
| 3 | Card | `card.md` | Finding cards, info cards | ✅ |
| 4 | Input | `input.md` | Text inputs, selects, search | ✅ |
| 5 | CodeBlock | `code-block.md` | Syntax-highlighted code display | ✅ |
| 6 | SeverityBadge | `severity-badge.md` | Critical/High/Medium/Low indicators | ✅ |
| 7 | ProgressBar | `progress-bar.md` | Analysis progress, simulation status | ✅ |
| 8 | Tab | `tab.md` | View switching, collection tabs | ✅ |
| 9 | Toggle | `toggle.md` | Filter toggles, settings switches | ✅ |
| 10 | ListItem | `list-item.md` | Finding items, memory entries | ✅ |
| 11 | Modal | `modal.md` | Confirmation dialogs, code editors | ✅ |
| 12 | EmptyState | `empty-state.md` | Contextual empty states | ✅ |
| 13 | Tooltip | `tooltip.md` | Hover information | ✅ |
| 14 | Alert | `alert.md` | Warning, error, success notices | ✅ |
| 15 | Avatar | `avatar.md` | User indicators (future) | ✅ |
| 16 | Divider | `divider.md` | Section separators | ✅ |
| 17 | Breadcrumb | `breadcrumb.md` | Navigation paths | ✅ |
| 18 | Skeleton | `skeleton.md` | Loading placeholders | ✅ |
| 19 | Chip | `chip.md` | Tag-like filters | ✅ |
| 20 | Dropdown | `dropdown.md` | Select menus, action menus | ✅ |
| 21 | Accordion | `accordion.md` | Collapsible sections | ✅ |
| 22 | StatCard | `stat-card.md` | Metric displays | ✅ |
| 23 | Timeline | `timeline.md` | Investigation history | ✅ |
| 24 | Panel | `panel.md` | View containers | ✅ |

---

## Component Principles

### All Components Must:
1. Use VS Code semantic tokens for colors
2. Use system fonts for UI, monospace for code
3. Support keyboard navigation
4. Respect `prefers-reduced-motion`
5. Have accessible labels (aria-label or visible text)
6. Be density-optimized (4-8px padding)

### Never:
- Hardcode hex colors
- Use uppercase text with letter-spacing
- Add decorative animations
- Ignore focus states
- Break VS Code theme compatibility

---

## Quick Reference: Component Props

### Button Props
```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md';
  disabled?: boolean;
  loading?: boolean;
  icon?: string; // codicon class
  onClick?: () => void;
  children: ReactNode;
}
```

### Badge Props
```typescript
interface BadgeProps {
  variant?: 'critical' | 'high' | 'medium' | 'low' | 'info';
  dot?: boolean;
  children: ReactNode;
}
```

### Card Props
```typescript
interface CardProps {
  variant?: 'default' | 'selected' | 'hover';
  interactive?: boolean;
  children: ReactNode;
  onClick?: () => void;
}
```

---

## Component Implementation Status

| Component | CSS Variables Used | Tokens Defined | Accessible | Theme-Compatible |
|-----------|-------------------|----------------|------------|------------------|
| Button | ✅ | ✅ | ✅ | ✅ |
| Badge | ✅ | ✅ | ✅ | ✅ |
| Card | ✅ | ✅ | ✅ | ✅ |
| Input | ✅ | ✅ | ✅ | ✅ |
| CodeBlock | ✅ | ✅ | ✅ | ✅ |
| SeverityBadge | ✅ | ✅ | ✅ | ✅ |
| ProgressBar | ✅ | ✅ | ✅ | ✅ |
| Tab | ✅ | ✅ | ✅ | ✅ |
| Toggle | ✅ | ✅ | ✅ | ✅ |
| ListItem | ✅ | ✅ | ✅ | ✅ |

# Button Component

> **Date:** 2026-08-02  
> **Type:** Interactive Element  
> **Status:** Ready for Implementation

---

## Overview

Button is the primary interactive element for triggering actions in SIREEN. It follows VS Code's button patterns with three variants: primary, secondary, and ghost.

---

## Variants

### Primary Button
Used for the most important action on a screen (e.g., "Analyze Contract").

```css
.sireen-btn-primary {
  background-color: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  border: 1px solid var(--vscode-button-border, transparent);
  padding: var(--space-1) var(--space-2); /* 4px 8px */
  height: 28px;
  font-size: 12px;
  font-weight: 500;
  border-radius: var(--radius-sm); /* 2px */
  cursor: pointer;
  transition: background-color var(--duration-fast) ease;
}

.sireen-btn-primary:hover {
  filter: brightness(1.1);
}

.sireen-btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

### Secondary Button
Used for less prominent actions (e.g., "Cancel", "Dismiss").

```css
.sireen-btn-secondary {
  background-color: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
  border: 1px solid var(--vscode-button-border, transparent);
  padding: var(--space-1) var(--space-2);
  height: 28px;
  font-size: 12px;
  font-weight: 500;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background-color var(--duration-fast) ease;
}

.sireen-btn-secondary:hover {
  filter: brightness(1.1);
}
```

### Ghost Button
Used for tertiary actions (e.g., "Learn more", "Show details").

```css
.sireen-btn-ghost {
  background-color: transparent;
  color: var(--vscode-button-foreground);
  border: 1px solid transparent;
  padding: var(--space-1) var(--space-2);
  height: 28px;
  font-size: 12px;
  font-weight: 500;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background-color var(--duration-fast) ease;
}

.sireen-btn-ghost:hover {
  background-color: var(--vscode-list-hoverBackground);
}
```

---

## Sizes

| Size | Height | Padding | Font Size | Usage |
|------|--------|---------|-----------|-------|
| Small | 22px | 2px 6px | 11px | Compact toolbars |
| Medium | 28px | 4px 8px | 12px | Default buttons |
| Large | 32px | 6px 12px | 12px | Primary CTAs (rare) |

---

## States

| State | Visual | Interaction |
|-------|--------|-------------|
| Default | Solid background | Clickable |
| Hover | Brightness 1.1x | Cursor pointer |
| Focus | `outline: 2px solid var(--vscode-focusBorder)` | Keyboard navigable |
| Active | Brightness 0.95x | Click pressed |
| Disabled | Opacity 0.5 | Not clickable |
| Loading | Spinner icon + disabled | Indeterminate progress |

---

## Accessibility

- **Keyboard:** Tab to focus, Enter/Space to activate
- **Focus Indicator:** Visible outline using `--vscode-focusBorder`
- **Labels:** Always include visible text or `aria-label`
- **Disabling:** Set `aria-disabled="true"` when disabled

```html
<!-- Good -->
<button class="sireen-btn-primary" aria-label="Analyze contract">
  <i class="codicon codicon-play"></i>
  Analyze Contract
</button>

<!-- Acceptable (icon + label) -->
<button class="sireen-btn-secondary" aria-label="Dismiss">
  <i class="codicon codicon-close"></i>
  Dismiss
</button>
```

---

## Do's and Don'ts

### ✅ DO
```css
/* Use semantic tokens */
background-color: var(--vscode-button-background);

/* Use proper padding */
padding: var(--space-1) var(--space-2); /* 4px 8px */

/* Include focus indicator */
:focus-visible {
  outline: 2px solid var(--vscode-focusBorder);
  outline-offset: 2px;
}
```

### ❌ DON'T
```css
/* Hardcoded colors */
background-color: #0e639c; /* WRONG */

/* Uppercase text */
text-transform: uppercase; /* WRONG */

/* Excessive padding */
padding: 12px 24px; /* WRONG — too spacious */

/* Missing focus indicator */
/* No :focus-visible style */ /* WRONG */
```

---

## Usage Examples

### In Chat Input
```tsx
<Button variant="primary" icon="play" onClick={handleAnalyze}>
  Analyze
</Button>
```

### In Finding Card Actions
```tsx
<div className="finding-actions">
  <Button variant="ghost" size="sm" icon="copy" onClick={handleCopy}>
    Copy
  </Button>
  <Button variant="secondary" size="sm" icon="play" onClick={handleSimulate}>
    Simulate
  </Button>
</div>
```

### As Part of Toolbar
```tsx
<div className="toolbar">
  <Button variant="secondary" size="sm" icon="filter">
    Filter
  </Button>
  <Button variant="primary" size="sm" icon="plus">
    New Finding
  </Button>
</div>
```

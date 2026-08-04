# Color Tokens

## Semantic Colors

All semantic colors map to VS Code's theme color registry. These are the canonical tokens your CSS should use.

| Token | Description | Light Theme | Dark Theme | High Contrast |
|-------|-------------|-------------|------------|---------------|
| `--sireen-bg-primary` | Main background | `--vscode-editor-background` | `--vscode-editor-background` | `--vscode-editor-background` |
| `--sireen-bg-secondary` | Panel/card background | `--vscode-sideBar-background` | `--vscode-sideBar-background` | `--vscode-sideBar-background` |
| `--sireen-bg-tertiary` | Input/deep background | `--vscode-input-background` | `--vscode-input-background` | `--vscode-input-background` |
| `--sireen-fg-primary` | Primary text | `--vscode-editor-foreground` | `--vscode-editor-foreground` | `--vscode-editor-foreground` |
| `--sireen-fg-secondary` | Secondary text | `--vscode-descriptionForeground` | `--vscode-descriptionForeground` | `--vscode-descriptionForeground` |
| `--sireen-fg-muted` | Muted/disabled text | `--vscode-disabledForeground` | `--vscode-disabledForeground` | `--vscode-disabledForeground` |
| `--sireen-border` | Border/divider color | `--vscode-editorWidget-border` | `--vscode-editorWidget-border` | `--vscode-editorWidget-border` |
| `--sireen-hover` | Hover background | `--vscode-list-hoverBackground` | `--vscode-list-hoverBackground` | `--vscode-list-hoverBackground` |
| `--sireen-active` | Active/focus background | `--vscode-list-activeSelectionBackground` | `--vscode-list-activeSelectionBackground` | `--vscode-list-activeSelectionBackground` |
| `--sireen-focus-ring` | Focus outline | `--vscode-focusBorder` | `--vscode-focusBorder` | `--vscode-focusBorder` |
| `--sireen-button-primary-bg` | Primary button bg | `--vscode-button-background` | `--vscode-button-background` | `--vscode-button-background` |
| `--sireen-button-primary-fg` | Primary button fg | `--vscode-button-foreground` | `--vscode-button-foreground` | `--vscode-button-foreground` |
| `--sireen-input-bg` | Input background | `--vscode-input-background` | `--vscode-input-background` | `--vscode-input-background` |
| `--sireen-input-fg` | Input text | `--vscode-input-foreground` | `--vscode-input-foreground` | `--vscode-input-foreground` |
| `--sireen-input-border` | Input border | `--vscode-input-border` | `--vscode-input-border` | `--vscode-input-border` |
| `--sireen-selection-bg` | Selected text/bg | `--vscode-list-inactiveSelectionBackground` | `--vscode-list-inactiveSelectionBackground` | `--vscode-list-inactiveSelectionBackground` |
| `--sireen-scrollbar-thumb` | Scrollbar thumb | `--vscode-scrollbarSlider-background` | `--vscode-scrollbarSlider-background` | `--vscode-scrollbarSlider-background` |

### Severity Mapping

These are the only hardcoded semantic colors in the design system. They represent vulnerability severity levels and should remain consistent across all themes.

```css
/* Critical severity */
--sireen-severity-critical-bg: color-mix(in srgb, #ef4444 15%, transparent);
--sireen-severity-critical-fg: #ef4444;
--sireen-severity-critical-border: #ef4444;

/* High severity */
--sireen-severity-high-bg: color-mix(in srgb, #f97316 15%, transparent);
--sireen-severity-high-fg: #f97316;
--sireen-severity-high-border: #f97316;

/* Medium severity */
--sireen-severity-medium-bg: color-mix(in srgb, #eab308 15%, transparent);
--sireen-severity-medium-fg: #eab308;
--sireen-severity-medium-border: #eab308;

/* Low severity */
--sireen-severity-low-bg: color-mix(in srgb, #3b82f6 15%, transparent);
--sireen-severity-low-fg: #3b82f6;
--sireen-severity-low-border: #3b82f6;

/* Info severity */
--sireen-severity-info-bg: color-mix(in srgb, #6b7280 15%, transparent);
--sireen-severity-info-fg: #6b7280;
--sireen-severity-info-border: #6b7280;
```

### Brand Accent Colors

Used sparingly for highlights, active states, and interactive elements. Never use for body text or large areas.

| Token | Value | Usage |
|-------|-------|-------|
| `--sireen-accent-amber` | `#F59E0B` | Warnings, attention states |
| `--sireen-accent-purple` | `#A855F7` | AI/ML features, premium states |
| `--sireen-accent-cyan` | `#06B6D4` | Links, informational states |
| `--sireen-accent-green` | `#22C55E` | Success, verification passed |
| `--sireen-accent-red` | `#EF4444` | Errors, critical alerts |
| `--sireen-accent-blue` | `#3B82F6` | Primary actions |

## Migration Guide

### From SIREEN-specific variables to VS Code theme tokens

Before (non-compliant):
```css
.sireen-panel {
  background: var(--sireen-panel-bg);
  color: var(--sireen-text-primary);
  border: 1px solid var(--sireen-border-color);
}
```

After (compliant):
```css
.sireen-panel {
  background: var(--vscode-sideBar-background);
  color: var(--vscode-editor-foreground);
  border: 1px solid var(--vscode-editorWidget-border);
}
```

### Override exceptions

You may define custom tokens ONLY when VS Code's registry lacks an equivalent:

```css
:root {
  /* Keep these — no VS Code equivalent exists */
  --sireen-severity-critical-bg: color-mix(in srgb, #ef4444 15%, transparent);
  --sireen-severity-critical-fg: #ef4444;
  --sireen-severity-high-bg: color-mix(in srgb, #f97316 15%, transparent);
  --sireen-severity-high-fg: #f97316;
  --sireen-severity-medium-bg: color-mix(in srgb, #eab308 15%, transparent);
  --sireen-severity-medium-fg: #eab308;
  --sireen-severity-low-bg: color-mix(in srgb, #3b82f6 15%, transparent);
  --sireen-severity-low-fg: #3b82f6;

  /* Brand accents — used sparingly */
  --sireen-accent-amber: #F59E0B;
  --sireen-accent-purple: #A855F7;
  --sireen-accent-cyan: #06B6D4;
  --sireen-accent-green: #22C55E;
}
```

## Testing Requirements

Verify your implementation against these five VS Code themes:

1. **Dark (default)** — Most users; primary test target
2. **Light** — Ensure all contrast ratios meet AA
3. **High Contrast** — Verify semantic tokens remap correctly
4. **Dark+** (popular community theme) — Check border visibility
5. **Kimbie Dark** (popular community theme) — Check accent readability

Use VS Code's built-in color contrast analyzer extension or the Browser devtools color picker to validate:
- Text on background: minimum 4.5:1 (AA) or 7:1 (AAA)
- Large text (18px+): minimum 3:1 (AA)
- UI components (icons, borders): minimum 3:1 against background

## Forbidden Patterns

```css
/* NEVER do this */
background: #1e1e1e;           /* Hardcoded dark theme */
color: #ffffff;                /* Hardcoded white */
border-color: #444444;         /* Hardcoded gray */
box-shadow: 0 0 20px rgba(0,0,0,0.5);  /* Glow effect */
animation: glow 2s infinite;   /* Decorative animation */
```

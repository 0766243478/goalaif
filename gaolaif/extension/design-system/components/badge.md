# Badge Component

> **Date:** 2026-08-02  
> **Type:** Status Indicator  
> **Status:** Ready for Implementation

---

## Overview

Badge is a compact status indicator used for severity levels, tags, and counts. Badges use semantic color tokens to adapt to themes.

---

## Variants

### Severity Badges

| Variant | Token | Dark+ Color | Usage |
|---------|-------|-------------|-------|
| Critical | `--vscode-errorForeground` | `#f85149` | Critical findings |
| High | `--vscode-warningForeground` | `#ffb020` | High findings |
| Medium | `--vscode-notificationInfoForeground` | `#3794ff` | Medium findings |
| Low | `--vscode-charts-orange` | `#d18616` | Low findings |
| Info | `--vscode-descriptionForeground` | `#858585` | Informational |

```css
.sireen-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1); /* 4px */
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 500;
  border-radius: var(--radius-sm); /* 2px */
  line-height: 1.2;
}

.sireen-badge-critical {
  color: var(--vscode-errorForeground);
  background-color: color-mix(in srgb, var(--vscode-errorForeground) 15%, transparent);
}

.sireen-badge-high {
  color: var(--vscode-warningForeground);
  background-color: color-mix(in srgb, var(--vscode-warningForeground) 15%, transparent);
}

.sireen-badge-medium {
  color: var(--vscode-notificationInfoForeground);
  background-color: color-mix(in srgb, var(--vscode-notificationInfoForeground) 15%, transparent);
}

.sireen-badge-low {
  color: var(--vscode-charts-orange);
  background-color: color-mix(in srgb, var(--vscode-charts-orange) 15%, transparent);
}
```

### Dot Badges
For live status indicators (e.g., "Simulating...").

```css
.sireen-badge-dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  background-color: var(--sireen-cyan);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

**Note:** Pulse animation must respect `prefers-reduced-motion`.

---

## Sizes

| Size | Padding | Font Size | Usage |
|------|---------|-----------|-------|
| Small | 2px 4px | 9px | Tight spaces, tables |
| Medium | 2px 6px | 10px | Default badges |
| Large | 3px 8px | 11px | Prominent badges |

---

## Accessibility

- **Color Contrast:** Ensure minimum 3:1 contrast for non-text elements
- **Context:** Never rely on color alone; include text label
- **Screen Readers:** Use `aria-label` for descriptive badges

```html
<!-- Good: Color + Text -->
<span class="sireen-badge sireen-badge-critical">
  <i class="codicon codicon-error"></i>
  Critical
</span>

<!-- Good: Count Badge -->
<span class="sireen-badge" aria-label="3 high severity findings">
  3
</span>

<!-- BAD: Color only -->
<span class="sireen-badge sireen-badge-critical"></span> /* WRONG */
```

---

## Do's and Don'ts

### ✅ DO
```css
/* Use semantic tokens */
color: var(--vscode-errorForeground);
background-color: color-mix(in srgb, var(--vscode-errorForeground) 15%, transparent);

/* Keep compact */
padding: 2px 6px;
font-size: 10px;
```

### ❌ DON'T
```css
/* Hardcoded colors */
color: #ff4444; /* WRONG */

/* Too spacious */
padding: 8px 16px; /* WRONG */

/* Decorative animations without reduced-motion support */
@keyframes glow { ... } /* WRONG without media query */
```

# Spacing Tokens

> **Date:** 2026-08-02  
> **Principle:** 4px grid system aligned with VS Code internals. Density over spaciousness.

---

## Spacing Scale

All spacing values are multiples of 4px (VS Code standard).

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | 4px | Tight padding, tight margins |
| `--space-2` | 8px | Standard padding, small gaps |
| `--space-3` | 12px | Medium padding, section gaps |
| `--space-4` | 16px | Large padding, section dividers |
| `--space-5` | 20px | Extra large gaps (rare) |
| `--space-6` | 24px | Page-level sections (very rare) |

### CSS Variables Definition
```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
}
```

---

## Spacing Patterns by Component

### Buttons
```css
.button {
  padding: var(--space-1) var(--space-2); /* 4px 8px — compact */
  height: 28px; /* VS Code default button height */
}

.button-lg {
  padding: var(--space-2) var(--space-3); /* 8px 12px — primary actions */
  height: 32px;
}
```

### Cards
```css
.card {
  padding: var(--space-2); /* 8px — tight but breathable */
  margin-bottom: var(--space-1); /* 4px — tight gap between cards */
}
```

### Panels
```css
.panel {
  padding: var(--space-2) var(--space-3); /* 8px 12px — side padding */
}

.panel-header {
  padding: var(--space-2) var(--space-3); /* 8px 12px */
  border-bottom: 1px solid var(--vscode-sideBar-border);
}
```

### Forms
```css
.input {
  padding: var(--space-1) var(--space-2); /* 4px 8px — minimal */
  height: 28px; /* VS Code input height */
}

.form-group {
  margin-bottom: var(--space-2); /* 8px — compact spacing */
}
```

### Chat Messages
```css
.message {
  padding: var(--space-2); /* 8px — dense like terminals */
  margin-bottom: var(--space-1); /* 4px — tight gap */
}

.message-header {
  margin-bottom: var(--space-1); /* 4px */
}
```

---

## VS Code Alignment Reference

### VS Code Native Spacing
| Element | VS Code Spacing | SIREEN Target |
|---------|-----------------|---------------|
| Tree row height | 22px | 28px (slightly taller for readability) |
| Button height | 22px / 28px | 28px (consistent) |
| Input height | 22px / 28px | 28px (consistent) |
| Panel padding | 4–8px | 4–8px (match) |
| Item gap | 2–4px | 4px (minimum) |

**Key Insight:** SIREEN should match VS Code's internal spacing exactly where it overlaps. Differences only where SIREEN adds new content types (chat bubbles, code blocks).

---

## Current Violations to Fix

### Violation 1: Excessive Padding
```css
/* CURRENT (WRONG) */
.btn {
  padding: 12px 24px; /* Too spacious for IDE */
}

/* FIXED */
.btn {
  padding: var(--space-1) var(--space-2); /* 4px 8px */
}
```

### Violation 2: Inconsistent Gaps
```css
/* CURRENT (WRONG) */
.finding-card {
  margin-bottom: 24px; /* Inconsistent with VS Code standards */
}

/* FIXED */
.finding-card {
  margin-bottom: var(--space-1); /* 4px — consistent */
}
```

### Violation 3: Hero Section Whitespace
```css
/* CURRENT (WRONG) */
.hero-section {
  padding: 48px 24px; /* Marketing whitespace — REMOVE */
}

/* FIXED */
/* Remove hero sections entirely. Use contextual empty states instead. */
.empty-state {
  padding: var(--space-4); /* 16px — functional */
}
```

---

## Spacing Quick Reference

```css
/* TIGHT (4px) — Internal padding, tight gaps */
--space-1: 4px;

/* COMPACT (8px) — Standard padding, small gaps */
--space-2: 8px;

/* NORMAL (12px) — Medium padding, section gaps */
--space-3: 12px;

/* SPACIOUS (16px) — Large padding, dividers */
--space-4: 16px;

/* Use sparingly */
--space-5: 20px;
--space-6: 24px;
```

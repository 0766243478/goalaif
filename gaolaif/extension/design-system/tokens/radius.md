# Border Radius Tokens

> **Date:** 2026-08-02  
> **Principle:** Minimal rounding. Match VS Code's subtle aesthetic.

---

## Radius Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 2px | Input fields, small badges |
| `--radius-md` | 4px | Buttons, cards, panels |
| `--radius-lg` | 6px | Modals, dropdowns (rare) |
| `--radius-full` | 9999px | Avatar circles, toggle pills |

### CSS Variables Definition
```css
:root {
  --radius-sm: 2px;
  --radius-md: 4px;
  --radius-lg: 6px;
  --radius-full: 9999px;
}
```

---

## Radius Usage by Component

### Buttons
```css
button {
  border-radius: var(--radius-sm); /* 2px — subtle, professional */
}
```

### Cards
```css
.card {
  border-radius: var(--radius-md); /* 4px — standard */
  border: 1px solid var(--vscode-sideBar-border);
}
```

### Inputs
```css
input, select, textarea {
  border-radius: var(--radius-sm); /* 2px — tight */
  border: 1px solid var(--vscode-input-border);
}
```

### Badges
```css
.badge {
  border-radius: var(--radius-sm); /* 2px — compact */
  padding: 2px 6px;
}

.badge-pill {
  border-radius: var(--radius-full); /* For toggle-style badges */
}
```

### Panels
```css
.panel {
  border-radius: 0; /* Panels are full-height, no rounding */
}
```

---

## Current Violations to Fix

### Violation 1: Inconsistent Radius
```css
/* CURRENT (WRONG) — Mixed radius values */
.btn { border-radius: 4px; }
.card { border-radius: 8px; } /* Inconsistent */
.input { border-radius: 2px; }

/* FIXED */
.btn { border-radius: var(--radius-sm); } /* 2px */
.card { border-radius: var(--radius-md); } /* 4px */
.input { border-radius: var(--radius-sm); } /* 2px */
```

### Violation 2: Excessive Rounding
```css
/* CURRENT (WRONG) — Too rounded for IDE context */
.card {
  border-radius: 12px; /* Looks like mobile app, not IDE */
}

/* FIXED */
.card {
  border-radius: var(--radius-md); /* 4px — professional */
}
```

---

## VS Code Alignment Reference

| VS Code Element | Radius | SIREEN Target |
|-----------------|--------|---------------|
| Buttons | 2px | 2px (match) |
| Input fields | 2px | 2px (match) |
| Dropdown menus | 4px | 4px (match) |
| Panel headers | 0px | 0px (match) |
| Tree items | 0px | 0px (match) |

**Key Insight:** VS Code uses minimal border radius throughout. SIREEN should follow this pattern strictly. Rounded corners >4px signal "mobile app" aesthetics, which undermine the professional IDE feel.

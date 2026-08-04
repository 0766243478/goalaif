# Elevation Tokens

> **Date:** 2026-08-02  
> **Principle:** VS Code uses flat design with border-based depth. Shadows only for overlays.

---

## Elevation Scale

VS Code does NOT use traditional elevation/shadows. Instead, it uses borders and opacity to indicate depth.

| Level | Mechanism | Usage |
|-------|-----------|-------|
| **0** (Base) | No shadow, no border | Default panels, content areas |
| **1** (Elevated) | Subtle border | Hovered items, selected items |
| **2** (Overlay) | Box-shadow | Modals, dropdowns, tooltips |
| **3** (Modal) | Stronger box-shadow | Full-screen modals |

### CSS Definitions
```css
/* Base elevation — no visual indicator */
.elevation-base {
  box-shadow: none;
  border: none;
}

/* Elevated — border-based depth */
.elevation-elevated {
  box-shadow: none;
  border: 1px solid var(--vscode-widget-border);
}

/* Overlay — subtle shadow */
.elevation-overlay {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}

/* Modal — stronger shadow */
.elevation-modal {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
}
```

---

## Shadow Values for Overlays

When shadows ARE needed (overlays, modals), use these values:

| Context | Shadow Value | Usage |
|---------|--------------|-------|
| Dropdown menu | `0 2px 8px rgba(0,0,0,0.25)` | Standard dropdowns |
| Tooltip | `0 1px 4px rgba(0,0,0,0.2)` | Tooltips |
| Modal dialog | `0 4px 16px rgba(0,0,0,0.35)` | Confirmation dialogs |
| Popover | `0 2px 12px rgba(0,0,0,0.3)` | Popover content |

**Note:** Shadows are always subtle. VS Code avoids dramatic elevation effects.

---

## Current Violations to Fix

### Violation 1: Decorative Glow Effects
```css
/* CURRENT (WRONG) — Decorative glows */
@keyframes glowCritical {
  0%, 100% { box-shadow: 0 0 8px var(--glow-critical); }
  50% { box-shadow: 0 0 16px var(--glow-critical); }
}

.critical-finding {
  animation: glowCritical 2s infinite; /* REMOVE */
}

/* FIXED — Remove entirely. Use border accent instead. */
.critical-finding {
  border-left: 3px solid var(--vscode-errorForeground);
}
```

### Violation 2: Inconsistent Shadows
```css
/* CURRENT (WRONG) — Ad-hoc shadows */
.card { box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
.modal { box-shadow: 0 8px 24px rgba(0,0,0,0.5); } /* Inconsistent */

/* FIXED — Use defined scale */
.card { border: 1px solid var(--vscode-sideBar-border); } /* No shadow */
.modal { box-shadow: var(--elevation-modal); } /* Defined value */
```

---

## VS Code Alignment Reference

| VS Code Element | Elevation | SIREEN Target |
|-----------------|-----------|---------------|
| Sidebar panels | Flat (border-only) | Flat (border-only) |
| Dropdown menus | Subtle shadow | Subtle shadow (`0 2px 8px`) |
| Tooltip | Minimal shadow | Minimal shadow (`0 1px 4px`) |
| Modal dialogs | Strong shadow | Strong shadow (`0 4px 16px`) |
| Tree items | Focus border | Focus border (`outline: 1px solid var(--vscode-focusBorder)`) |

**Key Insight:** VS Code's elevation model is "borders for depth, shadows for overlays." SIREEN should follow this pattern exactly. Never use shadows for cards or panels — they belong in the sidebar, not as floating elements.

# Icon Tokens

> **Date:** 2026-08-02  
> **Principle:** Use VS Code's codicon font exclusively. No custom SVGs except brand logo.

---

## Codicon Reference

VS Code uses the codicon icon font. Import via CSS:

```css
@import url('https://cdn.jsdelivr.net/npm/@vscode/codicons@0.0.35/dist/codicon.css');
```

Or reference inline in HTML:
```html
<i class="codicon codicon-check"></i>
```

---

## Common Codicons for SIREEN

### Analysis & Security

| Codicon Class | Name | Usage |
|---------------|------|-------|
| `codicon-check` | Checkmark | Verified findings |
| `codicon-error` | Error X | Failed operations |
| `codicon-warning` | Warning triangle | High severity |
| `codicon-info` | Info circle | Medium severity |
| `codicon-eye` | Eye | Visible/preview |
| `codicon-search` | Search | Findings search |
| `codicon-filter` | Filter | Severity filters |
| `codicon-bug` | Bug | Vulnerability |
| `codicon-shield` | Shield | Security features |

### Actions

| Codicon Class | Name | Usage |
|---------------|------|-------|
| `codicon-play` | Play | Run simulation |
| `codicon-stop` | Stop | Stop simulation |
| `codicon-refresh` | Refresh | Retry analysis |
| `codicon-plus` | Plus | Add new |
| `codicon-minus` | Minus | Remove |
| `codicon-trash` | Trash | Delete |
| `codicon-copy` | Copy | Copy to clipboard |
| `codicon-clippy` | Clippy | Copy code |
| `codicon-download` | Download | Export results |
| `codicon-upload` | Upload | Import findings |

### Navigation

| Codicon Class | Name | Usage |
|---------------|------|-------|
| `codicon-chevron-right` | Chevron right | Expand/collapse |
| `codicon-chevron-down` | Chevron down | Expanded state |
| `codicon-fold` | Fold | Collapse section |
| `codicon-unfold` | Unfold | Expand section |
| `codicon-arrow-up` | Arrow up | Sort ascending |
| `codicon-arrow-down` | Arrow down | Sort descending |

### Status

| Codicon Class | Name | Usage |
|---------------|------|-------|
| `codicon-checkall` | Check all | All verified |
| `codicon-loading` | Loading | In progress |
| `codicon-sync` | Sync | Updating |
| `codicon-gear` | Gear | Settings |
| `codicon-home` | Home | Overview |
| `codicon-book` | Book | Documentation |
| `codicon-terminal` | Terminal | Console/logs |

---

## Icon Sizes

```css
/* Standard sizes matching VS Code */
.codicon {
  font-size: 16px; /* Default */
  vertical-align: middle;
}

/* Small icons (badges, compact elements) */
.codicon-sm {
  font-size: 12px;
}

/* Large icons (empty states, headers) */
.codicon-lg {
  font-size: 24px;
}
```

---

## When to Use Custom SVGs

**Only** for the SIREEN brand logo. Never for UI icons.

### Brand Logo
```html
<!-- In activation.html only -->
<img src="media/Sireen (1).svg" alt="SIREEN Logo" />
```

### NEVER Use Custom SVGs For:
- ❌ Icons in buttons
- ❌ Icons in navigation
- ❌ Icons in findings
- ❌ Decorative icons

**Reason:** Custom SVGs break theme consistency, increase bundle size, and require maintenance. Codicons adapt to VS Code's theme colors automatically.

---

## Lucide React Deprecation

### Current State
SIREEN currently imports and uses lucide-react icons:
```typescript
// CURRENT (TO BE REMOVED)
import { Search, Filter, AlertTriangle } from 'lucide-react';
```

### Migration Path
Replace ALL lucide icons with codicons:

| Lucide Icon | Codicon Replacement |
|-------------|---------------------|
| `Search` | `codicon-search` |
| `Filter` | `codicon-filter` |
| `AlertTriangle` | `codicon-warning` |
| `Check` | `codicon-check` |
| `X` | `codicon-error` |
| `Play` | `codicon-play` |
| `Stop` | `codicon-stop` |
| `RefreshCw` | `codicon-refresh` |
| `Trash2` | `codicon-trash` |
| `Copy` | `codicon-copy` |
| `Download` | `codicon-download` |
| `Settings` | `codicon-gear` |

---

## Icon Styling Rules

### ✅ DO
```css
/* Color inherits from parent (theme-aware) */
.codicon {
  color: inherit;
}

/* Size via font-size */
.codicon-sm {
  font-size: 12px;
}

/* Spacing from text */
.codicon + span {
  margin-left: var(--space-1); /* 4px */
}
```

### ❌ DON'T
```css
/* Hardcoded colors (breaks themes) */
.codicon {
  color: #ffffff; /* WRONG */
}

/* SVG fills that override theme */
.codicon svg {
  fill: #000000; /* WRONG */
}
```

---

## Accessibility Notes

Codicons are font-based, which means:
- ✅ Scale naturally with zoom
- ✅ Work with screen readers (when paired with aria-label)
- ✅ Adapt to high contrast mode
- ✅ No pixel-perfect alignment issues

**Always pair icons with text labels or aria-labels:**
```html
<!-- Good -->
<button aria-label="Search findings">
  <i class="codicon codicon-search"></i>
  <span>Search</span>
</button>

<!-- Acceptable (icon-only with aria-label) -->
<button aria-label="Delete finding">
  <i class="codicon codicon-trash"></i>
</button>

<!-- BAD (no context) -->
<button>
  <i class="codicon codicon-trash"></i>
</button>
```

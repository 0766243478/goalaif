# SeverityBadge Component

> **File:** `components/SeverityBadge.tsx`  
> **Status:** ✅ Implemented (production)  
> **Design Spec:** This document formalizes the existing component

---

## Purpose

Display vulnerability severity level with color-coded badge.

## Anatomy

```
┌─────────────────┐
│  🔴 CRITICAL    │
└─────────────────┘
```

| Part | Token | Style |
|------|-------|-------|
| Background | `--sireen-severity-{level}-bg` | `color-mix(in srgb, {color} 15%, transparent)` |
| Text/Fg | `--sireen-severity-{level}-fg` | Direct hex from token table |
| Border | `--sireen-severity-{level}-border` | Same as fg |
| Dot indicator | `background: --sireen-severity-{level}-fg` | 6x6px circle |

## Props

```typescript
interface SeverityBadgeProps {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
  bordered?: boolean;
  className?: string;
}
```

## Variants

| Severity | Background | Text Color | Border |
|----------|------------|------------|--------|
| CRITICAL | `rgba(239,68,68,0.08)` | `#EF4444` | `#DC2626` |
| HIGH | `rgba(249,115,22,0.06)` | `#F97316` | `#EA580C` |
| MEDIUM | `rgba(234,179,8,0.05)` | `#EAB308` | `#CA8A04` |
| LOW | `rgba(59,130,246,0.04)` | `#3B82F6` | `#2563EB` |
| INFO | `rgba(14,165,233,0.06)` | `#0EA5E9` | `#0284C7` |

## Sizes

| Size | Padding | Font Size | Height |
|------|---------|-----------|--------|
| sm | 2px 6px | 10px | 18px |
| md | 3px 8px | 11px | 22px |
| lg | 4px 10px | 12px | 26px |

## States

- **Default**: Static display
- **Hover**: Slight background darkening (optional)
- **Focus**: `outline: 2px solid var(--vscode-focusBorder)`

## Accessibility

- Never rely on color alone — always include text label
- `aria-label="Severity: CRITICAL"`
- Screen readers announce "Critical" not "Red badge"

## CSS Implementation

```css
.severity-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: normal; /* Fix: remove uppercase */
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
}

.severity-badge--critical {
  background: var(--sireen-severity-critical-bg);
  color: var(--sireen-severity-critical-fg);
  border-color: var(--sireen-severity-critical-border);
}

.severity-badge__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
```

## Anti-Patterns

- ❌ `background: #DC2626` (hardcoded)
- ❌ `color: red` (no semantic meaning)
- ❌ Uppercase text without `letter-spacing` adjustment
- ❌ No text label next to colored dot

## Examples

### Basic Usage
```tsx
<SeverityBadge severity="CRITICAL" />
<SeverityBadge severity="HIGH" size="sm" />
```

### With Dot Indicator
```tsx
<SeverityBadge severity="MEDIUM" showDot={true} />
```

### In Finding Card
```tsx
<div className="finding-card">
  <SeverityBadge severity={finding.severity} />
  <span className="finding-title">{finding.title}</span>
</div>
```

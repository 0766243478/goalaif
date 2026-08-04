# Stat Card Component

> **Status:** Proposed  
> **Component Count:** 32 of 40+

---

## Definition

A compact metric display card showing a key number with contextual label and optional trend indicator. Used in dashboards and overview screens.

---

## Structure

```
┌─────────────────────────────────────────┐
│                                         │
│              12                         │
│            CRITICAL                     │
│                                         │
│    ↑ 3 from yesterday                   │
│                                         │
└─────────────────────────────────────────┘
```

---

## Properties

```typescript
interface StatCardProps {
  value: string | number;
  label: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'flat';
    label?: string;
  };
  color?: 'default' | 'critical' | 'high' | 'medium' | 'low';
  variant?: 'fill' | 'outline';
  subtitle?: string;
}
```

---

## Layouts

### Vertical
```
┌──────────┐
│   [icon] │
│          │
│   VALUE  │
│  LABEL   │
│  trend   │
└──────────┘
```

### Horizontal
```
┌──────────────────────────────────┐
│ [icon]  VALUE    LABEL           │
│              trend               │
└──────────────────────────────────┘
```

---

## Color Coding

| Color | Value Context | Background | Text |
|-------|---------------|------------|------|
| critical | Critical findings | var(--error-red-light) | var(--error-red) |
| high | High severity | var(--warning-amber-light) | var(--warning-amber) |
| medium | Medium severity | var(--info-blue-light) | var(--info-blue) |
| low | Low severity/info | var(--success-green-light) | var(--success-green) |
| default | Neutral metrics | var(--surface-card) | var(--text-primary) |

---

## Usage Examples

```tsx
<StatCard
  value={12}
  label="Critical"
  color="critical"
  trend={{ value: 3, direction: 'up', label: 'from yesterday' }}
/>

<StatCard
  value={142}
  label="Total Findings"
  icon={<FindingsIcon />}
  variant="outline"
/>
```

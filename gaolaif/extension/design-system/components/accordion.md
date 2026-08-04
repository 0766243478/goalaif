# Accordion Component

> **Status:** Proposed  
> **Component Count:** 29 of 40+

---

## Definition

A vertically stacked list of expandable sections. Each item can be expanded to reveal additional content while collapsing others.

---

## Structure

```
┌─────────────────────────────────────────────────┐
│  ► Finding #1: Reentrancy in withdraw()    [+]  │
│  ─────────────────────────────────────────────  │
│  │  Severity: CRITICAL                          │
│  │  Line: 45 · VulnerableVault.sol              │
│  │  Description: ...                            │
│  │  PoC: [View Code]                            │
│  └──────────────────────────────────────────────┘
│                                                  │
│  ▼ Finding #2: Integer Overflow           [-]   │
│  ─────────────────────────────────────────────  │
│  │  Severity: HIGH                              │
│  │  Line: 112 · TokenTransfer.sol               │
│  │  ...                                         │
│  └──────────────────────────────────────────────┘
│                                                  │
│  ► Finding #3: Missing Access Control     [+]   │
└─────────────────────────────────────────────────┘
```

---

## Properties

```typescript
interface AccordionProps {
  items: AccordionItem[];
  collapsible?: boolean;
  multiExpand?: boolean;
  onChange?: (expandedIds: string[]) => void;
}

interface AccordionItem {
  id: string;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: number;
  content: React.ReactNode;
  defaultExpanded?: boolean;
}
```

---

## Modes

| Mode | Behavior |
|------|----------|
| single | Only one item open at a time (default) |
| multi | Multiple items can be open |
| collapsible | Clicking open item closes it |
| non-collapsible | Must have at least one open |

---

## Animation

| Property | Duration | Easing |
|----------|----------|--------|
| Expand | 200ms | ease-out |
| Collapse | 150ms | ease-in |

---

## Accessibility

- `role="region"` on each item
- `aria-expanded` on trigger
- `aria-controls` linking to content
- Keyboard: Enter/Space toggles, Arrow keys navigate

---

## Usage Examples

```tsx
<Accordion
  items={findings.map(f => ({
    id: f.id,
    title: f.title,
    subtitle: `${f.line} · ${f.file}`,
    icon: <SeverityBadge severity={f.severity} />,
    content: <FindingDetail finding={f} />
  }))}
  collapsible
/>
```

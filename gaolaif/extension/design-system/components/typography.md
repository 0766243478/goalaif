# Typography Component

> **Status:** Proposed  
> **Component Count:** 40 of 40+

---

## Definition

A centralized typography system defining font scales, weights, line heights, and text styles for consistent text presentation across SIREEN.

---

## Type Scale

| Style | Size | Weight | Line Height | Use Case |
|-------|------|--------|-------------|----------|
| H1 | 24px | 700 | 1.2 | Page titles |
| H2 | 20px | 700 | 1.3 | Section headers |
| H3 | 16px | 600 | 1.4 | Subsection headers |
| H4 | 14px | 600 | 1.4 | Card titles |
| Body | 12px | 400 | 1.6 | Body text |
| Caption | 11px | 400 | 1.4 | Helper text |
| Overline | 10px | 500 | 1.2 | Labels, badges |
| Code | 11px | 400 | 1.5 | Code blocks |

---

## Properties

```typescript
interface TypographyProps {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'caption' | 'overline' | 'code';
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
  color?: string;
  align?: 'left' | 'center' | 'right';
  truncate?: boolean;
  children: React.ReactNode;
}
```

---

## Font Families

```typescript
const fonts = {
  sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  mono: 'JetBrains Mono, "Fira Code", "Cascadia Code", monospace',
  display: 'Inter, -apple-system, sans-serif'
};
```

---

## Usage Examples

```tsx
<Typography variant="h1">Security Audit Results</Typography>
<Typography variant="body">Found {count} vulnerabilities.</Typography>
<Typography variant="code">{`function withdraw()`}</Typography>
<Typography variant="caption">Updated 2 minutes ago</Typography>
```

---

## CSS Variables

```css
--typography-h1-size: 24px;
--typography-h1-weight: 700;
--typography-h2-size: 20px;
--typography-h3-size: 16px;
--typography-body-size: 12px;
--typography-caption-size: 11px;
--typography-code-size: 11px;
```

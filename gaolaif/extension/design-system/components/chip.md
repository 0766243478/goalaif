# Chip Component

> **Status:** Proposed  
> **Component Count:** 35 of 40+

---

## Definition

A compact interactive element representing a filter, tag, or attribute. Can be selected, removed, or clicked.

---

## Types

### Filter Chip
```
[🔴 Critical ×]  [🟠 High ×]  [+ Add]
```

### Tag Chip
```
#reentrancy  #flashloan  #oracle
```

### Input Chip
```
[User] [@mention] [tag] [x]
```

---

## Properties

```typescript
interface ChipProps {
  label: string;
  removable?: boolean;
  disabled?: boolean;
  variant?: 'filled' | 'outlined' | 'plain';
  color?: string;
  icon?: React.ReactNode;
  avatar?: React.ReactNode;
  onClick?: () => void;
  onDelete?: () => void;
  size?: 'sm' | 'md' | 'lg';
}
```

---

## Sizes

| Size | Height | Font | Padding |
|------|--------|------|---------|
| sm | 20px | 10px | 4px 8px |
| md | 24px | 11px | 4px 12px |
| lg | 28px | 12px | 6px 16px |

---

## States

| State | Appearance |
|-------|------------|
| default | Filled or outlined |
| hover | Elevated shadow |
| selected | Accent color fill |
| disabled | Dimmed, no interaction |
| removable | Shows × on hover |

---

## Usage Examples

```tsx
// Filter chips
<Chip label="Critical" color="red" removable />
<Chip label="High" color="orange" removable />

// Tags
<Chip label="#reentrancy" variant="outlined" />

// With avatar
<Chip 
  label="John Doe"
  avatar={<Avatar name="JD" />}
  removable
/>
```

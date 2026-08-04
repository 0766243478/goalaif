# Finding Selection Pattern

> **Date:** 2026-08-02  
> **Type:** Interaction Pattern  
> **Status:** Reference Implementation

---

## Overview

When a user clicks a finding, it becomes selected and displays detailed information in a side panel or modal. Only one finding can be selected at a time.

---

## States

| State | Visual | Behavior |
|-------|--------|----------|
| Default | Standard card | Click selects |
| Hover | Slight background change | Prepare selection |
| Selected | Highlighted border/background | Show details panel |
| Unselected | Click elsewhere | Deselect |

---

## Implementation

```tsx
interface FindingCardProps {
  finding: Finding;
  isSelected: boolean;
  onSelect: (finding: Finding) => void;
}

function FindingCard({ finding, isSelected, onSelect }: FindingCardProps) {
  return (
    <div 
      className={`finding-card ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect(finding)}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(finding)}
      tabIndex={0}
      role="button"
      aria-pressed={isSelected}
      aria-label={`${finding.severity} severity: ${finding.title}`}
    >
      <FindingSeverityBadge severity={finding.severity} />
      <h3>{finding.title}</h3>
      <p>{finding.summary}</p>
      {isSelected && <FindingDetails finding={finding} />}
    </div>
  );
}
```

---

## Details Panel

When a finding is selected, show detailed view:

```tsx
function FindingDetails({ finding }: { finding: Finding }) {
  return (
    <div className="finding-details" role="region" aria-label="Finding details">
      <div className="severity">{finding.severity}</div>
      <h2>{finding.title}</h2>
      <p className="summary">{finding.summary}</p>
      
      <div className="code-location">
        <h4>Location</h4>
        <CodeBlock code={finding.code} language="solidity" />
      </div>
      
      <div className="recommendations">
        <h4>Recommendations</h4>
        <ul>
          {finding.recommendations.map((rec, i) => (
            <li key={i}>{rec}</li>
          ))}
        </ul>
      </div>
      
      <div className="actions">
        <Button variant="primary" onClick={generateExploit}>
          Generate Exploit
        </Button>
        <Button variant="secondary" onClick={addNote}>
          Add Note
        </Button>
      </div>
    </div>
  );
}
```

---

## Keyboard Navigation

- **Click/Enter:** Select finding
- **Escape:** Deselect
- **Arrow keys:** Navigate between findings in list

---

## Accessibility

- **ARIA Attributes:** Use `aria-pressed` for toggle state
- **Focus Management:** Move focus to selected finding
- **Announcements:** Notify screen readers of selection change

```html
<div 
  role="button"
  aria-pressed="true"
  aria-label="Critical severity: Reentrancy vulnerability in withdraw function"
  tabindex="0"
>
  ...
</div>
```

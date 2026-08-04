# Research Notes Screen Specification

> **File:** `views/ResearchNotesView.tsx`  
> **Purpose:** Markdown-based research documentation

---

## Purpose

Maintain structured research notes with markdown support, linked to findings and memories.

## Layout

```
┌─────────────────────────────────────────────────────┐
│  Research Notes                           [📝 Edit]│
├─────────────────────────────────────────────────────┤
│  ## Flash Loan Analysis                             │
│                                                     │
│  **Date:** 2026-08-02                               │
│  **Related:** [VulnerableVault]                     │
│                                                     │
│  Key findings from analysis:                        │
│  - Oracle manipulation vector identified            │
│  - Cross-contract reentrancy possible               │
│                                                     │
│  See also:                                          │
│  - [[Reentrancy Pattern]]                           │
│  - [[Flash Loan Attacks]]                           │
└─────────────────────────────────────────────────────┘
```

## Features

- Markdown rendering
- Wiki-links for cross-referencing
- Linked to findings/memories
- Export to PDF/MD

## Acceptance Criteria

- [ ] Markdown renders correctly
- [ ] Links navigate to related content
- [ ] Edit mode available
- [ ] Save persists

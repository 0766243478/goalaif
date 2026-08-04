# Tasks Screen Specification

> **File:** `views/TasksView.tsx`  
> **Purpose:** Queue management for background audits and analysis

---

## Purpose

Manage queued audit tasks, monitor progress, and handle concurrent analyses.

## Layout

```
┌─────────────────────────────────────────────────────┐
│  Tasks                                  [+ Add]    │
├─────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────┐  │
│  │  ▶ Auditing VulnerableVault.sol              │  │
│  │    Progress: ████████░░ 80%                  │  │
│  │    ETA: ~2 min                               │  │
│  │    [Pause] [Cancel]                          │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │  ⏸ Researching attack patterns               │  │
│  │    In queue...                               │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## Components

- TaskCard with progress bar
- Queue management controls
- Status indicators

## Acceptance Criteria

- [ ] Multiple tasks supported
- [ ] Pause/Resume/Cancel operations
- [ ] Progress updates in real-time
- [ ] Task persistence across reloads

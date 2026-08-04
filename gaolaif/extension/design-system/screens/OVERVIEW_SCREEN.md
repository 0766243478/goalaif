# Overview Screen Specification

> **File:** `views/OverviewView.tsx`  
> **Purpose:** Dashboard showing audit summary and statistics

---

## Purpose

Provide at-a-glance overview of audit status, finding counts, and quick actions.

## Layout

```
┌─────────────────────────────────────────────────────┐
│  Overview                                [▶ Audit] │
├─────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │  12      │  │   5      │  │   3      │        │
│  │ CRITICAL │  │  HIGH    │  │ MEDIUM   │        │
│  └──────────┘  └──────────┘  └──────────┘        │
│  ┌──────────┐  ┌──────────┐                       │
│  │   4      │  │   ✅     │                       │
│  │  LOW     │  │Complete  │                       │
│  └──────────┘  └──────────┘                       │
├─────────────────────────────────────────────────────┤
│  Recent Activity                                    │
│  • Found 3 critical issues in Vault.sol          │
│  • Generated PoC for Reentrancy                    │
│  • Saved memory: "Flash Loan Pattern"              │
└─────────────────────────────────────────────────────┘
```

## Components

- StatCard grid (severity counts)
- Progress indicator (audit completion)
- Recent activity list

## Acceptance Criteria

- [ ] Counts update in real-time
- [ ] Click stat card filters Findings view
- [ ] Activity log persists

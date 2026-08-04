# Analyze Contract Flow

## Flow: F003 - Analyze Contract

### Entry Point
FindingsView or ChatView

### Decision Points
1. **Audit already running?**
   - Yes → Show progress, offer pause/cancel
   - No → Start new audit

2. **Errors during audit?**
   - Yes → Show partial results + error notice
   - No → Complete audit

### Success Path
```
User clicks "Run Audit" → Pipeline starts → 
Planning stage (analyzing structure) → 
Researching stage (pattern matching) → 
Auditing stage (finding vulnerabilities) → 
Findings appear in real-time → 
Audit completes → Summary displayed
```

### Failure Path
```
Stage fails → Error toast → Retry button → 
User chooses retry/fail → Partial results shown
```

### Recovery Path
```
Paused audit → Resume button → Continue from checkpoint
Failed audit → Clear state → Restart from beginning
```

### Key Components
- AuditProgressBar (multi-stage)
- FindingCard (real-time updates)
- EmptyState (pre-audit)

### Performance Considerations
- VirtualList for >100 findings
- Debounced real-time updates
- Checkpoint saving every 30 seconds

### Acceptance Criteria
- [ ] Progress accurate at each stage
- [ ] Findings appear as discovered
- [ ] Pause/Resume works correctly
- [ ] Error states handled gracefully
- [ ] No data loss on interruption

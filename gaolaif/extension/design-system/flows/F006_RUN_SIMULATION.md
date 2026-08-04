# Run Simulation Flow

## Flow: F006 - Run Simulation

### Entry Point
ExploitsView → Click "Run in Sandbox"

### Decision Points
1. **Sandbox ready?**
   - Yes → Proceed to run
   - No → Start sandbox first

2. **RPC configured?**
   - Yes → Use existing
   - No → Prompt for URL

3. **Test passes?**
   - Yes → Show success with details
   - No → Show error with diagnostics

### Success Path
```
User clicks "Run in Sandbox" → SimulationView loads → 
Checks sandbox status → If offline, starts sandbox → 
Selects exploit from dropdown → Clicks "Run Test" → 
Log streams execution output → Test completes → 
Result summary displayed → Money flow if applicable
```

### Failure Path
```
RPC connection fails → Error toast → Try different RPC
Test times out → Timeout error → Adjust settings and retry
Transaction reverts → Detailed error in log → Debug info
```

### Recovery Path
```
Stuck sandbox → Force stop → Restart fresh
Failed test → Review log → Adjust exploit parameters
```

### Key Components
- SandboxConfigCard
- ExploitSelector
- LogPanel (virtualized)
- PoCResultPanel

### Performance
- VirtualList for logs >100 entries
- Connection reuse for RPC calls
- 60-second timeout limit

### Acceptance Criteria
- [ ] Sandbox start/stop works reliably
- [ ] RPC configuration validated
- [ ] Real-time log streaming smooth
- [ ] Error messages actionable
- [ ] Results persist across reloads

# First Launch Flow

## Flow: F001 - First Launch

### Entry Point
Extension activation in VS Code

### Decision Points
1. **API Key Required?**
   - Yes → Show ApiKeySetup screen
   - No → Proceed to main layout

### Success Path
```
VS Code opens → Extension activates → Sidebar icon appears → 
User clicks icon → ApiKeySetup loads → User enters key → 
Key validated (min 20 chars) → Settings saved → 
Main layout loads → Overview view displayed
```

### Failure Path
```
User enters invalid key (too short) → Validation error shown → 
User corrects key → Proceed to success path
OR
Network error during validation → Error toast → Retry button
```

### Recovery Path
```
User closes webview → Reopens later → ApiKeySetup still shown → 
User re-enters key → Validation succeeds
```

### Key Screens
1. **ApiKeySetup** — Clean form with masking
2. **MainLayout** — CopilotLayout with sidebar

### Acceptance Criteria
- [ ] API key is masked by default
- [ ] Validation provides clear error feedback
- [ ] Settings persist across VS Code restarts
- [ ] Smooth transition to main layout

# Generate Report Flow

## Flow: F008 - Generate Report

### Entry Point
FindingsView → "Export" button

### Decision Points
1. **Select format?**
   - PDF → Standard report
   - Markdown → Editable document
   - JSON → Machine-readable

2. **Select scope?**
   - All → Include everything
   - Selected → Only chosen findings
   - Critical+ → Severity threshold

3. **Include code?**
   - Yes → Attach PoCs
   - No → Text only

### Success Path
```
User clicks "Export" → Dialog appears → 
Selects format: PDF → Chooses scope: Critical+ → 
Toggles "Include PoC code": ON → 
Clicks "Generate" → Progress shown → 
Download starts → Toast: "Report downloaded"
```

### Failure Path
```
Generation fails → Error toast → Retry button
Large scope → Progress bar for extended time
File too large → Warning + compression option
```

### Recovery Path
```
Failed download → Retry with smaller scope
Corrupted file → Regenerate with different format
```

### Key Components
- ExportDialog (configuration)
- ProgressIndicator (generation)
- FileSaver (download trigger)

### Output Structure
```
SIREEN_Report_[timestamp].pdf
├── Executive Summary
├── Methodology
├── Findings
│   ├── Critical (with PoC)
│   ├── High
│   └── Medium/Low
└── Appendix
```

### Acceptance Criteria
- [ ] Format selection works
- [ ] Scope filters correctly
- [ ] Progress indicates status
- [ ] Download initiates properly
- [ ] Error states handled

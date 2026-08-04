# Save Memory Flow

## Flow: F007 - Save Memory

### Entry Point
MemoryView or any context where security knowledge is discovered

### Decision Points
1. **Create new or edit existing?**
   - New → Create form with empty fields
   - Existing → Load into edit mode

2. **Add tags?**
   - Yes → Tag suggestions appear
   - No → Save without tags

### Success Path
```
User clicks "+ New" → Create/Edit form appears → 
Enters title: "Flash Loan Pattern X" → 
Enters content (markdown) → 
Adds tags: [flashloan] [pattern] → 
Clicks Save → Memory card added → 
Confirmation toast: "Memory saved"
```

### Failure Path
```
Invalid title (too short) → Validation error → Field highlights red
Network issue → Retry button → Auto-save attempted
Duplicate title → Warning: "Memory with similar title exists"
```

### Recovery Path
```
Abandoned edit → Auto-save draft → Resume editing later
Deleted accidentally → Undo option available for 5 minutes
```

### Key Components
- MemoryCard (display)
- TagInput (suggestions)
- MarkdownEditor (content)

### Storage
- Local storage (VS Code extension API)
- Persistent across sessions
- Exportable via Settings

### Acceptance Criteria
- [ ] Title required validation
- [ ] Content editable in markdown
- [ ] Tag suggestions work
- [ ] Auto-save drafts
- [ ] Search filters correctly

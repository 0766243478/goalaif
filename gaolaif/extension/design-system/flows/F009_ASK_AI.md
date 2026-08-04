# Ask AI Flow

## Flow: F009 - Ask AI Question

### Entry Point
ChatView

### Decision Points
1. **Conversation empty?**
   - Yes → Show starter questions
   - No → Continue conversation

2. **API response streaming?**
   - Yes → Character-by-character display
   - No → Show complete response

3. **Rate limited?**
   - Yes → Show countdown, offer retry

### Success Path
```
User opens ChatView → Types question or clicks starter → 
Message sent → User message appears (right) → 
ThinkingIndicator shows steps → 
AI response streams in (left) → 
Streaming complete → Cursor stops blinking → 
User can reply with follow-up
```

### Failure Path
```
Network error → Error toast → Retry button
API returns error → Inline error message → Suggested fix
Rate limited → Countdown timer → Auto-retry enabled
```

### Recovery Path
```
Interrupted stream → Escape to stop → Regenerate
Incomplete response → "Continue" button → Resume streaming
```

### Key Components
- ChatInput (with slash commands)
- ChatMessage (role-based styling)
- ThinkingIndicator (step display)
- CodeBlock (in AI responses)

### Accessibility
- aria-live polite for new messages
- Focus returns to input after send
- Escape stops generation

### Acceptance Criteria
- [ ] Streaming feels responsive (<100ms per char)
- [ ] Interruption via Escape works
- [ ] Error states clear and actionable
- [ ] Conversation history preserved
- [ ] Code blocks render correctly

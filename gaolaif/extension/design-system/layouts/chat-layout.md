# ChatLayout Component

> **Date:** 2026-08-02  
> **Type:** View Layout  
> **Status:** Ready for Implementation

---

## Overview

ChatLayout displays the AI conversation interface with streaming responses, starter questions, and slash command input.

---

## Structure

```tsx
interface ChatLayoutProps {
  messages: ChatMessage[];
  onSend: (message: string) => void;
  onSlashCommand: (command: string) => void;
  isLoading?: boolean;
}
```

```tsx
<div class="chat-layout">
  <ChatMessageList messages={messages} />
  <ChatInput 
    onSend={handleSend} 
    onSlashCommand={handleSlash}
    isLoading={isLoading}
  />
</div>
```

---

## CSS

```css
.chat-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.chat-message-list {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-2);
}

.chat-input-container {
  border-top: 1px solid var(--vscode-sideBar-border);
  padding: var(--space-2);
}

.chat-input {
  width: 100%;
  min-height: 80px;
  max-height: 200px;
  resize: none;
  background-color: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  border: 1px solid var(--vscode-input-border);
  border-radius: var(--radius-sm);
  padding: var(--space-2);
  font-family: system-ui, sans-serif;
  font-size: 12px;
  line-height: 1.4;
}

.chat-input:focus {
  border-color: var(--vscode-focusBorder);
  outline: none;
}

.starter-questions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  margin-top: var(--space-2);
}
```

---

## Streaming Behavior

Messages stream character-by-character:

```tsx
// Pseudo-code for streaming
const handleStream = async (response: AsyncIterable<string>) {
  for await (const chunk of response) {
    setMessages(prev => [...prev, chunk]);
  }
};
```

**Performance Note:** Buffer chunks and update via requestAnimationFrame to avoid excessive re-renders.

---

## Accessibility

- **Live Region:** Announce new messages via `aria-live="polite"`
- **Input Focus:** Return focus to input after sending
- **Loading State:** Indicate streaming with spinner + "AI is thinking..."

```html
<div aria-live="polite" aria-atomic="false">
  {messages.map(msg => <ChatMessage key={msg.id} {...msg} />)}
</div>
```

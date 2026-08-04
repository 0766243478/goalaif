# Streaming Responses Pattern

> **Date:** 2026-08-02  
> **Type:** Interaction Pattern  
> **Status:** Reference Implementation

---

## Overview

Streaming renders AI responses character-by-character via Server-Sent Events (SSE). This creates perceived responsiveness and allows users to see progress immediately.

---

## Implementation

```typescript
async function* streamResponse(prompt: string): AsyncGenerator<string> {
  const response = await fetch('/api/chat/stream', {
    method: 'POST',
    body: JSON.stringify({ prompt }),
  });
  
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value);
    yield chunk;
  }
}
```

---

## React Implementation

```tsx
function ChatMessage({ message }: { message: ChatMessage }) {
  const [displayedText, setDisplayedText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  
  useEffect(() => {
    if (message.isStreaming) {
      setIsStreaming(true);
      (async () => {
        for await (const chunk of streamResponse(message.prompt)) {
          setDisplayedText(prev => prev + chunk);
        }
        setIsStreaming(false);
      })();
    } else {
      setDisplayedText(message.content);
    }
  }, [message]);
  
  return (
    <div className="message">
      <div className="message-content">
        {renderMarkdown(displayedText)}
        {isStreaming && <TypingIndicator />}
      </div>
    </div>
  );
}
```

---

## Performance Optimization

Buffer chunks and update via requestAnimationFrame:

```typescript
let buffer = '';
let rafId: number;

function queueChunk(chunk: string) {
  buffer += chunk;
  
  if (!rafId) {
    rafId = requestAnimationFrame(() => {
      setDisplayedText(buffer);
      buffer = '';
      rafId = 0;
    });
  }
}
```

**Target:** Update at most 60 times per second (16ms interval).

---

## Typing Indicator

Show a subtle indicator while streaming:

```tsx
function TypingIndicator() {
  return (
    <span className="typing-indicator" aria-label="AI is typing">
      <span className="dot"></span>
      <span className="dot"></span>
      <span className="dot"></span>
    </span>
  );
}
```

```css
.typing-indicator .dot {
  animation: bounce 1.4s infinite ease-in-out both;
  animation-delay: 0s;
}

.typing-indicator .dot:nth-child(1) { animation-delay: -0.32s; }
.typing-indicator .dot:nth-child(2) { animation-delay: -0.16s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}
```

**Note:** Remove animation if `prefers-reduced-motion: reduce`.

---

## Accessibility

- **Live Region:** Wrap streaming content in `aria-live="polite"`
- **Completion Signal:** Announce when streaming completes
- **Interruptible:** Allow user to stop streaming with Escape

```html
<div aria-live="polite" aria-atomic="false">
  {displayedText}
  {isStreaming && <span className="sr-only">Streaming...</span>}
</div>
```

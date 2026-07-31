import { useState, useCallback, useRef, useEffect } from 'react';
import type { ChatContext } from '../store/types';

interface Props {
  context: ChatContext;
  onSubmit: (message: string) => void;
  onSlashCommand: (command: string, args: string) => void;
}

const SLASH_COMMANDS = [
  { cmd: '/analyze', desc: 'Deep analysis of specific function' },
  { cmd: '/exploit', desc: 'Generate exploit PoC with hypothesis' },
  { cmd: '/patch', desc: 'Generate fix for specific finding' },
  { cmd: '/report', desc: 'Generate bug bounty report' },
  { cmd: '/search', desc: 'Search memory for similar patterns' },
  { cmd: '/explain', desc: 'Explain code or pattern' },
  { cmd: '/fuzz', desc: 'Run fuzz testing' },
  { cmd: '/invariant', desc: 'Generate invariant tests' },
];

export function ChatInput({ context, onSubmit, onSlashCommand }: Props) {
  const [value, setValue] = useState('');
  const [showCommands, setShowCommands] = useState(false);
  const [filteredCommands, setFilteredCommands] = useState(SLASH_COMMANDS);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setValue(v);

    if (v.startsWith('/') && v.length < 20) {
      const query = v.toLowerCase();
      setFilteredCommands(SLASH_COMMANDS.filter(c => c.cmd.startsWith(query)));
      setShowCommands(true);
      setSelectedIdx(0);
    } else {
      setShowCommands(false);
    }
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (showCommands) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIdx(i => Math.min(i + 1, filteredCommands.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIdx(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && filteredCommands.length > 0) {
        e.preventDefault();
        const cmd = filteredCommands[selectedIdx];
        setValue(cmd.cmd + ' ');
        setShowCommands(false);
      } else if (e.key === 'Escape') {
        setShowCommands(false);
      }
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.startsWith('/')) {
        const parts = value.split(' ');
        const cmd = parts[0];
        const args = parts.slice(1).join(' ');
        onSlashCommand(cmd.slice(1), args);
      } else if (value.trim()) {
        onSubmit(value.trim());
      }
      setValue('');
    }
  }, [value, showCommands, filteredCommands, selectedIdx, onSubmit, onSlashCommand]);

  const contextChips = [];
  if (context.file) contextChips.push(`File: ${context.file.split(/[/\\]/).pop()}`);
  if (context.selection) contextChips.push(`Sel: L${context.selection.startLine}-${context.selection.endLine}`);
  if (context.findingRefs?.length) contextChips.push(`${context.findingRefs.length} findings`);

  return (
    <div style={{
      borderTop: '1px solid var(--sireen-border)',
      padding: 8,
      background: 'var(--sireen-void)',
    }}>
      {contextChips.length > 0 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 4,
          marginBottom: 6,
        }}>
          {contextChips.map((chip, i) => (
            <span key={i} className="badge badge-ghost" style={{ fontSize: 'var(--text-xs)' }}>
              {chip}
            </span>
          ))}
        </div>
      )}

      <div style={{ position: 'relative' }}>
        {showCommands && filteredCommands.length > 0 && (
          <div style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            right: 0,
            background: 'var(--sireen-surface)',
            border: '1px solid var(--sireen-border)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 4,
            overflow: 'hidden',
            zIndex: 10,
          }}>
            {filteredCommands.map((c, i) => (
              <div
                key={c.cmd}
                style={{
                  padding: '6px 10px',
                  cursor: 'pointer',
                  background: i === selectedIdx ? 'var(--sireen-raised)' : 'transparent',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
                onMouseEnter={() => setSelectedIdx(i)}
                onClick={() => {
                  setValue(c.cmd + ' ');
                  setShowCommands(false);
                  textareaRef.current?.focus();
                }}
              >
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--sireen-amber)', fontWeight: 600 }}>
                  {c.cmd}
                </span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--sireen-text-ghost)' }}>
                  {c.desc}
                </span>
              </div>
            ))}
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Ask Sireen anything... (Shift+Enter for new line)"
          aria-label="Chat message"
          rows={1}
          style={{
            width: '100%',
            padding: '8px 10px',
            background: 'var(--sireen-abyss)',
            border: '1px solid var(--sireen-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--sireen-text-primary)',
            fontSize: 'var(--text-sm)',
            fontFamily: 'var(--font-mono)',
            resize: 'none',
            outline: 'none',
            minHeight: 36,
            maxHeight: 120,
            lineHeight: 1.5,
          }}
        />
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
        fontSize: 'var(--text-xs)',
        color: 'var(--sireen-text-ghost)',
      }}>
        <span>Enter to send · Shift+Enter for new line</span>
        <span>/ for commands</span>
      </div>
    </div>
  );
}

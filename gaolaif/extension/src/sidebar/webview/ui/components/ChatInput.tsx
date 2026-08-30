import { useState, useCallback, useRef, useEffect, memo } from 'react';
import type { ChatContext } from '../../store/types';
import { Text } from '../primitives/Text';
import { Flex } from '../primitives/Flex';
import { Chip } from './Chip';
import { Button } from './Button';

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
  { cmd: '/explain', desc: 'Explain code or pattern' },
  { cmd: '/fuzz', desc: 'Run fuzz testing' },
  { cmd: '/invariant', desc: 'Generate invariant tests' },
];

function ChatInputImpl({ context, onSubmit, onSlashCommand }: Props) {
  const [value, setValue] = useState('');
  const [showCommands, setShowCommands] = useState(false);
  const [filteredCommands, setFilteredCommands] = useState(SLASH_COMMANDS);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

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

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
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
          textareaRef.current?.focus();
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
    },
    [value, showCommands, filteredCommands, selectedIdx, onSubmit, onSlashCommand],
  );

  const contextChips: string[] = [];
  if (context.file) contextChips.push(`File: ${context.file.split(/[/\\]/).pop()}`);
  if (context.selection) contextChips.push(`Sel: L${context.selection.startLine}-${context.selection.endLine}`);
  if (context.findingRefs?.length) contextChips.push(`${context.findingRefs.length} findings`);

  return (
    <div
      style={{
        borderTop: '1px solid var(--sireen-border-subtle)',
        padding: 'var(--sireen-space-2)',
        background: 'var(--sireen-bg-primary)',
      }}
    >
      {contextChips.length > 0 && (
        <Flex wrap="wrap" gap={1} style={{ marginBottom: 'var(--sireen-space-1)' }}>
          {contextChips.map((chip, i) => (
            <Chip key={i}>{chip}</Chip>
          ))}
        </Flex>
      )}

      <div style={{ position: 'relative' }}>
        {showCommands && filteredCommands.length > 0 && (
          <div
            style={{
              position: 'absolute',
              bottom: '100%',
              left: 0,
              right: 0,
              background: 'var(--sireen-bg-elevated)',
              border: '1px solid var(--sireen-border)',
              borderRadius: 'var(--sireen-radius-md)',
              marginBottom: 'var(--sireen-space-1)',
              overflow: 'hidden',
              zIndex: 'var(--sireen-z-dropdown)',
            }}
          >
            {filteredCommands.map((c, i) => (
              <div
                key={c.cmd}
                style={{
                  padding: 'var(--sireen-space-2) var(--sireen-space-3)',
                  cursor: 'pointer',
                  background: i === selectedIdx ? 'var(--sireen-bg-hover)' : 'transparent',
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
                <Text variant="body-sm" weight="semibold" style={{ color: 'var(--sireen-accent-amber)' }}>
                  {c.cmd}
                </Text>
                <Text variant="caption" color="muted">
                  {c.desc}
                </Text>
              </div>
            ))}
          </div>
        )}

        <Flex gap={1} align="flex-end">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask Sireen anything... (Shift+Enter for new line)"
            aria-label="Chat message"
            rows={1}
            style={{
              flex: 1,
              padding: 'var(--sireen-space-2) var(--sireen-space-3)',
              background: 'var(--sireen-input-bg)',
              color: 'var(--sireen-input-fg)',
              border: '1px solid var(--sireen-input-border)',
              borderRadius: 'var(--sireen-radius-md)',
              fontFamily: 'var(--sireen-font-ui)',
              fontSize: 'var(--sireen-font-size-body)',
              lineHeight: 'var(--sireen-line-height-body)',
              resize: 'none',
              outline: 'none',
              minHeight: 'var(--sireen-control-height-md)',
              transition: 'border-color var(--sireen-duration-fast) var(--sireen-ease)',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--sireen-input-focus-border)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'var(--sireen-input-border)')}
          />
          <Button
            variant="primary"
            iconOnly="zap"
            aria-label="Send message"
            onClick={() => {
              if (value.trim()) {
                onSubmit(value.trim());
                setValue('');
              }
            }}
          />
        </Flex>
      </div>
    </div>
  );
}

export const ChatInput = memo(ChatInputImpl);

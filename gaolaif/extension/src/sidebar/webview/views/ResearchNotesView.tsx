import { useStore } from '../store';
import { Text } from '../ui/primitives/Text';
import { Stack } from '../ui/primitives/Stack';

export default function ResearchNotesView() {
  const { state, dispatch } = useStore();

  return (
    <Stack gap={3}>
      <Stack gap={0}>
        <Text variant="h1" weight="semibold">
          Research Notes
        </Text>
        <Text variant="caption" color="muted">
          Auto-saved research notes
        </Text>
      </Stack>

      <textarea
        value={state.researchNotes}
        onChange={e => dispatch({ type: 'SET_NOTES', content: e.target.value })}
        placeholder={`Start taking notes about this protocol...

Examples:
- What does this contract do?
- What assumptions does it make?
- What external calls does it make?
- What invariants should hold?`}
        aria-label="Research notes"
        style={{
          width: '100%',
          minHeight: 300,
          padding: 'var(--sireen-space-3)',
          background: 'var(--sireen-input-bg)',
          border: '1px solid var(--sireen-input-border)',
          borderRadius: 'var(--sireen-radius-md)',
          color: 'var(--sireen-input-fg)',
          fontSize: 'var(--sireen-font-size-body)',
          fontFamily: 'var(--sireen-font-mono)',
          resize: 'vertical',
          outline: 'none',
          lineHeight: 'var(--sireen-line-height-body)',
          boxSizing: 'border-box',
          transition: 'border-color var(--sireen-duration-fast) var(--sireen-ease)',
        }}
        onFocus={e => (e.currentTarget.style.borderColor = 'var(--sireen-input-focus-border)')}
        onBlur={e => (e.currentTarget.style.borderColor = 'var(--sireen-input-border)')}
      />
    </Stack>
  );
}

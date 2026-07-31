import { useStore } from '../store';
import { EmptyState } from '../components/EmptyState';

export default function ResearchNotesView() {
  const { state, dispatch } = useStore();

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--sireen-text-primary)' }}>
          Research Notes
        </div>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--sireen-text-muted)' }}>
          Auto-saved research notes
        </div>
      </div>

      <textarea
        value={state.researchNotes}
        onChange={(e) => dispatch({ type: 'SET_NOTES', content: e.target.value })}
        placeholder="Start taking notes about this protocol...

Examples:
- What does this contract do?
- What assumptions does it make?
- What external calls does it make?
- What invariants should hold?"
        style={{
          width: '100%',
          minHeight: 300,
          padding: 12,
          background: 'var(--sireen-abyss)',
          border: '1px solid var(--sireen-border)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--sireen-text-primary)',
          fontSize: 'var(--text-sm)',
          fontFamily: 'var(--font-mono)',
          resize: 'vertical',
          outline: 'none',
          lineHeight: 1.6,
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
}
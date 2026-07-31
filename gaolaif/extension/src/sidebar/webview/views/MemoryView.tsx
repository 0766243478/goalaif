import { useState, useMemo } from 'react';
import { useStore } from '../store';
import { useMessageBus } from '../hooks/useMessageBus';
import { SearchInput } from '../components/SearchInput';
import { EmptyState } from '../components/EmptyState';

const COLLECTIONS = ['patterns', 'tactics', 'fixes', 'templates'] as const;

export default function MemoryView() {
  const { state, dispatch } = useStore();
  const { send } = useMessageBus();
  const [search, setSearch] = useState('');

  const filteredEntries = useMemo(() => {
    if (!search) return state.memoryEntries;
    const q = search.toLowerCase();
    return state.memoryEntries.filter(e =>
      e.content.toLowerCase().includes(q) ||
      e.key.toLowerCase().includes(q)
    );
  }, [state.memoryEntries, search]);

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--sireen-text-primary)' }}>
          Memory
        </div>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--sireen-text-muted)' }}>
          {state.memoryEntries.length} patterns stored
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {COLLECTIONS.map((col) => (
          <button
            key={col}
            onClick={() => {
              dispatch({ type: 'SET_MEMORY_COLLECTION', collection: col });
              send('sireen.memory.search', { query: search || col, top_k: 20 });
            }}
            className={state.memoryCollection === col ? 'btn-primary' : 'btn-ghost'}
            style={{
              fontSize: 'var(--text-xs)',
              padding: '3px 8px',
              textTransform: 'capitalize',
              ...(state.memoryCollection === col ? {} : { border: '1px solid var(--sireen-border)' }),
            }}
          >
            {col}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: 12 }}>
        <SearchInput placeholder="Search memory..." onSearch={setSearch} />
      </div>

      {filteredEntries.length === 0 ? (
        <EmptyState
          title="No patterns yet"
          message="Memory is populated as you run audits and exploits"
        />
      ) : (
        filteredEntries.map((entry) => (
          <div key={entry.key} className="card animate-fade-in" style={{ marginBottom: 6 }}>
            <div className="card-body" style={{ padding: '8px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  color: 'var(--sireen-cyan)',
                }}>
                  {entry.key}
                </span>
                {entry.score != null && (
                  <span className="badge badge-ghost" style={{ fontSize: '9px' }}>
                    {(entry.score * 100).toFixed(0)}%
                  </span>
                )}
              </div>
              <div style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--sireen-text-secondary)',
                lineHeight: 1.5,
              }}>
                {entry.content}
              </div>
              {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                  {Object.entries(entry.metadata).map(([k, v]) => (
                    <span key={k} className="badge badge-ghost" style={{ fontSize: '9px' }}>
                      {k}: {String(v)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
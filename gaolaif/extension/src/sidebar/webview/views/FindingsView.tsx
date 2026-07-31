import { useState, useMemo, memo } from 'react';
import { useStore } from '../store';
import { FindingCard } from '../components/FindingCard';
import { SearchInput } from '../components/SearchInput';
import { EmptyState } from '../components/EmptyState';
import { VirtualList } from '../components/VirtualList';
import { AuditProgressBar } from '../components/AuditProgressBar';

const SEVERITY_OPTIONS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const;
const VIRTUAL_THRESHOLD = 50;

const FindingsView = memo(function FindingsView() {
  const { state } = useStore();
  const [search, setSearch] = useState('');
  const [selectedSeverities, setSelectedSeverities] = useState<Set<string>>(new Set());

  const filteredFindings = useMemo(() => {
    return state.findings.filter((f) => {
      if (selectedSeverities.size > 0 && !selectedSeverities.has(f.severity)) return false;
      if (search) {
        const q = search.toLowerCase();
        return f.title.toLowerCase().includes(q) ||
               f.description.toLowerCase().includes(q) ||
               f.affected_functions?.some(fn => fn.toLowerCase().includes(q));
      }
      return true;
    });
  }, [state.findings, search, selectedSeverities]);

  const toggleSeverity = (sev: string) => {
    setSelectedSeverities((prev) => {
      const next = new Set(prev);
      if (next.has(sev)) next.delete(sev);
      else next.add(sev);
      return next;
    });
  };

  const useVirtual = filteredFindings.length > VIRTUAL_THRESHOLD;

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--sireen-text-primary)' }}>
            Findings
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--sireen-text-muted)' }}>
            {filteredFindings.length} of {state.findings.length} findings
          </div>
        </div>
      </div>

      <AuditProgressBar />

      <div style={{ marginBottom: 12 }}>
        <SearchInput placeholder="Filter findings..." onSearch={setSearch} />
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap' }}>
        {SEVERITY_OPTIONS.map((sev) => {
          const active = selectedSeverities.has(sev);
          return (
            <button
              key={sev}
              onClick={() => toggleSeverity(sev)}
              className={active ? 'btn-primary' : 'btn-ghost'}
              style={{
                fontSize: 'var(--text-xs)',
                padding: '3px 8px',
                ...(active ? {} : { border: '1px solid var(--sireen-border)' }),
              }}
            >
              {sev}
            </button>
          );
        })}
        {selectedSeverities.size > 0 && (
          <button
            className="btn-ghost"
            style={{ fontSize: 'var(--text-xs)', padding: '3px 8px' }}
            onClick={() => setSelectedSeverities(new Set())}
          >
            Clear
          </button>
        )}
      </div>

      {filteredFindings.length === 0 ? (
        <EmptyState
          title="No findings"
          message={state.findings.length === 0 ? 'Run an audit to discover vulnerabilities' : 'No findings match your filter'}
        />
      ) : useVirtual ? (
        <VirtualList
          items={filteredFindings}
          height={400}
          itemHeight={120}
          keyExtractor={(item: any) => item.id}
          renderItem={(item: any) => <FindingCard finding={item} />}
        />
      ) : (
        filteredFindings.map((f) => (
          <FindingCard key={f.id} finding={f} />
        ))
      )}
    </div>
  );
});

export default FindingsView;
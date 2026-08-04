import { useState, useMemo, memo } from 'react';
import { useStore } from '../store';
import { Text } from '../ui/primitives/Text';
import { Flex } from '../ui/primitives/Flex';
import { Stack } from '../ui/primitives/Stack';
import { Button } from '../ui/components/Button';
import { EmptyState } from '../ui/components/EmptyState';
import { VirtualList } from '../ui/components/VirtualList';
import { FindingCard } from '../ui/components/FindingCard';
import { SearchInput } from '../ui/components/SearchInput';
import { AuditProgressBar } from '../ui/components/AuditProgressBar';

const SEVERITY_OPTIONS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const;
const VIRTUAL_THRESHOLD = 50;

const FindingsView = memo(function FindingsView() {
  const { state } = useStore();
  const [search, setSearch] = useState('');
  const [selectedSeverities, setSelectedSeverities] = useState<Set<string>>(new Set());

  const filteredFindings = useMemo(() => {
    return state.findings.filter(f => {
      if (selectedSeverities.size > 0 && !selectedSeverities.has(f.severity)) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          f.title.toLowerCase().includes(q) ||
          f.description.toLowerCase().includes(q) ||
          f.affected_functions?.some(fn => fn.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [state.findings, search, selectedSeverities]);

  const toggleSeverity = (sev: string) => {
    setSelectedSeverities(prev => {
      const next = new Set(prev);
      if (next.has(sev)) next.delete(sev);
      else next.add(sev);
      return next;
    });
  };

  const useVirtual = filteredFindings.length > VIRTUAL_THRESHOLD;

  return (
    <Stack gap={3}>
      <Flex align="center" justify="space-between">
        <Stack gap={0}>
          <Text variant="h1" weight="semibold">
            Findings
          </Text>
          <Text variant="caption" color="muted">
            {filteredFindings.length} of {state.findings.length} findings
          </Text>
        </Stack>
      </Flex>

      <AuditProgressBar />

      <SearchInput value={search} onChange={setSearch} placeholder="Filter findings..." />

      <Flex gap={1} wrap="wrap">
        {SEVERITY_OPTIONS.map(sev => {
          const active = selectedSeverities.has(sev);
          return (
            <Button
              key={sev}
              variant={active ? 'primary' : 'outline'}
              size="sm"
              onClick={() => toggleSeverity(sev)}
            >
              {sev}
            </Button>
          );
        })}
        {selectedSeverities.size > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setSelectedSeverities(new Set())}>
            Clear
          </Button>
        )}
      </Flex>

      {filteredFindings.length === 0 ? (
        <EmptyState
          icon="findings"
          title="No findings"
          message={
            state.findings.length === 0
              ? 'Run an audit to discover vulnerabilities'
              : 'No findings match your filter'
          }
        />
      ) : useVirtual ? (
        <VirtualList
          items={filteredFindings}
          height={400}
          itemHeight={120}
          keyExtractor={item => item.id}
          renderItem={item => <FindingCard finding={item} />}
        />
      ) : (
        <Stack gap={2}>
          {filteredFindings.map(f => (
            <FindingCard key={f.id} finding={f} />
          ))}
        </Stack>
      )}
    </Stack>
  );
});

export default FindingsView;

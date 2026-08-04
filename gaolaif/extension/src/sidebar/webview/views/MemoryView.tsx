import { useState, useMemo } from 'react';
import { useStore } from '../store';
import { useMessageBus } from '../hooks/useMessageBus';
import { Text } from '../ui/primitives/Text';
import { Flex } from '../ui/primitives/Flex';
import { Stack } from '../ui/primitives/Stack';
import { Button } from '../ui/components/Button';
import { EmptyState } from '../ui/components/EmptyState';
import { SearchInput } from '../ui/components/SearchInput';
import { MemoryCard } from '../ui/components/MemoryCard';

const COLLECTIONS = ['patterns', 'tactics', 'fixes', 'templates'] as const;

export default function MemoryView() {
  const { state, dispatch } = useStore();
  const { send } = useMessageBus();
  const [search, setSearch] = useState('');

  const filteredEntries = useMemo(() => {
    if (!search) return state.memoryEntries;
    const q = search.toLowerCase();
    return state.memoryEntries.filter(
      e => e.content.toLowerCase().includes(q) || e.key.toLowerCase().includes(q),
    );
  }, [state.memoryEntries, search]);

  return (
    <Stack gap={3}>
      <Stack gap={0}>
        <Text variant="h1" weight="semibold">
          Memory
        </Text>
        <Text variant="caption" color="muted">
          {state.memoryEntries.length} patterns stored
        </Text>
      </Stack>

      <Flex gap={1} wrap="wrap">
        {COLLECTIONS.map(col => (
          <Button
            key={col}
            variant={state.memoryCollection === col ? 'primary' : 'outline'}
            size="sm"
            onClick={() => {
              dispatch({ type: 'SET_MEMORY_COLLECTION', collection: col });
              send('sireen.memory.search', { query: search || col, top_k: 20 });
            }}
          >
            {col}
          </Button>
        ))}
      </Flex>

      <SearchInput value={search} onChange={setSearch} placeholder="Search memory..." />

      {filteredEntries.length === 0 ? (
        <EmptyState
          icon="memory"
          title="No patterns yet"
          message="Memory is populated as you run audits and exploits"
        />
      ) : (
        <Stack gap={2}>
          {filteredEntries.map(entry => (
            <MemoryCard key={entry.key} entry={entry} />
          ))}
        </Stack>
      )}
    </Stack>
  );
}

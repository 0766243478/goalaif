import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { useSend } from '../hooks/useMessageBus';
import { Text } from '../ui/primitives/Text';
import { Flex } from '../ui/primitives/Flex';
import { Stack } from '../ui/primitives/Stack';
import { Button } from '../ui/components/Button';
import { Input } from '../ui/components/Input';
import { Card } from '../ui/components/Card';
import { Badge } from '../ui/components/Badge';
import { EmptyState } from '../ui/components/EmptyState';
import type { SessionMeta } from '../store/types';

function formatDate(ts: number): string {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function SessionCard({ session }: { session: SessionMeta }) {
  const { send } = useSend();
  const { state, dispatch } = useStore();
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(session.name);

  const open = () => {
    send('sireen.session.get', { id: session.id });
  };

  const rename = () => {
    if (newName && newName !== session.name) {
      send('sireen.session.update', { id: session.id, name: newName });
    }
    setRenaming(false);
  };

  const archive = () => {
    send('sireen.session.update', { id: session.id, status: 'archived' });
  };

  const duplicate = () => {
    send('sireen.session.duplicate', { id: session.id });
  };

  const remove = () => {
    send('sireen.session.delete', { id: session.id });
  };

  const isActive = state.activeSessionId === session.id;

  return (
    <Card
      style={{
        cursor: 'pointer',
        borderColor: isActive ? 'var(--sireen-accent-amber)' : undefined,
        borderWidth: isActive ? 2 : 1,
      }}
      onClick={open}
    >
      <Stack gap={2}>
        <Flex align="center" justify="space-between">
          {renaming ? (
            <Flex gap={1} onClick={e => e.stopPropagation()}>
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && rename()}
                style={{ flex: 1 }}
                autoFocus
              />
              <Button size="sm" onClick={rename}>Save</Button>
              <Button size="sm" variant="ghost" onClick={() => { setRenaming(false); setNewName(session.name); }}>Cancel</Button>
            </Flex>
          ) : (
            <Text variant="body" weight="semibold" truncate>{session.name}</Text>
          )}
          {isActive && <Badge color="green" variant="filled">Active</Badge>}
        </Flex>
        <Flex gap={2} align="center">
          {session.project && <Text variant="caption" color="muted">{session.project}</Text>}
          {session.file_name && <Text variant="caption" color="muted">· {session.file_name}</Text>}
        </Flex>
        <Flex gap={2} align="center" justify="space-between">
          <Text variant="caption" color="muted">
            {formatDate(session.created_at)} · {session.audit_status}
          </Text>
          <Flex gap={1} onClick={e => e.stopPropagation()}>
            <Button size="sm" variant="ghost" onClick={() => setRenaming(true)}>Rename</Button>
            <Button size="sm" variant="ghost" onClick={duplicate}>Duplicate</Button>
            <Button size="sm" variant="ghost" onClick={archive}>Archive</Button>
            <Button size="sm" variant="ghost" onClick={remove}>Delete</Button>
          </Flex>
        </Flex>
      </Stack>
    </Card>
  );
}

export default function SessionManagerView() {
  const { state } = useStore();
  const { send } = useSend();
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [newName, setNewName] = useState('');
  const [newProject, setNewProject] = useState('');

  useEffect(() => {
    send('sireen.session.list', { status: showArchived ? 'all' : 'active', search });
  }, [send, search, showArchived]);

  const createSession = () => {
    send('sireen.session.create', {
      name: newName || 'Untitled Session',
      project: newProject,
    });
    setNewName('');
    setNewProject('');
  };

  const resumeLast = () => {
    if (state.sessionList.length > 0) {
      const last = state.sessionList[0];
      send('sireen.session.get', { id: last.id });
    }
  };

  return (
    <Stack gap={3} style={{ maxWidth: 600, margin: '0 auto', padding: 'var(--sireen-space-4)' }}>
      <Stack gap={0}>
        <Text variant="h1" weight="semibold">Sessions</Text>
        <Text variant="caption" color="muted">
          Every audit, finding, and conversation belongs to a session. Your work is saved automatically.
        </Text>
      </Stack>

      {/* Create new session */}
      <Card>
        <Stack gap={2}>
          <Text variant="caption" color="secondary" weight="semibold" style={{ letterSpacing: '0.05em' }}>
            NEW SESSION
          </Text>
          <Input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Session name (e.g. Euler Finance Audit)"
          />
          <Input
            value={newProject}
            onChange={e => setNewProject(e.target.value)}
            placeholder="Project / repository (optional)"
          />
          <Flex gap={2}>
            <Button variant="primary" onClick={createSession} iconLeft="plus">
              Create Session
            </Button>
            {state.sessionList.length > 0 && (
              <Button variant="secondary" onClick={resumeLast} iconLeft="history">
                Resume Last Session
              </Button>
            )}
          </Flex>
        </Stack>
      </Card>

      {/* Search + filter */}
      <Flex gap={2} align="center">
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search sessions..."
          style={{ flex: 1 }}
        />
        <Button
          variant={showArchived ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setShowArchived(!showArchived)}
        >
          {showArchived ? 'Showing All' : 'Show Archived'}
        </Button>
      </Flex>

      {/* Session list */}
      {state.sessionList.length === 0 ? (
        <EmptyState
          icon="overview"
          title="No sessions yet"
          message="Create a session above to start your first security audit"
        />
      ) : (
        <Stack gap={2}>
          {state.sessionList.map(session => (
            <SessionCard key={session.id} session={session} />
          ))}
        </Stack>
      )}
    </Stack>
  );
}

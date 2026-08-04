import { useState } from 'react';
import { useStore } from '../store';
import { Text } from '../ui/primitives/Text';
import { Flex } from '../ui/primitives/Flex';
import { Stack } from '../ui/primitives/Stack';
import { Card } from '../ui/components/Card';
import { Input } from '../ui/components/Input';
import { Button } from '../ui/components/Button';
import { EmptyState } from '../ui/components/EmptyState';
import { Icon } from '../ui/primitives/Icon';

export default function TasksView() {
  const { state, dispatch } = useStore();
  const [newTask, setNewTask] = useState('');
  const [filter, setFilter] = useState<'all' | 'open' | 'done'>('all');

  const filteredTasks = state.tasks.filter(t => {
    if (filter === 'open') return t.status === 'open';
    if (filter === 'done') return t.status === 'done';
    return true;
  });

  const addTask = () => {
    if (!newTask.trim()) return;
    dispatch({
      type: 'ADD_TASK',
      task: {
        id: crypto.randomUUID(),
        title: newTask.trim(),
        description: '',
        status: 'open',
        createdAt: Date.now(),
      },
    });
    setNewTask('');
  };

  return (
    <Stack gap={3}>
      <Stack gap={0}>
        <Text variant="h1" weight="semibold">
          Tasks
        </Text>
        <Text variant="caption" color="muted">
          {state.tasks.filter(t => t.status === 'open').length} open tasks
        </Text>
      </Stack>

      <Flex gap={2}>
        <Input
          value={newTask}
          onChange={e => setNewTask(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTask()}
          placeholder="Add a task..."
          aria-label="New task"
          style={{ flex: 1 }}
        />
        <Button variant="primary" iconLeft="plus" onClick={addTask}>
          Add
        </Button>
      </Flex>

      <Flex gap={1}>
        {(['all', 'open', 'done'] as const).map(f => (
          <Button
            key={f}
            variant={filter === f ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f}
          </Button>
        ))}
      </Flex>

      {filteredTasks.length === 0 ? (
        <EmptyState icon="tasks" title="No tasks" message="Add a task to track your research" />
      ) : (
        <Stack gap={1}>
          {filteredTasks.map(task => (
            <Card key={task.id} style={{ padding: 'var(--sireen-space-2) var(--sireen-space-3)' }}>
              <Flex align="center" gap={2}>
                <button
                  onClick={() => dispatch({ type: 'TOGGLE_TASK', id: task.id })}
                  aria-label={task.status === 'done' ? 'Mark as open' : 'Mark as done'}
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 'var(--sireen-radius-sm)',
                    border: `1px solid ${task.status === 'done' ? 'var(--sireen-success-fg)' : 'var(--sireen-border)'}`,
                    background: task.status === 'done' ? 'var(--sireen-success-fg)' : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {task.status === 'done' && <Icon name="check" size={12} color="#fff" />}
                </button>
                <Text
                  variant="body-sm"
                  style={{
                    flex: 1,
                    color: task.status === 'done' ? 'var(--sireen-fg-muted)' : 'var(--sireen-fg-primary)',
                    textDecoration: task.status === 'done' ? 'line-through' : 'none',
                  }}
                >
                  {task.title}
                </Text>
                <button
                  onClick={() => dispatch({ type: 'DELETE_TASK', id: task.id })}
                  aria-label="Delete task"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--sireen-fg-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    padding: 'var(--sireen-space-1)',
                    borderRadius: 'var(--sireen-radius-sm)',
                  }}
                >
                  <Icon name="trash" size="sm" />
                </button>
              </Flex>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

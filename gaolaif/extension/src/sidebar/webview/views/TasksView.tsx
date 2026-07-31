import { useState } from 'react';
import { useStore } from '../store';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';

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
    <div className="animate-fade-in">
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--sireen-text-primary)' }}>
          Tasks
        </div>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--sireen-text-muted)' }}>
          {state.tasks.filter(t => t.status === 'open').length} open tasks
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTask()}
          placeholder="Add a task..."
          className="input"
          style={{ flex: 1, fontSize: 'var(--text-sm)' }}
        />
        <button className="btn-primary" onClick={addTask} style={{ fontSize: 'var(--text-xs)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Icon name="plus" size={12} />
          Add
        </button>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {(['all', 'open', 'done'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={filter === f ? 'btn-primary' : 'btn-ghost'}
            style={{
              fontSize: 'var(--text-xs)',
              padding: '3px 8px',
              textTransform: 'capitalize',
              ...(filter === f ? {} : { border: '1px solid var(--sireen-border)' }),
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {filteredTasks.length === 0 ? (
        <EmptyState
          title="No tasks"
          message="Add a task to track your research"
        />
      ) : (
        filteredTasks.map((task) => (
          <div
            key={task.id}
            className="card animate-fade-in"
            style={{ marginBottom: 6 }}
          >
            <div className="card-body" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => dispatch({ type: 'TOGGLE_TASK', id: task.id })}
                style={{
                  width: 18, height: 18, borderRadius: 3,
                  border: `1px solid ${task.status === 'done' ? 'var(--sireen-green)' : 'var(--sireen-border)'}`,
                  background: task.status === 'done' ? 'var(--sireen-green)' : 'transparent',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {task.status === 'done' && <Icon name="check" size={12} color="#fff" />}
              </button>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 'var(--text-sm)',
                  color: task.status === 'done' ? 'var(--sireen-text-ghost)' : 'var(--sireen-text-primary)',
                  textDecoration: task.status === 'done' ? 'line-through' : 'none',
                }}>
                  {task.title}
                </div>
              </div>
              <button
                onClick={() => dispatch({ type: 'DELETE_TASK', id: task.id })}
                style={{
                  background: 'transparent', border: 'none',
                  color: 'var(--sireen-text-ghost)', cursor: 'pointer',
                  display: 'flex', padding: 2,
                }}
                title="Delete task"
              >
                <Icon name="trash" size={14} />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

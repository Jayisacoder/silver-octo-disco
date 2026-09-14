'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';

import type { TaskDTO } from '@/lib/types';

const STATUS_OPTIONS = ['TODO', 'IN_PROGRESS', 'COMPLETED'] as const;
const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH'] as const;

interface FieldErrorBody {
  error: string;
  fields?: Record<string, string>;
}

export function TaskBoard({ initialTasks }: { initialTasks: TaskDTO[] }) {
  const [tasks, setTasks] = useState<TaskDTO[]>(initialTasks);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<(typeof PRIORITY_OPTIONS)[number]>('MEDIUM');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: description.trim() === '' ? undefined : description,
          priority,
        }),
      });

      if (res.status === 201) {
        const data = (await res.json()) as { task: TaskDTO };
        setTasks((prev) => [data.task, ...prev]);
        setTitle('');
        setDescription('');
        setPriority('MEDIUM');
      } else {
        const data = (await res.json().catch(() => ({}))) as FieldErrorBody;
        const message = data.fields ? Object.values(data.fields).join(', ') : 'Could not create task.';
        setFormError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdate(
    id: string,
    changes: Partial<Pick<TaskDTO, 'status' | 'priority' | 'title' | 'description'>>,
  ) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(changes),
    });
    if (res.ok) {
      const data = (await res.json()) as { task: TaskDTO };
      setTasks((prev) => prev.map((task) => (task.id === id ? data.task : task)));
      return true;
    }
    return false;
  }

  function startEdit(task: TaskDTO) {
    setEditingId(task.id);
    setEditTitle(task.title);
    setEditDescription(task.description ?? '');
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError(null);
  }

  async function saveEdit(id: string) {
    setEditError(null);
    const ok = await handleUpdate(id, {
      title: editTitle,
      description: editDescription.trim() === '' ? null : editDescription,
    });
    if (ok) {
      setEditingId(null);
    } else {
      setEditError('Could not save changes.');
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    if (res.ok || res.status === 404) {
      setTasks((prev) => prev.filter((task) => task.id !== id));
    }
    setConfirmingDeleteId(null);
  }

  return (
    <section>
      <form
        onSubmit={handleCreate}
        style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', margin: '1rem 0' }}
      >
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Title"
          maxLength={200}
          required
        />
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Description (optional)"
          maxLength={2000}
        />
        <select
          value={priority}
          onChange={(event) => setPriority(event.target.value as (typeof PRIORITY_OPTIONS)[number])}
        >
          {PRIORITY_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <button type="submit" disabled={isSubmitting}>
          Add task
        </button>
        {formError && <p style={{ color: 'var(--error)' }}>{formError}</p>}
      </form>

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {tasks.map((task) => (
          <li
            key={task.id}
            style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '0.75rem', marginBottom: '0.5rem' }}
          >
            {editingId === task.id ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input
                  value={editTitle}
                  onChange={(event) => setEditTitle(event.target.value)}
                  placeholder="Title"
                  maxLength={200}
                />
                <textarea
                  value={editDescription}
                  onChange={(event) => setEditDescription(event.target.value)}
                  placeholder="Description (optional)"
                  maxLength={2000}
                />
                {editError && <p style={{ color: 'var(--error)' }}>{editError}</p>}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="button" onClick={() => saveEdit(task.id)}>
                    Save
                  </button>
                  <button type="button" onClick={cancelEdit}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <strong>{task.title}</strong>
                {task.description && <p>{task.description}</p>}
              </>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <label>
                Status:{' '}
                <select
                  value={task.status}
                  onChange={(event) =>
                    handleUpdate(task.id, { status: event.target.value as TaskDTO['status'] })
                  }
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Priority:{' '}
                <select
                  value={task.priority}
                  onChange={(event) =>
                    handleUpdate(task.id, { priority: event.target.value as TaskDTO['priority'] })
                  }
                >
                  {PRIORITY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              {editingId !== task.id && (
                <button type="button" onClick={() => startEdit(task)}>
                  Edit
                </button>
              )}
              {confirmingDeleteId === task.id ? (
                <>
                  <span>Delete this task?</span>
                  <button type="button" onClick={() => handleDelete(task.id)}>
                    Yes, delete
                  </button>
                  <button type="button" onClick={() => setConfirmingDeleteId(null)}>
                    Cancel
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => setConfirmingDeleteId(task.id)}>
                  Delete
                </button>
              )}
            </div>
          </li>
        ))}
        {tasks.length === 0 && <p>No tasks yet.</p>}
      </ul>
    </section>
  );
}

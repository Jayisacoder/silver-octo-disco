'use client';

import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import type { TaskDTO } from '@/lib/types';

import { ClipboardIcon, PencilIcon, PlusIcon, SearchIcon, TrashIcon, XIcon } from './icons';

const STATUS_OPTIONS = ['TODO', 'IN_PROGRESS', 'COMPLETED'] as const;
const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH'] as const;
const PRIORITY_RANK: Record<(typeof PRIORITY_OPTIONS)[number], number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

const STATUS_LABELS: Record<(typeof STATUS_OPTIONS)[number], string> = {
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
};

interface FieldErrorBody {
  error: string;
  fields?: Record<string, string>;
}

export function TaskBoard({ initialTasks }: { initialTasks: TaskDTO[] }) {
  const [tasks, setTasks] = useState<TaskDTO[]>(initialTasks);
  const [isFormOpen, setIsFormOpen] = useState(false);
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
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number] | 'ALL'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<(typeof PRIORITY_OPTIONS)[number] | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortByPriority, setSortByPriority] = useState(false);

  function openCreateForm() {
    setFormError(null);
    setIsFormOpen(true);
  }

  function closeCreateForm() {
    setIsFormOpen(false);
    setFormError(null);
    setTitle('');
    setDescription('');
    setPriority('MEDIUM');
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (title.trim() === '') {
      setFormError('Title is required.');
      return;
    }
    if (title.length > 200) {
      setFormError('Title must be 200 characters or fewer.');
      return;
    }
    if (description.length > 2000) {
      setFormError('Description must be 2000 characters or fewer.');
      return;
    }

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
        setIsFormOpen(false);
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

  function clearFilters() {
    setStatusFilter('ALL');
    setPriorityFilter('ALL');
    setSearchQuery('');
  }

  const hasActiveFilters = statusFilter !== 'ALL' || priorityFilter !== 'ALL' || searchQuery.trim() !== '';

  const visibleTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return tasks
      .filter((task) => statusFilter === 'ALL' || task.status === statusFilter)
      .filter((task) => priorityFilter === 'ALL' || task.priority === priorityFilter)
      .filter(
        (task) =>
          query === '' ||
          task.title.toLowerCase().includes(query) ||
          (task.description ?? '').toLowerCase().includes(query),
      )
      .sort((a, b) => (sortByPriority ? PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] : 0));
  }, [tasks, statusFilter, priorityFilter, searchQuery, sortByPriority]);

  return (
    <section>
      <div className="page-header" style={{ marginBottom: '1rem' }}>
        <div className="page-header__text">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Your tasks</h2>
        </div>
        <div className="page-header__actions">
          {!isFormOpen && (
            <button type="button" className="btn btn-primary" onClick={openCreateForm}>
              <PlusIcon />
              New task
            </button>
          )}
        </div>
      </div>

      {isFormOpen && (
        <form onSubmit={handleCreate} className="card fade-in" style={{ padding: '1.1rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div className="field">
              <label htmlFor="new-task-title">Title</label>
              <input
                id="new-task-title"
                className="input"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Draft the project proposal"
                maxLength={200}
                required
                autoFocus
              />
            </div>
            <div className="field">
              <label htmlFor="new-task-description">Description</label>
              <textarea
                id="new-task-description"
                className="textarea"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Optional details worth remembering later"
                maxLength={2000}
              />
            </div>
            <div className="field" style={{ maxWidth: 220 }}>
              <label htmlFor="new-task-priority">Priority</label>
              <select
                id="new-task-priority"
                className="select"
                value={priority}
                onChange={(event) => setPriority(event.target.value as (typeof PRIORITY_OPTIONS)[number])}
              >
                {PRIORITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option.charAt(0) + option.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
            {formError && <p className="field-error">{formError}</p>}
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Adding…' : 'Add task'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={closeCreateForm}>
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="toolbar">
        <div className="toolbar__search">
          <SearchIcon />
          <input
            className="input"
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search tasks…"
            aria-label="Search tasks"
          />
        </div>
        <div className="toolbar__group" role="group" aria-label="Filter by status">
          {(['ALL', ...STATUS_OPTIONS] as const).map((option) => (
            <button
              key={option}
              type="button"
              className="filter-tab"
              onClick={() => setStatusFilter(option)}
              aria-pressed={statusFilter === option}
            >
              {option === 'ALL' ? 'All' : STATUS_LABELS[option]}
            </button>
          ))}
        </div>
        <div className="toolbar__group">
          <select
            className="select"
            value={priorityFilter}
            onChange={(event) => setPriorityFilter(event.target.value as (typeof PRIORITY_OPTIONS)[number] | 'ALL')}
            aria-label="Filter by priority"
          >
            <option value="ALL">All priorities</option>
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option.charAt(0) + option.slice(1).toLowerCase()} priority
              </option>
            ))}
          </select>
          <select
            className="select"
            value={sortByPriority ? 'PRIORITY' : 'NEWEST'}
            onChange={(event) => setSortByPriority(event.target.value === 'PRIORITY')}
            aria-label="Sort tasks"
          >
            <option value="NEWEST">Newest first</option>
            <option value="PRIORITY">Priority (high to low)</option>
          </select>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">
            <ClipboardIcon size={32} />
          </div>
          <p className="empty-state__title">No tasks yet</p>
          <p className="empty-state__body">Create your first task to start tracking your work.</p>
          <button type="button" className="btn btn-primary" onClick={openCreateForm}>
            <PlusIcon />
            New task
          </button>
        </div>
      ) : visibleTasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">
            <SearchIcon size={32} />
          </div>
          <p className="empty-state__title">No matching tasks</p>
          <p className="empty-state__body">Try a different search term or clear your filters.</p>
          <button type="button" className="btn btn-secondary" onClick={clearFilters}>
            Clear filters
          </button>
        </div>
      ) : (
        <ul className="task-list">
          {visibleTasks.map((task) => (
            <li
              key={task.id}
              className={`task-card${task.status === 'COMPLETED' ? ' task-card--completed' : ''}`}
            >
              {editingId === task.id ? (
                <div className="task-edit-form">
                  <div className="field">
                    <label htmlFor={`edit-title-${task.id}`}>Title</label>
                    <input
                      id={`edit-title-${task.id}`}
                      className="input"
                      value={editTitle}
                      onChange={(event) => setEditTitle(event.target.value)}
                      placeholder="Title"
                      maxLength={200}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor={`edit-description-${task.id}`}>Description</label>
                    <textarea
                      id={`edit-description-${task.id}`}
                      className="textarea"
                      value={editDescription}
                      onChange={(event) => setEditDescription(event.target.value)}
                      placeholder="Description (optional)"
                      maxLength={2000}
                    />
                  </div>
                  {editError && <p className="field-error">{editError}</p>}
                  <div className="form-actions">
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => saveEdit(task.id)}>
                      Save
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={cancelEdit}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="task-card__top">
                  <div style={{ minWidth: 0 }}>
                    <p className="task-card__title">{task.title}</p>
                    {task.description && <p className="task-card__description">{task.description}</p>}
                  </div>
                  <div className="task-card__actions">
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon"
                      onClick={() => startEdit(task)}
                      aria-label={`Edit "${task.title}"`}
                      title="Edit task"
                    >
                      <PencilIcon />
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon"
                      onClick={() => setConfirmingDeleteId(task.id)}
                      aria-label={`Delete "${task.title}"`}
                      title="Delete task"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              )}

              <div className="task-card__meta">
                <label className="visually-hidden" htmlFor={`status-${task.id}`}>
                  Status for {task.title}
                </label>
                <select
                  id={`status-${task.id}`}
                  className={`badge-select status-${task.status}`}
                  value={task.status}
                  onChange={(event) => handleUpdate(task.id, { status: event.target.value as TaskDTO['status'] })}
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {STATUS_LABELS[option]}
                    </option>
                  ))}
                </select>

                <label className="visually-hidden" htmlFor={`priority-${task.id}`}>
                  Priority for {task.title}
                </label>
                <select
                  id={`priority-${task.id}`}
                  className={`badge-select priority-${task.priority}`}
                  value={task.priority}
                  onChange={(event) => handleUpdate(task.id, { priority: event.target.value as TaskDTO['priority'] })}
                >
                  {PRIORITY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option.charAt(0) + option.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>

              {confirmingDeleteId === task.id && (
                <div className="task-card__confirm fade-in">
                  <span>Delete this task?</span>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => handleDelete(task.id)}>
                    Yes, delete
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setConfirmingDeleteId(null)}
                  >
                    <XIcon size={14} />
                    Cancel
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {tasks.length > 0 && visibleTasks.length > 0 && hasActiveFilters && (
        <p style={{ marginTop: '0.9rem', fontSize: '0.82rem', color: 'var(--muted)' }}>
          Showing {visibleTasks.length} of {tasks.length} tasks ·{' '}
          <button
            type="button"
            onClick={clearFilters}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              color: 'var(--accent)',
              cursor: 'pointer',
              font: 'inherit',
              textDecoration: 'underline',
            }}
          >
            clear filters
          </button>
        </p>
      )}
    </section>
  );
}

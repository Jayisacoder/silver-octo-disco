import { getServerSession } from 'next-auth/next';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { TaskDTO } from '@/lib/types';

import { SignInButton, SignOutButton } from './auth-buttons';
import { TaskBoard } from './task-board';

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return (
      <main className="page">
        <div className="signin-screen">
          <div className="card signin-card">
            <h1>Task Manager</h1>
            <p>Sign in with Google to view and manage your tasks.</p>
            <SignInButton />
          </div>
        </div>
      </main>
    );
  }

  const tasks = await prisma.task.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  });

  // Dates aren't JSON; convert to ISO strings for the client component / API
  // response shape (see src/lib/types.ts).
  const initialTasks: TaskDTO[] = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  }));

  const stats = {
    total: initialTasks.length,
    todo: initialTasks.filter((t) => t.status === 'TODO').length,
    inProgress: initialTasks.filter((t) => t.status === 'IN_PROGRESS').length,
    completed: initialTasks.filter((t) => t.status === 'COMPLETED').length,
  };

  return (
    <main className="page">
      <header className="page-header">
        <div className="page-header__text">
          <h1>Task Manager</h1>
          <p>Signed in as {session.user.email ?? session.user.name ?? 'you'}</p>
        </div>
        <div className="page-header__actions">
          <SignOutButton />
        </div>
      </header>

      <section className="stats" aria-label="Task summary">
        <div className="stat-card">
          <div className="stat-card__value">{stats.total}</div>
          <div className="stat-card__label">Total</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__value">{stats.todo}</div>
          <div className="stat-card__label">To do</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__value">{stats.inProgress}</div>
          <div className="stat-card__label">In progress</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__value">{stats.completed}</div>
          <div className="stat-card__label">Completed</div>
        </div>
      </section>

      <TaskBoard initialTasks={initialTasks} />
    </main>
  );
}

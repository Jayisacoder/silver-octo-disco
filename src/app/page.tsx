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
      <main style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: 720, margin: '0 auto' }}>
        <h1>Task Manager</h1>
        <p>Sign in with Google to view and manage your tasks.</p>
        <SignInButton />
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

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: 720, margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Task Manager</h1>
        <SignOutButton />
      </header>
      <p>Signed in as {session.user.email ?? session.user.name ?? 'you'}</p>
      <TaskBoard initialTasks={initialTasks} />
    </main>
  );
}

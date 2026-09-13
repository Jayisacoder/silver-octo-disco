import type { TaskPriority, TaskStatus } from '@prisma/client';

// Client-safe, JSON-serializable shape of a Task (Prisma's `Task` has `Date`
// objects for createdAt/updatedAt; this is what actually crosses the
// server-component -> client-component boundary and the JSON API responses).
export interface TaskDTO {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: string;
  updatedAt: string;
}

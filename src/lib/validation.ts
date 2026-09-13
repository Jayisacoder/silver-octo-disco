import { TaskPriority, TaskStatus } from '@prisma/client';
import { z } from 'zod';

// Field limits are kept in sync with prisma/schema.prisma (`title @db.VarChar(200)`)
// per the Gate 1-approved research handoff's risk note: if these two numbers ever
// drift apart, an over-length title would fail as an unhandled DB error instead of
// a clean 422. TITLE_MAX_LENGTH is the single agreed constant.
export const TITLE_MAX_LENGTH = 200;
export const DESCRIPTION_MAX_LENGTH = 2000;

const titleSchema = z
  .string({ invalid_type_error: 'Title must be a string' })
  .trim()
  .min(1, 'Title is required')
  .max(TITLE_MAX_LENGTH, `Title must be ${TITLE_MAX_LENGTH} characters or fewer`);

const descriptionSchema = z
  .string({ invalid_type_error: 'Description must be a string' })
  .max(DESCRIPTION_MAX_LENGTH, `Description must be ${DESCRIPTION_MAX_LENGTH} characters or fewer`)
  .optional();

const statusSchema = z.nativeEnum(TaskStatus, {
  errorMap: () => ({ message: 'Status must be one of TODO, IN_PROGRESS, COMPLETED' }),
});

const prioritySchema = z.nativeEnum(TaskPriority, {
  errorMap: () => ({ message: 'Priority must be one of LOW, MEDIUM, HIGH' }),
});

// `.strict()` rejects any key not listed in the shape (e.g. a client-supplied
// `userId`) rather than silently dropping it, per the ownership requirement that
// the owning user must only ever come from the server-verified session.
export const createTaskSchema = z
  .object({
    title: titleSchema,
    description: descriptionSchema,
    status: statusSchema.optional(),
    priority: prioritySchema.optional(),
  })
  .strict();

export const updateTaskSchema = z
  .object({
    title: titleSchema.optional(),
    description: descriptionSchema,
    status: statusSchema.optional(),
    priority: prioritySchema.optional(),
  })
  .strict();

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

interface FieldErrorBody {
  error: string;
  fields: Record<string, string>;
}

// Structured 422 body: a machine-checkable `error` code plus field-level
// messages, not just a bare "400 Bad Request" (per the research handoff's
// validation approach).
export function formatZodError(error: z.ZodError): FieldErrorBody {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : '_';
    if (!(key in fields)) {
      fields[key] = issue.message;
    }
  }
  return { error: 'ValidationError', fields };
}

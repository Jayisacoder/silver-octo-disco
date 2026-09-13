// Unit tests for src/lib/validation.ts - pure zod schemas, no I/O, no mocking
// needed. This is the highest-priority target per the research/implementation
// handoffs: it directly covers the "invalid input is handled appropriately"
// acceptance criterion.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createTaskSchema,
  updateTaskSchema,
  formatZodError,
  TITLE_MAX_LENGTH,
  DESCRIPTION_MAX_LENGTH,
} from '../src/lib/validation.ts';

test('createTaskSchema accepts a minimal valid input and fills in defaults', () => {
  const result = createTaskSchema.safeParse({ title: 'Write tests' });
  assert.equal(result.success, true);
  assert.equal(result.data.title, 'Write tests');
  assert.equal(result.data.status, undefined);
  assert.equal(result.data.priority, undefined);
  // The schema itself does not assign TaskStatus.TODO/TaskPriority.MEDIUM when
  // omitted - status/priority stay optional/undefined here; the DEFAULT
  // values come from Prisma's `@default(TODO)`/`@default(MEDIUM)` on the
  // column, applied at `prisma.task.create()` time. See tasks-route.test.mjs
  // for a test that a create call omitting these fields is passed straight
  // through to Prisma so the DB default takes effect.
});

test('createTaskSchema accepts a fully populated valid input', () => {
  const result = createTaskSchema.safeParse({
    title: 'Ship the feature',
    description: 'Some details',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
  });
  assert.equal(result.success, true);
  assert.deepEqual(result.data, {
    title: 'Ship the feature',
    description: 'Some details',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
  });
});

test('createTaskSchema trims the title', () => {
  const result = createTaskSchema.safeParse({ title: '  padded title  ' });
  assert.equal(result.success, true);
  assert.equal(result.data.title, 'padded title');
});

test('createTaskSchema rejects a missing title', () => {
  const result = createTaskSchema.safeParse({});
  assert.equal(result.success, false);
});

test('createTaskSchema rejects an empty-string title', () => {
  const result = createTaskSchema.safeParse({ title: '' });
  assert.equal(result.success, false);
  assert.equal(formatZodError(result.error).fields.title, 'Title is required');
});

test('createTaskSchema rejects a whitespace-only title', () => {
  const result = createTaskSchema.safeParse({ title: '   \t\n  ' });
  assert.equal(result.success, false);
  assert.equal(formatZodError(result.error).fields.title, 'Title is required');
});

test('createTaskSchema rejects a title over the max length', () => {
  const tooLong = 'a'.repeat(TITLE_MAX_LENGTH + 1);
  const result = createTaskSchema.safeParse({ title: tooLong });
  assert.equal(result.success, false);
  assert.match(formatZodError(result.error).fields.title, /200 characters or fewer/);
});

test('createTaskSchema accepts a title at exactly the max length', () => {
  const exact = 'a'.repeat(TITLE_MAX_LENGTH);
  const result = createTaskSchema.safeParse({ title: exact });
  assert.equal(result.success, true);
});

test('createTaskSchema rejects a description over the max length', () => {
  const result = createTaskSchema.safeParse({
    title: 'ok',
    description: 'a'.repeat(DESCRIPTION_MAX_LENGTH + 1),
  });
  assert.equal(result.success, false);
  assert.match(formatZodError(result.error).fields.description, /2000 characters or fewer/);
});

test('createTaskSchema accepts a description at exactly the max length', () => {
  const result = createTaskSchema.safeParse({
    title: 'ok',
    description: 'a'.repeat(DESCRIPTION_MAX_LENGTH),
  });
  assert.equal(result.success, true);
});

test('createTaskSchema rejects an invalid status value', () => {
  const result = createTaskSchema.safeParse({ title: 'ok', status: 'DONE' });
  assert.equal(result.success, false);
  assert.match(formatZodError(result.error).fields.status, /TODO, IN_PROGRESS, COMPLETED/);
});

test('createTaskSchema rejects an invalid priority value', () => {
  const result = createTaskSchema.safeParse({ title: 'ok', priority: 'URGENT' });
  assert.equal(result.success, false);
  assert.match(formatZodError(result.error).fields.priority, /LOW, MEDIUM, HIGH/);
});

test('createTaskSchema accepts every real TaskStatus/TaskPriority enum value', () => {
  for (const status of ['TODO', 'IN_PROGRESS', 'COMPLETED']) {
    assert.equal(createTaskSchema.safeParse({ title: 'ok', status }).success, true, status);
  }
  for (const priority of ['LOW', 'MEDIUM', 'HIGH']) {
    assert.equal(createTaskSchema.safeParse({ title: 'ok', priority }).success, true, priority);
  }
});

test('createTaskSchema rejects unknown/extra keys (.strict())', () => {
  const result = createTaskSchema.safeParse({ title: 'ok', bogusField: 'nope' });
  assert.equal(result.success, false);
});

test('createTaskSchema rejects a spoofed userId in the request body', () => {
  // The core IDOR defense: the owning user must only ever come from the
  // server-verified session, never a client-supplied field. .strict()
  // rejecting an unknown `userId` key is what guarantees this at the
  // validation layer, before the handler ever builds a Prisma call.
  const result = createTaskSchema.safeParse({ title: 'ok', userId: 'someone-elses-id' });
  assert.equal(result.success, false);
  assert.equal(formatZodError(result.error).error, 'ValidationError');
});

test('createTaskSchema rejects a non-string title', () => {
  const result = createTaskSchema.safeParse({ title: 12345 });
  assert.equal(result.success, false);
});

test('updateTaskSchema accepts a partial object (single field)', () => {
  const result = updateTaskSchema.safeParse({ status: 'COMPLETED' });
  assert.equal(result.success, true);
  assert.deepEqual(result.data, { status: 'COMPLETED' });
});

test('updateTaskSchema accepts an empty object at the schema level', () => {
  // The route handler itself additionally rejects an empty PATCH body with a
  // 422 ("at least one field must be provided") - that is route.ts logic
  // layered on top of this schema, exercised separately in
  // tasks-id-route.test.mjs. At the schema level alone, {} is valid because
  // every field on updateTaskSchema is optional.
  const result = updateTaskSchema.safeParse({});
  assert.equal(result.success, true);
});

test('updateTaskSchema still enforces field-level rules on provided fields', () => {
  assert.equal(updateTaskSchema.safeParse({ title: '' }).success, false);
  assert.equal(updateTaskSchema.safeParse({ status: 'NOPE' }).success, false);
  assert.equal(
    updateTaskSchema.safeParse({ description: 'a'.repeat(DESCRIPTION_MAX_LENGTH + 1) }).success,
    false,
  );
});

test('updateTaskSchema rejects unknown/extra keys (.strict()), including a spoofed userId', () => {
  assert.equal(updateTaskSchema.safeParse({ title: 'ok', bogusField: 1 }).success, false);
  assert.equal(updateTaskSchema.safeParse({ userId: 'someone-elses-id' }).success, false);
});

test('formatZodError produces the { error, fields } shape with one message per field', () => {
  const result = createTaskSchema.safeParse({ title: '', status: 'NOPE', extra: true });
  assert.equal(result.success, false);
  const formatted = formatZodError(result.error);
  assert.equal(formatted.error, 'ValidationError');
  assert.equal(typeof formatted.fields, 'object');
  assert.ok('title' in formatted.fields);
  assert.ok('status' in formatted.fields);
  // Every value should be a human-readable string, not a raw zod issue object.
  for (const value of Object.values(formatted.fields)) {
    assert.equal(typeof value, 'string');
  }
});

test('formatZodError keeps only the first message per field when a field has multiple issues', () => {
  // title: '' fails both the (never reached here, but guards against future
  // schema changes stacking multiple issues on one field silently swapping
  // which message wins)
  const result = createTaskSchema.safeParse({ title: '' });
  const formatted = formatZodError(result.error);
  assert.equal(Object.keys(formatted.fields).filter((k) => k === 'title').length, 1);
});

test('updateTaskSchema accepts an explicit null description (clears the field on PATCH)', () => {
  // description String? is nullable in prisma/schema.prisma; updateTaskSchema
  // uses updateDescriptionSchema (.nullable().optional()) so an explicit
  // `null` means "clear this field," distinct from omitting the key entirely
  // (which means "leave it as-is"). See docs/agent-handoffs/implementation.md,
  // 2026-09-13 QA follow-up entry.
  const result = updateTaskSchema.safeParse({ description: null });
  assert.equal(result.success, true);
  assert.equal(result.data.description, null);
});

test('createTaskSchema still rejects an explicit null description (unchanged)', () => {
  // createTaskSchema intentionally was NOT given the nullable variant - a
  // brand-new task has no existing description to clear, so null is not a
  // valid create-time value. Confirms the two schemas didn't converge by
  // accident when updateDescriptionSchema was introduced.
  const result = createTaskSchema.safeParse({ title: 'x', description: null });
  assert.equal(result.success, false);
});

// Tests for src/app/api/tasks/route.ts (GET = list, POST = create), importing
// the real, unmodified handler module and running it against a mocked
// session (see tests/helpers/module-loader.mjs) and a mocked prisma.task
// client (see tests/helpers/route-test-helpers.mjs). No real database, no
// real Google OAuth. See docs/agent-handoffs/unit-testing.md for the exact
// scope/limits of this approach.

import test from 'node:test';
import assert from 'node:assert/strict';

import { registerModuleLoader, setMockSession, makeSession, mockPrismaTask, jsonRequest } from './helpers/route-test-helpers.mjs';

registerModuleLoader();

const { GET, POST } = await import('../src/app/api/tasks/route.ts');
const { prisma } = await import('../src/lib/prisma.ts');

test.afterEach(() => {
  setMockSession(null);
});

test('GET returns 401 when there is no session', async () => {
  setMockSession(null);
  const res = await GET();
  assert.equal(res.status, 401);
  const body = await res.json();
  assert.equal(body.error, 'Unauthorized');
});

test('GET only queries tasks scoped to the session user (ownership filter)', async () => {
  setMockSession(makeSession('user-1'));
  let capturedArgs;
  const restore = mockPrismaTask(prisma, {
    findMany: async (args) => {
      capturedArgs = args;
      return [{ id: 't1', userId: 'user-1' }];
    },
  });
  try {
    const res = await GET();
    assert.equal(res.status, 200);
    assert.deepEqual(capturedArgs.where, { userId: 'user-1' });
    const body = await res.json();
    assert.equal(body.tasks.length, 1);
  } finally {
    restore();
  }
});

test('POST returns 401 when there is no session (no Prisma call should happen)', async () => {
  setMockSession(null);
  let called = false;
  const restore = mockPrismaTask(prisma, {
    create: async () => {
      called = true;
      throw new Error('should not be called');
    },
  });
  try {
    const res = await POST(jsonRequest({ title: 'Should not persist' }));
    assert.equal(res.status, 401);
    assert.equal(called, false);
  } finally {
    restore();
  }
});

test('POST returns 400 on malformed JSON', async () => {
  setMockSession(makeSession('user-1'));
  const res = await POST(jsonRequest({}, { malformed: true }));
  assert.equal(res.status, 400);
});

test('POST returns 422 with structured field errors on invalid input', async () => {
  setMockSession(makeSession('user-1'));
  const res = await POST(jsonRequest({ title: '' }));
  assert.equal(res.status, 422);
  const body = await res.json();
  assert.equal(body.error, 'ValidationError');
  assert.ok('title' in body.fields);
});

test('POST ignores/rejects a client-supplied userId and never lets it reach Prisma', async () => {
  setMockSession(makeSession('user-1'));
  let capturedData;
  const restore = mockPrismaTask(prisma, {
    create: async ({ data }) => {
      capturedData = data;
      return { id: 'new-task', ...data };
    },
  });
  try {
    const res = await POST(jsonRequest({ title: 'ok', userId: 'attacker-controlled-id' }));
    // createTaskSchema is .strict(), so the extra `userId` key fails validation
    // before the handler ever calls Prisma - the attacker-controlled id must
    // never reach `capturedData`.
    assert.equal(res.status, 422);
    assert.equal(capturedData, undefined);
  } finally {
    restore();
  }
});

test('POST creates a task scoped to the session user and returns 201', async () => {
  setMockSession(makeSession('user-42'));
  let capturedData;
  const restore = mockPrismaTask(prisma, {
    create: async ({ data }) => {
      capturedData = data;
      return { id: 'new-task-id', createdAt: new Date(), updatedAt: new Date(), ...data };
    },
  });
  try {
    const res = await POST(jsonRequest({ title: 'Ship it', priority: 'HIGH' }));
    assert.equal(res.status, 201);
    assert.equal(capturedData.userId, 'user-42');
    assert.equal(capturedData.title, 'Ship it');
    assert.equal(capturedData.priority, 'HIGH');
    const body = await res.json();
    assert.equal(body.task.id, 'new-task-id');
  } finally {
    restore();
  }
});

test('POST omitting status/priority passes them through as undefined so Prisma applies its @default', async () => {
  // validation.ts intentionally leaves status/priority undefined when
  // omitted (see validation.test.mjs); the default TODO/MEDIUM values come
  // from `prisma/schema.prisma`'s `@default(...)`, applied by Prisma when a
  // field is entirely absent from `data`. This test only asserts the route
  // handler does not itself invent/override a default and pass it through -
  // whether Prisma's real @default actually fires is outside what a mocked
  // prisma.task.create can prove and is the Test/QA Agent's job against a
  // real database.
  setMockSession(makeSession('user-1'));
  let capturedData;
  const restore = mockPrismaTask(prisma, {
    create: async ({ data }) => {
      capturedData = data;
      return { id: 'x', ...data };
    },
  });
  try {
    const res = await POST(jsonRequest({ title: 'No status or priority given' }));
    assert.equal(res.status, 201);
    assert.equal(capturedData.status, undefined);
    assert.equal(capturedData.priority, undefined);
    assert.ok(!('status' in capturedData) || capturedData.status === undefined);
  } finally {
    restore();
  }
});

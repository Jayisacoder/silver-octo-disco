// Tests for src/app/api/tasks/[id]/route.ts (GET/PATCH/DELETE one task),
// same approach as tasks-route.test.mjs: real handler module, mocked
// session, mocked prisma.task client. See
// docs/agent-handoffs/unit-testing.md for scope/limits.

import test from 'node:test';
import assert from 'node:assert/strict';

import { registerModuleLoader, setMockSession, makeSession, mockPrismaTask } from './helpers/route-test-helpers.mjs';

registerModuleLoader();

const { GET, PATCH, DELETE } = await import('../src/app/api/tasks/[id]/route.ts');
const { prisma } = await import('../src/lib/prisma.ts');

function patchRequest(body) {
  return new Request('http://localhost/api/tasks/t1', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function malformedPatchRequest() {
  return new Request('http://localhost/api/tasks/t1', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: '{ not valid json',
  });
}

const ctx = { params: { id: 't1' } };

test.afterEach(() => {
  setMockSession(null);
});

// ---------- GET ----------

test('GET /tasks/:id returns 401 when there is no session', async () => {
  setMockSession(null);
  const res = await GET(new Request('http://localhost/api/tasks/t1'), ctx);
  assert.equal(res.status, 401);
});

test('GET /tasks/:id filters by { id, userId } in a single call', async () => {
  setMockSession(makeSession('user-1'));
  let capturedArgs;
  const restore = mockPrismaTask(prisma, {
    findFirst: async (args) => {
      capturedArgs = args;
      return { id: 't1', userId: 'user-1', title: 'x' };
    },
  });
  try {
    const res = await GET(new Request('http://localhost/api/tasks/t1'), ctx);
    assert.equal(res.status, 200);
    assert.deepEqual(capturedArgs.where, { id: 't1', userId: 'user-1' });
  } finally {
    restore();
  }
});

test('GET /tasks/:id returns 404 (not 403) when the row is missing or owned by someone else', async () => {
  setMockSession(makeSession('user-1'));
  const restore = mockPrismaTask(prisma, {
    findFirst: async () => null, // same result whether it doesn't exist or belongs to user-2
  });
  try {
    const res = await GET(new Request('http://localhost/api/tasks/t1'), ctx);
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.error, 'NotFound');
  } finally {
    restore();
  }
});

// ---------- PATCH ----------

test('PATCH /tasks/:id returns 401 when there is no session', async () => {
  setMockSession(null);
  const res = await PATCH(patchRequest({ title: 'new title' }), ctx);
  assert.equal(res.status, 401);
});

test('PATCH /tasks/:id returns 400 on malformed JSON', async () => {
  setMockSession(makeSession('user-1'));
  const res = await PATCH(malformedPatchRequest(), ctx);
  assert.equal(res.status, 400);
});

test('PATCH /tasks/:id returns 422 on invalid field values', async () => {
  setMockSession(makeSession('user-1'));
  const res = await PATCH(patchRequest({ status: 'NOT_A_STATUS' }), ctx);
  assert.equal(res.status, 422);
});

test('PATCH /tasks/:id rejects a spoofed userId in the body (.strict())', async () => {
  setMockSession(makeSession('user-1'));
  let called = false;
  const restore = mockPrismaTask(prisma, {
    updateMany: async () => {
      called = true;
      return { count: 1 };
    },
  });
  try {
    const res = await PATCH(patchRequest({ userId: 'attacker-id' }), ctx);
    assert.equal(res.status, 422);
    assert.equal(called, false);
  } finally {
    restore();
  }
});

test('PATCH /tasks/:id returns 422 when the body has no fields at all', async () => {
  setMockSession(makeSession('user-1'));
  const res = await PATCH(patchRequest({}), ctx);
  assert.equal(res.status, 422);
  const body = await res.json();
  assert.equal(body.error, 'ValidationError');
});

test('PATCH /tasks/:id updates using a single compound { id, userId } where clause', async () => {
  setMockSession(makeSession('user-1'));
  let updateArgs;
  let findArgs;
  const restore = mockPrismaTask(prisma, {
    updateMany: async (args) => {
      updateArgs = args;
      return { count: 1 };
    },
    findFirst: async (args) => {
      findArgs = args;
      return { id: 't1', userId: 'user-1', title: 'updated' };
    },
  });
  try {
    const res = await PATCH(patchRequest({ title: 'updated' }), ctx);
    assert.equal(res.status, 200);
    assert.deepEqual(updateArgs.where, { id: 't1', userId: 'user-1' });
    assert.deepEqual(updateArgs.data, { title: 'updated' });
    // the follow-up read that returns the current state is *also* ownership-scoped
    assert.deepEqual(findArgs.where, { id: 't1', userId: 'user-1' });
  } finally {
    restore();
  }
});

test('PATCH /tasks/:id returns 404 (not 500) when zero rows match (missing or not-yours)', async () => {
  setMockSession(makeSession('user-1'));
  const restore = mockPrismaTask(prisma, {
    updateMany: async () => ({ count: 0 }),
  });
  try {
    const res = await PATCH(patchRequest({ title: 'updated' }), ctx);
    assert.equal(res.status, 404);
  } finally {
    restore();
  }
});

test('PATCH /tasks/:id returns a structured 500 (not an uncaught throw) when Prisma fails unexpectedly', async () => {
  // src/app/api/tasks/[id]/route.ts wraps the updateMany/findFirst pair in a
  // try/catch that returns internalErrorResponse() (src/lib/api-errors.ts)
  // on any thrown error, instead of letting a real DB failure fall through
  // to Next's generic unshaped 500. See docs/agent-handoffs/implementation.md,
  // 2026-09-13 QA follow-up entry.
  setMockSession(makeSession('user-1'));
  const restore = mockPrismaTask(prisma, {
    updateMany: async () => {
      throw new Error('simulated database failure');
    },
  });
  try {
    const res = await PATCH(patchRequest({ title: 'updated' }), ctx);
    assert.equal(res.status, 500);
    const body = await res.json();
    assert.deepEqual(body, { error: 'InternalError' });
  } finally {
    restore();
  }
});

// ---------- DELETE ----------

test('DELETE /tasks/:id returns 401 when there is no session', async () => {
  setMockSession(null);
  const res = await DELETE(new Request('http://localhost/api/tasks/t1', { method: 'DELETE' }), ctx);
  assert.equal(res.status, 401);
});

test('DELETE /tasks/:id deletes using a compound { id, userId } where clause and returns 204', async () => {
  setMockSession(makeSession('user-1'));
  let capturedArgs;
  const restore = mockPrismaTask(prisma, {
    deleteMany: async (args) => {
      capturedArgs = args;
      return { count: 1 };
    },
  });
  try {
    const res = await DELETE(new Request('http://localhost/api/tasks/t1', { method: 'DELETE' }), ctx);
    assert.equal(res.status, 204);
    assert.deepEqual(capturedArgs.where, { id: 't1', userId: 'user-1' });
  } finally {
    restore();
  }
});

test('DELETE /tasks/:id is idempotent-safe: a nonexistent/already-deleted id is a 404, not a 500', async () => {
  setMockSession(makeSession('user-1'));
  const restore = mockPrismaTask(prisma, {
    deleteMany: async () => ({ count: 0 }),
  });
  try {
    const res = await DELETE(new Request('http://localhost/api/tasks/t1', { method: 'DELETE' }), ctx);
    assert.equal(res.status, 404);
  } finally {
    restore();
  }
});

test('DELETE /tasks/:id owned by a different user is a 404, identical to "does not exist"', async () => {
  setMockSession(makeSession('user-2'));
  let capturedArgs;
  const restore = mockPrismaTask(prisma, {
    deleteMany: async (args) => {
      capturedArgs = args;
      return { count: 0 }; // task t1 belongs to user-1, not user-2, so nothing matches
    },
  });
  try {
    const res = await DELETE(new Request('http://localhost/api/tasks/t1', { method: 'DELETE' }), ctx);
    assert.equal(res.status, 404);
    assert.deepEqual(capturedArgs.where, { id: 't1', userId: 'user-2' });
  } finally {
    restore();
  }
});

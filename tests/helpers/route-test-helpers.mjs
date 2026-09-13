// Shared test utilities for exercising the real Route Handler modules
// (src/app/api/tasks/route.ts, src/app/api/tasks/[id]/route.ts) directly
// under `node --test`, using the loader in ./module-loader.mjs.
//
// See docs/agent-handoffs/unit-testing.md for exactly what this does and
// does not prove: it verifies the route handlers' own status-code/branching
// logic and the exact Prisma `where`/`data` shapes they construct, using a
// mocked session (no real Google OAuth) and a mocked `prisma.task` client (no
// real database) - it does NOT prove end-to-end ownership enforcement
// against a real isolated database with real seeded sessions, which is the
// independent Test/QA Agent's job.

import { register } from 'node:module';

let registered = false;

export function registerModuleLoader() {
  if (registered) return;
  register('./module-loader.mjs', import.meta.url);
  registered = true;
}

/** Sets the fake "logged in" session the mocked next-auth/next reads. Pass null/undefined for "no session". */
export function setMockSession(session) {
  globalThis.__UNIT_TEST_SESSION__ = session ?? null;
}

export function makeSession(userId) {
  return { user: { id: userId } };
}

/**
 * Replaces methods on the shared `prisma` singleton's `task` delegate with
 * node:test mock functions, and returns a restore() function that puts the
 * originals back. This is the "lightly mocked Prisma client" option the
 * research handoff explicitly names for the Unit Testing Agent.
 */
export function mockPrismaTask(prisma, implementations) {
  const original = { ...prisma.task };
  Object.assign(prisma.task, implementations);
  return function restore() {
    Object.assign(prisma.task, original);
  };
}

/** Builds a Request with a JSON body, or a deliberately malformed body. */
export function jsonRequest(body, { malformed = false } = {}) {
  const init = {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
  };
  if (malformed) {
    return new Request('http://localhost/api/tasks', { ...init, body: '{ not valid json' });
  }
  return new Request('http://localhost/api/tasks', { ...init, body: JSON.stringify(body) });
}

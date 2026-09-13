# Task

Author focused unit tests for the Gate 1-approved, now-implemented Task Management feature: primarily `src/lib/validation.ts` (pure, no I/O), and route handler logic in `src/app/api/tasks/route.ts` / `src/app/api/tasks/[id]/route.ts` to whatever extent is honestly achievable with no live Postgres database and no real Google OAuth credentials in this environment. Report honestly on what could and couldn't be verified; do not fix any application bug found, only report it.

## Input Received

- `docs/agent-handoffs/research.md` (Gate 1-approved architecture): Route Handlers, compound `{ id, userId }` ownership filter in a single Prisma call, identical 404 for "not found" and "not yours", zod `.strict()` validation with structured 422s, and an explicit assignment of "the isolated test database **or a lightly mocked Prisma client**" to this agent for validation/ownership-filter/default-value tests, while the independent Test/QA Agent owns true end-to-end tests against a real database with seeded sessions.
- `docs/agent-handoffs/implementation.md`: what was actually built — `src/lib/validation.ts` (`createTaskSchema`/`updateTaskSchema`, both `.strict()`, `TITLE_MAX_LENGTH`/`DESCRIPTION_MAX_LENGTH`, `formatZodError`), `src/app/api/tasks/route.ts` (GET/POST), `src/app/api/tasks/[id]/route.ts` (GET/PATCH/DELETE using `updateMany`/`deleteMany` for the ownership-scoped writes), `src/lib/auth.ts` (NextAuth v4, database session strategy), `src/lib/prisma.ts` (singleton).
- Explicit environment constraint from the Lead Agent: `DATABASE_URL` is empty, no real Google OAuth credentials exist, `prisma db push` cannot be run against a real database here — tests had to be designed around that rather than assuming a reachable DB.
- Existing tooling: `node --test tests/**/*.test.mjs` via `npm run test:unit`/`npm test` (Node 22.18.0), which already automatically includes any new `tests/**/*.test.mjs` file.

## Work Completed

1. **`tests/validation.test.mjs` (22 tests) — the priority target, pure, no mocking.** Directly imports `src/lib/validation.ts` (Node 22.18 strips TS type syntax natively, no build step needed for a file with no path-alias imports). Covers: minimal valid input + confirms `status`/`priority` are left `undefined` (not defaulted) by the schema itself when omitted; a fully populated valid input; title trimming; missing/empty/whitespace-only title rejection; title over/at the 200-char boundary; description over/at the 2000-char boundary; every real `TaskStatus`/`TaskPriority` enum value accepted, invalid values rejected; `.strict()` rejecting unknown keys, specifically a spoofed `userId`; non-string title rejection; `updateTaskSchema` accepting a partial object and still enforcing per-field rules and `.strict()`; `formatZodError`'s `{ error, fields }` shape and one-message-per-field behavior.
2. **`tests/tasks-route.test.mjs` (8 tests) and `tests/tasks-id-route.test.mjs` (14 tests) — route handler logic, against the real, unmodified handler modules.** Rather than declaring this out of reach immediately, I built a small test-only harness (`tests/helpers/module-loader.mjs`, a Node `module.register()` ESM loader hook, and `tests/helpers/route-test-helpers.mjs`) that resolves the `@/*` path alias and extensionless first-party/third-party imports so `src/app/api/tasks/route.ts` and `src/app/api/tasks/[id]/route.ts` can be `import()`-ed directly, unmodified, under plain `node --test` (no Next bundler in the loop). This let me exercise the **real** handler code — real zod validation, real branching, the real exact Prisma `where`/`data` shapes it builds — for:
   - 401 when there's no session, on every verb, checked before any Prisma call runs (asserted via a mock that would throw/flag if called).
   - The exact `where` clause Prisma receives: `{ userId }` on list, `{ id, userId }` on get/update/delete, always in one call.
   - 404 (never 403) when `findFirst` returns null / `updateMany`/`deleteMany` report `count: 0` — for both "doesn't exist" and "exists but owned by someone else" (simulated by making the mock return zero matches for a task belonging to a different `userId`).
   - 400 on malformed JSON; 422 with `{ error, fields }` on invalid input; a spoofed `userId` in the POST/PATCH body rejected by `.strict()` before it ever reaches the mocked Prisma call (asserted the mock was never invoked with attacker data).
   - 201/200/204 on success; PATCH's empty-body 422; PATCH's re-read after `updateMany` also carrying the same ownership filter.
   - `status`/`priority` omitted on create are passed through as `undefined` (not invented) so Prisma's own `@default(TODO)`/`@default(MEDIUM)` is what would apply — see the caveat in "Problems or Risks" about what this does and doesn't prove.

## Files Changed

- `tests/validation.test.mjs` (new)
- `tests/tasks-route.test.mjs` (new)
- `tests/tasks-id-route.test.mjs` (new)
- `tests/helpers/module-loader.mjs` (new) — test-only Node ESM loader hook, heavily commented with *why* each resolution shim exists
- `tests/helpers/route-test-helpers.mjs` (new) — shared mock/session/request-building utilities
- `docs/agent-handoffs/unit-testing.md` (this file)
- Not modified: `tests/basic-config.test.mjs`, anything under `src/**`, `prisma/schema.prisma`, `package.json`, any other agent's handoff.

## Decisions Made

- **Mocked the `next-auth/next` module itself, not just Prisma.** The real `getServerSession(authOptions)` (App Router, no-arg form) reads request context via `next/headers`'s `AsyncLocalStorage`, which only exists inside a live Next.js request — calling it directly from a plain Node script throws `` `headers` was called outside a request scope`` (confirmed by reproducing it before deciding to mock). There is no seam in `route.ts` itself for injecting a session (it calls `getServerSession(authOptions)` directly, per `implementation.md`), and I cannot add one since `src/**` is off-limits to this agent. So `tests/helpers/module-loader.mjs` substitutes the whole `next-auth/next` module with a small fake whose `getServerSession()` returns a test-controlled value (`globalThis.__UNIT_TEST_SESSION__`). This is the same category of substitution research.md sanctioned ("a small `getSession(req)` seam... swappable in tests"), applied at the module-resolution boundary instead of an in-code seam, since no in-code seam exists and I'm not allowed to add one.
- **Two more resolution/interop shims were needed purely to let Node load unmodified TypeScript route/auth modules without Next's bundler** (documented at length in the loader file itself): mapping `@/*` back to `src/*`, retrying extensionless first-party (`.ts`) and third-party (`.js`) imports, and fixing a Node-ESM-specific CJS default-export double-wrapping quirk for `next-auth/providers/google` and `@next-auth/prisma-adapter` (verified this is a Node runtime/interop gap, not an app bug, by confirming `require()`-ing the same packages returns the correct shape — see the file's comments). None of this changes what `src/lib/auth.ts` or the route handlers actually do; it only lets their real, unmodified code run under `node --test`.
- **Mocked `prisma.task.*` methods directly on the shared singleton** (`src/lib/prisma.ts`'s exported `prisma` object), per research.md's explicitly sanctioned "lightly mocked Prisma client" option — `mockPrismaTask()` swaps methods in and restores the originals after each test via `try/finally`.
- **Did not touch `tests/basic-config.test.mjs`** — nothing in this work changed schema/scripts, so its assumptions still hold; confirmed all its tests still pass in the full run.

## Tests/Verification

- `npm run test:unit` — **47/47 tests pass, exit code 0** (3 pre-existing `basic-config.test.mjs` + 22 `validation.test.mjs` + 8 `tasks-route.test.mjs` + 14 `tasks-id-route.test.mjs`). Runs in well under a second, no network access, no interactive input, does not hang.
- `npm test` — same command, same result (47/47, exit 0).
- **Sanity-checked the harness is not vacuous**: temporarily broke one assertion in `validation.test.mjs` (flipped an expected `false` to `true`), reran `npm run test:unit`, confirmed it failed (`not ok`, exit code 1, `# fail 1`), then restored the correct assertion and confirmed a clean 47/47 pass again. This confirms the suite genuinely detects regressions rather than passing by construction.
- Did not run anything against a live database or real Google OAuth — none exists in this environment, consistent with the stated constraint.

## Problems or Risks

- **No bug found in `src/lib/validation.ts` or the route handlers.** Every case tested behaved exactly as `research.md`/`implementation.md` describe (correct status codes, correct compound `where` shapes, correct rejection of a spoofed `userId`, identical 404 for "missing" vs. "not yours"). Nothing here needs routing back to the Developer Agent.
- **What the mocked-Prisma route tests do *not* prove** (this is the honest boundary, not a gap I'm hiding): that Prisma's real `@default(TODO)`/`@default(MEDIUM)` actually fires against a real column when `status`/`priority` are omitted (I only proved the route handler passes them through as `undefined` rather than inventing a value — the DB-level default itself needs a real database); that `getServerSession`'s real database-strategy lookup against a real seeded `Session` row correctly authenticates/rejects; that a real cross-user IDOR attempt against a real second seeded user's row is blocked (I simulated "belongs to another user" purely by having the mock report zero matches — the real ownership filter's SQL was never executed against real rows); that `PrismaAdapter`/`GoogleProvider` behave correctly with real credentials (both were interop-shimmed at the test-tooling level specifically so their *construction* wouldn't block loading the module — their actual OAuth/session-persistence behavior was never exercised). **All of this is exactly the independent Test/QA Agent's job next, against the isolated test database with real seeded users/sessions**, per research.md's division of labor — QA must not treat any of the above as already proven by this suite.
- **The `tests/helpers/module-loader.mjs` shim is test-only infrastructure, not a change to how the app resolves modules in dev/build/production** — it only affects module resolution inside `node --test` processes that explicitly call `registerModuleLoader()`. `next build`/`next dev`/`next start` are unaffected (confirmed nothing under `src/**`, `package.json`, or `next.config.mjs` was touched). If a future Next.js/Node upgrade changes how `next-auth`'s CJS packages are built or how `node --test` handles `.ts` files, this shim may need adjusting — that's contained entirely to `tests/helpers/`.
- **Node 22.18's built-in TypeScript type-stripping (no flag needed) is what made importing `.ts` files directly possible at all.** If this project is ever run under an older Node version without that support, `tests/validation.test.mjs` and the route tests would need a transpile step first — flagging this as an environment assumption, not a defect.

## Next Agent

Lead Agent

## Required Action From Next Agent

The Lead Agent should delegate independent QA to the Test Agent (`jayisacoder-test`) next. QA must not simply trust these unit-test results: it needs to run its own end-to-end verification against a real isolated test database with real seeded users/sessions (two distinct users A and B, confirming A cannot read/update/delete B's task via `404`, an unauthenticated request gets `401`, a full create→read→update→delete lifecycle persists and survives a fresh read, Prisma's real `@default(TODO)`/`@default(MEDIUM)` actually apply, and the production build/deploy path works), since everything in this handoff's route-handler coverage used a mocked session and a mocked Prisma client rather than real ones.

# Task

Independently verify the completed Task Management feature (Gate 1-approved architecture, implemented and unit-tested by prior agents) before it is presented at Gate 2. This is the required, Bravo-independent Test/QA Agent pass: run the full validation suite myself, independently read the actual implementation and test code (not the handoffs' descriptions of it), probe edge cases the unit tests may have missed, and mark every acceptance criterion PASS/FAIL/BLOCKED-BY-ENVIRONMENT with evidence I personally gathered.

## Input Received

- `docs/agent-handoffs/research.md` (Gate 1-approved architecture), `database.md`, `implementation.md`, `unit-testing.md` — read in full, treated as claims to verify, not facts to restate.
- `evidence/validation.md` — Gate 1 approval record and one prior delegation example.
- Confirmed environment constraint (verified myself, not just accepted): no `.env` file exists, `DATABASE_URL`/Google OAuth credentials are unset, and `docker info` fails with `failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine ... the daemon is running`. No live Postgres could be stood up in this sandbox.
- Direct reads of `src/app/api/tasks/route.ts`, `src/app/api/tasks/[id]/route.ts`, `src/lib/auth.ts`, `src/lib/validation.ts`, `src/lib/prisma.ts`, `prisma/schema.prisma`, `tests/validation.test.mjs`, `tests/tasks-route.test.mjs`, `tests/tasks-id-route.test.mjs`, `tests/helpers/module-loader.mjs`, `tests/helpers/route-test-helpers.mjs`.

## Work Completed

1. **Ran the full validation suite myself** (`npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm test`, `npm run build`) — actual output captured below, not paraphrased.
2. **Independently read every implementation file** line by line, specifically checking: session-before-DB-call ordering on every handler; presence of the compound `{ id, userId }` filter on every read/write with no fetch-by-id-alone path; how a malformed/garbage task `id` is handled; whether unhandled Prisma errors are caught; whether the GET list endpoint over-returns; and zod edge cases (type coercion, `null`, arrays, oversized payloads).
3. **Independently read the three test files and both test helpers**, checking whether assertions verify the actual Prisma call arguments (not just final status codes), and whether any assertion is vacuous/loose enough to pass on subtly wrong code.
4. **Independently probed zod edge cases not present in `tests/validation.test.mjs`** via a standalone script importing the real `src/lib/validation.ts` (see Tests/Verification) — `null` for title/description/status, array title, boolean title, whole-body `null`/array, and a 5MB description string.
5. Filled in the Acceptance Criteria, Automated Tests, Production Build, and Test Agent Recommendation sections of `evidence/validation.md`, and added my own Delegation Examples row.

## Files Changed

- `docs/agent-handoffs/qa.md` (this file — replaces the prior, superseded foundation-validation QA handoff).
- `evidence/validation.md` — Acceptance Criteria table, Automated Tests, Production Build, Test Agent Recommendation sections filled in; one Delegation Examples row added. Did not touch the existing Project / Implementation Plan and Human Approval / prior Delegation Examples rows.
- No application source, schema, or test files modified (out of scope for this agent).

## Decisions Made

- Treated "unit tests passed" strictly as one input. Re-derived my own conclusions by reading the actual `route.ts`/`[id]/route.ts`/`auth.ts`/`validation.ts` code, not `implementation.md`'s prose description of it.
- Did not attempt to start Docker Desktop or otherwise provision real infrastructure, per the explicit hard constraint from the Lead Agent — worked entirely within the sandboxed, no-DB/no-OAuth environment and reported honestly on what that blocks.
- Did not modify `tests/validation.test.mjs`, `tests/tasks-route.test.mjs`, `tests/tasks-id-route.test.mjs`, or `tests/helpers/**` — critiqued them in place instead, per my role boundary.
- Ran my own edge-case probe as a throwaway inline Node script (not saved to the repo) rather than adding a new test file, since authoring/modifying test files is not this agent's job — it independently re-verifies, it doesn't add to the Unit Testing Agent's suite.

## Tests/Verification

**Full suite, run myself, actual output:**

- `npm run lint` → `✔ No ESLint warnings or errors`. Exit 0.
- `npm run typecheck` (`tsc --noEmit`) → no output, no errors. Exit 0.
- `npm run test:unit` (`node --test tests/**/*.test.mjs`) → `# tests 47 / # pass 47 / # fail 0 / # cancelled 0`. Exit 0.
- `npm test` (identical command per `package.json`) → same result, `47/47 pass`. Exit 0.
- `npm run build` (`next build`) → `✓ Compiled successfully`, `✓ Generating static pages (5/5)`. Route table confirms `/api/tasks` and `/api/tasks/[id]` are both `ƒ` (dynamic, server-rendered on demand), consistent with `getServerSession`/Prisma calls happening at request time, not build time. Exit 0. Confirmed this succeeds with **no** `.env` file and **no** `DATABASE_URL` present in this environment — matches `implementation.md`'s claim, verified independently rather than trusted.

**Independent code read — findings:**

- **Session-before-DB-call ordering:** verified on all five handlers (`GET`/`POST` in `tasks/route.ts`; `GET`/`PATCH`/`DELETE` in `tasks/[id]/route.ts`) — `getServerSession(authOptions)` and the `session?.user?.id` truthiness check is the first statement in every handler, before any `prisma.task.*` call. No path bypasses this.
- **Ownership filter completeness:** every read/write is filtered by `{ id, userId }` (or `{ userId }` for the list) in the same Prisma call — `findMany({ where: { userId } })`, `findFirst({ where: { id, userId } })` (GET-by-id and PATCH's post-update re-read), `updateMany({ where: { id, userId }, data })`, `deleteMany({ where: { id, userId } })`. No code path fetches by `id` alone.
- **Malformed/non-cuid `id`:** `Task.id` is a plain Prisma `String @id @default(cuid())` with no format constraint (no `@db.Uuid`, no check constraint) — `cuid()` only governs generation of *new* ids, it does not restrict what `id` values look like at query time. A garbage string in the URL segment produces a normal parameterized `WHERE id = $1 AND userId = $2` that simply matches zero rows (→ clean 404), not a thrown exception. This is a reasoned conclusion from the schema and Prisma's query-building behavior, not something I could execute against a live database in this environment — flagged as inferred-safe rather than empirically verified.
- **Unhandled Prisma errors:** confirmed no handler wraps its `prisma.task.*` calls in `try/catch`. If Prisma threw (e.g., a real DB connection failure), the exception is uncaught and falls through to Next.js's default Route Handler error behavior (a generic 500, no stack trace exposed in a production build). This is a real, if minor, gap: every other failure mode in this feature (401/404/422/400) returns the app's own structured JSON body, but an infrastructure-level failure would return Next's generic 500 instead of a matching structured error. I judge this **acceptable for this project's scope** (Next's default 500 does not leak a stack trace), but it is inconsistent with the rest of the error-handling design and worth a one-line note back to the Developer Agent if there's time before Gate 2 — not a blocker.
- **GET list endpoint field exposure:** `findMany({ where: { userId } })` returns full `Task` rows (`id`, `title`, `description`, `status`, `priority`, `createdAt`, `updatedAt`, `userId`) scoped to the requester's own `userId` — no cross-user leakage, no unrelated model fields exposed.
- **Zod edge cases beyond the 22 tests in `tests/validation.test.mjs` — new finding:** `description: null` (and `title: null`, `status: null`) are all **rejected** by the schema (`success: false`), not treated as "no value provided." This is technically correct behavior for `.optional()` (which only tolerates `undefined`, not `null`), but it is a real, previously-uncaught product-level gap: a client that wants to *clear* a task's description via PATCH by sending `{ "description": null }` gets a confusing 422 instead of the field being cleared. Not a security issue, not a crash, but a genuine edge case the 22 validation tests do not cover and worth a note back to the Developer Agent if description-clearing is an intended UX. Also independently confirmed: array title, boolean title, whole-body `null`/array, and a 5MB description string are all correctly rejected (`success: false`) with no hang or crash (the 5MB case completed in ~0ms).

**Independent test-file critique:**

- Assertions in `tasks-route.test.mjs`/`tasks-id-route.test.mjs` genuinely check the *arguments* Prisma mocks receive (`assert.deepEqual(capturedArgs.where, { id: 't1', userId: 'user-1' })`, `assert.deepEqual(updateArgs.data, { title: 'updated' })`), not just final status codes — this is real verification of the ownership-filter shape, not a rubber stamp.
- The "no Prisma call happens" tests (e.g., POST/401, spoofed-`userId`) assert `called === false` inside the mock itself, which would fail if the handler ever reached Prisma on a path it shouldn't — not vacuous.
- I did not find any test that would pass against subtly-wrong code (e.g., no test only checks a status code where the underlying `where`/`data` shape matters and goes unchecked).
- The `module-loader.mjs` interop shims (path-alias resolution, extensionless import retry, CJS default-export unwrap for `next-auth/providers/google`/`@next-auth/prisma-adapter`) are test-tooling only, confirmed by their own well-commented rationale and by the fact that `next build` (which does not use this loader) succeeds independently — this is not a change to how the app resolves modules in dev/build/production.
- Confirmed the honesty of `unit-testing.md`'s stated boundary: the mocked-session/mocked-Prisma approach genuinely does not and cannot prove real `getServerSession` DB-strategy behavior, real cross-user IDOR against real rows, or Prisma's real `@default(TODO)`/`@default(MEDIUM)` firing at the column level — all three require a real database, none of which exists here.

## Problems or Risks

- **No live Postgres, no real Google OAuth credentials, Docker daemon not running** — confirmed firsthand (`docker info` fails to connect; no `.env` file exists). This blocks true end-to-end verification of persistence-across-reload, real cross-user IDOR against real rows, and real session establishment/sign-out/failed-sign-in behavior. Closing this out before production approval requires: a real `DATABASE_URL` (local Postgres or a running Docker container) + `npm run prisma:generate && npm run prisma:db:push` run successfully against it, plus real `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`NEXTAUTH_URL`/`NEXTAUTH_SECRET` values and a real OAuth consent round trip (or, at minimum, a seeded real `Session` row exercised against a real running app instance).
- **New finding, not previously reported:** unhandled Prisma exceptions fall through to Next's generic 500 rather than a structured error body — judged acceptable, not a blocker, but inconsistent with the rest of the feature's error-handling design.
- **New finding, not previously reported:** `description: null` (explicit null, as opposed to omission) is rejected rather than treated as "clear the field" — a minor product/UX gap, not a security or correctness bug.
- All other risks previously flagged by prior agents (no optimistic concurrency; `db push` with no migration history; NextAuth v4 + App Router being a slightly dated pairing) are carried forward as already-accepted, unchanged limitations — I did not find anything to add or dispute there.

## Next Agent

Lead Agent

## Required Action From Next Agent

**Ready to present at Gate 2, with the environment caveats spelled out explicitly for the humans.** Code-level correctness and every acceptance criterion that does not require a live database or real Google sign-in are verified and passing (lint, typecheck, 47/47 tests, production build all pass, independently re-run and independently code-reviewed — not just re-reported). Nothing needs to go back to the Developer or Unit Testing Agent as a blocking fix; the two new findings above (unhandled-Prisma-error 500s, `description: null` not clearing the field) are minor and optional cleanups, not defects that should hold up Gate 2. Full end-to-end persistence/auth verification (real database, real Google OAuth) is **not yet done** and cannot be done in this sandbox — the Lead Agent must present this explicitly to the humans as a required step **before production deployment approval**: provision a real `DATABASE_URL` (local/Docker/hosted Postgres) and real Google OAuth credentials, run `prisma db push` for real, and re-verify the persistence/IDOR/auth criteria against the running app before Gate 2 is treated as fully closing out the production-readiness bar.

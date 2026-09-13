# Task

Implement the Gate 1-approved Task Management feature end to end: Prisma client singleton, NextAuth v4 (Google provider, Prisma adapter, database session strategy), the `/api/tasks` and `/api/tasks/[id]` Route Handlers with server-enforced ownership and validation, and a minimal sign-in-gated UI to exercise create/read/update/delete. Implementation only, against the schema and architecture already approved and committed by prior agents — no changes to `prisma/schema.prisma`, instructor requirement docs, other agents' handoff files, or deployment configuration.

## Input Received

- The Gate 1-approved architecture from `docs/agent-handoffs/research.md`: Task/User/Account/Session/VerificationToken schema, Route Handlers (not Server Actions), ownership/IDOR pattern (compound `{ id, userId }` filter in one Prisma call, identical 404 for "not found" and "not yours"), zod-based validation returning structured 422s, database session strategy for NextAuth so a seeded `Session` row can drive tests without interactive Google consent.
- The completed Database Agent handoff (`docs/agent-handoffs/database.md`): `prisma/schema.prisma` already has `Task`, `User`, `Account`, `Session`, `VerificationToken` models and `TaskStatus`/`TaskPriority` enums, implemented exactly as approved. Treated as read-only input; not modified.
- Approval record in `evidence/validation.md` (2026-09-12, Alpha) covering this architecture.
- Repo state at start: `src/app/` had only `layout.tsx`, `page.tsx`, `globals.css` — no auth, no API routes. `package.json` had `next-auth`, `@next-auth/prisma-adapter`, `@prisma/client`, `next`, `react` installed, but not `zod`.

## Work Completed

- Installed `zod` (`npm install zod@^3` — network reachable, install succeeded; added to `dependencies`).
- Ran `npm run prisma:generate` for the first time in this environment so `@prisma/client` exports the `Task`/`TaskStatus`/`TaskPriority`/etc. types the code below depends on. This does not require a live database connection.
- Built the Prisma singleton (`src/lib/prisma.ts`).
- Built NextAuth config (`src/lib/auth.ts`) with `GoogleProvider`, `PrismaAdapter(prisma)`, `session: { strategy: "database" }`, and a `session` callback that attaches `user.id` onto `session.user.id` (the database strategy's `session` callback receives the full adapter `User` row, not a JWT — this is what makes `session.user.id` available at all).
- Added a NextAuth type augmentation (`src/types/next-auth.d.ts`) so `session.user.id` is typed, matching what the callback actually attaches.
- Wired the NextAuth route handler (`src/app/api/auth/[...nextauth]/route.ts`).
- Built the shared validation module (`src/lib/validation.ts`) with zod: `createTaskSchema`/`updateTaskSchema`, both `.strict()` (rejects unknown keys, including a client-supplied `userId`), `title` trimmed/required/≤200 chars, `description` optional/≤2000 chars, `status`/`priority` validated against the real Prisma enums via `z.nativeEnum`. `TITLE_MAX_LENGTH = 200` is exported as the single constant kept in sync with the schema's `@db.VarChar(200)`, per the risk flagged in both prior handoffs.
- Built `/api/tasks` (`src/app/api/tasks/route.ts`): `GET` requires a session (401 otherwise) and returns only `prisma.task.findMany({ where: { userId } })`; `POST` requires a session, parses/validates the body (422 with `{ error, fields }` on failure, 400 on unparseable JSON), and creates the task with `userId` taken only from the session.
- Built `/api/tasks/[id]` (`src/app/api/tasks/[id]/route.ts`): `GET`/`PATCH`/`DELETE` all require a session (401 otherwise). Every operation filters by `{ id, userId: session.user.id }` in the same Prisma call (`findFirst` for `GET`, `updateMany` for `PATCH`, `deleteMany` for `DELETE` — `update`/`delete` were not used because they require a unique `where`, and `id` alone is unique, which would have made it impossible to also filter by `userId` in that same call). A task that doesn't exist and a task owned by another user both produce the same 404 (`result.count === 0`), never a 403. `PATCH` re-validates with the same `.strict()` schema (partial, only supplied fields), rejects an empty body with 422, and re-reads the row after a successful `updateMany` to return the current state. `DELETE` returns 404 (not 500) for a nonexistent/already-deleted id, and 204 on success.
- Built a minimal UI: `src/app/page.tsx` (Server Component) checks the session server-side; with no session it renders a sign-in prompt and a "Sign in with Google" button; with a session it server-fetches the user's own tasks via Prisma and renders `TaskBoard`. `src/app/task-board.tsx` (Client Component) provides a create form (title/description/priority) and a list with per-task status/priority selects and a delete button, calling the API routes above. `src/app/auth-buttons.tsx` provides `signIn('google')`/`signOut()` buttons. `src/app/providers.tsx` wraps the tree in NextAuth's `SessionProvider`; `src/app/layout.tsx` was updated to use it.
- Added `src/lib/types.ts` (`TaskDTO`) as the JSON-serializable shape used across the server component → client component boundary and the API responses (Prisma's `Task` has `Date` fields; the DTO uses ISO strings).

## Files Changed

- `src/lib/prisma.ts` (new)
- `src/lib/auth.ts` (new)
- `src/lib/validation.ts` (new)
- `src/lib/types.ts` (new)
- `src/types/next-auth.d.ts` (new)
- `src/app/api/auth/[...nextauth]/route.ts` (new)
- `src/app/api/tasks/route.ts` (new)
- `src/app/api/tasks/[id]/route.ts` (new)
- `src/app/providers.tsx` (new)
- `src/app/auth-buttons.tsx` (new)
- `src/app/task-board.tsx` (new)
- `src/app/layout.tsx` (modified — wrapped children in `Providers`)
- `src/app/page.tsx` (modified — replaced the placeholder landing page with the session-gated task UI)
- `package.json` (modified — added `zod` as a dependency)
- `docs/agent-handoffs/implementation.md` (this handoff — replaces the superseded foundation-setup handoff)
- Not modified: `prisma/schema.prisma`, any instructor requirement doc, any other agent's handoff file, deployment configuration.

## Decisions Made

- **`zod` installed rather than hand-rolled.** The environment had working network access (`npm install zod@^3` succeeded cleanly), so the research-recommended real schema validator was used instead of the fallback hand-rolled option; no substitution was needed.
- **`updateMany`/`deleteMany` instead of `update`/`delete` for ownership-scoped writes.** This is the mechanism, not a deviation, for satisfying "filter by `{ id, userId }` in the same Prisma call": Prisma's `update`/`delete` require a unique `where`, and `Task.id` alone is the only unique field on the model, so they could not also carry the `userId` filter in one call. `updateMany`/`deleteMany` accept an arbitrary `where` and return a `count`, which is what lets a single query both enforce ownership and report whether anything matched — a `count` of 0 is treated as 404 in both the "doesn't exist" and "not yours" cases.
- **`session` callback added to attach `user.id`.** Not explicitly spelled out in the research handoff, but required to make `session.user.id` exist at all under the database strategy (the adapter's callback receives the full `User` row) — without it there would be no server-verified id to filter Task queries by. Paired with a `next-auth` module augmentation (`src/types/next-auth.d.ts`) so this is typed rather than cast with `any`.
- **PATCH re-reads the row after `updateMany`.** The ownership filter itself lives in the single `updateMany` call; the follow-up `findFirst` (same compound filter) is only to return the current row state to the caller, not a second ownership check — the mutation already succeeded or the handler already returned 404 by that point.
- **UI kept intentionally minimal**, per the instruction that this is not a design task: inline styles, no component library, a single create form and a flat task list with inline status/priority selects and a delete button.
- **No optimistic concurrency control implemented** — this matches the explicitly accepted MVP limitation recorded in both `docs/agent-handoffs/research.md` and `evidence/validation.md`.

## Tests/Verification

- `npm run prisma:generate` — succeeded (no live DB required for client generation).
- `npm run typecheck` (`tsc --noEmit`) — clean, no errors.
- `npm run lint` (`next lint`) — "No ESLint warnings or errors."
- `npm run test:unit` — all 3 existing tests in `tests/basic-config.test.mjs` still pass (script wiring, env var names, schema presence). Nothing in this feature's implementation touched those files' assumptions.
- `npm test` — same 3 tests pass, same result as `test:unit` (they run the same command per `package.json`).
- `npm run build` (`next build`) — **attempted and succeeded**, despite no real `DATABASE_URL`/Google credentials configured in this environment (no `.env` file exists here). This was not skipped: the build compiled, typechecked, and generated all routes, including `/`, `/api/auth/[...nextauth]`, `/api/tasks`, `/api/tasks/[id]`, all correctly marked dynamic (ƒ) rather than statically prerendered, because `/` calls `getServerSession`/`prisma.task.findMany` at request time rather than build time. No environment-only failure occurred, so there is nothing to caveat here.
- Did not author or run a test suite beyond the above — per scope, authoring tests is the Unit Testing Agent's job next. Did not manually exercise the running dev server against a real database/Google OAuth flow, since no real `DATABASE_URL`/`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` values exist in this environment; the code paths were verified via typecheck/lint/build only.

## Problems or Risks

- **No live database or Google OAuth credentials exist in this environment.** Nothing here has been exercised against a real Postgres instance or a real Google sign-in flow — `prisma db push`, actual session creation, and actual CRUD against real rows are all still unverified beyond `prisma generate`/`tsc`/`next build` succeeding. Whoever provisions real `DATABASE_URL`/`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`NEXTAUTH_URL`/`NEXTAUTH_SECRET` values first should confirm `npm run prisma:db:push` succeeds and a real sign-in → create → list → update → delete round trip works.
- **The `session` callback (attaching `user.id`) is an addition beyond what `research.md` spelled out.** It's required for the approved ownership pattern to be possible at all under the database strategy, so it's presented as an implementation necessity rather than an architecture deviation, but it's called out here in case the Lead Agent wants to confirm it doesn't need separate sign-off.
- **`updateMany`/`deleteMany` vs. `update`/`delete`** is a Prisma-API-level detail, not an architectural deviation — the effective ownership guarantee (single-call compound filter, identical 404 for both failure modes) is unchanged from what was approved, but flagged here for transparency since the exact method names weren't in the research handoff's pseudocode.
- **No optimistic concurrency** — carried forward as an accepted, already-approved limitation, not new.
- **Seeded-session-cookie test strategy is not yet exercised by anything.** The Route Handlers use `getServerSession(authOptions)` directly (no injected seam), matching the "seeded real `Session` row + cookie" testing strategy confirmed in scope at Gate 1. The Unit Testing Agent should confirm this integrates cleanly when it writes fixtures; if it doesn't, that's a signal to revisit with the Lead Agent rather than quietly add a dependency-injection seam.

## Next Agent

Lead Agent

## Required Action From Next Agent

The Lead Agent should delegate unit testing to the Unit Testing Agent next: author focused tests against the isolated test database (`DATABASE_URL_TEST`) covering validation rejection cases, the ownership-filter behavior, default `status`/`priority` values on create, and the 401/404/422 status codes above, using the seeded `User` + `Session` row (with a known `sessionToken` cookie) strategy confirmed at Gate 1 — no interactive Google consent. The Test Agent should independently verify the complete suite afterward.

---

# 2026-09-13 Update: QA follow-up (unhandled Prisma errors, `description: null`)

## Task

Address two minor, explicitly non-blocking gaps the independent QA/Test Agent pass (`docs/agent-handoffs/qa.md`, "New finding" items) surfaced in the already-shipped Task Management feature (commit `7d1ef81`): (1) no handler caught an unexpected Prisma exception, so a real DB failure would fall through to Next.js's generic 500 instead of this app's own structured `{ error }` JSON shape; (2) `updateTaskSchema`'s `description` field rejected an explicit `null` (422) instead of treating it as "clear the field," even though the column is nullable (`description String?`). Both were called out by QA as acceptable-but-inconsistent, not blockers — this pass closes them out.

## Input Received

- `docs/agent-handoffs/qa.md` (read in full) — specifically the "Unhandled Prisma errors" and "Zod edge cases … new finding" items under Work Completed / Independent code read — findings.
- Direct re-read of `src/app/api/tasks/route.ts`, `src/app/api/tasks/[id]/route.ts`, `src/lib/validation.ts` before editing (not just QA's prose description of them).
- Instructed boundary: `src/**` and this handoff only; do not touch `prisma/schema.prisma`, `tests/**`, `evidence/validation.md`, or `docs/agent-handoffs/qa.md`.

## Work Completed

1. **Structured 500 on unexpected Prisma failures.** Added `src/lib/api-errors.ts` exporting `internalErrorResponse()`, which returns `NextResponse.json({ error: 'InternalError' }, { status: 500 })` — matching the `{ error }` shape convention already used by the 401/404/422/400 paths. Wrapped every `prisma.task.*` call in `src/app/api/tasks/route.ts` (`GET`'s `findMany`, `POST`'s `create`) and `src/app/api/tasks/[id]/route.ts` (`GET`'s `findFirst`, `PATCH`'s `updateMany` + follow-up `findFirst` re-read in one `try` block, `DELETE`'s `deleteMany`) in `try { … } catch { return internalErrorResponse(); }`. This does not swallow errors — a genuine failure still returns `500`, just with the app's own JSON body instead of Next's generic unshaped one. The existing `try/catch` around `request.json()` (400 `InvalidJSON`) was left untouched; this is a separate, additive `try/catch` around the Prisma calls only.
2. **`description: null` now clears the field on PATCH.** In `src/lib/validation.ts`, split the old `descriptionSchema` into a shared `descriptionBaseSchema` (the string/max-length rule, no optional/nullable modifier) plus two call-site variants: `descriptionSchema = descriptionBaseSchema.optional()` (unchanged behavior, still used by `createTaskSchema` — a new task has no existing description to clear, so `undefined`/omitted is the only "no description" case there) and a new `updateDescriptionSchema = descriptionBaseSchema.nullable().optional()` (used only by `updateTaskSchema`), which accepts `string | null | undefined`. No route-handler change was needed to plumb the value through: `src/app/api/tasks/[id]/route.ts`'s `PATCH` already does `data: parsed.data` (a generic passthrough of whatever keys `zod` produced), and zod's object parser only sets a key on the parsed output when the key was present in the input or its parsed value isn't `undefined` — so `{ "description": null }` now produces `parsed.data = { description: null }`, which `prisma.task.updateMany`'s `data` interprets as "set this nullable column to NULL," and an omitted `description` still produces no key at all (unaffected, still passes the existing "at least one field must be provided" check on a truly empty body).

## Files Changed

- `src/lib/api-errors.ts` (new) — `internalErrorResponse()` helper.
- `src/app/api/tasks/route.ts` — `GET`/`POST` Prisma calls wrapped in `try/catch`; imports `internalErrorResponse`.
- `src/app/api/tasks/[id]/route.ts` — `GET`/`PATCH`/`DELETE` Prisma calls wrapped in `try/catch`; imports `internalErrorResponse`.
- `src/lib/validation.ts` — `descriptionBaseSchema` extracted; `updateDescriptionSchema` (nullable) added and wired into `updateTaskSchema` only; `createTaskSchema`'s `description` field unchanged.
- `docs/agent-handoffs/implementation.md` (this update — appended, did not erase prior content).
- Not modified: `prisma/schema.prisma`, `tests/**`, `evidence/validation.md`, `docs/agent-handoffs/qa.md`, any other agent's handoff, deployment configuration.

## Decisions Made

- **One shared `internalErrorResponse()` helper rather than inlining the same `NextResponse.json(...)` call five times** — keeps the 500 shape defined in exactly one place across both route files.
- **`PATCH`'s `updateMany` and its post-update `findFirst` re-read share one `try` block**, not two — both are the same logical unit of work for a single request (mutate, then read back current state to return it), and a Prisma failure in either is equally an `InternalError`. The early `return` for `result.count === 0` (404) still happens inside the `try` block but is not itself a thrown error, so it's unaffected by the surrounding `catch`.
- **`descriptionBaseSchema` extraction over duplicating the string/max-length rule** — avoids the two variants (`create`'s optional-only, `update`'s nullable-and-optional) drifting apart on the max-length message/limit.
- **No route-handler change needed for the `null` plumbing** — `data: parsed.data` was already a generic passthrough; the fix belongs entirely in `validation.ts`. Confirmed this by tracing zod's object-parsing rule (a key is only set on the output when present in input or non-`undefined`) rather than assuming it.

## Tests/Verification

- `npm run typecheck` (`tsc --noEmit`) — clean, no errors.
- `npm run lint` (`next lint`) — "No ESLint warnings or errors."
- `npm run test:unit` (`node --test tests/**/*.test.mjs`) — `# tests 47 / # pass 47 / # fail 0 / # cancelled 0`, unmodified test files, all still passing against the new code.
- `npm test` — same command per `package.json`, same result, `47/47 pass`.
- `npm run build` (`next build`) — `✓ Compiled successfully`, `✓ Generating static pages (5/5)`, route table unchanged (`/api/tasks` and `/api/tasks/[id]` still `ƒ` dynamic).
- Did not add new tests — out of scope for this agent (`tests/**` is the Unit Testing Agent's territory) and not requested by this task.

## Problems or Risks

- **No new test coverage exists yet for either fix.** The existing 47 tests pass unmodified because neither fix changes any previously-tested behavior (no existing test exercised a genuine Prisma throw, and no existing test sent `description: null` to `updateTaskSchema`/`PATCH`). Recommend the Unit Testing Agent add: (a) a test where a mocked `prisma.task.*` call rejects/throws and the handler is asserted to return `{ error: 'InternalError' }` with `500` (for at least one handler per route file), and (b) a `updateTaskSchema`/`PATCH` test asserting `description: null` is accepted and passed through as `null` (and that `createTaskSchema` still rejects `description: null`, confirming the two schemas didn't converge by accident).
- **No other behavior changed.** `createTaskSchema` is untouched (still `.optional()`-only for `description`); the `400`/`401`/`404`/`422` paths and their exact JSON shapes are untouched; no schema, test, or other-agent file was modified.

## Next Agent

Unit Testing Agent (for the two recommended new tests above), then Lead Agent.

## Required Action From Next Agent

Unit Testing Agent: add focused coverage for (1) a Prisma-throws-during-a-handler-call path returning the new `{ error: 'InternalError' }`/500 shape, and (2) `updateTaskSchema` accepting `description: null` while `createTaskSchema` still rejects it. Neither is a blocker for Gate 2 — these are optional-but-recommended additions closing out QA's two non-blocking findings. Lead Agent: no re-approval of architecture or schema needed: this is an implementation-only fix within the already-approved feature, no `prisma/schema.prisma` or route contract change (the 500 shape is new but was already the intended contract per the original error-handling design; the `PATCH` request/response shape for `description` is unchanged, only the previously-rejected `null` input is now accepted).

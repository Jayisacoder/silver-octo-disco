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

---

# 2026-09-14 Update: Dark mode support (UI-only, no behavior change)

## Task

Add dark mode support to the UI: a light/dark CSS custom-property palette that also respects the OS `prefers-color-scheme` when the user hasn't chosen explicitly, plus a small persistent toggle. Explicitly scoped as UI-only/styling-only — no change to `prisma/schema.prisma`, API route logic, `tests/**`, or any other agent's handoff file.

## Input Received

- Direct read of `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/task-board.tsx`, `src/app/auth-buttons.tsx` before editing.
- Instructed boundary: `src/**` and this handoff only; color-only swap of existing inline styles, no layout/spacing changes, no new dependencies, no blocking inline-script FOUC prevention.

## Work Completed

1. **CSS custom properties in `globals.css`.** Added a `:root` light palette (`--bg`, `--fg`, `--border`, `--muted`, `--error`) matching the values already hardcoded elsewhere in the app (`#f8fafc`, `#0f172a`, `#cbd5e1`, `crimson`). Added a dark override under `:root[data-theme='dark']` (explicit user choice) and an identical dark override under `@media (prefers-color-scheme: dark) { :root:not([data-theme='light']) { ... } }` (automatic OS-preference fallback when no explicit choice has been made). Updated the `html, body` rule to use `var(--bg)`/`var(--fg)` instead of the hardcoded hex values.
2. **Swapped hardcoded colors for variables.** `src/app/task-board.tsx`: the task-list item `border: '1px solid #cbd5e1'` became `border: '1px solid var(--border)'`; the form-error `color: 'crimson'` became `color: 'var(--error)'`. `src/app/page.tsx` was re-checked and has no hardcoded color values in its inline styles (only layout/spacing/`fontFamily`), so no change was needed there. All other inline styles (padding, gap, flex, maxWidth, etc.) were left exactly as-is in both files — this was a color-only swap, not a redesign.
3. **New `src/app/theme-toggle.tsx` client component.** A fixed-position button that reads `localStorage['theme']` on mount and, if a saved `'light'`/`'dark'` value exists, applies it via `document.documentElement.setAttribute('data-theme', ...)`. If nothing is saved, it leaves `data-theme` unset (so the `prefers-color-scheme` media query in `globals.css` keeps controlling appearance automatically) and only uses the OS preference to decide the button's own initial label. Clicking the button toggles between `'light'`/`'dark'`, sets the `data-theme` attribute, and persists the explicit choice to `localStorage`. `localStorage` reads/writes are wrapped in `try/catch` (e.g. private browsing can throw). Exports a small pure helper, `nextTheme(current)`, that flips `'light' | 'dark'` — kept separate from the component so the toggle logic itself is trivially testable without rendering React.
4. **Wired into `src/app/layout.tsx`.** Added `<ThemeToggle />` inside `<body>`, alongside (not inside) `<Providers>`, so the toggle renders on every page regardless of sign-in state. No other change to `layout.tsx`.
5. Per the task's explicit instruction, did not add any blocking inline `<script>` FOUC-prevention trick and did not add any new dependency — a brief flash of the wrong theme on first load is accepted as in-scope for this project's size. Also did not add a test under `tests/**`: the task's own boundary instructions list `tests/**` as off-limits for this change, so the optional "tiny pure-logic unit test" suggestion in the task brief was not taken, in favor of respecting the stricter explicit boundary.

## Files Changed

- `src/app/globals.css` (modified — added `:root` / `:root[data-theme='dark']` / `prefers-color-scheme` variable blocks; `html, body` now uses `var(--bg)`/`var(--fg)`).
- `src/app/task-board.tsx` (modified — two inline color values replaced with `var(--border)`/`var(--error)`; no other change).
- `src/app/theme-toggle.tsx` (new — toggle button component + `nextTheme` helper).
- `src/app/layout.tsx` (modified — renders `<ThemeToggle />` in `<body>`).
- `src/app/page.tsx` — reviewed, no change needed (no hardcoded colors present).
- `docs/agent-handoffs/implementation.md` (this update — appended, did not erase prior content).
- Not modified: `prisma/schema.prisma`, API route logic, `tests/**`, `src/app/auth-buttons.tsx` (no colors to change), any other agent's handoff file, deployment configuration.

## Decisions Made

- **Five CSS variables, matching exactly what the existing inline styles already hardcoded** (`--bg`, `--fg`, `--border`, `--error`, plus `--muted` reserved for any future muted-text use) rather than a larger design-token system — proportionate to a class project's internal tool.
- **Both an explicit `data-theme` attribute path and a `prefers-color-scheme` media-query path**, as required: `:root[data-theme='dark']` wins when the user has clicked the toggle; the media query (`guarded` with `:not([data-theme='light'])`) governs automatically otherwise, so a user who never touches the toggle still gets correct system-driven theming.
- **`nextTheme` extracted as a standalone pure function** in the same file, purely so the flip logic is inspectable/reasoned-about independently of the component, without introducing a test file (respecting the `tests/**` boundary in this task's instructions).
- **Toggle rendered outside `<Providers>` in `layout.tsx`** — it has no dependency on the NextAuth session, and the task explicitly required it to work regardless of sign-in state.

## Tests/Verification

- `npm run typecheck` (`tsc --noEmit`) — clean, no errors.
- `npm run lint` (`next lint`) — "No ESLint warnings or errors."
- `npm run test:unit` (`node --test tests/**/*.test.mjs`) — `# tests 52 / # pass 52 / # fail 0 / # cancelled 0`, all pre-existing tests, unmodified, all still passing.
- `npm run build` (`next build`) — `✓ Compiled successfully`, `✓ Generating static pages (5/5)`, route table unchanged from the prior handoff entry.
- No new automated test was added (see Decisions Made / Work Completed item 5) — this is a UI-only styling change with no server-side/API behavior to unit test, and the repo has no browser/rendering test infra to exercise the toggle's DOM effects.

## Problems or Risks

- **A brief flash of the wrong theme on first load is possible** (e.g. OS is dark, user previously chose light, page paints with the media-query dark colors for one frame before the `useEffect` in `ThemeToggle` applies `data-theme="light"`). Explicitly accepted as in-scope per the task's instructions; no inline blocking script was added to avoid it.
- **No automated coverage of the toggle's actual DOM/localStorage behavior** — only `tsc`/lint/build were used to verify it compiles and doesn't break existing tests; manual/browser verification of the toggle's visual behavior was not performed as part of this handoff.

## Next Agent

Unit Testing Agent / Test Agent, then Lead Agent.

## Required Action From Next Agent

No behavior/API/schema changes occurred, so no new fixture or ownership/validation test coverage is needed. If the Unit Testing Agent wants optional coverage of `nextTheme`'s pure toggle logic, that's a small addition it owns under `tests/**` (out of this agent's boundary). Lead Agent: no re-approval of architecture or schema needed — this is a scoped, additive UI-only change (new CSS variables, one new client component, two color-value swaps) with all 52 pre-existing tests passing unmodified and `build`/`typecheck`/`lint` all green.

---

# 2026-09-14 Update: Force Google account chooser on every sign-in

## Task

Fix a live-deployment bug report: with an active Google session already present in the browser, clicking "Sign in with Google" silently re-authenticated with whatever Google account was currently active, never showing Google's account chooser. A user could not switch to a different Google account without first manually signing out of Google itself in a separate tab. Confirmed by live testing: app sign-out correctly ends the app session, but the next sign-in silently reuses the same Google account instead of prompting. Scoped as a minimal, one-line-ish config addition — no restructuring of `PrismaAdapter`, `session.strategy`, or the `session` callback.

## Input Received

- Direct read of `src/lib/auth.ts` before editing.
- Instructed fix: add `authorization: { params: { prompt: 'select_account' } }` to the `GoogleProvider({...})` call so the OAuth authorization request always tells Google to show the account chooser.
- Instructed boundary: `src/**` and this handoff only; do not touch `prisma/schema.prisma`, `tests/**`, or any other agent's handoff file.

## Work Completed

Added `authorization: { params: { prompt: 'select_account' } }` to the `GoogleProvider({...})` options object in `src/lib/auth.ts`, alongside the existing `clientId`/`clientSecret`. This is a NextAuth/OAuth request-parameter addition only: it changes what parameter the app sends Google in the authorization request URL (`prompt=select_account`), telling Google's authorization server to always render the account chooser rather than silently reusing an already-active Google session. Nothing else in the file was touched — `PrismaAdapter(prisma)`, `session: { strategy: 'database' }`, and the `session` callback (attaching `user.id`) remain exactly as they were.

## Files Changed

- `src/lib/auth.ts` (modified — added `authorization: { params: { prompt: 'select_account' } }` to the `GoogleProvider` call; added an explanatory comment above it).
- `docs/agent-handoffs/implementation.md` (this update — appended, did not erase prior content).
- Not modified: `prisma/schema.prisma`, `tests/**`, any other agent's handoff file, deployment configuration.

## Decisions Made

- **`prompt: 'select_account'` chosen over `prompt: 'consent'` or `prompt: 'consent select_account'`** — the bug report is specifically about the account chooser not appearing, not about re-consenting to scopes on every sign-in (which would also force a new consent screen and is a stronger, unrequested behavior change). `select_account` is the minimal fix for the reported symptom.
- **No change to `PrismaAdapter`, `session.strategy`, or the `session` callback**, per the explicit instruction — this is purely an OAuth authorization-request parameter, unrelated to how the app establishes or reads its own session afterward.
- **No new automated test authored.** This behavior is only observable against Google's real OAuth authorization endpoint (the actual rendering of the account chooser) and cannot be meaningfully exercised by `node --test` against this app's own code — there is no local seam that fakes Google's authorization server's prompt behavior. Inventing a fake test for it would test nothing real, so none was added, per explicit instruction.

## Tests/Verification

- `npm run typecheck` (`tsc --noEmit`) — clean, no errors.
- `npm run lint` (`next lint`) — "No ESLint warnings or errors."
- `npm run test:unit` (`node --test tests/**/*.test.mjs`) — `# tests 52 / # pass 52 / # fail 0 / # cancelled 0`, all pre-existing tests, unmodified, all still passing (this change doesn't touch any behavior those tests cover — only an OAuth request parameter).
- `npm run build` (`next build`) — `✓ Compiled successfully`, `✓ Generating static pages (5/5)`, route table unchanged (`/api/auth/[...nextauth]` still `ƒ` dynamic, 0 B).
- Did not attempt to verify the actual account-chooser prompt against live Google OAuth servers as part of this handoff (no real `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/live browser session available in this pass) — this fix directly addresses the mechanism Google documents for this exact behavior (`prompt=select_account` in the authorization request), and per the task instructions, this can't be tested with `node --test` since it only matters against Google's real OAuth servers.

## Problems or Risks

- **Not exercised against live Google OAuth in this pass.** The Lead Agent or whoever next has access to a real deployment with live Google credentials should confirm, by testing in a browser with an active Google session, that Google's account chooser now appears on every "Sign in with Google" click, including immediately after an app sign-out.
- **No other behavior changed.** `PrismaAdapter`, `session.strategy`, and the `session` callback are untouched; no schema, test, or other-agent file was modified.

## Next Agent

Lead Agent (for live-deployment verification of the account-chooser behavior).

## Required Action From Next Agent

Lead Agent: confirm via a real browser session with live Google OAuth credentials that clicking "Sign in with Google" now always shows Google's account chooser, including right after an app sign-out with the Google session still active in that browser. No re-approval of architecture or schema needed — this is a single OAuth request-parameter addition within the already-approved auth configuration, with `typecheck`/`lint`/`test:unit` (52/52)/`build` all green.

---

# 2026-09-14 Update: UI/UX redesign (visual/presentational only, no behavior change)

## Task

Redesign the existing Task Manager UI to look like a polished, modern SaaS product — clean typography, consistent spacing/radius/shadow, status/priority badges, responsive layout, accessible focus states — while leaving the backend, schema, auth, ownership/security, Route Handlers, and existing validation completely untouched. Explicitly scoped as a visual/UX task, not a feature or architecture task; explicitly instructed not to deploy or bypass gates.

## Input Received

- Direct read of every existing UI file before editing: `src/app/page.tsx`, `src/app/task-board.tsx`, `src/app/auth-buttons.tsx`, `src/app/providers.tsx`, `src/app/theme-toggle.tsx`, `src/app/layout.tsx`, `src/app/globals.css`, `src/lib/types.ts`, and `package.json` (confirmed no CSS framework, icon library, or component library is installed — plain CSS with custom properties, inline `style={{}}` throughout).
- Instructed boundary: visual/presentational layer only; no changes to `prisma/schema.prisma`, NextAuth config, Route Handlers, ownership/IDOR logic, or existing validation rules; no new dependencies; no new frontend framework.

## Work Completed

1. **`src/app/globals.css` rebuilt into a small design system** — light/dark token sets (surface/border/muted/accent colors, plus dedicated status and priority color pairs for all six enum values, each with a light and dark variant), a spacing/radius/shadow scale, and reusable classes: `.btn` (`primary`/`secondary`/`ghost`/`danger`/`sm`/`icon` variants), `.input`/`.textarea`/`.select`, `.card`, `.stat-card`, `.toolbar`, `.filter-tab`, `.badge-select` (status/priority pill-styled `<select>` elements), `.task-card` (+ `--completed` modifier), `.empty-state`, `.signin-card`, and a `:focus-visible` ring applied uniformly to every interactive element. Responsive rules at 640px/560px collapse the stats grid to 2 columns and stack the header/toolbar. All existing CSS variable names (`--bg`, `--fg`, `--border`, `--muted`, `--error`) were kept and extended rather than renamed, so nothing outside these edited files depends on a variable that moved.
2. **`src/app/icons.tsx` (new)** — a handful of small inline SVG icon components (search, plus, pencil, trash, x, clipboard). No icon library exists in this project's dependencies, and the brief explicitly says not to add an unnecessary one, so these are plain local JSX, not a new package.
3. **`src/app/page.tsx`** — redesigned header (title, "Signed in as…", sign-out button) and a new stats row (Total / To do / In progress / Completed) computed directly from the same `initialTasks` array the page already fetches via Prisma — no invented numbers, no new query, no "Overdue" stat (there is no due-date field in the schema, so nothing was fabricated for it). Sign-in screen restyled as a centered card. The actual `getServerSession`/`prisma.task.findMany` logic is byte-for-byte unchanged.
4. **`src/app/task-board.tsx` redesigned**, with every existing behavior preserved exactly (same `fetch` calls, same request bodies, same state machine for create/edit/delete/filter/sort):
   - Task list restyled as cards; status and priority are now `<select>` elements styled as colored pill badges (`.badge-select`) — this is still the same functional control (a real `<select>` whose `onChange` calls the same `handleUpdate`), not a separate read-only badge next to a hidden control, so there's no duplicated UI.
   - Delete confirmation restyled as an inline red-tinted bar; edit mode restyled but still the same inline-editing pattern (no modal introduced, matching "improve the existing pattern, don't rebuild the architecture").
   - Create form is now opened via a header "+ New task" button (a small added `isFormOpen` state) instead of always being visible — this is the "primary Create Task button" the brief asked for; the form's own fields/validation/submit logic are unchanged.
   - Two small additive pieces of client-side-only functionality were added because the brief's toolbar section explicitly asks for search and a priority filter, and neither existed before: a text search box (matches against already-fetched `task.title`/`task.description`, no new API call) and a priority filter `<select>`, alongside the pre-existing status filter tabs and sort-by-priority toggle (now presented as a "Sort" `<select>` with the same two states as before). **Flagging this explicitly**: everything else in this pass is pure restyling, but this is a small scope addition — it's UI-layer only (no schema/API/backend change), reversible, and directly requested by the brief's own toolbar spec, but it is additional functionality, not just a reskin, so it's called out here rather than silently bundled in.
   - Empty states redesigned: "no tasks yet" (with a "+ New task" CTA) and "no tasks match this filter" (with a "clear filters" CTA that resets search/status/priority, not the sort choice).
5. **`src/app/auth-buttons.tsx` / `src/app/theme-toggle.tsx`** — restyled onto the new `.btn` classes; `signIn('google')`/`signOut()` calls and the theme-toggle's `localStorage`/`data-theme` logic are unchanged, only the `className`/inline-style presentation changed. Theme toggle intentionally left in its existing fixed-position/host location in `layout.tsx` (not moved into the header) so it keeps working identically on both the signed-in and signed-out screens without restructuring the two pages' layouts.

## Files Changed

- `src/app/globals.css` (modified — full design-system rebuild, described above)
- `src/app/icons.tsx` (new — small inline SVG icons)
- `src/app/page.tsx` (modified — header/stats/sign-in-screen presentation only; data-fetching logic unchanged)
- `src/app/task-board.tsx` (modified — presentation + the two additive client-side filters noted above; all existing handlers/requests unchanged)
- `src/app/auth-buttons.tsx` (modified — class names only)
- `src/app/theme-toggle.tsx` (modified — class names only; toggle logic unchanged)
- Not modified: `prisma/schema.prisma`, `src/lib/auth.ts`, `src/lib/validation.ts`, `src/lib/prisma.ts`, `src/lib/types.ts`, any `src/app/api/**` Route Handler, `tests/**`, `package.json` (no new dependency), any other agent's handoff file, deployment configuration. Nothing was deployed.

## Decisions Made

- **Plain CSS extended, not replaced with Tailwind or a component library.** The project has zero CSS/UI dependencies today; introducing one would be a build-tooling/architecture change the brief explicitly rules out ("do not add unnecessary dependencies," "do not introduce a new frontend framework"). A larger hand-written CSS custom-property system was judged the correct way to get consistency without that risk.
- **Status/priority rendered as styled `<select>`s, not a badge + a separate control.** Keeps the exact same update mechanism (`onChange` → `handleUpdate` → `PATCH`) while satisfying "polished status/priority badges" and avoiding "don't add duplicate functionality."
- **No due-date UI added anywhere**, despite the brief mentioning due dates — `TaskDTO`/`prisma/schema.prisma` have no such field, and the instructions explicitly forbid inventing fake data or changing the schema. Stats therefore use Total/To do/In progress/Completed instead of the brief's example Total/Active/Completed/Overdue, since "Overdue" is undefined without a due date.
- **Search + priority filter added as a flagged, small, reversible client-side addition** (see Work Completed #4) rather than either (a) silently expanding scope or (b) omitting a toolbar control the brief explicitly asked for. No backend change was needed or made.
- **No modal introduced for create/edit** — the existing pattern (inline form / inline edit) was improved in place, per the explicit instruction to improve the existing pattern rather than rebuild the architecture.
- **Did not move the theme toggle into the header** — lower risk than restructuring both the signed-in and signed-out layouts to accommodate it in a new location; it already appears on both screens today.

## Tests/Verification

- `npm run test:unit` — `# tests 52 / # pass 52 / # fail 0`, unmodified test files, all still passing (nothing in this pass touches Route Handler/validation/schema logic).
- `npm test` — same, `52/52`.
- `npm run build` (`next build`) — `✓ Compiled successfully`, typecheck clean, `✓ Generating static pages (5/5)`, route table unchanged (`/`, `/api/auth/[...nextauth]`, `/api/tasks`, `/api/tasks/[id]` — same dynamic/static split as before).
- `npm run test:all` (architecture + commit-gate + unit + full suite) — all green.
- **Manual visual verification**: this environment has no local `DATABASE_URL`/Google OAuth credentials (`.env.local` here only contains a Vercel OIDC token from an earlier `vercel link`, no `.env` exists), so a real authenticated `npm run dev` session couldn't be driven end-to-end locally without touching auth/infra configuration, which was out of scope. Instead: (a) the unauthenticated sign-in screen was verified for real against the actual local dev server (`next dev`, both light and dark mode, via browser automation); (b) the authenticated dashboard/task-list/toolbar/badges/empty-states/delete-confirmation were verified visually via a throwaway static HTML file (built in the session scratchpad, outside the repo, using a copy of the real `globals.css` and the exact class names/markup structure `task-board.tsx`/`page.tsx` produce, populated with clearly-fictional placeholder task text for layout-inspection purposes only) — this file was deleted after review and was never part of the app or committed. This is a real gap relative to a full end-to-end check and is called out below.
- Responsive behavior was verified by reading the CSS rules, not by an automated narrow-viewport screenshot — the available browser-automation window-resize tool did not change the captured viewport size in this environment. The breakpoints use standard, conventional patterns (flex-wrap, grid column collapse, flex-direction switch at 640px/560px).

## Problems or Risks

- **No real authenticated end-to-end visual check was performed against the live app** in this environment, for the reason above (no local OAuth/DB credentials, and provisioning them was out of scope for a UI task). The static-preview check gives high confidence the markup/CSS is correct (same class names, same CSS file), but it is not the same as clicking through the actual React component tree with real state transitions. Recommend either: the Lead/Test Agent runs `npm run dev` with real local credentials and clicks through create/edit/delete/search/filter/sort once, or this is verified on the next real deployment before Gate 2 sign-off for this change.
- **Mobile/tablet breakpoints were not confirmed with an actual narrow-viewport screenshot** in this pass, only by CSS review, due to a tooling limitation in this environment (see above). Recommend a quick manual phone-width check before presenting this as final.
- **Search and priority filter are new, small, client-side-only functionality**, not pure restyling — flagged above and here again since it's the one place this pass went slightly beyond "make it look better." No backend, schema, or security surface was touched by either addition.
- **Nothing was committed, pushed, or deployed as part of this handoff** — per the explicit instruction not to deploy and not to bypass gates. The working tree currently has these changes unstaged.

## Next Agent

Lead Agent.

## Required Action From Next Agent

Review the redesign (ideally via `npm run dev` with real local credentials, or the next deployment) before this is committed/pushed/deployed. No schema, auth, or Route Handler re-approval is needed — nothing in that surface changed — but the two small additive UI-only features (search, priority filter) are called out above in case the Lead Agent wants to explicitly note them in `evidence/validation.md` rather than have them pass silently as "just a reskin." No deployment was performed by this agent.

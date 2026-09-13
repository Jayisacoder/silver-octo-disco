# Task

Research the data model, authentication/authorization approach, API architecture, validation approach, edge cases, and testing strategy for a user-owned Task Management feature (title, description, status enum, priority enum, timestamps, owning user), before any implementation begins. Research only — no code, schema, or config changes made.

## Input Received

- Feature scope from the Lead Agent: signed-in users create/view/update/delete their own tasks; task fields are title, description, status (TODO | IN_PROGRESS | COMPLETED), priority (LOW | MEDIUM | HIGH), createdAt, updatedAt, owning user; strict ownership enforcement (no IDOR).
- Current repo state: `prisma/schema.prisma` has only a placeholder `FeatureSubmission` model, no `User` model. `next-auth@4.24.7` and `@next-auth/prisma-adapter@1.0.7` are installed but completely unwired (no `[...nextauth]` route, no provider config, no session usage anywhere in `src/app`).
- Constraints from `docs/REQUIRED-STACK.md` and `docs/TESTING.md`: Prisma must persist real feature data (not just auth records); Google OAuth must be a real server-enforced session with ownership checks; tests run via `node --test tests/**/*.test.mjs`, must exit nonzero on failure, must use controlled/mocked auth (no interactive Google consent in commits), must not touch production data, and need an isolated test database.
- App Router project (Next.js 14.2.15), TypeScript, no auth or feature code exists yet in `src/app` (only `layout.tsx`, `page.tsx`, `globals.css`).

## Work Completed

- Reviewed `prisma/schema.prisma`, `package.json`, `.env.example`, `tests/basic-config.test.mjs`, `docs/REQUIRED-STACK.md`, `docs/TESTING.md`.
- Reviewed the other agent definitions this handoff feeds (`jayisacoder-lead.md`, `jayisacoder-database.md`, `jayisacoder-developer.md`) to keep recommendations inside their stated boundaries (Database Agent owns `prisma/schema.prisma`; Developer Agent owns `src/**`).
- Worked out a concrete Prisma model shape, the minimal NextAuth-v4-adapter-required `User`/`Account`/`Session`/`VerificationToken` shape, an ownership-enforcement pattern, an API-architecture recommendation, a validation approach, an edge-case list, and a testing strategy — detailed below.

## Files Changed

- `docs/agent-handoffs/research.md` (this file) — replaces the prior foundation-setup research handoff, which is now superseded.
- No application code, schema, config, or test files were modified (out of scope for this agent).

## Decisions Made

### 1. Task data model

```prisma
enum TaskStatus {
  TODO
  IN_PROGRESS
  COMPLETED
}

enum TaskPriority {
  LOW
  MEDIUM
  HIGH
}

model Task {
  id          String       @id @default(cuid())
  title       String       @db.VarChar(200)
  description String?      @db.Text
  status      TaskStatus   @default(TODO)
  priority    TaskPriority @default(MEDIUM)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  userId      String
  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

- **Enum vs. string+validation: use Prisma native `enum`.** The datasource is `postgresql` (per current `schema.prisma`), and Postgres has first-class enum support, so there is no SQLite-style reason to fall back to string+validation. A DB-level enum rejects invalid values at the storage layer as a second line of defense behind app-layer validation, and Prisma generates a matching TypeScript union so invalid literals are also caught at compile time. String+validation would only be worth it if the enum's value set were expected to change frequently or the DB provider didn't support enums — neither applies here.
- **Indexes:** `@@index([userId])` is the important one — every task query in this feature filters by owner, so an unindexed foreign-key scan would be the main hot path. A compound `@@index([userId, status])` is a reasonable future addition if a "tasks by status" dashboard view is added, but isn't required for basic CRUD and is called out as optional rather than committed now.
- `title` is bounded (`VarChar(200)`) at the DB layer as a backstop to app-layer validation; `description` is optional, unbounded text.

### 2. User/Account/Session/VerificationToken shape (NextAuth v4 + `@next-auth/prisma-adapter`)

This is the standard shape the adapter requires (field names and types are load-bearing — the adapter reads/writes these exact columns):

```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  accounts      Account[]
  sessions      Session[]
  tasks         Task[]
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}
```

- **`Task.userId` → `User.id` is one-to-many** (`User.tasks Task[]`), same pattern as `Account`/`Session`.
- **`onDelete: Cascade`** on `Task.user`, `Account.user`, and `Session.user`: a task has no meaning without its owner, so deleting a user should delete their tasks rather than leaving orphaned rows with a dangling `userId`. This also avoids a foreign-key violation blocking user deletion.
- **Session strategy: `database`**, not `jwt`. The Prisma adapter is installed specifically to back real `Session` rows; use `session: { strategy: "database" }` in `authOptions` so `getServerSession` performs a real DB lookup per request. This is also what makes the "seed a session row directly" test strategy (below) possible without going through Google at all.

### 3. Authentication / access-control considerations

- **Where the route lives:** `src/app/api/auth/[...nextauth]/route.ts`, exporting `GET`/`POST` handlers built from `NextAuth(authOptions)`, with `authOptions` (GoogleProvider + `PrismaAdapter(prisma)` + `session: { strategy: "database" }`) factored into its own module (e.g. `src/lib/auth.ts`) so it can be imported by both the route and any server-side code that needs `getServerSession(authOptions)`.
- **Reading the session server-side:** call `getServerSession(authOptions)` inside every task Route Handler, not middleware. Middleware in the App Router runs on the Edge runtime by default, which complicates using the Node-only Prisma adapter/session lookup; calling `getServerSession` directly inside each Node-runtime Route Handler is simpler and keeps the DB session check colocated with the ownership check.
- **Ownership enforcement — the core IDOR defense:** every read, update, and delete must filter by both the task id *and* the session's `userId` in the same Prisma query, e.g. `prisma.task.findFirst({ where: { id, userId: session.user.id } })` (or `updateMany`/`deleteMany` with the same compound `where` for writes, checking the returned count). Never fetch a task by `id` alone and check ownership afterward as a separate step — combining the filter into the query itself removes any window where a wrong branch could return or mutate another user's row.
- **Not leaking existence:** when a task doesn't exist *or* belongs to another user, return the same `404` in both cases (never a `403` that would confirm the id belongs to someone else). This prevents an attacker from enumerating valid task ids belonging to other users.
- **Never trust a client-supplied `userId`.** Reject/ignore any `userId` field in a request body; the owning user always comes from the server-verified session, both on create and on any update.
- **Unauthenticated requests** must be rejected (`401`) before any Prisma call is made — check `session` truthiness first in every handler.

### 4. Recommended API/server architecture

**Recommendation: Route Handlers** under `src/app/api/tasks/route.ts` (list/create) and `src/app/api/tasks/[id]/route.ts` (get/update/delete), not Server Actions.

Justification, weighed specifically against this project's testing constraint (`node --test`, no browser, no interactive Google consent):
- Route Handlers are plain functions that accept a `Request` and return a `Response`/`NextResponse` — they can be exercised directly with `node --test` either by importing the handler module and invoking it with a constructed `Request` object, or by running the Next server and hitting it with `fetch`. Either path stays inside Node with no browser or React render tree involved.
- Server Actions are invoked through Next's internal RPC-like encoding tied to a rendered client component/form; reproducing that from a plain Node test is significantly more scaffolding for no benefit here, since this feature has no need for progressive-enhancement form semantics.
- Route Handlers give explicit HTTP status codes (`401`, `404`, `422`, etc.), which maps directly onto both the IDOR "same 404" requirement above and the validation "useful failure feedback" requirement below.
- Auth mocking is more straightforward against Route Handlers: a session can be established for a test either by seeding a real `Session` row and sending its `sessionToken` cookie, or by structuring the handler to read the session through a small seam that a test can substitute — both integrate more naturally with a fetch-based or handler-import-based test than with Server Actions.

### 5. Validation approach

- Use `zod` (or an equivalent minimal schema-validation library) to define a `TaskInput` schema in a shared module, e.g.:
  - `title`: string, trimmed, min length 1, max length 200 (matching the DB column).
  - `description`: optional string, max length ~2000.
  - `status`: must be one of the `TaskStatus` enum values.
  - `priority`: must be one of the `TaskPriority` enum values.
  - Use a "strict"/no-unknown-keys parse so an extra field (e.g. a client trying to smuggle `userId`) is rejected rather than silently dropped or accepted.
- Parse the request body at the top of every `POST`/`PATCH` handler, inside a `try/catch` that also covers `request.json()` itself throwing on malformed JSON.
- **Rejected-input response shape** (useful failure feedback, per requirement): a `422` with a structured body, e.g.
  ```json
  { "error": "ValidationError", "fields": { "title": "Title is required" } }
  ```
  so the caller gets both a machine-checkable `error` code and a field-level message, not just a bare "400 Bad Request."

### 6. Important edge cases

- Empty title / whitespace-only title → `422`.
- Title exceeding max length → `422`.
- Oversized description → `422`.
- Invalid `status`/`priority` value not in the enum → `422` (zod enum parse rejects before it ever reaches Prisma).
- Malformed/non-JSON request body → `400`.
- Missing or malformed task id (not a valid cuid shape) → `400` or `404` (treat as not-found rather than a 500).
- Task id well-formed but no such row → `404`.
- Task exists but is owned by a different user → `404` (identical response to "doesn't exist," per the IDOR note in §3).
- Unauthenticated request to any task endpoint → `401`, checked before any DB access.
- Double-delete / delete of an already-deleted task → idempotent `404`, not a server error.
- Concurrent updates to the same task from two sessions/tabs: **flagged as an accepted MVP limitation, not solved by this research.** A future enhancement would compare `updatedAt` (optimistic concurrency) before applying an update; the Lead Agent should confirm at Gate 1 whether this is in scope or explicitly deferred.

### 7. Testing strategy

- **Isolated test database:** point tests at a separate `DATABASE_URL` (e.g., a distinct local/CI Postgres database or schema, documented as `DATABASE_URL_TEST` or via a `.env.test`) — never the same connection string used for local dev or production. Run `prisma db push` (or migrations) against that test database before the suite runs, and reset task/user/session rows between tests (`deleteMany` in setup/teardown) so tests don't leak state into each other. This is the Database Agent's responsibility to finalize alongside its schema/setup handoff, since it owns database setup documentation.
- **Controlled/mocked authentication (no interactive Google consent):** recommended primary approach is to seed a real `User` row plus a real `Session` row (with a known `sessionToken`) directly into the test database, then send that `sessionToken` as the request cookie when calling the Route Handlers in tests. This exercises the *real* `getServerSession`/adapter code path end-to-end without touching Google at all, and without needing to fake or intercept NextAuth internals. A lighter-weight alternative for narrowly-scoped unit tests is dependency-injecting the session lookup (a small `getSession(req)` seam the handler calls, swappable in tests) — useful for the Unit Testing Agent's more granular tests, while the seeded-session-cookie approach is better suited to the Test/QA Agent's end-to-end ownership checks since it doesn't rely on mocking framework internals.
- **Unit Testing Agent** (focused, per-handler): validation rejection cases (empty title, bad enum values, oversized fields, malformed JSON), the ownership-filter construction, and default-value behavior (default `status`/`priority` on create) — against the isolated test DB or a lightly mocked Prisma client.
- **Test/QA Agent** (independent, end-to-end): seed two distinct users/sessions (A and B) and their tasks against the isolated test DB, then assert: user A cannot read/update/delete user B's task (expect `404` in every case); an unauthenticated request gets `401`; a full create→read→update→delete lifecycle persists correctly and is retrievable after a fresh read (proving data "survives reload"); the production build passes.
- Both suites must run under `node --test`, exit nonzero on any failure, and must never point at a production `DATABASE_URL`.

## Tests/Verification

- No tests were run — this is a research-only handoff and no code exists yet to test. Verification here consists of: cross-checking the proposed `User`/`Account`/`Session`/`VerificationToken` shape against the documented `@next-auth/prisma-adapter` schema requirements for NextAuth v4, and cross-checking the proposed architecture against `docs/REQUIRED-STACK.md` and `docs/TESTING.md`'s constraints (server-enforced access, ownership enforcement, isolated test DB, no interactive consent in tests).

## Problems or Risks

- **NextAuth v4 + App Router is a supported but slightly dated pairing.** v4 predates the App Router; the route-handler + `getServerSession(authOptions)` pattern recommended here is the documented compatibility path and is expected to work, but the Developer Agent should double check the exact `authOptions` import/usage against the installed `next-auth@4.24.7` release notes if anything behaves unexpectedly, rather than assuming v5/Auth.js patterns apply.
- **The seeded-session-cookie vs. dependency-injected-session test strategy is itself an architecture decision, not just a research footnote.** It affects how the Developer Agent structures the Route Handlers (whether session lookup goes through a swappable seam) and how the Unit Testing/Test Agents write their fixtures. This should be explicitly confirmed at Gate 1 rather than assumed, since it crosses from "how to test" into "how the handler code is shaped."
- **No optimistic concurrency is proposed for the MVP.** If the acceptance criteria implicitly requires safe concurrent edits, this is a gap; otherwise it's an acceptable, explicitly-flagged limitation.
- **DB column length vs. validation length must stay in sync.** If `title`'s zod `max()` and the Prisma `@db.VarChar(n)` length ever drift apart, an over-length title could fail as an unhandled DB error instead of a clean `422` — the Database Agent and Developer Agent should keep these two numbers as a single agreed constant.
- **Test database provisioning is not yet decided** (local Docker Postgres vs. a second logical database vs. a separate schema) — left to the Database Agent's setup documentation; this research only establishes that it must be isolated from dev/production data.

## Next Agent

Lead Agent

## Required Action From Next Agent

Present this research handoff to Alpha and Bravo for Gate 1 review and approval — specifically the Task/User/Account/Session schema shape, the Route Handlers vs. Server Actions decision, the ownership/IDOR enforcement pattern, the validation approach, and the seeded-session-cookie testing strategy. Do not begin database, implementation, unit-testing, or deployment work until that explicit, dated Gate 1 approval is recorded in `evidence/validation.md`.

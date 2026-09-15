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

---

# 2026-09-13 Addendum: Google OAuth redirect URI / authorized origin configuration

## Task

Research and document exactly what Google OAuth redirect URI / authorized origin configuration this project's NextAuth v4 setup needs, for both local development and a Vercel production deployment, so Bravo (who is setting up the real Google Cloud Console OAuth client) has the exact values to register. Research only — no code, schema, or config changes made.

## Input Received

- Scoped by the Lead Agent: confirm the exact route path this app actually uses (don't assume), then give Bravo concrete redirect URI / origin / `NEXTAUTH_URL` values for local dev and Vercel production, confirm whether one Google OAuth client can hold both, and flag the `NEXTAUTH_URL`-vs-registered-redirect-URI mismatch failure mode.
- Existing repo state consulted: `src/lib/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `package.json`, `.env.example`, `docs/REQUIRED-STACK.md`, and the prior Gate-1-approved research above (which already established the route location and `session: { strategy: "database" }`).

## Work Completed

- Read `src/app/api/auth/[...nextauth]/route.ts`: it calls `NextAuth(authOptions)` and exports the result as both `GET` and `POST`. Under Next.js App Router file-based routing, a route handler at `src/app/api/auth/[...nextauth]/route.ts` serves every path under `/api/auth/*` — this is the actual mount point, not an assumption.
- Read `src/lib/auth.ts`: `authOptions.providers` contains exactly one provider, `GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID ?? '', clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '' })`. NextAuth v4's provider id for `next-auth/providers/google` is `google`.
- Read `package.json`: confirmed installed version is `"next-auth": "^4.24.7"` — genuinely v4 (Auth.js/NextAuth v5's different route/callback conventions do not apply here).
- Read `.env.example`: `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`, `AUTH_SECRET`, and `AUTH_TRUST_HOST` are already documented as expected variable names (values blank, as required — no secrets committed).
- Cross-checked NextAuth v4's documented callback URL convention (`/api/auth/callback/:provider`, mounted wherever the catch-all `[...nextauth]` route lives) against the confirmed mount point above: for this repo, provider id `google`, that resolves to `/api/auth/callback/google` off whatever origin `NEXTAUTH_URL` is set to.

## Files Changed

- `docs/agent-handoffs/research.md` (this addendum only, appended below the existing Gate-1-approved content, which was not altered or removed).
- No application code, schema, config, or `.env.example` was modified — read-only research per this agent's boundary.

## Decisions Made / Findings

### 1. Exact redirect URI values for Bravo to register

Because the catch-all route lives at `src/app/api/auth/[...nextauth]/route.ts` and the only configured provider id is `google`, NextAuth v4 always builds the callback URL as `<NEXTAUTH_URL origin>/api/auth/callback/google`. Concretely, in Google Cloud Console → Credentials → the OAuth 2.0 Client ID → **Authorized redirect URIs**, register:

- **Local development:** `http://localhost:3000/api/auth/callback/google`
  (assumes the default Next.js dev port 3000, i.e. `npm run dev` with no `-p` override, matching `NEXTAUTH_URL=http://localhost:3000` in local `.env`.)
- **Vercel production:** `https://<your-vercel-domain>/api/auth/callback/google`
  Substitute `<your-vercel-domain>` with whatever the real deployed domain is once it exists — either the auto-generated `*.vercel.app` domain Vercel assigns the project, or a custom domain if one is attached. This must be typed in **after** the Vercel deployment exists and its domain is known, then registered as a second URI on the same client (see §3). If Vercel preview deployments (unique URL per PR/branch) also need to complete a real Google sign-in during review, each preview's unique domain would need its own registered redirect URI too, since Google matches redirect URIs by exact string, not by wildcard/pattern — flagged as a decision for Alpha/Bravo, not resolved here (a common workaround is to only exercise Google sign-in against Preview branch domains that are pinned, or to rely on the seeded-session-cookie test strategy from the Gate-1 research above for anything that doesn't need a real Google round trip).

### 2. `NEXTAUTH_URL` value per environment, and why mismatches break OAuth

- **Local:** `NEXTAUTH_URL=http://localhost:3000`
- **Vercel production:** `NEXTAUTH_URL=https://<your-vercel-domain>` — the exact same origin used in the registered redirect URI above (scheme + host, no trailing slash, no path).

NextAuth v4 does not discover its own public URL reliably from the incoming request in every deployment configuration — it uses `NEXTAUTH_URL` (falling back to `VERCEL_URL`-derived detection in some cases, which is not guaranteed to match a custom domain) to build the redirect URI it sends to Google as part of the OAuth `redirect_uri` parameter. Google's OAuth server then rejects the callback with `redirect_uri_mismatch` unless the exact string NextAuth constructs (`<NEXTAUTH_URL>/api/auth/callback/google`) is byte-for-byte one of the URIs registered on the Google client (scheme, host, port, and path all matter — `http` vs `https`, a missing/extra trailing slash, or the wrong port all count as a mismatch). This is why `NEXTAUTH_URL` being unset, stale, or pointed at the wrong origin (e.g. left as the local value in a Vercel environment, or pointed at a preview URL that doesn't match the registered one) is the most common cause of Google OAuth failing in an otherwise-correct setup — the failure surfaces as a redirect to Google's own error page, not a NextAuth application error, which is why it's easy to misdiagnose as a code bug. Bravo should set `NEXTAUTH_URL` as a Vercel project environment variable (Production, and Preview if preview-domain sign-in is needed) pointed at the real deployed origin, not left blank or copied from `.env.example`.

### 3. One Google OAuth client can hold both URIs — no need for two apps

Yes — a single Google OAuth 2.0 Client ID's **Authorized redirect URIs** field accepts multiple entries. Bravo can add both:
```
http://localhost:3000/api/auth/callback/google
https://<your-vercel-domain>/api/auth/callback/google
```
on the same client, and NextAuth will simply present whichever one matches the `NEXTAUTH_URL` active in that running environment. There is no need to create a second Google Cloud OAuth client/app for production — only a second entry on the existing client's redirect URI list (plus, per §1, an additional entry for any preview domain that needs real Google sign-in).

### 4. Authorized JavaScript origins

Google Cloud Console's OAuth client form also has a separate **Authorized JavaScript origins** field (distinct from redirect URIs — origins only, no path). Because NextAuth v4's Google provider uses the standard server-side OAuth authorization-code flow (a full-page redirect to Google and back to the `/api/auth/callback/google` route handler, not a client-side/implicit `google.accounts.id` JS SDK flow), Authorized JavaScript origins are not strictly required for this flow to function — Google's own console UI treats the field as optional for this OAuth client type when only server-side redirect flow is used. That said, it is low-cost and commonly done defensively to register the same origins as JavaScript origins (without the path):
```
http://localhost:3000
https://<your-vercel-domain>
```
so that if any future feature adds a client-side Google Identity Services button/prompt, the origins are already registered rather than needing a second round-trip through Console.

## Tests/Verification

Research-only work — nothing to execute. Verification performed by cross-checking the recommendation against actual repo state rather than assumed defaults:
- Confirmed route mount point by reading `src/app/api/auth/[...nextauth]/route.ts` directly (catch-all under `src/app/api/auth/`, handler built from `NextAuth(authOptions)`), rather than assuming a conventional path.
- Confirmed installed `next-auth` major version is 4 (`"^4.24.7"` in `package.json`), not 5 — v4's `/api/auth/callback/:provider` convention was used, not v5/Auth.js conventions, which differ.
- Confirmed the only configured provider id is `google` by reading `authOptions.providers` in `src/lib/auth.ts` directly.
- Confirmed `NEXTAUTH_URL` is already the expected env var name for this project by reading `.env.example`, rather than guessing a variable name.

## Problems or Risks

- **The real Vercel domain does not exist yet.** This handoff gives the exact pattern and substitution rule, not a literal final URL — Bravo (or whoever completes the Vercel deployment) must fill in `<your-vercel-domain>` once Vercel assigns/attaches it, and update both the Google Console redirect URI and the Vercel `NEXTAUTH_URL` environment variable to match, in the same commit/change so they can't drift apart.
- **Preview deployments are an open question, not resolved here.** If Alpha/Bravo want a real interactive Google sign-in to work against Vercel Preview URLs (which change per branch/PR), each such URL needs its own registered redirect URI, which doesn't scale to arbitrary preview URLs. This should be decided explicitly (e.g., "Preview environments rely on the seeded-session-cookie test strategy and never exercise real Google sign-in") rather than assumed.
- **Local dev port assumption.** The `http://localhost:3000` value assumes `next dev`'s default port; if a learner's machine runs the dev server on a different port (e.g., 3000 already in use), both `NEXTAUTH_URL` and the registered local redirect URI must be updated together to match the actual port in use.
- **`NEXTAUTH_SECRET`/`AUTH_SECRET` and `AUTH_TRUST_HOST` are out of scope for this addendum** (already listed in `.env.example`, not part of the redirect-URI/origin question asked) — flagged only so Bravo doesn't assume this addendum covers all NextAuth environment configuration; it covers redirect URI/origin/`NEXTAUTH_URL` specifically.

## Next Agent

Lead Agent

## Required Action From Next Agent

Hand this addendum to Bravo for the actual Google Cloud Console OAuth client registration: add both redirect URIs (§1) to the existing/new Google OAuth client, set `NEXTAUTH_URL` correctly in each environment (§2) — including as a real Vercel project environment variable once the Vercel domain is known — confirm a single client covers both environments (§3), and optionally register the matching Authorized JavaScript origins (§4). Bravo should also get an explicit decision from Alpha on the open preview-deployment question flagged above before assuming preview URLs need their own registered redirect URIs.

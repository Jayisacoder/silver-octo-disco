# Task

Implement the Gate 1-approved Prisma schema for the Task Management feature (`Task`, `TaskStatus`/`TaskPriority` enums, and the NextAuth-v4-adapter-required `User`/`Account`/`Session`/`VerificationToken` models) in `prisma/schema.prisma`, document database setup/initialization for another developer, and document the isolated test database approach. Schema authoring only — no live database connection exists yet, so no `prisma db push` / `prisma generate` was run against a real database.

## Input Received

- The Gate 1-approved schema from the Lead Agent (sourced from `docs/agent-handoffs/research.md`, approval recorded in `evidence/validation.md`, 2026-09-12, Alpha).
- Current repo state: `prisma/schema.prisma` had only a placeholder `FeatureSubmission` model (from the prior foundation-setup handoff) and no `User`/auth models.
- `.env.example` already documented `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `AUTH_SECRET`, `AUTH_TRUST_HOST`, `NEXT_PUBLIC_APP_NAME`.

## Work Completed

- Replaced the placeholder `FeatureSubmission` model in `prisma/schema.prisma` with the full approved schema: `TaskStatus` enum, `TaskPriority` enum, `Task` model (with `@@index([userId])` and `onDelete: Cascade` on the user relation), and the `User` / `Account` / `Session` / `VerificationToken` models required by `@next-auth/prisma-adapter` (database session strategy). `generator client` and `datasource db` blocks were left untouched.
- Added `DATABASE_URL_TEST` to `.env.example` (name only, no value) for the isolated test database, with an inline comment stating it must point at a separate database/instance from `DATABASE_URL`.
- Ran `npx prisma validate` with a throwaway, non-real `DATABASE_URL` value supplied only for that command's env (never written to any file) — schema is syntactically valid. This did not connect to any database.

## Files Changed

- `prisma/schema.prisma` — placeholder model removed; approved `Task`/`TaskStatus`/`TaskPriority`/`User`/`Account`/`Session`/`VerificationToken` models added.
- `.env.example` — added `DATABASE_URL_TEST` (name + comment only).
- `docs/agent-handoffs/database.md` — this handoff (supersedes the prior foundation-setup handoff).

## Decisions Made

- **Removed `FeatureSubmission` rather than keeping it.** It was only ever a foundation placeholder (per its own handoff: "keep the schema compatible... until the final feature is agreed"), was never part of any approved feature, and has no code referencing it anywhere in `src/`. Keeping it alongside the real schema would add dead surface area and an unused table to every environment for no benefit, so it was removed in favor of the real feature models.
- **Kept the approved schema as-is, no deviations.** Enums, field types/lengths (`title @db.VarChar(200)`, `description @db.Text`), the `@@index([userId])`, and all `onDelete: Cascade` relations were implemented exactly as specified in the Gate 1-approved research handoff. No additional indexes (e.g. the optional future `@@index([userId, status])`) were added since the research explicitly flagged that as optional/future, not part of this approval.
- **`db push` over migrations for this project.** `package.json` already ships a `prisma:db:push` script (and no `migrate` scripts), this is a small single-environment student project without a staged rollout process, and the schema is not expected to churn after Gate 1 approval. Migration history would add process overhead (tracked migration files, deploy-time `migrate deploy` step) with no corresponding benefit here. If the project later needs reproducible, reviewable schema history across environments (e.g. a real staging/prod split), switching to `prisma migrate dev`/`migrate deploy` would be the reasonable next step — noted as a risk below, not adopted now.
- **Test database identified via a second env var, `DATABASE_URL_TEST`**, per the research handoff's recommendation, rather than a same-named var swapped via `.env.test` — a distinctly-named variable makes it harder to accidentally run tests (which include `deleteMany` resets) against the dev/prod connection string.

## Tests/Verification

- `npx prisma validate` (dummy `DATABASE_URL` supplied inline to the command only, not persisted anywhere): schema is syntactically valid.
- Did **not** run `prisma generate` or `prisma db push` against any real database — no live `DATABASE_URL` is configured in this environment, and the task explicitly scoped this to schema authoring only.
- No application code exists yet to exercise the schema at runtime; that is the Developer Agent's responsibility next.

## Database setup / initialization procedure (for the next developer)

1. Copy `.env.example` to `.env` and fill in real values: `DATABASE_URL` (a PostgreSQL connection string for local/dev), plus the NextAuth/Google variables already documented there.
2. Install dependencies (`npm install`) if not already done.
3. Generate the Prisma client: `npm run prisma:generate`.
4. Push the schema to the database: `npm run prisma:db:push`. This creates/updates the `Task`, `User`, `Account`, `Session`, and `VerificationToken` tables (and the `TaskStatus`/`TaskPriority` enum types) directly from `prisma/schema.prisma` — no migration files are used on this project (see decision above).
5. Optional: `npm run prisma:studio` to inspect data visually during development.

### Isolated test database

- Provision a **second**, separate Postgres database/instance and set its connection string as `DATABASE_URL_TEST` in `.env` (never reuse the `DATABASE_URL` value — per `docs/TESTING.md`, tests must never touch production/dev data).
- Before running the suite, push the same schema to that database, e.g. `DATABASE_URL="$DATABASE_URL_TEST" npx prisma db push`, so it has the identical table/enum shape.
- The test setup/teardown code (owned by the Unit Testing/Test Agents) should point its `PrismaClient` at `DATABASE_URL_TEST` and reset `Task`/`Session`/`Account`/`User` rows (`deleteMany`, in FK-safe order: `Task` → `Account`/`Session` → `User`) between test files or test cases so state doesn't leak across tests.
- Per the research handoff's testing strategy: seed a real `User` row plus a real `Session` row (known `sessionToken`) into this test database to exercise `getServerSession` end-to-end via the session cookie, without any interactive Google consent.
- Any local/CI provisioning mechanism (a local Postgres instance, a Docker container, a second logical database on the same server, or a CI-provided Postgres service) is acceptable as long as it is a distinct database from dev/prod — the concrete choice is left to whoever wires up CI/local test running, since it doesn't affect the schema itself.

## Problems or Risks

- **`db push` has no migration history.** Acceptable for this project's scale and single-environment nature (see decision above), but if requirements later demand auditable schema change history or multi-environment promotion, this should be revisited in favor of `prisma migrate dev`/`deploy`.
- **`prisma validate` was the only check run; no connection to a real database was made.** The schema has not been exercised against an actual Postgres instance (enum creation, cascade deletes, unique constraints all remain unverified until `prisma:db:push` is run against a real `DATABASE_URL`). The Developer Agent (or whoever first provisions a real database) should run `npm run prisma:generate && npm run prisma:db:push` and confirm it completes cleanly before relying on the schema.
- **`title` length must stay in sync.** The DB column is `@db.VarChar(200)`; per the research handoff, the Developer Agent's zod validation max-length for `title` must match this exact number (200) so an over-length title fails as a clean `422` rather than an unhandled DB-level error.
- **Adapter field-shape sensitivity.** The `Account`/`Session`/`VerificationToken` field names/types are exactly what `@next-auth/prisma-adapter` expects for NextAuth v4 with `session: { strategy: "database" }`; if the Developer Agent needs to deviate from this shape for any reason, it should be treated as a schema change requiring this agent's involvement, not a silent adjustment in application code.
- **No `DATABASE_URL`/`DATABASE_URL_TEST` real values exist in this environment.** Nothing was connected to; both variables are documented as names only in `.env.example`, consistent with the "never commit real secret values" instruction at the top of that file.

## Next Agent

Lead Agent

## Required Action From Next Agent

The Lead Agent should delegate implementation (Route Handlers, auth wiring) to the Developer Agent next, using this schema and the setup/test-database documentation above as the stable data-layer foundation. The Developer Agent should provision a real `DATABASE_URL` (and eventually `DATABASE_URL_TEST`), run `npm run prisma:generate` and `npm run prisma:db:push` for the first time against a real database, and confirm they succeed before building the auth/task Route Handlers on top of this schema.

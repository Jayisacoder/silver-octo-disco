# Project 3 — AI Software Development Team

## Project Overview

This project is a Task Management application built using a coordinated AI software development team.

The application allows authenticated users to create, view, update, and delete their own tasks. Tasks are persisted in PostgreSQL through Prisma and protected through Google OAuth authentication and server-side authorization.

The purpose of this project is not only to build a working application, but also to demonstrate a structured AI-assisted software development workflow using specialized agents, bounded delegation, agent handoffs, automated testing, independent verification, human approval gates, and controlled deployment.

---

# 1. Project Purpose

## Application

Build a simple authenticated Task Management application for individual users.

Each authenticated user should be able to manage their own tasks.

The application must support:

- Creating tasks
- Viewing tasks
- Updating tasks
- Deleting tasks
- Changing task status
- Setting task priority
- Persisting tasks in PostgreSQL
- Protecting tasks so users can only access their own data

## Intended User

The intended user is an individual who wants a simple application for keeping track of personal tasks.

The application is not intended to be a collaborative project-management platform.

## Primary Problem

Users need a simple way to keep track of tasks and their current progress without exposing one user's tasks to another user.

---

# 2. Core Feature

## User Task Management

The primary application feature is authenticated CRUD task management.

An authenticated user can:

1. Create a task
2. View their tasks
3. View the details of one of their tasks
4. Edit one of their tasks
5. Delete one of their tasks
6. Change a task's status
7. Change a task's priority

Unauthenticated users must not be able to access protected task functionality.

A user must never be able to access, modify, or delete another user's task.

---

# 3. Task Data Model

The Task model should contain the information necessary to support the core feature.

Expected fields include:

- `id`
- `userId`
- `title`
- `description`
- `status`
- `priority`
- `createdAt`
- `updatedAt`

## Status

Tasks must support these statuses:

```text
TODO
IN_PROGRESS
COMPLETED
```

## Priority

Tasks must support these priorities:

```text
LOW
MEDIUM
HIGH
```

---

# 4. Acceptance Criteria

The feature is successful when all of the following are true.

- An authenticated user can create a task.
- The task is persisted through Prisma.
- The task belongs to the authenticated user (never trusted from client input).
- The user can view their own tasks.
- The user can update their own tasks (including status and priority).
- The user can delete their own tasks.
- A user can never view, update, or delete another user's task, including by guessing or tampering with a task ID (IDOR).
- Invalid input (missing/empty title, over-length fields, invalid status/priority values, malformed JSON) is rejected with useful feedback, not a crash.
- Unit tests cover expected behavior, edge cases, and failure paths.
- The Test Agent independently validates the complete feature, not just the unit-test results.
- The application passes `npm run test:unit`, `npm test`, and `npm run build`.
- The feature works on the live Vercel deployment (Google sign-in, protected access, Prisma-backed persistence) after human approval.

Out of scope for this feature: task sharing/collaboration between users, file attachments, notifications/reminders, recurring tasks, and any multi-user/team functionality.

---

# 5. Required Technology Design

- **Prisma**: `prisma/schema.prisma` defines `Task` (with `TaskStatus`/`TaskPriority` enums, `userId` foreign key, `@@index([userId])`) plus the `User`/`Account`/`Session`/`VerificationToken` models required by `@next-auth/prisma-adapter`. Another developer initializes the database with `npm run prisma:generate` then `npm run prisma:db:push` against a real `DATABASE_URL` (see `docs/agent-handoffs/database.md`).
- **Google OAuth**: `src/lib/auth.ts` configures NextAuth v4 with `GoogleProvider` + `PrismaAdapter(prisma)` + `session: { strategy: "database" }`, wired at `src/app/api/auth/[...nextauth]/route.ts`. Every task route handler calls `getServerSession(authOptions)` before touching the database and rejects unauthenticated requests with `401`.
- **Vercel**: the build is already confirmed compatible (all `/api/tasks*` routes are correctly dynamic, not statically prerendered). Production needs real `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET` set as Vercel environment variables, and the Google OAuth client's authorized redirect URI updated to the deployed URL.
- Required stack acceptance criteria are tracked against `docs/REQUIRED-STACK.md` in `evidence/validation.md` and `evidence/deployment.md`.

---

# 6. Development Commands

```bash
npm install
npm run dev          # local dev server
npm run prisma:generate
npm run prisma:db:push   # requires a real DATABASE_URL
npm run test:unit     # node --test tests/**/*.test.mjs
npm test               # same suite today; must include every additional required suite as they're added
npm run build          # next build
npm run hooks:install  # installs the required commit gate (.githooks)
```

`npm run test:all` (repository gate tests + unit tests + `npm test`) and `npm run build` must both pass before any commit; the installed hook enforces this and must not be bypassed except with explicit, recorded learner authorization for a confirmed environment-only failure (see `evidence/validation.md`).

---

# 7. Learner Identity and Agent Naming

GitHub username: `jayisacoder`
Unique learner ID: `jayisacoder`

| Role | Filename | Agent `name` | Owner |
|---|---|---|---|
| Lead Agent | `.claude/agents/jayisacoder-lead.md` | `jayisacoder-lead` | Alpha |
| Research Agent | `.claude/agents/jayisacoder-research.md` | `jayisacoder-research` | Alpha |
| Test Agent | `.claude/agents/jayisacoder-test.md` | `jayisacoder-test` | Alpha |
| Database Agent | `.claude/agents/jayisacoder-database.md` | `jayisacoder-database` | Bravo |
| Developer Agent | `.claude/agents/jayisacoder-developer.md` | `jayisacoder-developer` | Bravo |
| Unit Testing Agent | `.claude/agents/jayisacoder-unit-testing.md` | `jayisacoder-unit-testing` | Bravo |
| DevOps Agent | `.claude/agents/jayisacoder-devops.md` | `jayisacoder-devops` | Bravo |

All six required roles exist as learner-authored agent definitions under `.claude/agents/`. "Alpha"/"Bravo" are the two humans pairing on this submission, not separate learner IDs — every agent shares the one `jayisacoder-` prefix.

---

# 8. Agent Responsibilities and Delegation

Each agent's full responsibilities, inputs/outputs, allowed/forbidden files, and handback conditions are defined in its own file under `.claude/agents/` — this section summarizes the delegation flow, it does not restate every boundary.

- **Lead Agent** coordinates: breaks a feature request into tasks, delegates to the specialized agents below, reads every handoff in `docs/agent-handoffs/`, and enforces both human approval gates. It does not write application code itself.
- **Research Agent** investigates architecture/security/testing approaches before implementation and produces `docs/agent-handoffs/research.md`. Read-only; never implements.
- **Database Agent** owns `prisma/schema.prisma` and database setup documentation (`docs/agent-handoffs/database.md`).
- **Developer Agent** implements the approved feature in `src/**` and produces `docs/agent-handoffs/implementation.md`. Does not change the approved schema or architecture without going back through the Lead Agent.
- **Unit Testing Agent** authors and runs focused tests in `tests/**` covering expected behavior, edge cases, and failures (`docs/agent-handoffs/unit-testing.md`). Runs through `npm run test:unit`.
- **Test Agent** independently verifies the complete suite, lint/typecheck, the production build, and every acceptance criterion — it must not simply trust the Unit Testing Agent's results (`docs/agent-handoffs/qa.md`).
- **DevOps Agent** verifies production configuration/environment variables and deploys to Vercel only after Gate 2 approval (`docs/agent-handoffs/release.md`).

Failures found by the Test Agent go back to the Lead Agent, which routes the fix to the responsible specialized agent; the feature returns to independent QA after any significant fix.

---

# 9. Reusable Skill

Created: `.claude/skills/jayisacoder-agent-handoff/SKILL.md` (Skill name `jayisacoder-agent-handoff`). Encodes the standard agent handoff procedure — verify the work with real command output, confirm the agent stayed inside its declared file boundary, write the `docs/agent-handoffs/*.md` handoff in the required template with a specific next agent and required action, then report back to the Lead Agent. Every specialized agent (Research, Database, Developer, Unit Testing, Test, DevOps) uses it after finishing delegated work, since they all repeat this exact procedure regardless of what the task was — it is a Skill rather than a one-off prompt because it is invoked repeatedly across different tasks and agents with a fixed, checkable completion condition, not a single instruction used once.

---

# 10. Human Approval Gates

## Gate 1 — before major implementation

Requires Alpha and Bravo to review and approve feature scope, research findings, architecture, and the implementation plan, recorded with a date in `evidence/validation.md` before implementation starts.

**Status for Feature Request #1 (Task Management): approved 2026-09-12 by Alpha, confirmed 2026-09-13 by Bravo** (both recorded in `evidence/validation.md`). Gate 1 is fully satisfied.

## Gate 2 — before production deployment

Requires Alpha and Bravo to review implementation, unit test results, independent QA results, the production build, and known limitations before the DevOps Agent may deploy.

**Status: not yet approved.** Independent QA recommended READY for everything verifiable in the development sandbox (lint, typecheck, 47/47 tests, build all pass), but explicitly flagged that real end-to-end persistence, real cross-user IDOR against live rows, and real Google sign-in/sign-out have not been verified — no real database or Google OAuth credentials have been configured yet. That verification must happen before Gate 2 is granted.

---

# 11. Boundaries and Failure Handling

- Secrets (database credentials, Google OAuth client secret, session secrets) are documented as variable **names only** in `.env.example` and must never be committed; real values live only in local `.env` (gitignored) or Vercel's environment configuration.
- Each agent's allowed/forbidden files are defined in its own `.claude/agents/*.md` file and must be respected — an agent finding a problem outside its boundary reports it to the Lead Agent rather than fixing it directly.
- When validation fails, the responsible agent (not the Lead Agent) fixes the underlying problem; tests are never deleted, disabled, or weakened to force a pass.
- When a requirement is unclear or a decision crosses from implementation detail into architecture (e.g., a testing strategy that shapes handler code), the agent flags it back to the Lead Agent for explicit confirmation rather than assuming.

---

# 12. Evidence and Completion

- Validation evidence (plan, approvals, delegation examples, acceptance-criteria results, test/build output): `evidence/validation.md`.
- Deployment evidence (approval, live URL, verification): `evidence/deployment.md`.
- Architecture diagram/export/overview: `docs/architecture/README.md` — **not yet completed**.
- The [Definition of Done](docs/DEFINITION-OF-DONE.md) is satisfied only once both approval gates are recorded, all required technologies are verified live on Vercel, and the architecture evidence check passes.
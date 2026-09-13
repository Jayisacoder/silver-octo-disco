# Learner-authored Project Instructions

This file is an unfinished design worksheet. Complete it for your AI Software Development Team project before using it as project instructions.

## Purpose and acceptance criteria

- What problem are you solving, and for whom?
- What observable results define success?
- What is outside the project scope?

## Required technology design

- How will Prisma persist and retrieve your feature data, and how will another developer initialize the database?
- How will Google OAuth establish a session, protect server-side access, and handle sign-out or failed sign-in?
- How will Prisma and Google OAuth work on Vercel, and what environment variable names and callback URLs need configuration?
- How will you demonstrate the [required stack acceptance criteria](docs/REQUIRED-STACK.md)?

## Development commands

- How is the application installed and run locally?
- What real commands will `test:unit`, `test`, and `build` execute? How will `npm test` include every additional suite?
- How will you require all tests to pass before code commits and ensure the [commit hook](docs/TESTING.md) remains installed?

## Learner identity and naming

- GitHub username: `jayisacoder`
- Unique learner ID: `jayisacoder`
- The learner ID follows the naming pattern in [docs/SUBMISSION.md](docs/SUBMISSION.md): lowercase letters and hyphens only, matching the GitHub-based prefix used for agent files and names.

### Role-to-name table

| Role | Agent filename | Agent `name` |
|---|---|---|
| Lead Agent | `.claude/agents/jayisacoder-lead.md` | `jayisacoder-lead` |
| Research Agent | `.claude/agents/jayisacoder-research.md` | `jayisacoder-research` |
| Database Agent | `.claude/agents/jayisacoder-database.md` | `jayisacoder-database` |
| Developer Agent | `.claude/agents/jayisacoder-developer.md` | `jayisacoder-developer` |
| Unit Testing Agent | `.claude/agents/jayisacoder-unit-testing.md` | `jayisacoder-unit-testing` |
| Test Agent | `.claude/agents/jayisacoder-test.md` | `jayisacoder-test` |
| DevOps Agent | `.claude/agents/jayisacoder-devops.md` | `jayisacoder-devops` |

- The architecture will connect these agents through the Lead Agent's delegation flow, the structured handoff documents in `docs/agent-handoffs/`, human approval gates, and the deployment path to Vercel.
- Architecture evidence will be captured in [docs/architecture/README.md](docs/architecture/README.md) with a shared diagram URL, exported diagram file, and written overview.

## Agent responsibilities and delegation

- What responsibilities, context, and allowed actions will each required agent have?
- How will your Unit Testing Agent author and run focused tests, and how will the Test Agent independently verify the complete suite?
- When should the Lead Agent delegate, and when should it work directly?
- How will results, failures, and disagreements return to the coordinating agent?

## Reusable Skills

- Which repeatable workflow will you encode as a Skill?
- What triggers it, and what evidence demonstrates completion?

## Human approval

- How will you require and record learner approval before implementation?
- How will you require and record learner approval before production deployment?
- What evidence must the learner review at each gate?

## Boundaries and failure handling

- How will you protect secrets and limit agent actions?
- What should happen when validation fails or requirements are unclear?

## Evidence and completion

- How will you map validation and deployment evidence to acceptance criteria?
- How will you verify the live application?
- How will you demonstrate the [Definition of Done](docs/DEFINITION-OF-DONE.md)?

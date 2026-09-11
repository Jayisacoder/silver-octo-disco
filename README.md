# Claude Code Agent Project Starter

Design, build, test, and explain your own Claude Code agent workflow, then deploy your application to Vercel with human approval.

## Branches

- `main` is the learner starter. It contains assignment requirements, unanswered design prompts, and empty application and evidence scaffolding.
- `solution` preserves the supplied reference agent definitions, Skills, and architecture. It is reference material, not a finished application.

Start your work from `main`. The branches have independent histories so the starter history contains no supplied solutions.

## Your project

Complete [Project 3 — AI Software Development Team](docs/project-ideas/03-software-development-team.md). Build your own agent team to research, implement, test, and deploy an application feature.

Define your intended user, problem, constraints, and 3–5 measurable acceptance criteria before implementation.

## What you will create

- Project-specific instructions in [CLAUDE.md](CLAUDE.md).
- At least one reusable Skill and your own agent definitions.
- A Lead Agent, Research Agent, Developer Agent, Test Agent, and DevOps Agent with bounded responsibilities.
- Your own delegation architecture, with at least two demonstrated delegation examples.
- A working application, automated tests, and a production build.
- Human approval gates for implementation and production deployment.
- Validation evidence and a verified live Vercel deployment.

The starter does not provide agent definitions or Skills. Create them in `.claude/agents/` and `.claude/skills/` as part of your project. Choose and justify how agents communicate, what they may do, and when they must return control to the learner.

## Getting started

1. Read the [Epic](docs/EPIC.md), [Features](docs/FEATURES.md), and [User Stories](docs/STORIES.md).
2. Use the [Tasks](docs/TASKS.md) to track your work.
3. Write your project instructions and design your architecture. Explain your decisions before asking an agent to implement them.
4. Choose an application framework and replace the placeholder commands in `package.json` with real test and build commands. Until then, both commands intentionally fail.
5. Create and demonstrate your Skills and agents, implement your application, and collect evidence against your acceptance criteria.
6. Obtain human approval before implementation and before production deployment. Verify the deployed application and record the results.

Use [src/](src/README.md) and [tests/](tests/README.md), or adapt the structure to your chosen framework. Document required environment variable names in `.env.example`; never commit secret values.

## Evidence and assessment

- [Validation evidence template](evidence/validation.md)
- [Deployment evidence template](evidence/deployment.md)
- [Definition of Done](docs/DEFINITION-OF-DONE.md)
- [Final Demo Rubric](docs/FINAL-DEMO-RUBRIC.md)

Prepare a 10–12 minute demonstration. Explain the difference between a prompt, a Skill, an agent, and a subagent; defend your delegation decisions and show how you retained human control.

## External references

- [Claude Code documentation](https://docs.anthropic.com/)
- [Vercel documentation](https://vercel.com/docs)

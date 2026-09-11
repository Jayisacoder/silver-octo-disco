# Claude Code Agent Project Starter

Design, build, test, and explain your own Claude Code agent workflow, then deploy your application to Vercel with human approval.

## Starting point

Start from `main`, which contains assignment requirements, design prompts, and empty application and evidence scaffolding.

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

## Steps to the goal

Follow these milestones in order. Use the detailed [task checklist](docs/TASKS.md) as your progress tracker.

| Step | Action | Evidence before moving on |
|---|---|---|
| 1. Set up | Clone [organizational `main`](https://github.com/LaunchPadPhilly/claude-code-agent-project), create your GitHub fork, connect it as `origin`, and create your submission branch. | Your fork URL and branch; see [submission instructions](docs/SUBMISSION.md). |
| 2. Define | Read Project 3 and write the feature, intended user, constraints, and 3–5 measurable acceptance criteria. | Your project definition in `CLAUDE.md`. |
| 3. Design | Plan your agent responsibilities, delegation, Skill, approval gates, and architecture. Reserve your unique naming prefix. | Your design in `CLAUDE.md`, including a role-to-agent-name table and architecture diagram. |
| 4. Approve | Present your implementation plan and review its scope and risks. | Dated learner approval in `evidence/validation.md` before implementation. |
| 5. Build | Author your agents and Skill, implement your feature, and configure real test/build commands. | Working application, five required agent roles, one reusable Skill, and two recorded delegation examples. |
| 6. Validate | Run tests and a production build; check every acceptance criterion and review your changes. Fix failures. | Commands, actual results, and delegation examples in `evidence/validation.md`. |
| 7. Deploy | Verify a preview, review evidence, approve production, deploy, and check the live feature. | Approval, production URL, and verification in `evidence/deployment.md`. |
| 8. Submit | Complete the Definition of Done, push to your fork, and open a PR to the instructor repository. | A review-ready PR with completed checklist and evidence links; prepare your 10–12 minute demo. |

The placeholder test and build commands intentionally fail until you replace them with real project checks. Keep your designs learner-authored; the starter supplies requirements, not implementations.

## Unique agent and Skill names

Follow the [naming rules and fork/PR submission guide](docs/SUBMISSION.md). Every agent filename and its `name` field must use your learner prefix, such as `<learner-id>-lead`; use that same identifier in delegation references. Prefix your Skill names and directories too.

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

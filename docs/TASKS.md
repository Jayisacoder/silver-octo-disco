# Tasks

[Back to Epic](EPIC.md) | [Features](FEATURES.md) | [Stories](STORIES.md)

Use the checkboxes as the learner's project tracker. Follow the [README milestones](../README.md#steps-to-the-goal) in order; the feature groups below organize requirements, not permission to skip approval gates.

## Setup — Fork and name your work

- [ ] Follow the [submission guide](SUBMISSION.md) to fork, clone, and create your submission branch from `main`.
- [ ] Choose your unique learner ID and record it with your GitHub username in `CLAUDE.md`.
- [ ] Plan your prefixed agent and Skill names; record the role-to-name mapping and architecture in `CLAUDE.md`.

## Feature 1 — Project Definition

### Story 1.1 Tasks

- [ ] Read [Project 3 — AI Software Development Team](project-ideas/03-software-development-team.md).
- [ ] Define the application feature your agent team will build.
- [ ] Write the project problem in your own words.
- [ ] Identify the intended user.
- [ ] Identify what a successful solution should do.

### Story 1.2 Tasks

- [ ] Write 3–5 measurable acceptance criteria.
- [ ] Identify at least one failure condition.
- [ ] Map each criterion to something that can be demonstrated.

---

## Feature 2 — Claude Code Configuration

### Story 2.1 Tasks

- [ ] Install or verify Claude Code.
- [ ] Open the starter repository.
- [ ] Read the design prompts in `CLAUDE.md`.
- [ ] Write your own project instructions in `CLAUDE.md`.
- [ ] Add any project-specific commands.
- [ ] Confirm the two approval gates are present.
- [ ] Ask Claude to summarize the repository rules.
- [ ] Correct any misunderstood rule.

---

## Feature 3 — Skills

### Story 3.1 Tasks

- [ ] Identify a workflow that benefits from a reusable Skill.
- [ ] Design the Skills needed by the project.
- [ ] Create at least one `.claude/skills/<learner-id>-<skill-purpose>/SKILL.md` with a matching prefixed Skill name.
- [ ] Define the Skill trigger/purpose.
- [ ] Define the procedure.
- [ ] Define completion evidence.
- [ ] Test the Skill on a small task.

### Story 3.2 Tasks

- [ ] Run the Skill during development.
- [ ] Compare the result against the Skill instructions.
- [ ] Save an example for the final demo.
- [ ] Explain why the workflow should be reusable.

---

## Feature 4 — Agents and Subagents

### Story 4.1 — Lead Agent

- [ ] Create your own `<learner-id>-lead.md` in `.claude/agents/`.
- [ ] Give every agent a `name` matching its prefixed filename stem and use it in all delegation references.
- [ ] Define its responsibilities and justify its boundaries.
- [ ] Define when it should delegate.
- [ ] Define when it should work directly.
- [ ] Confirm it cannot bypass approval gates.

### Story 4.2 — Research Agent

- [ ] Create your own `<learner-id>-research.md` in `.claude/agents/`.
- [ ] Confirm it has a read/investigation role.
- [ ] Ask it to identify relevant code for one feature.
- [ ] Review its findings.
- [ ] Correct any unsupported assumption.

### Story 4.3 — Developer Agent

- [ ] Create your own `<learner-id>-developer.md` in `.claude/agents/`.
- [ ] Generate an implementation plan.
- [ ] Review affected files.
- [ ] Review risks.
- [ ] Complete the implementation approval gate.
- [ ] Allow the Developer Agent to implement.
- [ ] Inspect the resulting Git diff.

### Story 4.4 — Test Agent

- [ ] Create your own `<learner-id>-test.md` in `.claude/agents/`.
- [ ] Run automated tests.
- [ ] Run the production build.
- [ ] Review acceptance criteria one by one.
- [ ] Record failures.
- [ ] Fix failures before continuing.
- [ ] Record results in `evidence/validation.md`.

### Story 4.5 — DevOps Agent

- [ ] Create your own `<learner-id>-devops.md` in `.claude/agents/`.
- [ ] Confirm Vercel CLI is available or choose Git integration.
- [ ] Identify deployment target.
- [ ] Review required environment variables.
- [ ] Confirm no secret is exposed to client-side code unintentionally.
- [ ] Confirm validation evidence exists.
- [ ] Complete production approval gate.
- [ ] Link the project to Vercel if needed.
- [ ] Deploy.
- [ ] Verify the production URL.
- [ ] Record evidence in `evidence/deployment.md`.

---

## Feature 5 — Approval Gates

### Story 5.1 — Implementation Gate

- [ ] Produce an implementation plan.
- [ ] Read the plan.
- [ ] Ask at least one question about the plan.
- [ ] Approve or reject the plan.
- [ ] Record the implementation plan and dated learner approval in `evidence/validation.md` before implementation starts.

Suggested learner command:

```text
APPROVED: implementation plan
```

### Story 5.2 — Production Gate

- [ ] Review test results.
- [ ] Review build result.
- [ ] Review `git diff`.
- [ ] Review known limitations.
- [ ] Confirm target Vercel project.
- [ ] Approve or reject deployment.

Suggested learner command:

```text
APPROVED: production deployment
```

---

## Feature 6 — Vercel Deployment

### Story 6.1 Tasks

- [ ] Authenticate with Vercel.
- [ ] Link the local repository to the correct Vercel project.
- [ ] Configure server-side environment variables.
- [ ] Run a preview deployment.
- [ ] Verify preview behavior.
- [ ] Obtain production approval.
- [ ] Run production deployment.

Choose and document your deployment method, including how it enforces the production approval requirement.

### Story 6.2 Tasks

- [ ] Open the production URL.
- [ ] Test the primary user flow.
- [ ] Test required routes/endpoints.
- [ ] Inspect deployment/runtime logs if needed.
- [ ] Record the production URL.
- [ ] Record deployment date.
- [ ] Record verification results.

---

## Feature 7 — Final Technical Demonstration

### Story 7.1 Tasks

- [ ] Prepare a 10–12 minute demo.
- [ ] Introduce the problem.
- [ ] State the acceptance criteria.
- [ ] Show `CLAUDE.md`.
- [ ] Show one Skill.
- [ ] Draw or explain the agent architecture.
- [ ] Demonstrate at least two delegation examples and record the named agent, task, result, and rationale in `evidence/validation.md`.
- [ ] Show implementation evidence.
- [ ] Show testing evidence.
- [ ] Explain the production approval gate.
- [ ] Show the live Vercel project.
- [ ] Explain how production was verified.
- [ ] Answer oral-defense questions without relying entirely on Claude.

## Submission — GitHub Pull Request

- [ ] Complete the [submission checklist](SUBMISSION.md#submission-checklist).
- [ ] Push your completed work to your fork's submission branch.
- [ ] Open a PR to instructor `main`, complete its evidence template, and mark it ready for review.
- [ ] Use the PR URL as your submission and respond to instructor feedback on the same branch.
- [ ] Keep the submission PR unmerged so instructor `main` remains starter-only.

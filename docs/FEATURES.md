# Features

[Back to Epic](EPIC.md) | [Stories](STORIES.md) | [Tasks](TASKS.md)

## Feature 1 — Project Definition and Success Criteria

The learner defines the application feature their AI Software Development Team will build and translates the problem into observable acceptance criteria.

### Evidence

- application feature
- problem statement
- goals
- acceptance criteria
- identified constraints

---

## Feature 2 — Claude Code Project Configuration

The repository provides enough context for Claude Code to understand the project, boundaries, workflow, and Definition of Done.

### Evidence

- valid `CLAUDE.md`
- repository structure
- project-specific instructions
- learner can explain how project context affects agent behavior

---

## Feature 3 — Reusable Skills

The learner creates Skills that encode repeatable workflows instead of relying on one-off prompts.

### Evidence

At least one working Skill must be demonstrated.

Recommended Skills:

- code review
- troubleshooting
- feature development
- testing
- Vercel deployment

---

## Feature 4 — Agent and Subagent Delegation

The learner designs and creates a Lead Agent and specialized subagents with clear scopes.

### Required Agents

- Lead Agent
- Research Agent
- Developer Agent
- Test Agent
- DevOps Agent

### Evidence

The final demo must show at least two examples of deliberate delegation.

---

## Feature 5 — Validation and Human Approval

The workflow prevents implementation and deployment from proceeding through sensitive gates without learner review.

### Gate A

Implementation plan approval.

### Gate B

Production deployment approval.

### Evidence

- implementation plan
- approval record
- passing tests
- passing production build
- reviewed Git changes
- production approval record

---

## Feature 6 — Vercel Deployment and Production Verification

The DevOps Agent prepares and executes the Vercel deployment only after required validation and human approval.

### Evidence

- deployment command or Git-triggered deployment
- deployment URL
- production verification
- deployment record
- learner explanation of environment variable safety

---

## Feature 7 — Final Technical Demonstration

The learner demonstrates the complete workflow and explains the architectural decisions.

### Evidence

A live demonstration covering:

1. project goal
2. Skill
3. agent architecture
4. delegation
5. implementation
6. tests
7. approval gate
8. Vercel deployment
9. production verification
10. oral defense

---

## Feature 8 — GitHub Submission

The learner works in a personal fork and submits a ready-for-review pull request to instructor `main`, following the [submission guide](SUBMISSION.md). Agent and Skill identifiers use a unique learner prefix.

### Evidence

- fork and submission branch
- unique role-to-agent-name mapping
- PR URL with completed checklist and evidence links
- required shared architecture URL, committed diagram export, and overview
- passing architecture check and instructor verification of diagram access and content

Submission PRs are reviewed without merging submissions into starter `main`.

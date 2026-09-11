# Claude Code Agent Project Starter

Design, build, test, and explain your own Claude Code agent workflow, then deploy your application to Vercel with human approval.

## Starting point

Start from `main`, which contains assignment requirements, design prompts, and empty application and evidence scaffolding.

## Your project

Complete [Project 3 — AI Software Development Team](docs/project-ideas/03-software-development-team.md). Build your own agent team to research, implement, test, and deploy an application feature.

Define your intended user, problem, constraints, and 3–5 measurable acceptance criteria before implementation.

## Getting started: clone, fork, and prepare

You need a GitHub account, Git installed locally, and access to Claude Code. Replace `YOUR-GITHUB-USERNAME` in every command with your actual GitHub username.

### 1. Clone the organizational repository

Open a terminal and run:

```bash
git clone --branch main --single-branch https://github.com/LaunchPadPhilly/claude-code-agent-project.git
cd claude-code-agent-project
```

If you already cloned this repository, open that folder instead of cloning it again.

### 2. Create your personal fork on GitHub

Open [LaunchPadPhilly/claude-code-agent-project](https://github.com/LaunchPadPhilly/claude-code-agent-project), click **Fork**, select your personal account, and create the fork. Keep the repository name `claude-code-agent-project` and copy only `main` if offered.

### 3. Connect your local clone to your fork

Run these commands once in the folder you cloned:

```bash
git remote rename origin upstream
git remote add origin https://github.com/YOUR-GITHUB-USERNAME/claude-code-agent-project.git
git remote -v
```

Check the output: `upstream` must point to `LaunchPadPhilly/claude-code-agent-project`, and `origin` must point to `YOUR-GITHUB-USERNAME/claude-code-agent-project`. If you already configured these remotes, verify them with `git remote -v` and skip the first two commands.

### 4. Create your working branch

```bash
git switch main
git switch -c submission/YOUR-GITHUB-USERNAME-project-3
```

Keep your project work on this branch and push it to your own fork.

### 5. Define and design your project

Read [Project 3](docs/project-ideas/03-software-development-team.md) and complete the prompts in [CLAUDE.md](CLAUDE.md). Define your feature, intended user, acceptance criteria, architecture, and agent responsibilities. Choose your unique learner prefix using the [naming guide](docs/SUBMISSION.md#2-give-your-agents-unique-names).

Create your system architecture in Figma, Excalidraw, or an equivalent diagram tool. Complete [System Architecture](docs/architecture/README.md) with a shared diagram URL, a committed PNG/SVG/PDF export, and your system overview. Give the instructor view access.

From the repository folder, start Claude Code:

```bash
claude
```

Review your design and implementation plan, then record learner approval before implementation. Follow the milestones below and check off [Tasks](docs/TASKS.md) as you build, validate, and deploy.

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
| 3. Design | Plan your agent responsibilities, delegation, Skill, approval gates, and architecture. Reserve your unique naming prefix. | Your design in `CLAUDE.md`, role-to-agent-name table, and [architecture evidence](docs/architecture/README.md) with shared URL and committed diagram export. |
| 4. Approve | Present your implementation plan and review its scope and risks. | Dated learner approval in `evidence/validation.md` before implementation. |
| 5. Build | Author your agents and Skill, implement your feature, and configure real test/build commands. | Working application, five required agent roles, one reusable Skill, and two recorded delegation examples. |
| 6. Validate | Run tests and a production build; check every acceptance criterion and review your changes. Fix failures. | Commands, actual results, and delegation examples in `evidence/validation.md`. |
| 7. Deploy | Verify a preview, review evidence, approve production, deploy, and check the live feature. | Approval, production URL, and verification in `evidence/deployment.md`. |
| 8. Submit | Complete the Definition of Done, push to your fork, and open a PR to the instructor repository. | A review-ready PR with completed checklist and evidence links; prepare your 10–12 minute demo. |

The placeholder test and build commands intentionally fail until you replace them with real project checks. Keep your designs learner-authored; the starter supplies requirements, not implementations.

## Unique agent and Skill names

Follow the [naming rules and fork/PR submission guide](docs/SUBMISSION.md). Every agent filename and its `name` field must use your learner prefix, such as `<learner-id>-lead`; use that same identifier in delegation references. Prefix your Skill names and directories too.

Use [src/](src/README.md) and [tests/](tests/README.md), or adapt the structure to your chosen framework. Document required environment variable names in `.env.example`; never commit secret values.

## How to submit your project

### 1. Pass the architecture gate

Complete [System Architecture](docs/architecture/README.md): shared diagram URL, committed diagram export, and written overview are all required. Show components, uniquely named agents, delegation paths, your Skill, approval gates, and deployment. Run this check from the repository root (Python 3 required):

```bash
python3 scripts/check-architecture.py
```

**Do not submit for assessment until this passes.** The same check runs on your PR using instructor-controlled validation. Missing evidence makes the **Architecture evidence** check fail. GitHub can still open a draft or PR, but the instructor will not accept it until the check passes and they confirm the shared link is accessible and the diagram describes your system.

### 2. Complete the readiness checklist

- [ ] Complete your project instructions, five required agents, and at least one Skill with unique names.
- [ ] Commit your architecture link, diagram export, and overview; pass the architecture check and give the instructor view access.
- [ ] Record implementation approval and two delegation examples in [validation evidence](evidence/validation.md).
- [ ] Run your real test and build commands, fix failures, and record the actual results.
- [ ] Record production approval, the live URL, and verification in [deployment evidence](evidence/deployment.md).
- [ ] Complete the [Definition of Done](docs/DEFINITION-OF-DONE.md) and prepare your 10–12 minute demo.

### 3. Commit and push to your fork

From your submission branch, review the changes and confirm you are not including secrets or generated dependencies:

```bash
git branch --show-current
git status
git diff
git add .
git diff --cached
git commit -m "Complete AI Software Development Team project"
git push -u origin submission/YOUR-GITHUB-USERNAME-project-3
```

Check the staged changes before running the commit. If all work is already committed, skip staging and committing and push the branch.

### 4. Open a pull request to the instructor repository

On the [organizational repository](https://github.com/LaunchPadPhilly/claude-code-agent-project), open **Pull requests → New pull request → compare across forks**. Select:

| Field | Value |
|---|---|
| Base repository | `LaunchPadPhilly/claude-code-agent-project` |
| Base branch | `main` |
| Head repository | Your personal fork |
| Compare branch | `submission/YOUR-GITHUB-USERNAME-project-3` |

Review the changed files, click **Create pull request**, and use the title `Project 3 submission — YOUR-GITHUB-USERNAME`.

### 5. Complete the PR description and submit its URL

Fill in the PR template with your GitHub username, learner prefix, feature description, and links to your architecture, agent definitions, Skill, approval records, delegation examples, test/build results, and live deployment. Link to files on your submission branch. Include the shared diagram URL and a link to the committed architecture export. Wait for **Architecture evidence** to pass, complete the checklist, and then mark the PR ready for review if it was a draft.

**Your submission is the PR URL.** Copy it for your instructor; a fork URL or live application URL alone is not the full submission.

### 6. Respond to feedback

Commit and push revisions to the same submission branch to update the existing PR. Re-run relevant checks and update evidence after changes. Keep your fork, branch, and deployment available through assessment. Submission PRs are reviewed and closed without merging into organizational `main`.

See the [full submission guide](docs/SUBMISSION.md) for naming rules and the complete submission checklist.

## Evidence and assessment

- [Required system architecture](docs/architecture/README.md)
- [Validation evidence template](evidence/validation.md)
- [Deployment evidence template](evidence/deployment.md)
- [Definition of Done](docs/DEFINITION-OF-DONE.md)
- [Final Demo Rubric](docs/FINAL-DEMO-RUBRIC.md)

Prepare a 10–12 minute demonstration. Explain the difference between a prompt, a Skill, an agent, and a subagent; defend your delegation decisions and show how you retained human control.

## External references

- [Claude Code documentation](https://docs.anthropic.com/)
- [Vercel documentation](https://vercel.com/docs)

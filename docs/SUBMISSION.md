# Fork, Build, and Submit

[README](../README.md) | [Task checklist](TASKS.md) | [Definition of Done](DEFINITION-OF-DONE.md)

## 1. Clone the organizational repository and connect your fork

1. Clone starter `main` directly from the [LaunchPadPhilly organizational repository](https://github.com/LaunchPadPhilly/claude-code-agent-project):

```bash
git clone --branch main --single-branch https://github.com/LaunchPadPhilly/claude-code-agent-project.git
cd claude-code-agent-project
```

2. Open [the organizational repository on GitHub](https://github.com/LaunchPadPhilly/claude-code-agent-project) and choose **Fork** under your own GitHub account. Copy only `main` if offered. Keep the repository name `claude-code-agent-project` for the commands below.
3. In your existing local clone, rename the organizational remote to `upstream` and add your personal fork as `origin`. Replace `YOUR-GITHUB-USERNAME` with your actual username. You do not need to clone again.

```bash
git remote rename origin upstream
git remote add origin https://github.com/YOUR-GITHUB-USERNAME/claude-code-agent-project.git
git remote -v
git switch -c submission/YOUR-GITHUB-USERNAME-project-3
```

Verify that `upstream` points to `LaunchPadPhilly/claude-code-agent-project` and `origin` points to your own GitHub fork before continuing. Push your submission branch to `origin`, as shown in step 4; do not push learner work to organizational `main`.

Build from starter `main` and author your own project.

Before your first project commit, run `npm run hooks:install`, then verify `git config --get core.hooksPath` prints `.githooks`. Node.js/npm and Python 3 are required. Install the hook in every clone; Git does not automatically activate hooks from a clone. See [Testing and commit requirements](TESTING.md).

## 2. Give your agents unique names

Use a consistent learner ID derived from your GitHub username: lowercase letters and hyphens only, spelling any digits as words (for example, `sam7` becomes `sam-seven`). Record both your GitHub username and learner ID in `CLAUDE.md`. Check existing class PRs for that prefix; if another learner uses it, append your first and last name in lowercase with hyphens.

Use `<learner-id>-<role>` for every agent's filename stem and its frontmatter `name` value. These must match. Replace the placeholders; do not use literal angle brackets or the sample prefix.

| Required role | File you create | Agent `name` |
|---|---|---|
| Lead | `.claude/agents/<learner-id>-lead.md` | `<learner-id>-lead` |
| Research | `.claude/agents/<learner-id>-research.md` | `<learner-id>-research` |
| Developer | `.claude/agents/<learner-id>-developer.md` | `<learner-id>-developer` |
| Unit Testing | `.claude/agents/<learner-id>-unit-testing.md` | `<learner-id>-unit-testing` |
| Test | `.claude/agents/<learner-id>-test.md` | `<learner-id>-test` |
| DevOps | `.claude/agents/<learner-id>-devops.md` | `<learner-id>-devops` |

Prefix any additional agents too. Use the exact agent names in your instructions, delegation references, design diagram, and evidence. Role labels such as “Lead Agent” explain responsibility; they do not replace unique identifiers.

Create Skills under `.claude/skills/<learner-id>-<skill-purpose>/SKILL.md` and use that same prefixed identifier for the Skill name. Write your own instructions and procedures using these naming conventions.

Unique names avoid agent-file and identifier collisions. They do not eliminate conflicts in shared files such as `CLAUDE.md`, `README.md`, or application code. Work in your own fork and branch; do not overwrite another learner's work to resolve a conflict. Ask the instructor if an upstream update conflicts with your work.

## 3. Build and collect evidence

Implement all [required technologies](REQUIRED-STACK.md): Prisma ORM persistence, Google OAuth sign-in and protected access, and a working Vercel deployment. Include links to the schema/setup, authentication implementation/setup, and live verification in your PR.

Follow the [README milestones](../README.md#steps-to-the-goal) and [task checklist](TASKS.md). Record your design and role-to-name mapping in `CLAUDE.md`.

Add your implementation plan and dated learner approval to `evidence/validation.md` before implementation. Record at least two delegation examples there, identifying the agent, delegated task, result, and why delegation was appropriate. Fill in actual validation results and deployment evidence; unchecked or blank evidence is not completion.

## Architecture gate — required before submission

Complete [System Architecture](architecture/README.md) with a specific shared diagram URL from Figma, Excalidraw, or an equivalent tool; a committed PNG/SVG/PDF export; and a written system overview. Show the application components, uniquely named agents, delegation and return paths, Skill, approval gates, and deployment. Give the instructor view access.

Run `python3 scripts/check-architecture.py` from the repository root (Python 3 required). Missing, empty, or placeholder evidence fails the check. Do not submit for assessment until it passes. The **Architecture evidence** PR check uses the instructor repository’s validator, so editing your copy of the validator does not bypass the check.

GitHub allows a PR to open before checks run. An open PR with missing evidence is incomplete and must not be accepted. The instructor must also open the shared link and inspect the diagram: the automated check does not verify link permissions or design correctness.

## 4. Push and open your submission PR

All testing must pass before code commits. The Unit Testing Agent authors and runs unit tests; the Test Agent verifies the full suite and production build. Configure `test:unit`, `test`, and `build` as described in [Testing and commit requirements](TESTING.md).

Review `git status` and `git diff`; confirm no secrets or generated dependencies are included. Then commit and push your work (replace the username placeholder):

```bash
git add .
git commit -m "Complete AI Software Development Team project"
git push -u origin submission/YOUR-GITHUB-USERNAME-project-3
```

The installed hook automatically runs `npm run test:all` followed by `npm run build`. A failure blocks the commit. Stage all intended files; the gate rejects unstaged edits, untracked files, and test/build changes to the files being committed. Fix failures and retry; do not bypass validation.

On GitHub, open a pull request and use **compare across forks** if needed:

- **Base repository:** `LaunchPadPhilly/claude-code-agent-project`
- **Base branch:** `main`
- **Head repository:** your fork
- **Compare branch:** `submission/YOUR-GITHUB-USERNAME-project-3`
- **Title:** `Project 3 submission — YOUR-GITHUB-USERNAME`

Complete the PR template with your own evidence, including the diagram share URL and a link to the committed export. Wait for **Architecture evidence** to pass before marking your submission ready for review. Link files from your submission branch, so the reviewer sees your completed work. If you opened a draft early, mark it ready for review when the checklist is complete. Your submission artifact is this PR URL, not only a fork URL or deployment URL.

Respond to instructor feedback by committing and pushing to the same branch; the PR updates automatically. Re-run relevant validation and refresh evidence after changes. Keep your fork, branch, and live deployment available through assessment.

## Submission checklist

- [ ] My work is in my own fork on a branch created from starter `main`.
- [ ] Prisma persists real feature data, Google OAuth protects access, and both work on Vercel with linked setup/test/live evidence.
- [ ] My architecture share URL, committed diagram export, and overview are present; the architecture check passes and the instructor has view access.
- [ ] My `CLAUDE.md` includes the feature, acceptance criteria, architecture, and unique agent-name mapping.
- [ ] All six required agent roles and at least one Skill are learner-authored and use my unique prefix.
- [ ] I recorded implementation approval and at least two delegation examples.
- [ ] My commit hook is installed, and all code commits pass the complete test suite and build without bypassing validation.
- [ ] Unit tests, all other tests, and the production build pass; results are in `evidence/validation.md`.
- [ ] Production approval, the live URL, and verification are in `evidence/deployment.md`.
- [ ] I completed the [Definition of Done](DEFINITION-OF-DONE.md) and prepared my demo.
- [ ] My PR targets instructor `main` from my fork's submission branch, contains evidence links, and is ready for review.

## Instructor review policy

Learner submission PRs are for assessment and feedback. Accept a submission only when **Architecture evidence** passes on its current revision and you have opened the shared link and confirmed the diagram meets the required content in [System Architecture](architecture/README.md). Record that verification in your PR review; request changes for missing access, an empty or inaccurate diagram, or a mismatch with the implementation. Recheck updated architecture evidence after revisions. Also verify all [required technologies](REQUIRED-STACK.md) work before acceptance. Keep starter `main` unchanged when assessing learner submissions. Review the fork branch and record feedback in the PR; close the PR after assessment without merging.

## Reference documentation

- [GitHub: creating a pull request from a fork](https://docs.github.com/en/pull-requests/how-tos/create-pull-requests/creating-a-pull-request-from-a-fork)
- [Claude Code: custom subagents](https://code.claude.com/docs/en/sub-agents)

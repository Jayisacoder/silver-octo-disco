# Testing and Commit Requirements

[README](../README.md) | [Tasks](TASKS.md) | [Submission guide](SUBMISSION.md)

All tests must pass before code commits. The production build must pass too. Fix failures before retrying a commit; do not bypass the hook, skip suites, or disable failing tests to obtain a pass.

## Required agents

Create both agents yourself using your unique learner prefix:

| Role | Filename and matching agent name | Responsibility |
|---|---|---|
| Unit Testing Agent | `.claude/agents/<learner-id>-unit-testing.md`; `<learner-id>-unit-testing` | Author and run meaningful unit tests covering expected behavior, edge cases, and failures. |
| Test Agent | `.claude/agents/<learner-id>-test.md`; `<learner-id>-test` | Independently verify unit tests, every additional project suite, the production build, and acceptance criteria. |

Include both in your architecture. These are two of the six required roles; you design their instructions, tools, and handoffs.

## Install the gate in every clone

Node.js/npm and Python 3 are required. Run from the repository root:

```bash
npm run hooks:install
git config --get core.hooksPath
```

The output must be `.githooks`. Installation does not require downloading dependencies. Git does not activate repository hooks automatically when cloning. If another hooks directory is already configured, the installer stops; ask your instructor to integrate the gate rather than overwrite existing hooks.

## Configure real testing

Replace the failing placeholders in `package.json` with commands appropriate to your application:

| Command | Required behavior |
|---|---|
| `npm run test:unit` | Run real unit tests once; return a failing exit code if tests fail or no tests are discovered. |
| `npm test` | Run every additional required suite, including integration/end-to-end tests when applicable. If the project only has unit tests, run the real unit suite here too and explain that scope in the evidence. |
| `npm run test:all` | Keep this aggregate entry point: repository gate tests, unit tests, then the complete project test command. |
| `npm run build` | Produce the real production build and fail on errors. |

Use non-watch commands that finish with an exit code. Do not use empty echo commands, ignored errors, or options that treat missing tests as success. Add every new project suite to `npm test`; running only the unit suite is insufficient when other suites exist. Configure test services locally as needed and document setup in your project instructions.

The starter intentionally cannot pass the application test/build checks. Configure your framework, tests, and commands before your first project commit. The supplied gate tests verify submission infrastructure; they do not replace learner-authored application tests.

## Before each commit

1. Record actual test evidence in `evidence/validation.md`.
2. Stage all intended changes and review `git diff --cached`. Resolve unstaged edits and untracked files; ignore only genuine generated output or local configuration.
3. Run `git commit`. The hook executes `npm run test:all`, then `npm run build`. Any failure stops the commit.
4. If checks change files, review and stage the changes, then retry so the changed version is tested too. The hook never stages or discards your work automatically.

You can invoke the same gate manually after staging with `npm run check:commit`. Keep build output, coverage, and dependencies ignored. The gate requires the staged version and working files to match before and after validation so an unstaged fix cannot hide a broken commit.

Local Git hooks can be disabled or bypassed and do not run for GitHub web-editor commits. Those routes do not satisfy this assignment. Use your configured local clone and provide test evidence; the instructor must verify the commands and evidence before accepting the submission. This gate does not replace the separate architecture submission gate.

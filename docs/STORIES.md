# User Stories

[Back to Epic](EPIC.md) | [Features](FEATURES.md) | [Tasks](TASKS.md)

## Feature 1 — Project Definition

### Story 1.1

As a learner, I want to define an application feature for my AI Software Development Team so that I have a clear outcome to build toward.

**Acceptance Criteria**

- the application feature for the AI Software Development Team is defined
- the problem is written in the learner's own words
- the intended user is identified

### Story 1.2

As a learner, I want measurable acceptance criteria so that I can determine whether my project actually works.

**Acceptance Criteria**

- criteria describe observable behavior
- criteria can be tested
- criteria map to the final demo

---

## Feature 2 — Claude Code Configuration

### Story 2.1

As a learner, I want Claude Code to understand the repository so that its actions follow the project's expectations.

**Acceptance Criteria**

- `CLAUDE.md` exists
- required workflow is documented
- prohibited behavior is documented
- Definition of Done is linked or described

---

## Feature 3 — Skills

### Story 3.1

As a learner, I want a reusable Skill so that a repeatable workflow does not depend on recreating the same prompt.

**Acceptance Criteria**

- Skill has a clear purpose
- Skill defines a repeatable procedure
- Skill has a recognizable completion condition

### Story 3.2

As a learner, I want to invoke a Skill during the demo so that I can prove it influences agent behavior.

**Acceptance Criteria**

- learner identifies the Skill used
- output follows the Skill workflow
- learner explains why the workflow belongs in a Skill

---

## Feature 4 — Agents and Subagents

### Story 4.1

As a learner, I want a Lead Agent so that complex work can be coordinated without every responsibility belonging to one agent.

**Acceptance Criteria**

- Lead Agent has a coordination role
- Lead Agent knows when to delegate
- Lead Agent does not perform specialized work unnecessarily

### Story 4.2

As a learner, I want a Research Agent so that codebase investigation can be separated from implementation.

**Acceptance Criteria**

- Research Agent does not modify application code
- findings are returned to the Lead Agent
- relevant files and constraints are identified

### Story 4.3

As a learner, I want a Developer Agent so that implementation has a clear responsibility and boundary.

**Acceptance Criteria**

- implementation follows an approved plan
- changes are limited to approved scope
- Developer Agent does not authorize deployment

### Story 4.4

As a learner, I want a Test Agent so that implementation receives independent validation.

**Acceptance Criteria**

- tests are run
- build is validated
- failures are reported rather than hidden
- evidence is recorded

### Story 4.5

As a learner, I want a DevOps Agent so that deployment is handled by a specialized role.

**Acceptance Criteria**

- deployment prerequisites are checked
- deployment cannot occur before production approval
- Vercel deployment is verified
- deployment evidence is recorded

---

## Feature 5 — Approval Gates

### Story 5.1

As a learner, I want to approve the implementation plan so that the AI cannot change code before I understand the proposed implementation.

**Acceptance Criteria**

- plan is presented
- learner reviews it
- explicit approval occurs before implementation

### Story 5.2

As a learner, I want production deployment to require my approval so that an agent cannot independently release code.

**Acceptance Criteria**

- test evidence is available
- build evidence is available
- Git changes have been reviewed
- learner explicitly approves production deployment

---

## Feature 6 — Deployment

### Story 6.1

As a learner, I want to deploy the project to Vercel so that the project can be demonstrated in a production environment.

**Acceptance Criteria**

- Vercel project is linked
- required environment variables are configured safely
- production deployment completes

### Story 6.2

As a learner, I want to verify the production deployment so that I know deployment success means the application works, not merely that a command exited successfully.

**Acceptance Criteria**

- public URL loads
- required feature is exercised
- expected output is confirmed
- evidence is stored

---

## Feature 7 — Final Demonstration

### Story 7.1

As a learner, I want to demonstrate and defend my agent architecture so that I can prove I understand the system I built.

**Acceptance Criteria**

The learner can explain:

- Skill vs prompt
- agent vs subagent
- why each subagent exists
- why human approval gates exist
- what the Test Agent validated
- what the DevOps Agent performed
- how secrets are protected
- how production success was verified

---

## Feature 8 — GitHub Submission

### Story 8.1

As a learner, I want to submit my work through a fork and pull request so that my instructor can review my implementation and evidence.

**Acceptance Criteria**

- work starts from starter `main` in the learner's own fork and submission branch
- agent filenames and identifiers use a unique learner prefix, with matching Skill naming
- a ready-for-review PR targets instructor `main` and links the required evidence
- architecture evidence includes a shared diagram URL, committed export, and overview; the PR check passes and the instructor verifies access and content before acceptance
- feedback is addressed on the same submission branch
- learner submissions are reviewed without merging into starter `main`

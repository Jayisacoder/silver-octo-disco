---
name: jayisacoder-agent-handoff
description: Standard procedure every jayisacoder-* agent follows when it finishes a delegated task — verify the work, write a structured handoff to docs/agent-handoffs/*.md, and report back to the Lead Agent. Use whenever an agent (Research, Database, Developer, Unit Testing, Test, or DevOps) completes bounded work delegated by jayisacoder-lead.
---

# Agent Handoff (jayisacoder-agent-handoff)

## Why this is a Skill, not a one-off prompt

Every specialized agent in this project's workflow (`jayisacoder-research`, `-database`, `-developer`, `-unit-testing`, `-test`, `-devops`) does the same five things at the end of its task, regardless of what the task was: verify its own work, stay inside its file boundaries, write a handoff in one fixed template, name the next agent, and report back. Writing that procedure into every individual agent prompt by hand is repetitive and drifts over time — encoding it once as a Skill means every agent finishes work the same, auditable way, and a fix to the procedure (e.g. tightening the verification step) only has to happen in one place.

## Trigger

Invoke this Skill whenever a specialized agent has finished the bounded work `jayisacoder-lead` delegated to it, immediately before reporting back. The Lead Agent itself does not run this Skill for its own coordination work — it's for the agents doing the specialized work: Research, Database, Developer, Unit Testing, Test, DevOps.

## Procedure

1. **Re-read the assigned task.** Confirm the scope you were given (what to do, and just as importantly, what you were told *not* to touch).
2. **Verify the work before claiming it's done.** Run whatever is relevant to your role and the change:
   - Code changes: `npm run typecheck`, `npm run lint`, the relevant test command(s), `npm run build` if you touched anything that affects it.
   - Research-only work: there's nothing to execute — verification means checking your recommendation against the actual current repo state (files, package versions, existing schema) rather than assumptions.
   - Report the actual command output, not a paraphrase. If something fails, that's a real result to report — never silently retry until it passes, and never weaken a check to force a pass.
3. **Confirm you stayed in bounds.** Check your own agent definition's "Allowed to modify" / "Must NOT modify" lists (`.claude/agents/jayisacoder-<role>.md`) against what you actually changed (`git status`/`git diff`). If you touched something outside your boundary, that's a problem to flag, not something to quietly leave in place.
4. **Write the handoff.** Update (don't just append blindly — supersede the prior handoff if this is a new pass) the file for your role in `docs/agent-handoffs/`:
   - `research.md`, `database.md`, `implementation.md` (Developer), `unit-testing.md`, `qa.md` (Test), `release.md` (DevOps).
   Use this exact template:
   ```
   # Task
   ## Input Received
   ## Work Completed
   ## Files Changed
   ## Decisions Made
   ## Tests/Verification
   ## Problems or Risks
   ## Next Agent
   ## Required Action From Next Agent
   ```
   `Next Agent` must name a real agent (usually `Lead Agent`, which then routes onward) and `Required Action From Next Agent` must say specifically what that agent needs to do next — not a vague "continue."
5. **Report back concisely.** Reply to the Lead Agent with what changed, what you verified (with real results), and anything you're unsure about — the handoff file is the full record; the reply is the short version.

## Completion evidence

A Skill run is complete when all of the following are true:
- The relevant `docs/agent-handoffs/*.md` file was updated in the required template, with every section filled in (no empty headers).
- `Tests/Verification` contains actual command output/results, not a claim without evidence.
- `Next Agent` and `Required Action From Next Agent` are both specific and actionable.
- Nothing outside the agent's declared boundary was modified (or, if it was, that's explicitly flagged in `Problems or Risks` rather than hidden).

If any of these isn't true, the task isn't done yet — go back and finish it before reporting to the Lead Agent.

# System Architecture

Complete this document and commit your diagram export before submitting your project for assessment. The starter intentionally leaves the evidence fields empty.

Diagram URL: https://excalidraw.com/#json=3EEcv8QCQf_9XS5VNGKdL,iyl_0yyv3aSKlr6sVUIBIA
Diagram export: docs/architecture/system-architecture.svg

Use a specific HTTPS share link from Figma, FigJam, Excalidraw, diagrams.net, or an equivalent diagram tool. Give the instructor view access and verify that the shared link opens for them. A tool homepage or a local browser session is not a diagram share link.

Export your diagram and commit it as `docs/architecture/system-architecture.png`, `docs/architecture/system-architecture.svg`, or `docs/architecture/system-architecture.pdf` (maximum 5 MiB). Put that exact repository-relative path after `Diagram export:`. Put the raw shared HTTPS URL after `Diagram URL:`. Keep both on single lines.

The diagram must show:

- The user, Google OAuth sign-in, application/session boundary, server-side Prisma access, persistent database, and Vercel deployment.
- Connections between those required technologies and any additional external services.
- All six required agent roles, labeled with your unique agent identifiers.
- Delegation and return paths, including how your Skill is used.
- Testing, human approval gates, and the deployment target.

## System overview

The diagram has three panels. **(A) Application Architecture** shows the required-technology chain: a User signs in through Google OAuth, which establishes a NextAuth database-strategy session (the app/session boundary); authenticated requests reach Next.js Route Handlers, which query through a Prisma client enforcing a single compound `{ id, userId }` ownership filter (the IDOR defense — a missing task and a task owned by someone else both return an identical 404) against a PostgreSQL database; the whole app is deployed on Vercel. **(B) Agent Workflow & Delegation** is laid out as three swim lanes — an ALPHA lane (Lead, Research, and the Independent Test agent), a BRAVO lane (Database, Developer, Unit Testing, DevOps agents), and a SHARED lane (the human developers, both approval gates, and the Vercel deployment target) — with the real delegation sequence crossing lanes as work changes hands, the dashed red failure/return path from the Test Agent back to the Lead Agent, and the reusable `jayisacoder-agent-handoff` Skill's dashed-purple invocation lines into three representative agents. A GitHub branch cluster shows each learner's branches merging into `main`, which triggers deployment. **(C) Agent & Skill Reference** is a plain-language "who's who" panel explaining the user persona, every agent/subagent's role and owner, and why the Skill is a Skill rather than a one-off prompt.

## Submission gate

Write your own overview above (at least 80 characters) explaining the components, connections, and approval gates shown in your diagram. Keep the export, shared diagram, and overview consistent with your implementation.

Run `python3 scripts/check-architecture.py` from the repository root before submitting. Missing evidence fails the **Architecture evidence** PR check. A passing check verifies evidence structure, not link permissions or design quality: the instructor must open the shared link and inspect the diagram before accepting the submission.

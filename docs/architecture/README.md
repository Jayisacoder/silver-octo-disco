# System Architecture

Complete this document and commit your diagram export before submitting your project for assessment. The starter intentionally leaves the evidence fields empty.

Diagram URL:
Diagram export:

Use a specific HTTPS share link from Figma, FigJam, Excalidraw, diagrams.net, or an equivalent diagram tool. Give the instructor view access and verify that the shared link opens for them. A tool homepage or a local browser session is not a diagram share link.

Export your diagram and commit it as `docs/architecture/system-architecture.png`, `docs/architecture/system-architecture.svg`, or `docs/architecture/system-architecture.pdf` (maximum 5 MiB). Put that exact repository-relative path after `Diagram export:`. Put the raw shared HTTPS URL after `Diagram URL:`. Keep both on single lines.

The diagram must show:

- The user, application components, and any data stores or external services.
- All six required agent roles, labeled with your unique agent identifiers.
- Delegation and return paths, including how your Skill is used.
- Testing, human approval gates, and the deployment target.

## System overview

## Submission gate

Write your own overview above (at least 80 characters) explaining the components, connections, and approval gates shown in your diagram. Keep the export, shared diagram, and overview consistent with your implementation.

Run `python3 scripts/check-architecture.py` from the repository root before submitting. Missing evidence fails the **Architecture evidence** PR check. A passing check verifies evidence structure, not link permissions or design quality: the instructor must open the shared link and inspect the diagram before accepting the submission.

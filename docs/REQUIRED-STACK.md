# Required Project Technologies

[README](../README.md) | [Project 3](project-ideas/03-software-development-team.md) | [Definition of Done](DEFINITION-OF-DONE.md)

Every project must use **Prisma ORM, Google OAuth sign-in, and Vercel** in the working application. Installing a package or mentioning a technology in the diagram is not sufficient. You choose your application framework, compatible database provider, authentication library, and data model, and explain those choices.

## Prisma ORM — application persistence

- Design and commit your Prisma schema and the database setup/change procedure appropriate to your chosen database.
- Use Prisma in server-side application code to create and retrieve real feature data from a persistent database. Authentication records alone do not meet the feature-data requirement.
- Document how another developer initializes the database and generates the required client for your selected Prisma version.
- Demonstrate that feature data remains available after a page reload and on the deployed application.
- Document configuration names in `.env.example`; keep connection strings and credentials out of committed files.

## Google OAuth — working sign-in

- Implement actual Google sign-in using Google's OAuth/OpenID Connect flow and an appropriate authentication library.
- Demonstrate sign-in, a valid application session, and sign-out. Handle denied or failed sign-in without granting access.
- Require authentication for at least one feature and enforce access on the server. Where records belong to users, enforce ownership so one user cannot access another user's private data.
- Configure the exact local and deployed callback/redirect URLs required by your chosen library in the Google OAuth client settings. Document the setup without including client secrets or tokens.
- Ensure the instructor can sign in for assessment; arrange access if the Google app is restricted to test users.

## Vercel — working production deployment

- Deploy the application to Vercel after the required validation and learner production approval.
- Configure the database connection, Google OAuth credentials, and any session configuration for the appropriate deployment environment. Keep secret values server-side.
- Verify Google sign-in, protected access, and Prisma-backed feature data on the live Vercel URL. A successful build or landing page alone is insufficient.
- Record the deployment URL, approval, and actual verification results in `evidence/deployment.md`.

## Architecture and testing evidence

The required architecture diagram must show Google sign-in, the application/session boundary, server-side Prisma access, the persistent database, and Vercel, alongside the six agents and approval gates. Explain their connections in `docs/architecture/README.md`.

Your Unit Testing Agent tests application behavior and authentication/authorization decisions with controlled test inputs. Your Test Agent also verifies persistence against a separate test database, denied/failed sign-in, signed-out access, and ownership rules where applicable. Include these checks in the full test command; automated tests must not modify production data or require a person to complete Google consent during a commit.

Record an actual Google sign-in/sign-out and protected Prisma-backed feature demonstration on Vercel as production evidence. Automated authentication mocks do not replace this live verification. All automated testing and the production build must still pass before code commits.

## Submission acceptance

Link your Prisma schema, database setup instructions, Google OAuth implementation/setup documentation, test results, and live Vercel verification in the PR. The instructor must verify all three technologies work before accepting the submission, in addition to the existing architecture and testing requirements.

## Official documentation

- [Prisma ORM schema documentation](https://docs.prisma.io/docs/orm/prisma-schema/overview)
- [Google OpenID Connect sign-in](https://developers.google.com/identity/openid-connect/openid-connect)
- [Google OAuth for web applications](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Vercel deployment environments](https://vercel.com/docs/deployments/environments)

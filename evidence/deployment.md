# Deployment Evidence

## Pre-Deployment Preparation (Bravo, 2026-09-13)

No deployment has happened yet — Gate 2 is not approved (see `CLAUDE.md` §10). This records prep work only, done ahead of that approval so the DevOps Agent can deploy immediately once both humans sign off.

- Vercel project linked: `slumpshouses-projects/silver-octo-disco` (`npx vercel link`, project ID `prj_BW7UbPVVXyuECqPCpELLr07dZP57`), local `.vercel/` gitignored.
- Production environment variables set in Vercel (`vercel env add ... production`, confirmed via `vercel env ls production`): `DATABASE_URL` (real, hosted Neon Postgres — already independently verified live in `evidence/validation.md`'s Database Agent Addendum), `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` (the same real credentials verified working in the Google OAuth Addendum), `NEXTAUTH_URL` (`https://silver-octo-disco.vercel.app` — **predicted, not yet confirmed**, since Vercel only finalizes the actual production domain at first deploy; per `docs/agent-handoffs/research.md`'s 2026-09-13 addendum, if the real domain differs, both this value and the Google Console redirect URI below must be updated together), a **freshly generated** `NEXTAUTH_SECRET`/`AUTH_SECRET` (distinct from the local dev `.env` value), `AUTH_TRUST_HOST=true`.
- **2026-09-13, Bravo:** added `https://silver-octo-disco.vercel.app/api/auth/callback/google` as a second Authorized redirect URI on the existing Google OAuth client (alongside the local `http://localhost:3000/...` one), via Google Cloud Console → APIs & Services → Credentials. Reported done by Bravo; not independently re-verified against Google's servers the way the local redirect URI was in the Google OAuth Addendum in `evidence/validation.md`, since that would require deploying first. If the real Vercel domain ends up different from the prediction after first deploy, this redirect URI (and `NEXTAUTH_URL` above) must both be updated to match.
- **Not done, and must not be done until Gate 2:** no `vercel deploy`/`vercel --prod` has been run. This section will be replaced by real deployment results once Gate 2 is recorded.

## Deployment

Date:

Learner:

Vercel project:

Environment:

- [ ] Preview
- [ ] Production

Deployment method:

- [ ] Vercel CLI
- [ ] Git integration
- [ ] Other

## Human Approval

Production deployment approved by learner:

- [ ] YES
- [ ] NO

Approval evidence:

```text

```

## Deployment URL

```text

```

## Verification

| Check | Result | Evidence |
|---|---|---|
| Application loads | PASS / FAIL | |
| Primary feature works | PASS / FAIL | |
| Required routes work | PASS / FAIL | |
| No obvious runtime failure | PASS / FAIL | |

## Known Issues

```text

```

## Final Status

- [ ] PASS
- [ ] FAIL

## Required Technology Verification on Vercel

Google sign-in, session, and sign-out results:

Protected feature and signed-out access results:

Prisma-backed feature write/read and persistence after reload results:

Instructor sign-in access confirmed (no credentials or tokens):

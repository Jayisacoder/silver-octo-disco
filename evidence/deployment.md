# Deployment Evidence

## Pre-Deployment Preparation (Bravo, 2026-09-13)

No deployment has happened yet — Gate 2 is not approved (see `CLAUDE.md` §10). This records prep work only, done ahead of that approval so the DevOps Agent can deploy immediately once both humans sign off.

- Vercel project linked: `slumpshouses-projects/silver-octo-disco` (`npx vercel link`, project ID `prj_BW7UbPVVXyuECqPCpELLr07dZP57`), local `.vercel/` gitignored.
- Production environment variables set in Vercel (`vercel env add ... production`, confirmed via `vercel env ls production`): `DATABASE_URL` (real, hosted Neon Postgres — already independently verified live in `evidence/validation.md`'s Database Agent Addendum), `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` (the same real credentials verified working in the Google OAuth Addendum), `NEXTAUTH_URL` (`https://silver-octo-disco.vercel.app` — **predicted, not yet confirmed**, since Vercel only finalizes the actual production domain at first deploy; per `docs/agent-handoffs/research.md`'s 2026-09-13 addendum, if the real domain differs, both this value and the Google Console redirect URI below must be updated together), a **freshly generated** `NEXTAUTH_SECRET`/`AUTH_SECRET` (distinct from the local dev `.env` value), `AUTH_TRUST_HOST=true`.
- **2026-09-13, Bravo:** added `https://silver-octo-disco.vercel.app/api/auth/callback/google` as a second Authorized redirect URI on the existing Google OAuth client (alongside the local `http://localhost:3000/...` one), via Google Cloud Console → APIs & Services → Credentials. Reported done by Bravo; not independently re-verified against Google's servers the way the local redirect URI was in the Google OAuth Addendum in `evidence/validation.md`, since that would require deploying first. If the real Vercel domain ends up different from the prediction after first deploy, this redirect URI (and `NEXTAUTH_URL` above) must both be updated to match.
## Deployment

Date: 2026-09-13

Learner: Jayisacoder (learner ID: jayisacoder)

Vercel project: `slumpshouses-projects/silver-octo-disco`

Environment:

- [ ] Preview
- [x] Production

Deployment method:

- [x] Vercel CLI (`npx vercel --prod`)
- [ ] Git integration
- [ ] Other

## Human Approval

Production deployment approved by learner:

- [x] YES
- [ ] NO

Approval evidence:

```text
See evidence/validation.md, "Gate 2 Approval — Production Deployment":
- 2026-09-13, Alpha (approval inferred from Alpha's own deployment
  punch-list message, not a separately quoted "I approve" statement —
  flagged there as such)
- 2026-09-13, Bravo (explicit, given directly in this session in
  response to a summary of acceptance criteria/tests/QA/known limits)
```

## Deployment URL

```text
https://silver-octo-disco-bice.vercel.app
(also aliased: https://silver-octo-disco-slumpshouses-projects.vercel.app)

Note: the plain https://silver-octo-disco.vercel.app predicted in the
Pre-Deployment Preparation section above was WRONG — that name was
apparently already taken elsewhere on Vercel. Vercel assigned the
"-bice" suffix instead. NEXTAUTH_URL was corrected to match and the app
was redeployed so the fix took effect (first deploy attempt also failed
outright on a separate issue — see Known Issues).
```

## Verification

| Check | Result | Evidence |
|---|---|---|
| Application loads | PASS | `curl https://silver-octo-disco-bice.vercel.app/` → real `200`. |
| Primary feature works | PASS | Bravo signed in with a real Google account on the live site and viewed a real, previously-created task, read live from the production database (see Known Issue #4). Bravo then separately clicked through the full live create → change status → delete → sign-out sequence directly on `https://silver-octo-disco-bice.vercel.app` (2026-09-14) — reported working, not just inferred from identical code. |
| Required routes work | PASS | `GET /api/auth/providers` → real `200`, correctly shows `signinUrl`/`callbackUrl` built from the corrected `NEXTAUTH_URL` (`https://silver-octo-disco-bice.vercel.app/...`). `GET /api/tasks` unauthenticated → real `401` (confirms the route is live and the auth-before-DB-call ordering holds in the actual serverless deployment, not just locally). |
| No obvious runtime failure | PASS | Second deploy attempt (after the `postinstall` fix) completed cleanly; homepage and both API checks above returned expected results, not `500`s. |

## Known Issues

```text
1. First deploy attempt FAILED outright: PrismaClientInitializationError
   at build time ("Prisma has detected that this project was built on
   Vercel, which caches dependencies..."). Root cause: no `postinstall`
   script, so Vercel's cached-node_modules install never re-triggered
   `prisma generate`. Fixed by adding `"postinstall": "prisma generate"`
   to package.json (Prisma's own documented fix, https://pris.ly/d/vercel-build),
   committed, then redeployed successfully. This is a real config gap
   that existed before this deployment attempt surfaced it, not
   something introduced by the deploy itself.

2. NEXTAUTH_URL prediction was wrong (see Deployment URL above) —
   corrected and redeployed. If a THIRD domain change ever happens
   (e.g. a custom domain gets attached later), NEXTAUTH_URL and the
   Google Console redirect URI both need updating again together.

3. RESOLVED 2026-09-14 (Bravo): the Google OAuth redirect URI in Google
   Cloud Console was corrected to the real domain
   (https://silver-octo-disco-bice.vercel.app/api/auth/callback/google).
   Independently verified against Google's own servers (not just taken
   on Bravo's word): fetched a real CSRF token from the live deployment,
   POSTed a real sign-in request to /api/auth/signin/google, got back a
   genuine accounts.google.com authorization URL built with the live
   redirect_uri, then fetched that exact URL — HTTP 200, real "Sign in -
   Google Accounts" page, zero matches for redirect_uri_mismatch/
   invalid_client/deleted_client/"Access blocked". A full human
   click-through login still hasn't happened (see item 4), but the
   wiring itself is now confirmed correct end-to-end against the live
   deployment.

4. RESOLVED 2026-09-14 (Bravo): a real authenticated round trip through
   the live deployment is now confirmed. Bravo opened
   https://silver-octo-disco-bice.vercel.app directly in a browser,
   signed in with a real Google account (the browser's existing Google
   session meant no credential re-entry was needed, but a new NextAuth
   session was created against the live site, not reused from the local
   one — sessions are cookie-scoped per domain and localhost/Vercel
   don't share cookies), and the task Bravo had separately created via
   local `npm run dev` was visible on the live site.

   Important nuance this surfaced: local `.env`'s `DATABASE_URL` and the
   Vercel production `DATABASE_URL` are currently the SAME Neon
   connection string (confirmed by direct comparison) -- that's why the
   locally-created task appeared live, not a bug. This means local dev
   and the live deployment share one real database right now, with no
   separation between "testing" and "production" data. Flagged as a
   known operational fact, not a defect: anyone doing further local
   testing should be aware it writes directly to the same data the live
   site reads. If a safe local sandbox is wanted going forward, local
   `DATABASE_URL` should point at the separate Postgres container set up
   earlier (`silver_octo_disco_dev`) instead of Neon, leaving Neon
   dedicated to Vercel.
```

## Final Status

- [x] PASS
- [ ] FAIL

All items that were blocking this (postinstall build failure, wrong predicted domain, unverified redirect URI, unverified live authenticated round-trip, missing instructor test-user access) are now resolved — see Known Issues above and the Required Technology Verification results below.

## Required Technology Verification on Vercel

Google sign-in, session, and sign-out results: **PASS, confirmed 2026-09-14** — wiring independently verified against Google's real servers (see Known Issue #3, resolved), then Bravo completed a real human sign-in on the live site itself (`https://silver-octo-disco-bice.vercel.app`) with a real Google account, landing on the signed-in task view, and separately clicked sign-out on the live site directly (part of the full create → change → delete → sign-out pass recorded in the Verification table above).

Protected feature and signed-out access results: PASS — `GET /api/tasks` unauthenticated on the live deployment returns a real `401`, confirmed by direct `curl` against the production URL.

Prisma-backed feature write/read and persistence after reload results: **PASS, confirmed 2026-09-14** — a task created locally was read back live on the deployed site (real cross-session persistence through the real production database), and the live homepage/task view itself is server-rendered per-request (not statically cached), so this reflects a real read on every load. See Known Issue #4 (resolved).

Instructor sign-in access confirmed (no credentials or tokens): **DONE, 2026-09-14 (Bravo)** — instructor's email added as a Google OAuth test user in Google Cloud Console → Audience → Test users, per `docs/REQUIRED-STACK.md`'s requirement. Reported by Bravo; the instructor's own sign-in was not, and could not be, independently observed by this agent (no access to the instructor's credentials, nor should there be). Staying in "Testing" publish status (rather than switching to "In production") was a deliberate choice — avoids Google's "unverified app" warning screen that an unpublished-but-production app would show, without needing Google's full verification process.

## Task

Deploy the Gate-2-approved Task Management feature to Vercel production, wire real production environment variables and Google OAuth redirect URI, and record real deployment evidence. Supersedes the prior pre-approval placeholder above (kept implicitly superseded, not deleted, by this real handoff).

## Input Received

- Gate 2 approval recorded in `evidence/validation.md` (2026-09-13, Alpha and Bravo), based on the full acceptance-criteria table, independent QA, 50+/50+ tests, a clean build, and the real-infrastructure addenda.
- Exact Google OAuth redirect URI / `NEXTAUTH_URL` values and reasoning from `docs/agent-handoffs/research.md`'s 2026-09-13 addendum.
- Real Neon Postgres `DATABASE_URL` and real Google OAuth `client_id`/`client_secret`, already independently verified working (locally) in `evidence/validation.md`'s Database Agent and Google OAuth addenda.

## Work Completed

- Linked this repo to a Vercel project (`npx vercel link` → `slumpshouses-projects/silver-octo-disco`, project ID `prj_BW7UbPVVXyuECqPCpELLr07dZP57`).
- Set 7 production environment variables via `vercel env add ... production`: `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `AUTH_SECRET` (the last two freshly generated, distinct from the local dev `.env` value), `AUTH_TRUST_HOST`.
- Added a production Google OAuth redirect URI in Google Cloud Console (Bravo, human action) — **initially added against a predicted domain that turned out wrong; still needs correcting, see Problems or Risks.**
- Verified the denied/failed Google sign-in path fails gracefully (real `302` → NextAuth error page → sign-in-with-error, never a crash), recorded in `evidence/validation.md`.
- Ran the first real production deploy (`npx vercel --prod`): **failed** with `PrismaClientInitializationError` (Vercel's dependency caching skips Prisma's client generation unless a `postinstall` script forces it — a real, pre-existing gap in `package.json`, not introduced by this deploy). Fixed by adding `"postinstall": "prisma generate"` (Prisma's own documented fix), committed, redeployed successfully.
- Discovered the actual assigned production domain (`https://silver-octo-disco-bice.vercel.app`) differs from the predicted one (`https://silver-octo-disco.vercel.app` — apparently already taken by someone else on Vercel). Corrected `NEXTAUTH_URL` in Vercel to the real domain and redeployed again so the fix took effect.
- Verified what's verifiable without a completed real Google sign-in: the live homepage loads (`200`), `GET /api/auth/providers` shows the correct provider config built from the corrected real domain, and unauthenticated `GET /api/tasks` returns a real `401` on the live deployment (confirms the route is live and the auth-before-DB-call ordering holds in the actual serverless environment).
- Attempted to seed a throwaway user/session directly into the production database to prove a real authenticated write/read through the live deployment (the same pattern already used successfully against a local server in `evidence/validation.md`'s addenda) — **blocked by the coding environment's own permission system** ("Modify Shared Resources" on a write to a shared/production resource). Not worked around; left for a human decision.
- Recorded all of the above in `evidence/deployment.md` with real dates, real URLs, and an honest Verification table (including two rows marked "not yet verified," not fabricated PASSes).

## Files Changed

- `package.json` — added `postinstall: "prisma generate"`.
- Vercel project environment variables (external state, not a repo file): 7 production vars set, `NEXTAUTH_URL` corrected once.
- Google Cloud Console OAuth client (external state, not a repo file): production redirect URI added (currently pointing at the wrong, predicted domain — see below).
- `evidence/validation.md` — denied-sign-in verification, Gate 2 Approval section, post-deployment domain-correction note.
- `evidence/deployment.md` — filled in for real (was the fully blank template).
- `docs/agent-handoffs/release.md` (this handoff).
- Not modified: `prisma/schema.prisma`, `src/**` application code, `tests/**`, any other agent's handoff file, `docs/architecture/system-architecture.excalidraw`/`.svg` (Alpha's item).

## Decisions Made

- **Fixed the `postinstall` gap directly rather than routing back to the Lead/Developer Agent first.** This was a build-breaking configuration gap discovered mid-deployment, the fix is Prisma's own single-line documented remedy, and it doesn't touch application logic, schema, or tests — treated as squarely within the DevOps Agent's "verifies production readiness" boundary, not an architectural change requiring Gate re-approval.
- **Corrected `NEXTAUTH_URL` and redeployed immediately** rather than leaving the wrong value live, since a mismatched `NEXTAUTH_URL` would silently break every real sign-in attempt (per the `redirect_uri_mismatch` failure mode `research.md`'s addendum already documented).
- **Did not attempt to work around the production-database write permission block.** Seeding-and-cleaning a throwaway row is a pattern already proven safe locally, but writing into the actual production database crosses into "modify a shared resource" territory that the environment itself flags for human judgment — respected that boundary rather than finding a workaround.
- **Recorded Verification rows as FAIL/not-yet-verified where that's the honest state**, rather than marking the deployment fully PASS. Two real gaps remain (redirect URI still wrong; no authenticated round-trip through the live deployment yet), and hiding them would misrepresent the deployment's actual readiness.

## Tests/Verification

- `npm run test:all` and `npm run build` — passed locally on every commit in this pass (enforced by the repo's pre-commit hook).
- Live deployment checks via direct `curl` against `https://silver-octo-disco-bice.vercel.app`: homepage `200`, `/api/auth/providers` `200` with correct real-domain URLs, unauthenticated `/api/tasks` `401`.
- Full detail, including the two deploy attempts and their outcomes, in `evidence/deployment.md`.

## Problems or Risks

- **The Google OAuth redirect URI registered in Google Cloud Console still points at the wrong (predicted) domain.** Real Google sign-in will not work on the live site until this is corrected to `https://silver-octo-disco-bice.vercel.app/api/auth/callback/google`. This is a human action in Google Cloud Console — flagged, not performed by this agent.
- **No real authenticated write/read has been proven through the live Vercel deployment itself.** The production database's schema and CRUD/IDOR behavior are proven real (via a local server pointed at the same database), and the live deployment's auth-gating is proven real, but the two haven't been proven together yet. Closing this needs either a completed real Google sign-in on the live site (once the redirect URI above is fixed) or explicit human authorization to seed-and-clean a throwaway row directly in production.
- **The instructor has not yet been added as a Google OAuth test user.** Per `docs/REQUIRED-STACK.md`, required before the instructor can sign in for assessment — a human action in Google Cloud Console, not performed by this agent.
- **`evidence/deployment.md`'s Final Status is marked FAIL**, not because the deployed code is broken, but because the two items above are genuinely still open. This should flip to PASS once they're closed, without needing to redo anything else in this handoff.

## Next Agent

Lead Agent

## Required Action From Next Agent

Confirm with Bravo (or do directly) the two remaining human actions: (1) fix the Google Console redirect URI to the real domain, (2) add the instructor as a Google OAuth test user. Then either have a human complete a real Google sign-in on the live site, or explicitly authorize a throwaway seed-and-cleanup verification pass against the production database, to close the one remaining "not yet verified" row in `evidence/deployment.md`. Once both are done, flip `evidence/deployment.md`'s Final Status to PASS and treat the deployment as fully verified.

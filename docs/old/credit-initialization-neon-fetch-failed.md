### Title
Fix for credit initialization failing with Neon fetch error in auth routes

### Context
- Symptom: On first login, user credit balance shows 0. After sign-out, Vercel logs show: "Failed to create credit account: NeonDbError: Error connecting to database: TypeError: fetch failed".
- Route: `api/auth/[...all]` (Better Auth handler), triggered during session creation/sign-in and sign-out.
- Likely cause: Edge runtime hitting transient Neon HTTP connectivity issues in auth route.

### Changes
1) Force Node.js runtime for auth route to ensure stable DB connectivity
   - File: `src/app/api/auth/[...all]/route.ts`
   - Change: `export const runtime = 'nodejs';`

2) Add retry to credit account initialization during user-created hook
   - File: `src/lib/auth/auth.ts`
   - Change: Wrap `creditService.getOrCreateCreditAccount` with up to 3 retries (with backoff) and safe fallback for detecting new account when transaction history temporarily fails.

3) Add balance endpoint fallback to grant signup bonus if missing
   - File: `src/server/actions/credit-actions.ts`
   - Change: In `getCreditBalance()`, if `totalEarned === 0` and no `referenceId === signup_<userId>` transaction exists, auto-grant `paymentConfig.plans.free.credits.onSignup` once, then re-fetch account.

### Why this works
- Node.js runtime avoids Edge-specific network quirks for Neon HTTP fetch.
- Retry handles transient DB connectivity blips during user initialization.
- Balance fallback ensures eventual consistency even if initialization step was skipped/failed earlier.

### Verification steps
1) Create a new user, complete sign-in.
2) Open the dashboard Credits page; the balance should be equal to signup bonus (default 50).
3) Check Vercel logs: no new "Failed to create credit account" during sign-out.
4) (Optional) For previously affected users, hitting the balance endpoint or visiting the credits page will trigger the fallback grant.

### Backfill options (optional)
- Scripts available for manual backfill:
  - `scripts/grant-signup-credits.ts`
  - `scripts/grant-existing-users-credits.ts`
  Run locally with valid `DATABASE_URL` to grant missing credits.

### Notes
- DB client is `drizzle-orm/neon-http`; `DATABASE_URL` must be set in Vercel env.
- If you want Edge runtime for auth in the future, consider a dedicated Neon connection strategy (or region pinning) and keep retry/backoff logic.



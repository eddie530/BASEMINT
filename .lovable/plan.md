## Goal
Resolve two Project monitoring findings:
1. **High** — Featured Launch ($15) and 2× Points Booster ($5) purchases take money but grant nothing; fulfillment is client-side localStorage that nothing reads.
2. **Medium** — "Manage subscription" errors for Pro members who paid via Coinbase Commerce (`environment='crypto'`) or on-chain USDC (`environment='usdc'`) because `createPortalSession` only queries the Stripe env.

## Finding 1 — Server-side entitlements for one-time SKUs

### Schema (migration)
New table `public.entitlements`:
- `id uuid pk`, `user_id uuid not null`, `kind text not null` (`launch_credit` | `points_booster`)
- `credits_remaining int` (for `launch_credit`, decrement on use)
- `expires_at timestamptz` (for `points_booster`, absolute end time; renewals extend from `max(now, expires_at)`)
- `source text` (`stripe` | `commerce`), `source_ref text` (session/charge id) `unique(source, source_ref)` for idempotent fulfillment
- `created_at`, `updated_at`
- RLS: `authenticated` can `SELECT` own rows. All writes via `service_role` (webhooks). Grants per project rules.

### Stripe fulfillment
Add a Stripe webhook route `src/routes/api/public/payments/webhook.ts` handling (extend if it exists):
- `checkout.session.completed` with `mode='payment'` and price `lookup_key` in `{launch_credit_once, points_booster_7d_once}`:
  - Resolve `userId` from `session.metadata.userId` (already set by `createCheckoutSession`).
  - Upsert into `entitlements` keyed on `(source='stripe', source_ref=session.id)`:
    - `launch_credit`: increment `credits_remaining` by 1.
    - `points_booster`: set `expires_at = greatest(now(), coalesce(expires_at, now())) + 7 days`.
- Verify signature with `STRIPE_*_WEBHOOK_SECRET` (already in secrets).

### Commerce fulfillment
Update `src/routes/api/public/commerce/webhook.ts` on `charge:confirmed` for `launch_credit_once` / `points_booster_7d_once`:
- Read `userId` + `priceId` from charge metadata (already stored by `createCommerceCharge`).
- Same idempotent upsert keyed on `(source='commerce', source_ref=charge.id)`.
- Remove the "credited on the client" comment.

### Readers
- `/launch` (`src/routes/launch.tsx`): before allowing a "Featured" launch, call a `useEntitlements` hook that reads `entitlements` for the current user; if `launch_credit.credits_remaining > 0`, offer a "Use featured credit" toggle; on submit call `consumeLaunchCredit` server fn (decrement with `credits_remaining = greatest(0, credits_remaining - 1)` guarded by `where user_id = auth.uid() and credits_remaining > 0`) and mark the created launch as featured (add `is_featured boolean` on the launches table if not already there, or annotate via metadata).
- Points booster: in `src/lib/points.functions.ts` `awardInternal` (and `spinAndAward`), before insert, look up caller's active booster (`expires_at > now()`) and if present multiply `points` by 2. Persist the applied multiplier on the point_event `metadata.booster_applied=true`.

### Client cleanup
- `src/routes/checkout.return.tsx`: remove the localStorage writes; keep the confirmation UI but message reads "Your credit/booster is being applied — it may take a few seconds." Invalidate the entitlements query so the UI refreshes.
- Remove `LAUNCH_CREDITS_KEY` / `BOOSTER_KEY` constants.

## Finding 2 — Manage Subscription for crypto/USDC

### Behavior
In `src/routes/shop.tsx`, pick the "active" subscription row (highest priority: any active row across envs) and branch:
- `environment === 'stripe'`: keep current `createPortalSession` flow (Stripe Billing Portal).
- `environment === 'crypto'` or `'usdc'`: no portal exists. Render a "Membership details" panel inline:
  - Show `current_period_end`, payment method label ("Coinbase Commerce" / "USDC on Base"), and a "Renew now" CTA that re-triggers the same purchase flow (Commerce charge or `UsdcPayButton`). Renewing extends `current_period_end` (already implemented in the USDC path; verify Commerce webhook does the same — extend, don't overwrite).
  - Copy: "One-time payments don't auto-renew, so there's nothing to cancel. Access ends on {date} unless you renew."

### Hook change
`src/hooks/useSubscription.ts`: expose `environment` of the active row so the UI can branch. (Already selects `*`, just surface it.)

### Guard
`createPortalSession` stays scoped to Stripe (as-is). The UI never calls it for non-Stripe rows, so the error toast disappears by construction.

## Out of scope
- No changes to pricing, product SKUs, or wallets.
- No refactor of the existing USDC/Commerce subscription extension logic beyond confirming Commerce extends `current_period_end`.

## Verification
- Simulate Stripe test-mode purchase of each SKU → row appears in `entitlements`, `/launch` shows credit available, points award doubles while booster active.
- Simulate Commerce webhook with fixture payload → same result under `source='commerce'`.
- Sign in as a crypto-Pro user → "Manage subscription" opens the details panel, not an error toast; sign in as Stripe-Pro user → portal opens as today.

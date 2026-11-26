# Resident Labs 3.0 — unpublished draft review

## Delivered
- Resident Pro: **4.99 USDC / 30 days**, simulated only, no automatic renewal. A server-generated order requires confirmation; expiration, history and entitlements persist under the authenticated account.
- Interactive AI Copilot: live Base token context and public ETH balance lookup where available; educational responses only. Durable quotas: 5 free / 50 Pro per UTC day, including failed attempts; duplicate request IDs cannot rerun inference.
- Token Radar: Base pairs discovered through **paid Dexscreener boosts**, then ranked by 24-hour volume; this is not an organic trending feed or endorsement. Liquidity/volume/search/sort filters, existing local watchlist, explicit unavailable audit information, server-gated enhanced analytics.
- Administrator metrics: simulated revenue/conversion/repeat purchases, actual verified USDC totals, active memberships, and AI usage/returning users. Server checks the caller's fixed-ID role before privileged reads.
- Existing Stripe management and purchased boosters/credits remain accessible. Simulated Pro does not grant legacy game rewards.
- Full desktop navigation labels, prominent Pro, and scrollable mobile More containing Arcade, Moonshot, Pro and Radar.

## Verification
- **20 live isolated-backend tests passed** (`python3 scripts/resident-v3.e2e.py`): pending quote, no activation before confirmation, 8 concurrent retries, exactly one order/membership, exact 30-day duration, no auto-renewal, stable expiration on retry, active-membership extension rejection, no admin from editable metadata, free/Pro concurrent quotas, UTC day reset, duplicate AI rejection, expiration fallback, manual renewal, owner-scoped request keys, expired checkout rejection.
- **18 new unit tests passed** for price, duration, simulation mode, membership status/expiration, legacy paid membership, and prepared proof network/token/sender/recipient/amount/success/12-confirmation guards.
- **11 MOONSHOT regression unit tests passed**; no MOONSHOT balances or payment settings changed.
- Signed-in browser: simulated checkout confirmed and persisted after reload; live AI response completed with evidence caveats; live Radar and Pro analytics displayed; watchlist persisted across reload; minimum liquidity filter worked.
- Temporary isolated test administrator read real draft aggregates (4.99 simulated USDC, one member, one completed AI request); role removed afterward. Non-admin direct revenue request denied; direct checkout rejected live mode and spoofed owner field.
- Desktop 1440×900, compact 664×614 and mobile 390×844: no horizontal overflow; mobile More opened and navigated to Radar. Final browser run recorded **zero runtime errors** after correcting Radar's loader snapshot hydration.
- Automatic preview build/type check reports **build OK**. Targeted lint across changed application files passed.
- Full-project lint was attempted: **1,374 errors / 17 warnings** in inherited code; not claimed clean and not mass-reformatted.
- Local access inspection: new tables have RLS; own-row reads only; atomic checkout and quota RPCs are not executable by anon/authenticated. Disposable concurrent-test accounts were removed only by their recorded UUIDs.
- Hosted quick and deep security tools refused to scan this isolated draft. Dependency scan reported existing transitive warnings (including Coinbase/Farcaster axios, follow-redirects, ws, Zod and tooling dependencies). No claim of comprehensive security clearance.

## Zora attribution audit
- `buildCreateCoinCalls` passes the existing creator to metadata upload and `createCoinCall`; `prepareTradeCall` passes the existing sender to `createTradeCall`.
- Neither currently explicitly passes a platform/trade referral address. Existing receiver/treasury/creator addresses were preserved.
- Potential opportunity: documented SDK-supported platform/trade referral attribution, after agreeing the destination and checking current Zora fee eligibility. No referral was silently assigned, and no actual rewards or transactions were measured in this audit.

## Remaining blockers and limitations
- **Administrator assignment pending:** the named email has no existing verified account in this draft. No owner role was assigned from email or editable metadata. Use a verified fixed user ID once the account exists; production accounts were not imported or altered.
- **Real checkout intentionally unavailable.** New proof checks are preparation only, not a live payment activation endpoint; launch still needs a server-issued quote, verified wallet binding, RPC receipt/log verification, durable transaction-hash uniqueness and atomic settlement. Existing live payment configuration was not changed. No funds moved and no signing was requested.
- Radar does not claim honeypot, holder concentration or verified contract audit coverage. Wallet AI looks up public ETH only, not holdings/history or ownership. Stripe/Commerce revenue totals are explicitly unavailable in the new administrator report.
- Farcaster-specific wallet authentication inside an actual client was not exercised. Mobile browser navigation was exercised.
- AI Gateway is installed and uses the workspace-resolved Responses model. No additional provider key required; model calls consume workspace credits.
- Accepting this draft brings its recorded data-structure changes into the app automatically; this draft's rows and test data do not move to the app. **No acceptance, publishing, production data modification or contract deployment occurred.**

## Changed source files
- `package.json`, `bun.lock`, `AGENTS.md`, `roadmap.md`, `RESIDENT_V3_REVIEW.md`
- `scripts/resident-v3.e2e.py`
- `src/ai-gateway.types.ts`, generated `src/generated/ai-gateway/models.d.ts` and `models.d.cts`
- `src/lib/resident-pro.ts`, `src/lib/resident-pro.test.ts`, `src/lib/resident-head.ts`, `src/lib/resident-v3.functions.ts`, `src/lib/token-radar.server.ts`, `src/lib/nav.ts`
- `src/hooks/useResidentPro.ts`, `src/hooks/useSubscription.ts`
- `src/components/ResidentProPanel.tsx`, `src/components/ResidentSidebar.tsx`, `src/components/BottomNav.tsx`
- `src/routes/pro.tsx`, `src/routes/admin.revenue.tsx`, `src/routes/ai.tsx`, `src/routes/radar.tsx`, `src/routes/shop.tsx`
- Generated `src/routeTree.gen.ts`, `src/integrations/supabase/types.ts`
- `drizzle/migrations/0002_resident_v3_simulation.sql`, `drizzle/migrations/0003_resident_v3_explicit_read_grants.sql`, generated journal/snapshot entries

Preview: https://id-preview-1--2c1a0487-807c-4c59-83b2-fd6fd390209d.lovable.app/pro
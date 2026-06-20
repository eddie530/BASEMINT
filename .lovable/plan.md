# Plan

Big batch — I'll ship it in 4 phases on top of Lovable Cloud (which I'll enable first).

## Phase 0 — Enable Lovable Cloud
Needed for profiles, referrals, and analytics persistence. One click.

## Phase 1 — Farcaster Mini App manifest
Create `src/routes/.well-known.farcaster.json.ts` returning a real manifest:
- `accountAssociation`: left as a TODO block in the response with clear instructions (signing requires your Farcaster custody wallet — I can't sign for you; you paste the header/payload/signature from Warpcast's Mini App tool and I wire them in).
- `frame`: `name: "Basemint"`, `version: "1"`, `iconUrl`, `homeUrl`, `splashImageUrl`, `splashBackgroundColor: "#000000"`, `subtitle`, `description`, `primaryCategory: "social"`, `tags: ["base","zora","mint","coins","nft"]`.
- Uses absolute URLs derived from request origin so it works on preview + prod.

Also add Base/Farcaster embed meta tags in `__root.tsx` (`fc:frame`, `of:version`, etc.) so links unfurl as Mini App embeds.

## Phase 2 — Real data (replace mocks)
Source: **Zora Coins SDK GraphQL** (`api-sdk.zora.engineering`) — no API key needed, covers Zora coins on Base + recent launches + trending. Wrap in server functions so we don't leak CORS issues client-side.

New server functions in `src/lib/zora.functions.ts`:
- `getTrendingCoins({ chain: "base", limit })` → top by 24h volume
- `getRecentCoins({ chain: "base", limit })` → newest
- `getCoinDetails({ address })`
- `getCoinsByCreator({ address })`

Wire into existing feed/vault/coin-detail screens via TanStack Query (`ensureQueryData` + `useSuspenseQuery`). Keep a typed DTO so UI stops depending on mock shape.

## Phase 3 — Creator profiles
- DB: `profiles` (wallet PK, display_name, bio, avatar_url, twitter, farcaster, website, created_at)
- Public route `/profile/$address` showing:
  - Header (avatar/handle/bio/socials) from `profiles` if present, else derived from on-chain/Zora data
  - Coins created by that address (from `getCoinsByCreator`)
  - Referral stats (public count only)
- Authenticated `/settings/profile` edit page (wallet must match signed-in user — link via existing auth)
- RLS: anyone SELECT, only owner UPDATE/INSERT; proper GRANTs

## Phase 4 — Referrals + analytics
- DB:
  - `referral_codes` (code PK, owner_user_id, created_at)
  - `referral_events` (id, code, event_type ['visit','signup','mint'], coin_address?, value_wei?, ip_hash, ua, created_at)
  - `page_events` (id, session_id, path, referrer, ref_code?, user_id?, created_at) — lightweight pageview log
- Capture: root layout reads `?ref=` from URL, persists to localStorage + cookie, fires a `visit` event via a public server route `/api/public/track` (rate-limited by IP hash, no PII). On signup/mint, dedupe and attribute.
- Server functions:
  - `getMyReferralStats` (auth) → visits/signups/mints/volume for owner
  - `getCreatorReferralPublicCount(address)` for profile page
- UI:
  - `/dashboard` (auth) → personal analytics: visits, signups, mints, referral leaderboard, recent events, top coins
  - Referral link generator on profile + dashboard (`?ref=<code>`)
- All inserts via service-role inside server route after validation; reads via RLS-scoped server fn.

## Technical notes
- Stack: TanStack Start + Lovable Cloud (Supabase). Server fns in `src/lib/*.functions.ts`.
- Zora API: server-side fetch only (avoids CORS, keeps response shapes stable). 30s `staleTime` for trending, 10s for recent.
- Analytics is first-party only (no third-party scripts). Charts via existing Recharts if already installed, else a simple table + sparkline.
- No new secrets needed for Zora. Farcaster `accountAssociation` requires you to paste signed values once.

## What I need from you after Phase 1 ships
The signed `accountAssociation` triplet (header/payload/signature) from Warpcast → Settings → Developer → Mini Apps → Domain manifest tool, for domain `foxy-token-forge.lovable.app` (or your custom domain). I'll paste it into the manifest fn.

## Out of scope (ask if you want them)
- On-chain mint execution from referral links
- Email notifications for referral milestones
- Public leaderboard across all creators

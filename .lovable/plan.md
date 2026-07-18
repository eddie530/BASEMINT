# Resident Labs — Integration Plan (Phase 0: audit only)

You asked for Command 1 only: inventory the project, do not touch code, and lay out a safe phased path to unify BaseMint + SpinBase under the Resident Labs umbrella with the nav: Home · Discover · Launch · Play · Vault · AI · Profile.

## 1. What exists today (inventory)

### Routes (`src/routes/`)
- `__root.tsx` — SSR shell, SEO/OG/Farcaster/Base Builder meta, JSON-LD
- `index.tsx` — Home feed (Curated Signal + Trending + Just Launched + search)
- `search.tsx` — full search results (?q, ?type, ?page)
- `coin.$id.tsx` — coin detail + Buy/Sell (Zora trade)
- `create.tsx` — Zora coin + ERC-1155 NFT creation
- `deploy.tsx` — Basemint Foundry factories (ERC20/ERC721) w/ wallet+approval gate
- `arcade.tsx` — "Neon Arcade" hub (placeholder tiles)
- `vault.tsx` — existing vault page
- `dashboard.tsx` — creator analytics
- `points.tsx`, `leaderboard.tsx` — points/quests
- `profile.$address.tsx`, `settings.profile.tsx` — profile view + edit (contracts, CDP server wallet)
- `api/public/track.ts` — analytics beacon
- `sitemap[.]xml.ts`

### Shell components
- `MiniAppShell` (max-w-[430px] mobile shell) → `AppHeader` + `BottomNav` (Feed/Points/Create/Vault)
- `AnalyticsTracker`

### Reusable feature components
- `feed/CoinCard`, `feed/NFTCard`, `feed/SpinDiscover` (already spin-styled discovery)
- `coin/MintDialog`, `coin/TradeDialog`
- `create/DeployProgress`, `create/LaunchReceipt`
- `profile/ProfileContractsPanel`
- Full `ui/` shadcn set

### Server / data libs
- Zora: `zora.functions.ts` (trending/recent/detail), `zora-create.functions.ts`, `zora-trade.functions.ts`
- Basemint contracts: `basemint-contracts.ts` (factory ABIs + addresses + Basescan)
- Points ledger: `points.functions.ts` + Supabase `point_events` / `point_balances` / `quests` / `quest_progress` / `daily_checkins`
- Profiles: `profiles.functions.ts`, `profile-contracts.functions.ts`
- CDP server wallets: `cdp-wallets.functions.ts`
- Analytics: `analytics.ts` + `page_events` + `referral_codes`/`referral_events`
- Curated Signal: `curated.ts` (Resident Labs brand constants live here already)

### Wallet / identity stack
- `wagmi.ts` — Base + Base Sepolia, connectors: Farcaster miniApp, injected, Coinbase Smart Wallet, CDP Embedded Wallet (email/Google/Apple)
- `providers.tsx` — `WagmiProvider` + `CDPReactProvider` + lazy `<SignIn />` modal, calls `sdk.actions.ready()`
- `use-connect-wallet.ts` — single hook already funnels all connectors
- `sponsored-tx.ts` — paymaster/EIP-5792 gasless path

### Database (Supabase)
Tables: `profiles`, `profile_contracts`, `cdp_wallets`, `point_events`, `point_balances`, `quests`, `quest_progress`, `daily_checkins`, `page_events`, `referral_codes`, `referral_events`. RLS/GRANTs already hardened (service-role writes for sensitive tables; public read where safe).

### Env vars (client-visible `VITE_*`)
- `VITE_BASE_RPC_URL`, `VITE_BASE_SEPOLIA_RPC_URL`
- `VITE_CDP_PROJECT_ID`, `VITE_CDP_PAYMASTER_URL_BASE(_SEPOLIA)`
- `VITE_TOKEN_FACTORY_BASE(_SEPOLIA)`, `VITE_NFT_FACTORY_BASE(_SEPOLIA)`
- Server secrets: `ZORA_API_KEY`, `CDP_API_KEY_ID/SECRET`, `CDP_WALLET_SECRET`, `LOVABLE_API_KEY`, Supabase keys

### Mini-app manifests
- `public/.well-known/farcaster.json` (signed accountAssociation for basemint.dev, `baseBuilder.appId=bc_iv004g9z`)
- `public/manifest.webmanifest`, apple-touch icons, favicon

## 2. Mapping: current → Resident Labs nav

```text
Resident Labs nav      Source in current app                          Status
─────────────────────  ────────────────────────────────────────────  ──────────────────
Home                   NEW dashboard (reuse index feed widgets)       BUILD (Cmd 3)
Discover  (BaseMint)   routes/index.tsx + search.tsx + coin.$id.tsx  MIGRATE (Cmd 4)
Launch    (BaseMint)   routes/create.tsx + routes/deploy.tsx          CONSOLIDATE (Cmd 5)
Play      (SpinBase)   routes/arcade.tsx + feed/SpinDiscover          EVOLVE (Cmd 6)
Vault     (Resident)   routes/vault.tsx + routes/dashboard.tsx        EXTEND (Cmd 7)
AI        (Resident)   — none yet (LOVABLE_API_KEY present)           NEW (Cmd 8)
Profile   (Resident)   routes/profile.$address + settings.profile +   UNIFY (Cmd 9)
                       routes/points.tsx + leaderboard.tsx
```

## 3. Duplicates / conflicts to resolve (later, not now)

- **Two launch surfaces**: `/create` (Zora coin + 1155) and `/deploy` (Basemint factories). Keep both engines, unify under one `/launch` hub with cards → sub-flows. Do NOT collapse the underlying functions.
- **Two "home-ish" pages**: `/` (feed) and `/dashboard` (creator analytics). New `/home` becomes the shell dashboard; `/` becomes `/discover`; `/dashboard` folds into Vault or Profile.
- **Two profile-adjacent surfaces**: `/points` + `/leaderboard` overlap with Profile. Keep as sub-routes under Profile.
- **Two shell chromes**: `MiniAppShell` (430px mobile) vs. desktop needs. Extend, don't replace — add a responsive layout wrapper that upgrades to sidebar ≥ md.
- **Arcade vs. Play**: `/arcade` is a placeholder; becomes `/play` (SpinBase) with real spin mechanics from `SpinDiscover`.
- **BottomNav** currently has 4 slots (Feed/Points/Create/Vault). Needs to become the mobile projection of the 7-item nav (5 visible + "More" sheet).

## 4. Which project is the shell?

**This BaseMint project is the shell.** Reasons: it already has the signed Farcaster manifest for `basemint.dev`, Base Builder ID, wagmi with 4 connectors, CDP embedded wallet, Supabase schema with points/profiles/analytics, Zora + Basemint contracts wired, and Resident Labs brand strings in `curated.ts`. SpinBase is not a separate repo in this sandbox — it will be built into `/play` reusing `SpinDiscover`.

Rebrand is a shell + copy change; product engines (BaseMint, SpinBase) stay named inside their sections.

## 5. Safe phased migration path

**Phase A — Shell & nav (Cmd 2)**  Non-destructive.
- Add `ResidentShell` responsive layout (desktop sidebar / mobile bottom-nav) that wraps existing `MiniAppShell` chrome.
- Add new routes as thin redirects/wrappers: `/home`, `/discover`, `/launch`, `/play`, `/ai`, `/profile`.
- Existing routes keep working: `/` still renders (either redirect to `/discover` or keep as legacy alias — decide in Cmd 2).
- No DB changes. No provider changes.

**Phase B — Home dashboard (Cmd 3)**  Additive.
- Reuse `zora.functions.ts` queries, `CoinCard`, wallet hooks — zero new API endpoints.

**Phase C — Discover (Cmd 4)**  Move, don't rewrite.
- `/discover` becomes the current `/` feed body; `/` stays as an alias redirect to preserve inbound links & manifest `homeUrl`.
- `/coin/$id` unchanged.

**Phase D — Launch (Cmd 5)**  Hub page linking to existing `/create` + `/deploy`; both keep working standalone.

**Phase E — Play / SpinBase (Cmd 6)**  Build on `/play` using `SpinDiscover` + local cooldown; no fake txs.

**Phase F — Vault extend (Cmd 7)**  Add tabs to existing `/vault`; keep current data sources.

**Phase G — AI (Cmd 8)**  New `/ai` using existing `LOVABLE_API_KEY` via a server function; label as AI, no auto-tx.

**Phase H — Profile unify (Cmd 9)**  `/profile` = my-profile shortcut → `/profile/$address`; fold points/leaderboard as tabs.

**Phase I — Provider consolidation (Cmd 10)**  Audit only; current stack is already single-provider — likely no code change beyond confirming.

**Phase J — Points ledger review (Cmd 11)**  Existing schema already ledger-based (`point_events` → trigger → `point_balances`). Extend with `source_module` + unique `ref_key` if not present; migration proposed before applied.

**Phase K — Activity feed (Cmd 12)**  Unified reader over `point_events` + `referral_events` + `page_events`; no new tables initially.

**Phase L — Mobile / mini-app / flags / regression / branding / deploy checklist (Cmds 13-18)**  Sequential polish; each is a non-breaking pass.

## 6. Non-negotiables to preserve across every phase

- `public/.well-known/farcaster.json` signature + `basemint.dev` domain
- `baseBuilder.appId = bc_iv004g9z`
- Wagmi connectors and CDP provider wiring
- Zora coin/trade/create server functions
- Basemint Foundry factory ABIs + env addresses
- Supabase schema, RLS policies, GRANTs (any changes go through `supabase--migration` with additive-only DDL)
- SSR shell in `__root.tsx` (title, description, OG, JSON-LD)

## 7. What I need from you before Command 2

Confirm two things:
1. **Legacy `/` behavior**: redirect `/` → `/home`, or keep `/` as the Discover feed and add `/home` alongside? (Manifest `homeUrl` currently points to `/`.)
2. **Domain**: stay on `basemint.dev` for now (keeps Farcaster signature valid) and rebrand copy only, correct?

Once you confirm, I'll execute Command 2.
# Home dashboard: personalization pass (Command 4)

Extend `/home` with real, honest personalization. Everything is gated on real state — no fake numbers, no fake alerts, no fake stats.

## Scope

Add the following sections to `src/routes/home.tsx`, above the existing "Recent activity" area, and adapt the hero:

1. **Persistent primary action (in Hero)** — swap the hero's primary CTA based on state:
   - No wallet → "Connect wallet"
   - Wallet + no `point_events` → "Explore Base" (→ `/`)
   - Wallet + has activity, no launches → "Continue exploring" (→ `/discover`)
   - Wallet + at least one `create_coin` event → "Launch an asset" (→ `/launch`)
   - `/play` is Coming Soon, so no "Spin now" branch yet.

2. **Continue where you left off** — only renders when real local state exists. Track the last meaningful action in `localStorage` under `resident:last-action`:
   - Last token viewed (written from `/coin/$id` route on mount)
   - Last created token (written from `create.tsx` / `deploy.tsx` on success — cheap: existing success paths)
   - We do NOT invent draft-launch / saved-asset / recent-spin until those systems exist.
   Section is hidden entirely when `localStorage` has nothing.

3. **Personalized onboarding checklist** — only for "new" users (wallet connected AND `getPointsSummary` returns zero events AND no `localStorage` last-action). Checklist items derived from real signals:
   - Connect wallet — `isConnected`
   - Link Farcaster — `inFarcaster` OR profile row has `farcaster` set (skip DB read for v1; use `inFarcaster` only, label "Open in Farcaster" otherwise)
   - Explore a token — presence of last-viewed token in localStorage
   - Launch your first asset — any `create_coin` point event
   - Save an asset / Try SpinBase — marked "Coming soon" (disabled), matching honest scope
   Hidden once user has any activity.

4. **Universal search bar** — reuse existing `/search` route. Render an input at the top of `/home` that navigates to `/search?q=...` on submit. Placeholder: "Search tokens, addresses…". Small helper text: "Basenames & Farcaster profiles coming soon."

5. **Resident Labs Today** — compact daily strip. Only real data:
   - Trending token: first item from `trendingQO` (already loaded)
   - New launch: most recent item from `trendingQO` sorted by `createdAt` if available, else omit
   - Current streak: from `getPointsSummary` (already fetched) if `data.streak > 0`, else omit
   - Free spin / campaign / learning card: omitted (no backend). Section renders only if at least one tile has real data.

## Explicitly deferred (not built this pass)

Called out in the request but skipped because they require infra we don't have:

- **Watchlist movement** — no watchlist table exists yet.
- **Quests card** — `quests` table exists but is empty; would show "Coming soon" placeholder only, so skipped to avoid noise.
- **Notifications center (bell icon)** — no notifications backend.
- **Ecosystem stats row** — no aggregate data source.

I'll note these in a short comment at the bottom of `home.tsx` so the next pass has a clear TODO anchor. No new routes, no schema changes, no new server functions.

## Files changed

- `src/routes/home.tsx` — new sections + smart hero CTA.
- `src/lib/last-action.ts` (new) — tiny typed helper: `readLastAction()`, `writeLastAction({kind, ...})`, SSR-safe.
- `src/routes/coin.$id.tsx` — call `writeLastAction({ kind: "view_coin", ... })` in a `useEffect`.
- `src/routes/create.tsx` and `src/routes/deploy.tsx` — call `writeLastAction({ kind: "create_coin", ... })` on the existing success paths (single line each).

## Technical notes

- All new UI stays inside `MiniAppShell` and uses existing tokens (`accent`, `primary`, glass panels). No new deps.
- `localStorage` reads happen in `useEffect` + `useState` to avoid hydration mismatch.
- Onboarding checklist checks derive purely from already-fetched `getPointsSummary` + `isConnected` + `inFarcaster` + last-action — no extra network calls.
- Search input is a plain `<form>` with `navigate({ to: "/search", search: { q } })`.

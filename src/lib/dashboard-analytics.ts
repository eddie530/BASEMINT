// Lightweight, vendor-agnostic event hook for the Resident Labs dashboard.
// Intentionally minimal: no personal wallet data, no PII, no network calls.
// Future backends can subscribe via addDashboardAnalyticsListener().

export type DashboardEvent =
  | { type: "dashboard_viewed" }
  | { type: "quick_action_selected"; id: string }
  | { type: "module_card_selected"; id: string }
  | { type: "search_used"; length: number }
  | { type: "trending_asset_opened"; symbol?: string }
  | { type: "onboarding_item_completed"; id: string }
  | { type: "onboarding_dismissed" }
  | { type: "watchlist_cta_selected" }
  | { type: "notifications_opened" };

type Listener = (event: DashboardEvent) => void;
const listeners = new Set<Listener>();

export function addDashboardAnalyticsListener(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function trackDashboard(event: DashboardEvent): void {
  if (typeof window === "undefined") return;
  for (const fn of listeners) {
    try {
      fn(event);
    } catch {
      // best-effort
    }
  }
  // Dev-only breadcrumb; no network transport wired yet.
  if (import.meta.env?.DEV) {
    // eslint-disable-next-line no-console
    console.debug("[dashboard]", event);
  }
}

// Lightweight, SSR-safe helper for tracking the user's last meaningful action.
// Only used to power the "Continue where you left off" panel on /home.
// Real data only — nothing is written unless a genuine event occurs.

export type LastActionKind = "view_coin" | "create_coin" | "create_nft";

export interface LastAction {
  kind: LastActionKind;
  /** Contract address (coin/nft) or route id. */
  ref: string;
  /** Human label — coin name, token symbol, etc. */
  label?: string;
  /** Optional secondary label (symbol, chain). */
  sub?: string;
  /** Where clicking the card should navigate. */
  href: string;
  /** ISO timestamp. */
  at: string;
}

const KEY = "resident:last-action";

export function readLastAction(): LastAction | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastAction;
    if (!parsed || !parsed.kind || !parsed.href) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeLastAction(a: Omit<LastAction, "at">) {
  if (typeof window === "undefined") return;
  try {
    const payload: LastAction = { ...a, at: new Date().toISOString() };
    window.localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    // storage disabled — silently ignore
  }
}

export function clearLastAction() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}

// First-party analytics + referral capture (browser only).

const REF_KEY = "bm_ref";
const SESSION_KEY = "bm_sid";

function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  let sid = window.localStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

export function captureRefFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const p = new URLSearchParams(window.location.search);
    const ref = p.get("ref");
    if (ref && /^[A-Za-z0-9_-]{4,64}$/.test(ref)) {
      window.localStorage.setItem(REF_KEY, ref.toLowerCase());
      return ref.toLowerCase();
    }
  } catch {
    // ignore
  }
  return window.localStorage.getItem(REF_KEY);
}

export function getStoredRef(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REF_KEY);
}

export async function track(
  event: "pageview" | "connect" | "mint" | "trade",
  extra: { path?: string; wallet_address?: string; coin_address?: string } = {},
): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await fetch("/api/public/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: getSessionId(),
        path: extra.path ?? window.location.pathname,
        referrer: document.referrer || null,
        ref_code: getStoredRef(),
        wallet_address: extra.wallet_address ?? null,
        event,
        coin_address: extra.coin_address ?? null,
      }),
      keepalive: true,
    });
  } catch {
    // best-effort
  }
}

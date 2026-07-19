// Local watchlist store. Keyed by lowercased "chainId:address".
// Persists to localStorage and broadcasts changes so UI can react live.

const KEY = "rl_watchlist_v1";
const EVENT = "rl:watchlist-changed";

export interface WatchlistItem {
  address: string;
  chainId: number;
  addedAt: number;
  // Optional cached hints so the UI can render before the network resolves.
  name?: string;
  symbol?: string;
  image?: string;
}

function idOf(chainId: number, address: string): string {
  return `${chainId}:${address.toLowerCase()}`;
}

function safeRead(): WatchlistItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is WatchlistItem =>
        !!x &&
        typeof (x as WatchlistItem).address === "string" &&
        typeof (x as WatchlistItem).chainId === "number",
    );
  } catch {
    return [];
  }
}

function safeWrite(items: WatchlistItem[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    // ignore
  }
}

export function readWatchlist(): WatchlistItem[] {
  return safeRead().sort((a, b) => b.addedAt - a.addedAt);
}

export function isWatched(chainId: number, address: string): boolean {
  const id = idOf(chainId, address);
  return safeRead().some((x) => idOf(x.chainId, x.address) === id);
}

export function addToWatchlist(item: Omit<WatchlistItem, "addedAt">): void {
  const id = idOf(item.chainId, item.address);
  const current = safeRead().filter((x) => idOf(x.chainId, x.address) !== id);
  current.unshift({ ...item, address: item.address, addedAt: Date.now() });
  safeWrite(current.slice(0, 50));
}

export function removeFromWatchlist(chainId: number, address: string): void {
  const id = idOf(chainId, address);
  safeWrite(safeRead().filter((x) => idOf(x.chainId, x.address) !== id));
}

export function toggleWatchlist(item: Omit<WatchlistItem, "addedAt">): boolean {
  if (isWatched(item.chainId, item.address)) {
    removeFromWatchlist(item.chainId, item.address);
    return false;
  }
  addToWatchlist(item);
  return true;
}

export function subscribeWatchlist(fn: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => fn();
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

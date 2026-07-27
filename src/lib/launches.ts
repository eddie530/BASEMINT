import type { CoinDTO } from "./zora.types";

/**
 * Mint progress indicator.
 * Zora coins have no hard cap, so we express "mint momentum" as progress toward
 * a collector milestone tier (100 → 500 → 1k → 5k → 10k collectors).
 */
const TIERS = [100, 500, 1000, 5000, 10000, 50000];

export function collectorTier(holders: number): number {
  return TIERS.find((t) => holders < t) ?? TIERS[TIERS.length - 1];
}

export function mintProgress(coin: Pick<CoinDTO, "uniqueHolders">): number {
  const holders = coin.uniqueHolders ?? 0;
  const target = collectorTier(holders);
  return Math.max(2, Math.min(100, Math.round((holders / target) * 100)));
}

/** Next Resident Labs release window: every Friday 18:00 UTC. */
export function nextReleaseAt(from: Date = new Date()): Date {
  const d = new Date(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate(), 18, 0, 0, 0),
  );
  while (d.getUTCDay() !== 5 || d.getTime() <= from.getTime()) {
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return d;
}

export function countdownParts(target: Date, now: Date = new Date()) {
  const ms = Math.max(0, target.getTime() - now.getTime());
  const total = Math.floor(ms / 1000);
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

export function mintLink(address: string): string {
  return `https://basemint.dev/coin/${address}`;
}

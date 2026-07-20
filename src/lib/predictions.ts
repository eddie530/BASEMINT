// Local-first prediction market. No backend — positions live in localStorage.
// Prices are simulated with a constant-product-style curve seeded per market.

export type Outcome = "yes" | "no";

export interface PredictionMarket {
  id: string;
  question: string;
  category: "Crypto" | "Base" | "Culture" | "Sports";
  endsAt: string; // ISO
  volumeUsd: number;
  /** Probability YES resolves true, 0..1. Drives price. */
  yesProb: number;
}

export interface Position {
  marketId: string;
  outcome: Outcome;
  shares: number; // whole shares
  avgPrice: number; // USD per share when acquired (0..1)
}

const POS_KEY = "basemint:predictions:positions:v1";
const BAL_KEY = "basemint:predictions:balance:v1";
const START_BAL = 1000;

export const MARKETS: PredictionMarket[] = [
  {
    id: "btc-200k-2026",
    question: "Will BTC close above $200k in 2026?",
    category: "Crypto",
    endsAt: "2026-12-31T23:59:59Z",
    volumeUsd: 482_130,
    yesProb: 0.42,
  },
  {
    id: "base-tvl-25b",
    question: "Will Base TVL exceed $25B by Q4 2026?",
    category: "Base",
    endsAt: "2026-12-31T23:59:59Z",
    volumeUsd: 128_400,
    yesProb: 0.61,
  },
  {
    id: "zora-1m-coins",
    question: "Will Zora surpass 1M content coins on Base?",
    category: "Base",
    endsAt: "2026-09-30T23:59:59Z",
    volumeUsd: 74_220,
    yesProb: 0.73,
  },
  {
    id: "farcaster-10m-users",
    question: "Farcaster to hit 10M active users this year?",
    category: "Culture",
    endsAt: "2026-12-31T23:59:59Z",
    volumeUsd: 251_900,
    yesProb: 0.28,
  },
  {
    id: "eth-8k-eoy",
    question: "Will ETH close above $8k end of year?",
    category: "Crypto",
    endsAt: "2026-12-31T23:59:59Z",
    volumeUsd: 612_050,
    yesProb: 0.55,
  },
  {
    id: "eu-champions",
    question: "Will Real Madrid win the Champions League 2026?",
    category: "Sports",
    endsAt: "2026-05-30T23:59:59Z",
    volumeUsd: 89_300,
    yesProb: 0.34,
  },
];

export function priceFor(market: PredictionMarket, outcome: Outcome): number {
  const p = outcome === "yes" ? market.yesProb : 1 - market.yesProb;
  // Clamp to keep quotes realistic.
  return Math.min(0.98, Math.max(0.02, p));
}

export function loadBalance(): number {
  if (typeof window === "undefined") return START_BAL;
  const raw = localStorage.getItem(BAL_KEY);
  if (raw == null) {
    localStorage.setItem(BAL_KEY, String(START_BAL));
    return START_BAL;
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : START_BAL;
}

export function saveBalance(v: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(BAL_KEY, String(Math.max(0, v)));
}

export function loadPositions(): Position[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(POS_KEY);
    return raw ? (JSON.parse(raw) as Position[]) : [];
  } catch {
    return [];
  }
}

export function savePositions(positions: Position[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(POS_KEY, JSON.stringify(positions));
}

export function trade(
  market: PredictionMarket,
  outcome: Outcome,
  side: "buy" | "sell",
  shares: number,
): { balance: number; positions: Position[]; cost: number } {
  const price = priceFor(market, outcome);
  const cost = price * shares;
  let balance = loadBalance();
  let positions = loadPositions();
  const idx = positions.findIndex((p) => p.marketId === market.id && p.outcome === outcome);

  if (side === "buy") {
    if (cost > balance) throw new Error("Insufficient play balance.");
    balance -= cost;
    if (idx >= 0) {
      const existing = positions[idx];
      const totalShares = existing.shares + shares;
      const avg = (existing.avgPrice * existing.shares + price * shares) / totalShares;
      positions[idx] = { ...existing, shares: totalShares, avgPrice: avg };
    } else {
      positions.push({ marketId: market.id, outcome, shares, avgPrice: price });
    }
  } else {
    if (idx < 0 || positions[idx].shares < shares) throw new Error("Not enough shares to sell.");
    balance += cost;
    const remaining = positions[idx].shares - shares;
    if (remaining <= 0) positions.splice(idx, 1);
    else positions[idx] = { ...positions[idx], shares: remaining };
  }

  saveBalance(balance);
  savePositions(positions);
  return { balance, positions, cost };
}

export function resetPredictions() {
  saveBalance(START_BAL);
  savePositions([]);
}

import { createServerFn } from "@tanstack/react-start";
import type { PredictionMarket } from "./predictions";

// Live markets from Polymarket's public Gamma API (no key required).
// Docs: https://docs.polymarket.com/#gamma-markets-api
const GAMMA = "https://gamma-api.polymarket.com/markets";

type GammaMarket = {
  id: string;
  slug: string;
  question: string;
  category?: string;
  endDate?: string;
  closed?: boolean;
  active?: boolean;
  archived?: boolean;
  outcomes?: string; // JSON-encoded array string
  outcomePrices?: string; // JSON-encoded array string
  volume?: string | number;
  volumeNum?: number;
  volume24hr?: number;
  liquidityNum?: number;
  image?: string;
};

function toCategory(raw?: string): PredictionMarket["category"] {
  const c = (raw || "").toLowerCase();
  if (c.includes("sport")) return "Sports";
  if (c.includes("crypto")) return "Crypto";
  if (c.includes("base")) return "Base";
  return "Culture";
}

function parseArr(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw as string[];
  if (typeof raw !== "string") return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

export const fetchLiveMarkets = createServerFn({ method: "GET" }).handler(
  async (): Promise<PredictionMarket[]> => {
    const url = `${GAMMA}?closed=false&active=true&archived=false&limit=60&order=volume24hr&ascending=false`;
    let res: Response;
    try {
      res = await fetch(url, { headers: { accept: "application/json" } });
    } catch {
      return [];
    }
    if (!res.ok) return [];
    const rows = (await res.json()) as GammaMarket[];
    if (!Array.isArray(rows)) return [];

    const markets: PredictionMarket[] = [];
    for (const r of rows) {
      const outcomes = parseArr(r.outcomes);
      const prices = parseArr(r.outcomePrices).map((p) => Number(p));
      // Binary Yes/No only.
      if (outcomes.length !== 2 || prices.length !== 2) continue;
      const yesIdx = outcomes.findIndex((o) => /^yes$/i.test(o));
      const noIdx = outcomes.findIndex((o) => /^no$/i.test(o));
      if (yesIdx < 0 || noIdx < 0) continue;
      const yesPrice = prices[yesIdx];
      if (!Number.isFinite(yesPrice) || yesPrice <= 0 || yesPrice >= 1) continue;
      if (!r.endDate) continue;

      markets.push({
        id: r.slug || r.id,
        slug: r.slug,
        question: r.question,
        category: toCategory(r.category),
        endsAt: r.endDate,
        volumeUsd: Number(r.volumeNum ?? r.volume ?? 0) || 0,
        yesProb: yesPrice,
        image: r.image,
        source: "polymarket",
      });
      if (markets.length >= 40) break;
    }
    return markets;
  },
);

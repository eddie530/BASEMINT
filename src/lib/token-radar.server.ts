import { z } from "zod";

const boostSchema = z.array(z.object({ chainId: z.string(), tokenAddress: z.string() }));
const pairsSchema = z.array(
  z.object({
    chainId: z.string(),
    pairAddress: z.string(),
    dexId: z.string(),
    url: z.string(),
    baseToken: z.object({ address: z.string(), name: z.string(), symbol: z.string() }),
    priceUsd: z.string().optional(),
    liquidity: z.object({ usd: z.number().optional() }).optional(),
    volume: z.object({ h24: z.number().optional() }).optional(),
    marketCap: z.number().optional(),
    fdv: z.number().optional(),
    priceChange: z.object({ h24: z.number().optional(), h1: z.number().optional() }).optional(),
    pairCreatedAt: z.number().optional(),
  }),
);

async function readJson(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error("Market provider unavailable");
  return response.json();
}

export async function loadRadar() {
  const fetchedAt = new Date().toISOString();
  try {
    // Paid boosts are a discovery source, not organic popularity or endorsement.
    const boosts = boostSchema.parse(
      await readJson("https://api.dexscreener.com/token-boosts/top/v1"),
    );
    const addresses = [
      ...new Set(
        boosts
          .filter((b) => b.chainId === "base" && /^0x[a-fA-F0-9]{40}$/.test(b.tokenAddress))
          .map((b) => b.tokenAddress),
      ),
    ].slice(0, 30);
    if (!addresses.length)
      return { tokens: [], fetchedAt, error: "No Base tokens in the current discovery feed." };
    const pairs = pairsSchema.parse(
      await readJson(`https://api.dexscreener.com/tokens/v1/base/${addresses.join(",")}`),
    );
    const strongest = new Map<string, (typeof pairs)[number]>();
    for (const pair of pairs.filter((p) => p.chainId === "base")) {
      const key = pair.baseToken.address.toLowerCase();
      if ((pair.liquidity?.usd ?? 0) >= (strongest.get(key)?.liquidity?.usd ?? 0))
        strongest.set(key, pair);
    }
    const tokens = [...strongest.values()]
      .map((p) => ({
        address: p.baseToken.address,
        name: p.baseToken.name,
        symbol: p.baseToken.symbol,
        dex: p.dexId,
        price: p.priceUsd ? Number(p.priceUsd) : null,
        liquidity: p.liquidity?.usd ?? null,
        volume24h: p.volume?.h24 ?? null,
        marketCap: p.marketCap ?? null,
        fdv: p.fdv ?? null,
        change24h: p.priceChange?.h24 ?? null,
        change1h: p.priceChange?.h1 ?? null,
        createdAt: p.pairCreatedAt ?? null,
        risks: [
          ...(p.liquidity?.usd === undefined
            ? ["Liquidity unavailable"]
            : p.liquidity.usd < 50000
              ? ["Low liquidity"]
              : []),
          ...(p.pairCreatedAt && Date.now() - p.pairCreatedAt < 86400000 ? ["New pair"] : []),
          "Contract audit unavailable",
        ],
      }))
      .sort((a, b) => (b.volume24h ?? 0) - (a.volume24h ?? 0));
    return { tokens, fetchedAt, error: null };
  } catch {
    return {
      tokens: [],
      fetchedAt,
      error: "Live Base market data is unavailable. No estimated values are shown.",
    };
  }
}

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { CoinDTO } from "./zora.types";

// Zora SDK is fetch-based; safe in the Worker runtime.

type RawNode = {
  address: string;
  name: string;
  symbol: string;
  description?: string;
  chainId: number;
  coinType?: string;
  createdAt?: string;
  uniqueHolders: number;
  totalSupply?: string;
  totalVolume?: string;
  volume24h?: string;
  marketCap?: string;
  marketCapDelta24h?: string;
  creatorAddress?: string;
  tokenPrice?: { priceInUsdc?: string };
  creatorProfile?: {
    handle?: string;
    avatar?: { previewImage?: { medium?: string; small?: string } };
  };
  mediaContent?: { previewImage?: { medium?: string; small?: string } };
};

function num(v: string | undefined | null): number | undefined {
  if (v == null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function toDTO(n: RawNode): CoinDTO {
  return {
    address: n.address,
    name: n.name,
    symbol: n.symbol,
    description: n.description,
    image:
      n.mediaContent?.previewImage?.medium ??
      n.mediaContent?.previewImage?.small ??
      `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(n.address)}&backgroundColor=0052ff,00ffd1,ff6b35`,
    creatorAddress: n.creatorAddress,
    creatorHandle: n.creatorProfile?.handle,
    creatorAvatar:
      n.creatorProfile?.avatar?.previewImage?.small ??
      n.creatorProfile?.avatar?.previewImage?.medium,
    priceUsd: num(n.tokenPrice?.priceInUsdc),
    marketCap: num(n.marketCap),
    volume24h: num(n.volume24h),
    marketCapDelta24h: num(n.marketCapDelta24h),
    uniqueHolders: n.uniqueHolders ?? 0,
    totalSupply: n.totalSupply,
    createdAt: n.createdAt,
    chainId: n.chainId,
    coinType: n.coinType,
  };
}

async function safeExplore(
  fn: () => Promise<{ data?: { exploreList?: { edges?: Array<{ node: RawNode }> } } }>,
): Promise<CoinDTO[]> {
  try {
    const res = await fn();
    const edges = res?.data?.exploreList?.edges ?? [];
    return edges.map((e) => toDTO(e.node));
  } catch (err) {
    console.error("zora explore failed", err);
    return [];
  }
}

export const getTrendingCoins = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ count: z.number().int().min(1).max(50).default(10) }).parse(input ?? {}),
  )
  .handler(async ({ data }): Promise<CoinDTO[]> => {
    const { getCoinsTopVolume24h } = await import("@zoralabs/coins-sdk");
    return safeExplore(() => getCoinsTopVolume24h({ count: data.count }));
  });

export const getRecentCoins = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ count: z.number().int().min(1).max(50).default(10) }).parse(input ?? {}),
  )
  .handler(async ({ data }): Promise<CoinDTO[]> => {
    const { getCoinsNew } = await import("@zoralabs/coins-sdk");
    return safeExplore(() => getCoinsNew({ count: data.count }));
  });

export const getTopGainers = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ count: z.number().int().min(1).max(50).default(10) }).parse(input ?? {}),
  )
  .handler(async ({ data }): Promise<CoinDTO[]> => {
    const { getCoinsTopGainers } = await import("@zoralabs/coins-sdk");
    return safeExplore(() => getCoinsTopGainers({ count: data.count }));
  });

export const getCoinDetail = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ address: z.string().min(1), chainId: z.number().int().default(8453) }).parse(input),
  )
  .handler(async ({ data }): Promise<CoinDTO | null> => {
    try {
      const { getCoin } = await import("@zoralabs/coins-sdk");
      const res = await getCoin({ address: data.address, chain: data.chainId });
      const token = (res as { data?: { zora20Token?: RawNode } })?.data?.zora20Token;
      if (!token) return null;
      return toDTO(token as RawNode);
    } catch (err) {
      console.error("zora getCoin failed", err);
      return null;
    }
  });

export const getCoinsByCreator = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ address: z.string().min(1), count: z.number().int().min(1).max(50).default(20) }).parse(input),
  )
  .handler(async ({ data }): Promise<CoinDTO[]> => {
    try {
      const { getProfileCoins } = await import("@zoralabs/coins-sdk");
      const res = await getProfileCoins({ identifier: data.address, count: data.count });
      const edges =
        (res as { data?: { profile?: { createdCoins?: { edges?: Array<{ node: RawNode }> } } } })
          ?.data?.profile?.createdCoins?.edges ?? [];
      return edges.map((e) => toDTO(e.node));
    } catch (err) {
      console.error("zora getProfileCoins failed", err);
      return [];
    }
  });

export const getHoldings = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ address: z.string().min(1), count: z.number().int().min(1).max(50).default(20) }).parse(input),
  )
  .handler(async ({ data }): Promise<CoinDTO[]> => {
    try {
      const { getProfileBalances } = await import("@zoralabs/coins-sdk");
      const res = await getProfileBalances({ identifier: data.address, count: data.count });
      const edges =
        (res as { data?: { profile?: { coinBalances?: { edges?: Array<{ node: { coin?: RawNode } }> } } } })
          ?.data?.profile?.coinBalances?.edges ?? [];
      return edges
        .map((e) => e.node?.coin)
        .filter((c): c is RawNode => Boolean(c))
        .map(toDTO);
    } catch (err) {
      console.error("zora getProfileBalances failed", err);
      return [];
    }
  });

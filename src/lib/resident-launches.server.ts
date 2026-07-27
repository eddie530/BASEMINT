import type { CoinDTO } from "./zora.types";
import {
  RESIDENT_CREATOR_ADDRESSES,
  RESIDENT_LAUNCHES,
  inferCollection,
  slugForCoin,
  type ResidentLaunch,
} from "./resident-launches";

type RawNode = {
  address: string;
  name: string;
  symbol: string;
  description?: string;
  chainId: number;
  createdAt?: string;
  uniqueHolders?: number;
  creatorAddress?: string;
  mediaContent?: { previewImage?: { medium?: string; small?: string } };
};

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
    uniqueHolders: n.uniqueHolders ?? 0,
    createdAt: n.createdAt,
    chainId: n.chainId ?? 8453,
  };
}

function creatorAddresses(): string[] {
  const fromEnv = (process.env.RESIDENT_CREATOR_ADDRESSES ?? "")
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);
  return [...new Set([...RESIDENT_CREATOR_ADDRESSES, ...fromEnv].map((a) => a.toLowerCase()))];
}

async function coinsByCreator(address: string): Promise<CoinDTO[]> {
  try {
    const { getProfileCoins } = await import("@zoralabs/coins-sdk");
    const res = await getProfileCoins({ identifier: address, count: 20 });
    const edges =
      (res as { data?: { profile?: { createdCoins?: { edges?: Array<{ node: RawNode }> } } } })?.data
        ?.profile?.createdCoins?.edges ?? [];
    return edges.map((e) => toDTO(e.node));
  } catch (err) {
    console.error("resident launches: getProfileCoins failed", err);
    return [];
  }
}

async function coinDetail(address: string): Promise<CoinDTO | null> {
  try {
    const { getCoin } = await import("@zoralabs/coins-sdk");
    const res = await getCoin({ address, chain: 8453 });
    const token = (res as { data?: { zora20Token?: RawNode } })?.data?.zora20Token;
    return token ? toDTO(token) : null;
  } catch (err) {
    console.error("resident launches: getCoin failed", err);
    return null;
  }
}

function fromCoin(coin: CoinDTO): ResidentLaunch {
  return {
    slug: slugForCoin(coin.address, coin.symbol),
    name: coin.name,
    ticker: coin.symbol,
    collection: inferCollection(coin.name ?? "", coin.symbol ?? ""),
    description:
      coin.description?.trim() ||
      `${coin.name} is a Resident Labs creator coin live on Base via Zora.`,
    tags: ["residentlabs", "base"],
    image: coin.image ?? "",
    launchDate: (coin.createdAt ?? new Date().toISOString()).slice(0, 10),
    address: coin.address,
    zoraUrl: `https://zora.co/coin/base:${coin.address}`,
    collectors: coin.uniqueHolders ?? 0,
    progress: {
      artwork: Boolean(coin.image),
      metadata: Boolean(coin.description),
      mint: true,
      farcaster: false,
      x: false,
      listed: true,
    },
  };
}

/** Merge the curated config with live Zora data for the Launch Hub. */
export async function loadResidentLaunches(): Promise<ResidentLaunch[]> {
  const creators = creatorAddresses();

  const [discovered, hydrations] = await Promise.all([
    Promise.all(creators.map(coinsByCreator)).then((r) => r.flat()),
    Promise.all(
      RESIDENT_LAUNCHES.filter((l) => l.address).map(async (l) => ({
        slug: l.slug,
        coin: await coinDetail(l.address as string),
      })),
    ),
  ]);

  const liveBySlug = new Map(hydrations.map((h) => [h.slug, h.coin]));

  // Configured launches win; live data fills in collectors + mint status.
  const configured = RESIDENT_LAUNCHES.map((l) => {
    const coin = liveBySlug.get(l.slug);
    if (!coin) return l;
    return {
      ...l,
      collectors: coin.uniqueHolders ?? l.collectors,
      image: l.image || (coin.image ?? ""),
      description: l.description || (coin.description ?? ""),
      zoraUrl: l.zoraUrl ?? `https://zora.co/coin/base:${coin.address}`,
      progress: { ...l.progress, mint: true, listed: true },
    } satisfies ResidentLaunch;
  });

  const taken = new Set(
    configured.map((l) => l.address?.toLowerCase()).filter(Boolean) as string[],
  );

  const auto = discovered
    .filter((c) => c.address && !taken.has(c.address.toLowerCase()))
    .filter((c, i, arr) => arr.findIndex((x) => x.address === c.address) === i)
    .map(fromCoin);

  return [...configured, ...auto].sort(
    (a, b) => new Date(b.launchDate).getTime() - new Date(a.launchDate).getTime(),
  );
}

export type FeedItem =
  | {
      kind: "coin";
      id: string;
      name: string;
      symbol: string;
      address: string;
      creator: string;
      change24h: number;
      priceUsd: number;
      holders: number;
      image: string;
    }
  | {
      kind: "nft";
      id: string;
      name: string;
      creator: string;
      address: string;
      priceEth: number;
      supply: number;
      minted: number;
      image: string;
    };

export const trendingFeed: FeedItem[] = [
  {
    kind: "coin",
    id: "1",
    name: "Based Cat",
    symbol: "BCAT",
    address: "0x4200000000000000000000000000000000000006",
    creator: "jesse.base",
    change24h: 124,
    priceUsd: 0.0042,
    holders: 1284,
    image: "https://api.dicebear.com/9.x/shapes/svg?seed=bcat&backgroundColor=ff6b35",
  },
  {
    kind: "nft",
    id: "2",
    name: "Neural Echoes",
    creator: "warpcore",
    address: "0x4200000000000000000000000000000000000007",
    priceEth: 0.005,
    supply: 1000,
    minted: 42,
    image: "https://api.dicebear.com/9.x/shapes/svg?seed=neural&backgroundColor=cc00ff,0052ff",
  },
  {
    kind: "coin",
    id: "3",
    name: "Degen Mode",
    symbol: "DGEN",
    address: "0x4200000000000000000000000000000000000008",
    creator: "vitalik.base",
    change24h: -8.4,
    priceUsd: 0.00018,
    holders: 4210,
    image: "https://api.dicebear.com/9.x/shapes/svg?seed=dgen&backgroundColor=ccff00",
  },
  {
    kind: "nft",
    id: "4",
    name: "Hyperstructure #04",
    creator: "optimist",
    address: "0x4200000000000000000000000000000000000009",
    priceEth: 0.001,
    supply: 256,
    minted: 198,
    image: "https://api.dicebear.com/9.x/shapes/svg?seed=hyper&backgroundColor=00ffd1,0052ff",
  },
];

export function getItem(id: string): FeedItem | undefined {
  return trendingFeed.find((i) => i.id === id);
}

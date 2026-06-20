// Shared serializable DTOs for Zora coin data. Safe for SSR loader payloads.

export interface CoinDTO {
  address: string;
  name: string;
  symbol: string;
  description?: string;
  image?: string;
  creatorAddress?: string;
  creatorHandle?: string;
  creatorAvatar?: string;
  priceUsd?: number;
  marketCap?: number;
  volume24h?: number;
  marketCapDelta24h?: number;
  uniqueHolders: number;
  totalSupply?: string;
  createdAt?: string;
  chainId: number;
  coinType?: string;
}

export interface CreatorProfileDTO {
  address: string;
  handle?: string;
  avatar?: string;
  bio?: string;
  twitter?: string;
  farcaster?: string;
  website?: string;
}

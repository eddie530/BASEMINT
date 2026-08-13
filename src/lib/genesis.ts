import { parseEther } from "viem";
import genesisArtworkAsset from "@/assets/genesis-pass.jpg";

/**
 * Placeholder artwork slot for the GENESIS PASS.
 * Swap the imported file above (or reassign this export) to drop in the final
 * generated image — no component edits required.
 */
export const genesisPassArtwork: string = genesisArtworkAsset;

/**
 * Resident Labs // GENESIS PASS — locked mint configuration.
 *
 * The page derives everything from this object. Set
 * `VITE_GENESIS_CONTRACT` (and optionally `VITE_GENESIS_MINT_START`) once the
 * contract is deployed on Base and the page flips from Coming Soon to LIVE
 * automatically — no UI edits required.
 */

const ENV_CONTRACT = (import.meta.env['VITE_GENESIS_CONTRACT'] as string | undefined)?.trim();
const ENV_START = (import.meta.env['VITE_GENESIS_MINT_START'] as string | undefined)?.trim();

export const GENESIS = {
  name: "Resident Labs // GENESIS PASS",
  shortName: "GENESIS PASS",
  edition: "001",
  /** Open edition for the duration of the mint window. */
  supply: "Open edition",
  chainId: 8453,
  chainLabel: "Base",
  priceEth: "0.0005",
  priceWei: parseEther("0.0005"),
  perWallet: 1,
  windowDays: 7,
  artwork: genesisArtwork,
  /** Deployed ERC-721 contract on Base, or null while Coming Soon. */
  address: (ENV_CONTRACT && /^0x[a-fA-F0-9]{40}$/.test(ENV_CONTRACT)
    ? (ENV_CONTRACT as `0x${string}`)
    : null) as `0x${string}` | null,
  /** ISO timestamp the 7-day window opens, when scheduled. */
  mintStart: ENV_START || null,
  tagline: "The first collectible from Resident Labs.",
  /** Deliberately non-promissory: recognition now, features only "possible". */
  benefits: [
    "Early-supporter recognition on your Resident ID",
    "Genesis Holder badge across BaseMint",
    "Permanent onchain record of the first Resident Labs collectible",
    "Possible future holder features — nothing guaranteed",
  ],
} as const;

export type GenesisPhase = "coming-soon" | "live" | "ended";

/** Millisecond timestamp the mint window closes, or null when unscheduled. */
export function mintEndsAt(): number | null {
  if (!GENESIS.mintStart) return null;
  const start = new Date(GENESIS.mintStart).getTime();
  if (Number.isNaN(start)) return null;
  return start + GENESIS.windowDays * 24 * 60 * 60 * 1000;
}

export function genesisPhase(now: number = Date.now()): GenesisPhase {
  if (!GENESIS.address) return "coming-soon";
  const start = GENESIS.mintStart ? new Date(GENESIS.mintStart).getTime() : null;
  const end = mintEndsAt();
  if (start && !Number.isNaN(start) && now < start) return "coming-soon";
  if (end && now > end) return "ended";
  return "live";
}

export const GENESIS_TEASER = `ORIGIN SIGNAL DETECTED //
Resident Labs // GENESIS PASS
The first collectible from Resident Labs.
Minting on Base through BaseMint.`;

export const GENESIS_URL = "https://basemint.dev/genesis";

export function basescanAddress(address: string) {
  return `https://basescan.org/address/${address}`;
}

export function basescanTx(hash: string) {
  return `https://basescan.org/tx/${hash}`;
}

/** Minimal ABI for the BasemintERC721 paid-mint interface. */
export const GENESIS_ABI = [
  {
    type: "function",
    name: "mint",
    stateMutability: "payable",
    inputs: [
      { name: "to", type: "address" },
      { name: "quantity", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "totalMinted",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "mintPrice",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

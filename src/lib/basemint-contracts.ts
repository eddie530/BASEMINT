import { base, baseSepolia } from "wagmi/chains";

/**
 * Basemint factory contract addresses, populated after `forge script Deploy.s.sol`.
 * Set via env: VITE_TOKEN_FACTORY_BASE(_SEPOLIA), VITE_NFT_FACTORY_BASE(_SEPOLIA).
 */
export const FACTORY_ADDRESSES: Record<
  number,
  { tokenFactory?: `0x${string}`; nftFactory?: `0x${string}` }
> = {
  [base.id]: {
    tokenFactory: import.meta.env.VITE_TOKEN_FACTORY_BASE as `0x${string}` | undefined,
    nftFactory: import.meta.env.VITE_NFT_FACTORY_BASE as `0x${string}` | undefined,
  },
  [baseSepolia.id]: {
    tokenFactory: import.meta.env.VITE_TOKEN_FACTORY_BASE_SEPOLIA as `0x${string}` | undefined,
    nftFactory: import.meta.env.VITE_NFT_FACTORY_BASE_SEPOLIA as `0x${string}` | undefined,
  },
};

export function basescanUrl(chainId: number, addressOrTx: string): string {
  const isTx = addressOrTx.length === 66;
  const seg = isTx ? "tx" : "address";
  return chainId === baseSepolia.id
    ? `https://sepolia.basescan.org/${seg}/${addressOrTx}`
    : `https://basescan.org/${seg}/${addressOrTx}`;
}

export const TOKEN_FACTORY_ABI = [
  {
    type: "function",
    name: "createToken",
    stateMutability: "payable",
    inputs: [
      { name: "name_", type: "string" },
      { name: "symbol_", type: "string" },
      { name: "decimals_", type: "uint8" },
      { name: "initialSupply", type: "uint256" },
    ],
    outputs: [{ name: "token", type: "address" }],
  },
  {
    type: "function",
    name: "creationFee",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "event",
    name: "TokenCreated",
    inputs: [
      { indexed: true, name: "creator", type: "address" },
      { indexed: true, name: "token", type: "address" },
      { indexed: false, name: "name", type: "string" },
      { indexed: false, name: "symbol", type: "string" },
      { indexed: false, name: "initialSupply", type: "uint256" },
    ],
  },
] as const;

export const NFT_FACTORY_ABI = [
  {
    type: "function",
    name: "createCollection",
    stateMutability: "payable",
    inputs: [
      { name: "name_", type: "string" },
      { name: "symbol_", type: "string" },
      { name: "baseURI_", type: "string" },
      { name: "maxSupply_", type: "uint256" },
      { name: "mintPrice_", type: "uint256" },
    ],
    outputs: [{ name: "collection", type: "address" }],
  },
  {
    type: "function",
    name: "creationFee",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "event",
    name: "CollectionCreated",
    inputs: [
      { indexed: true, name: "creator", type: "address" },
      { indexed: true, name: "collection", type: "address" },
      { indexed: false, name: "name", type: "string" },
      { indexed: false, name: "symbol", type: "string" },
      { indexed: false, name: "maxSupply", type: "uint256" },
      { indexed: false, name: "mintPrice", type: "uint256" },
    ],
  },
] as const;

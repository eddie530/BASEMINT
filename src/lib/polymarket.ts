/**
 * Polymarket on-chain constants (Polygon mainnet).
 *
 * Docs: https://docs.polymarket.com
 * All markets settle on Polygon PoS with USDC.e as the collateral token.
 */

import { polygon } from "wagmi/chains";
import { erc20Abi } from "viem";

export const POLYGON_CHAIN_ID = polygon.id; // 137

/** Bridged USDC (USDC.e) — the Polymarket collateral token. */
export const USDC_E = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174" as const;

/** ConditionalTokens (ERC-1155 outcome shares). */
export const CTF = "0x4D97DCd97eC945f40cF65F87097ACe5EA0476045" as const;

/** Polymarket exchange venues — each needs both USDC + CTF approvals. */
export const CTF_EXCHANGE = "0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E" as const;
export const NEG_RISK_CTF_EXCHANGE = "0xC5d563A36AE78145C45a50134d48A1215220f80a" as const;
export const NEG_RISK_ADAPTER = "0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296" as const;

export const POLYMARKET_OPERATORS = [
  CTF_EXCHANGE,
  NEG_RISK_CTF_EXCHANGE,
  NEG_RISK_ADAPTER,
] as const;

export const USDC_ABI = erc20Abi;

/** Minimal ERC-1155 ABI slice for CTF operator approval. */
export const CTF_ABI = [
  {
    type: "function",
    name: "isApprovedForAll",
    stateMutability: "view",
    inputs: [
      { name: "account", type: "address" },
      { name: "operator", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "setApprovalForAll",
    stateMutability: "nonpayable",
    inputs: [
      { name: "operator", type: "address" },
      { name: "approved", type: "bool" },
    ],
    outputs: [],
  },
] as const;

const ATTEST_KEY = "polymarket_geo_attest_v1";

export function hasAttested(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(ATTEST_KEY) === "1";
}

export function setAttested(v: boolean) {
  if (typeof window === "undefined") return;
  if (v) window.localStorage.setItem(ATTEST_KEY, "1");
  else window.localStorage.removeItem(ATTEST_KEY);
}

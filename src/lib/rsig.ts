/** Canonical Resident Signal ($RSIG) token metadata — single source of truth. */
export const RSIG = {
  name: "Resident Signal",
  ticker: "RSIG",
  type: "Community Token",
  network: "Solana",
  status: "LIVE",
  mint: "5cGDB5noeZvSKhGEvc7n5GHQUmiQUWMvFVjxn1P7pump",
  description:
    "Resident Signal ($RSIG) is the official community token of Resident Labs, connecting builders, creators, collectors, AI experiments, Base applications, and Solana into one growing ecosystem.",
  /** Set once a DexScreener pair exists — buttons stay disabled until then. */
  dexscreenerUrl: null as string | null,
} as const;

export const RSIG_PUMP_URL = `https://pump.fun/coin/${RSIG.mint}`;
export const RSIG_SOLSCAN_URL = `https://solscan.io/token/${RSIG.mint}`;

/** 4…4 abbreviated mint address for compact surfaces. */
export function shortMint(mint: string = RSIG.mint): string {
  return `${mint.slice(0, 4)}…${mint.slice(-4)}`;
}

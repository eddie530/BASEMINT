// Resident Labs curated "Signal" picks. Manually maintained allow-list of
// Base/Zora coin contract addresses that get a highlighted badge + section.
// Keep it short (3-6 per cycle). Lowercased for comparisons.

export const RESIDENT_LABS = {
  name: "Resident Labs",
  agentId: "56010",
  agentIdLabel: "ERC-8004 Agent #56010",
} as const;

export const CURATED_SIGNAL_ADDRESSES: string[] = [
  // Replace with real curated addresses as they're chosen.
  // Format: lowercased "0x..." Base mainnet coin/collection address.
];

const set = new Set(CURATED_SIGNAL_ADDRESSES.map((a) => a.toLowerCase()));

export function isCurated(address?: string): boolean {
  if (!address) return false;
  return set.has(address.toLowerCase());
}

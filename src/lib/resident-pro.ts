export const RESIDENT_PRO = {
  amountUsdc: 4.99,
  units: 4_990_000n,
  days: 30,
  mode: "simulation",
  freeDaily: 5,
  proDaily: 50,
} as const;

export function membershipActive(
  row: {
    status: string;
    current_period_end: string | null;
    price_id: string | null;
    environment: string;
  },
  now = Date.now(),
) {
  return (
    ["resident_pro_monthly", "resident_pro_monthly_v2", "resident_pro_simulation_v3"].includes(
      row.price_id ?? "",
    ) &&
    ["live", "crypto", "usdc", "resident_v3_simulation"].includes(row.environment) &&
    ["active", "trialing", "canceled"].includes(row.status) &&
    row.current_period_end !== null &&
    Date.parse(row.current_period_end) > now
  );
}

// Preparation only: not exposed as an activation endpoint and never signs or transfers.
export function validPreparedProof(
  proof: {
    chainId: number;
    token: string;
    sender: string;
    recipient: string;
    amount: bigint;
    successful: boolean;
    confirmations: number;
  },
  expected: { sender: string; recipient: string; token: string },
) {
  return (
    proof.chainId === 8453 &&
    proof.successful &&
    proof.confirmations >= 12 &&
    proof.token.toLowerCase() === expected.token.toLowerCase() &&
    proof.sender.toLowerCase() === expected.sender.toLowerCase() &&
    proof.recipient.toLowerCase() === expected.recipient.toLowerCase() &&
    proof.amount === RESIDENT_PRO.units
  );
}

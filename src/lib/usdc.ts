/**
 * On-chain USDC-on-Base subscription config.
 * Treasury receives 10 USDC per 30-day Resident Pro unlock.
 */
export const USDC_BASE_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;
export const USDC_DECIMALS = 6;

export const PRO_TREASURY_ADDRESS =
  "0xef1ff71edada68942b6ddfd5187888e84218297b" as const;

export const PRO_USDC_AMOUNT = 10; // whole USDC
export const PRO_USDC_UNITS = BigInt(PRO_USDC_AMOUNT) * 10n ** BigInt(USDC_DECIMALS);
export const PRO_DURATION_DAYS = 30;

export const USDC_TRANSFER_ABI = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

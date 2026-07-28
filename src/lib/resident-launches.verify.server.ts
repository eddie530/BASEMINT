import { createPublicClient, http } from "viem";
import { base, baseSepolia } from "viem/chains";

/**
 * Confirms a launch transaction really landed on Base and was sent by the
 * claimed creator. Throws with a human-readable message otherwise.
 */
export async function verifyLaunchTx(args: {
  txHash: `0x${string}`;
  creator: `0x${string}`;
  chainId: number;
}): Promise<void> {
  const isMainnet = args.chainId !== 84532;
  const rpc = isMainnet
    ? (process.env.BASE_RPC_URL ?? "https://mainnet.base.org")
    : (process.env.BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org");

  const client = createPublicClient({
    chain: isMainnet ? base : baseSepolia,
    transport: http(rpc),
  });

  let receipt;
  try {
    receipt = await client.getTransactionReceipt({ hash: args.txHash });
  } catch {
    throw new Error("Transaction not found on Base yet. Wait for confirmation and retry.");
  }
  if (receipt.status !== "success") throw new Error("Transaction reverted on Base.");
  if (receipt.from.toLowerCase() !== args.creator.toLowerCase()) {
    throw new Error("Transaction was not sent by the connected wallet.");
  }
}

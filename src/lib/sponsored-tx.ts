import type { PublicClient, TransactionReceipt, WalletClient } from "viem";
import { base, baseSepolia } from "wagmi/chains";
import { CDP_PAYMASTER_URLS, isGaslessEligible } from "@/lib/wagmi";

export type Call = { to: `0x${string}`; data: `0x${string}`; value?: bigint };

export type SendResult = {
  txHash: `0x${string}`;
  receipt: TransactionReceipt;
  sponsored: boolean;
};

/**
 * Send one or more calls. When the active connector is the Coinbase Smart
 * Wallet (Base Account) AND a CDP paymaster is configured for the chain,
 * route through EIP-5792 `wallet_sendCalls` with `paymasterService`
 * capability so the bundle is sponsored (gasless for the user).
 *
 * Falls back to a regular `eth_sendTransaction` for EOAs, Farcaster, or any
 * failure of the sponsored path. Always returns the final on-chain receipt.
 */
export async function sendSponsoredOrFallback(args: {
  walletClient: WalletClient;
  publicClient: PublicClient;
  account: `0x${string}`;
  chainId: number;
  connectorId: string | undefined;
  calls: Call[];
}): Promise<SendResult> {
  const { walletClient, publicClient, account, chainId, connectorId, calls } = args;
  const paymasterUrl = CDP_PAYMASTER_URLS[chainId];
  const eligible = isGaslessEligible(connectorId, chainId) && !!paymasterUrl;

  const chain = chainId === base.id ? base : chainId === baseSepolia.id ? baseSepolia : undefined;

  if (eligible) {
    try {
      // viem's sendCalls (EIP-5792). Cast because the action is typed broadly.
      const sendCalls = (
        walletClient as unknown as {
          sendCalls: (p: unknown) => Promise<{ id: string } | string>;
        }
      ).sendCalls;
      const getCallsStatus = (
        walletClient as unknown as {
          getCallsStatus: (p: { id: string }) => Promise<{
            status?: number | string;
            receipts?: Array<{ transactionHash: `0x${string}`; status?: string | number }>;
          }>;
        }
      ).getCallsStatus;

      if (typeof sendCalls === "function" && typeof getCallsStatus === "function") {
        const raw = await sendCalls.call(walletClient, {
          account,
          chain,
          calls: calls.map((c) => ({ to: c.to, data: c.data, value: c.value ?? 0n })),
          capabilities: {
            paymasterService: { url: paymasterUrl },
          },
        });
        const id = typeof raw === "string" ? raw : raw.id;

        // Poll for receipts
        const deadline = Date.now() + 120_000;
        while (Date.now() < deadline) {
          const s = await getCallsStatus.call(walletClient, { id });
          const txHash = s.receipts?.[0]?.transactionHash;
          if (txHash) {
            const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
            return { txHash, receipt, sponsored: true };
          }
          await new Promise((r) => setTimeout(r, 1500));
        }
        throw new Error("Timed out waiting for sponsored bundle");
      }
    } catch (e) {
      // Smart Wallet may decline sponsorship (policy/limit) — fall through to EOA path.
      console.warn("[sponsored-tx] sendCalls failed, falling back to sendTransaction", e);
    }
  }

  // Fallback: single tx via eth_sendTransaction. If multiple calls were given,
  // send them sequentially and return the last receipt.
  let lastHash: `0x${string}` | undefined;
  let lastReceipt: TransactionReceipt | undefined;
  for (const call of calls) {
    lastHash = await walletClient.sendTransaction({
      account,
      chain,
      to: call.to,
      data: call.data,
      value: call.value ?? 0n,
    });
    lastReceipt = await publicClient.waitForTransactionReceipt({ hash: lastHash });
  }
  if (!lastHash || !lastReceipt) throw new Error("No calls provided");
  return { txHash: lastHash, receipt: lastReceipt, sponsored: false };
}

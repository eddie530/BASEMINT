import {
  createPublicClient,
  http,
  decodeEventLog,
  erc20Abi,
  type Hex,
  type TransactionReceipt,
} from "viem";
import { base } from "viem/chains";
import { PACK } from "../shared";
import { GameError } from "./errors";
export const chainClient = createPublicClient({
  chain: base,
  transport: http(process.env.BASE_RPC_URL || "https://mainnet.base.org", {
    timeout: 12000,
    retryCount: 1,
  }),
});
export function checkPayment(
  receipt: TransactionReceipt,
  payer: string,
  blockTime: number,
  created: number,
  expires: number,
  head: bigint,
  start: bigint,
) {
  if (receipt.status !== "success")
    throw new GameError("This payment reverted. No cosmetic was unlocked.");
  if (
    receipt.blockNumber <= start ||
    blockTime < Math.floor(created / 1000) ||
    blockTime > Math.floor(expires / 1000)
  )
    throw new GameError("Payment is outside this checkout window.");
  if (head - receipt.blockNumber < 2n)
    throw new GameError("Payment is confirming. Check again in a few seconds.", 409);
  const valid = receipt.logs.some((log) => {
    if (log.address.toLowerCase() !== PACK.token.toLowerCase()) return false;
    try {
      const event = decodeEventLog({
        abi: erc20Abi,
        eventName: "Transfer",
        data: log.data,
        topics: log.topics,
      });
      return (
        event.args.from.toLowerCase() === payer.toLowerCase() &&
        event.args.to.toLowerCase() === PACK.recipient &&
        event.args.value === BigInt(PACK.units)
      );
    } catch {
      return false;
    }
  });
  if (!valid) throw new GameError("No matching 5 USDC payment from your linked wallet was found.");
}
export async function paymentProof(hash: Hex, order: any) {
  let receipt: TransactionReceipt;
  try {
    receipt = await chainClient.getTransactionReceipt({ hash });
  } catch {
    throw new GameError("Payment is not confirmed yet. Check again shortly.", 409);
  }
  const [head, block] = await Promise.all([
    chainClient.getBlockNumber({ cacheTime: 0 }),
    chainClient.getBlock({ blockNumber: receipt.blockNumber }),
  ]);
  checkPayment(
    receipt,
    order.payer,
    Number(block.timestamp),
    Number(order.created_ms),
    Number(order.expires_ms),
    head,
    BigInt(order.start_block),
  );
}

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export interface PreparedTrade {
  call: { target: `0x${string}`; data: `0x${string}`; value: string };
  amountOut: string; // wei (string)
  slippage: number;
  side: "buy" | "sell";
  coinAddress: `0x${string}`;
}

const schema = z.object({
  side: z.enum(["buy", "sell"]),
  coinAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  sender: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  amountIn: z.string().regex(/^\d+$/), // wei
  slippage: z.number().min(0).max(1).default(0.05),
  chainId: z.number().int().default(8453),
});

export const prepareTradeCall = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data }): Promise<PreparedTrade> => {
    const apiKey = process.env.ZORA_API_KEY;
    if (!apiKey) throw new Error("Zora API key not configured on server.");

    const { createTradeCall, setApiKey } = await import("@zoralabs/coins-sdk");
    setApiKey(apiKey);

    const coin = data.coinAddress as `0x${string}`;
    const sender = data.sender as `0x${string}`;
    const buyCoin = data.side === "buy";

    const res = await createTradeCall({
      sell: buyCoin ? { type: "eth" } : { type: "erc20", address: coin },
      buy: buyCoin ? { type: "erc20", address: coin } : { type: "eth" },
      amountIn: BigInt(data.amountIn),
      slippage: data.slippage,
      sender,
    });

    const ok = res as unknown as {
      call: { target: string; data: string; value: string };
      quote: { amountOut: string; slippage: number };
    };
    if (!ok?.call?.target) {
      throw new Error("Zora quote failed: no calldata returned.");
    }
    return {
      call: {
        target: ok.call.target as `0x${string}`,
        data: ok.call.data as `0x${string}`,
        value: ok.call.value,
      },
      amountOut: ok.quote.amountOut,
      slippage: ok.quote.slippage,
      side: data.side,
      coinAddress: coin,
    };
  });

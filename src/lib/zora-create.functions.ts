import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export interface PreparedCall {
  to: `0x${string}`;
  data: `0x${string}`;
  value: string; // bigint as string (JSON-safe)
}

export interface PreparedCoinCalls {
  calls: PreparedCall[];
  predictedCoinAddress?: string;
}

const coinSchema = z.object({
  creator: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  name: z.string().min(1).max(64),
  symbol: z.string().min(1).max(16),
  description: z.string().max(500).optional(),
  imageDataUri: z.string().optional(),
  currency: z.enum(["ZORA", "ETH"]).default("ZORA"),
  chainId: z.number().int().default(8453),
});

export const buildCreateCoinCalls = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => coinSchema.parse(input))
  .handler(async ({ data }): Promise<PreparedCoinCalls> => {
    const apiKey = process.env.ZORA_API_KEY;
    if (!apiKey) throw new Error("Zora API key not configured on server.");

    const { createCoinCall, setApiKey } = await import("@zoralabs/coins-sdk");
    setApiKey(apiKey);

    const metadataObject = {
      name: data.name,
      description: data.description ?? `${data.name} on Base`,
      symbol: data.symbol,
      image: data.imageDataUri,
    };
    const uri = `data:application/json;utf8,${encodeURIComponent(JSON.stringify(metadataObject))}`;

    const res = await createCoinCall({
      creator: data.creator as `0x${string}`,
      name: data.name,
      symbol: data.symbol.toUpperCase(),
      metadata: { type: "RAW_URI", uri },
      currency: data.currency,
      chainId: data.chainId,
      skipMetadataValidation: true,
    });

    return {
      calls: res.calls.map((c) => ({
        to: c.to as `0x${string}`,
        data: c.data as `0x${string}`,
        value: c.value.toString(),
      })),
      predictedCoinAddress: res.predictedCoinAddress,
    };
  });

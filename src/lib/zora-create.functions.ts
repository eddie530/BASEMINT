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
  metadataUri?: string;
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

/**
 * Parse a data: URI into a File suitable for the Zora uploader.
 * Accepts the `data:<mime>;base64,...` shape produced by FileReader.readAsDataURL.
 */
function dataUriToFile(dataUri: string, filename: string): File {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(dataUri);
  if (!match) throw new Error("Invalid image data URI");
  const mime = match[1] || "application/octet-stream";
  const isBase64 = Boolean(match[2]);
  const payload = match[3] ?? "";
  let bytes: Uint8Array;
  if (isBase64) {
    const buf = Buffer.from(payload, "base64");
    bytes = new Uint8Array(buf);
  } else {
    bytes = new TextEncoder().encode(decodeURIComponent(payload));
  }
  // Normalize jpg -> jpeg so the SDK MIME allow-list accepts it.
  const normalizedMime = mime === "image/jpg" ? "image/jpeg" : mime;
  const ext = normalizedMime.split("/")[1]?.split("+")[0] ?? "bin";
  return new File([bytes], `${filename}.${ext}`, { type: normalizedMime });
}

export const buildCreateCoinCalls = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => coinSchema.parse(input))
  .handler(async ({ data }): Promise<PreparedCoinCalls> => {
    const apiKey = process.env.ZORA_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Zora API key not configured on server. Add ZORA_API_KEY in project secrets.",
      );
    }

    const {
      createCoinCall,
      setApiKey,
      createMetadataBuilder,
      ZoraUploader,
    } = await import("@zoralabs/coins-sdk");
    setApiKey(apiKey);

    const creator = data.creator as `0x${string}`;
    const symbol = data.symbol.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11);
    if (!symbol) throw new Error("Symbol must contain at least one A-Z/0-9 character.");

    // 1. Build + upload metadata to Zora's IPFS uploader.
    //    The API rejects raw data: URIs, so we always materialize a real IPFS URI.
    if (!data.imageDataUri) {
      throw new Error("An image is required to deploy a coin.");
    }
    let metadataUri: string;
    try {
      const imageFile = dataUriToFile(data.imageDataUri, "coin-image");
      const uploader = new ZoraUploader(creator);
      const builder = createMetadataBuilder()
        .withName(data.name)
        .withSymbol(symbol)
        .withDescription(data.description ?? `${data.name} on Base`)
        .withImage(imageFile);
      const built = await builder.upload(uploader);
      metadataUri = built.createMetadataParameters.metadata.uri;
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      console.error("[zora-create] metadata upload failed:", detail, e);
      throw new Error(`Metadata upload failed: ${detail}`);
    }

    // 2. Request calldata from Zora's create API.
    let res;
    try {
      res = await createCoinCall({
        creator,
        name: data.name,
        symbol,
        metadata: { type: "RAW_URI", uri: metadataUri },
        currency: data.currency,
        chainId: data.chainId,
      });
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      console.error("[zora-create] createCoinCall threw:", detail, e);
      throw new Error(`Zora createCoinCall failed: ${detail}`);
    }

    if (!res?.calls?.length) {
      console.error("[zora-create] empty calls returned", {
        creator,
        chainId: data.chainId,
        currency: data.currency,
        metadataUri,
      });
      throw new Error(
        "Zora API returned no calldata. Common causes: invalid creator address, unsupported chain, or metadata rejected by the indexer.",
      );
    }

    return {
      calls: res.calls.map((c) => ({
        to: c.to as `0x${string}`,
        data: c.data as `0x${string}`,
        value: c.value.toString(),
      })),
      predictedCoinAddress: res.predictedCoinAddress,
      metadataUri,
    };
  });

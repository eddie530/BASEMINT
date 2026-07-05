import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Metadata + configuration exposed to the Deploy / Create UI.
 * Fetched from Zora's Coins SDK so the client always sees the live
 * currencies, chain support, and reference contract addresses.
 */
export interface CreationConfig {
  chainId: number;
  chainName: string;
  currencies: Array<{ symbol: "ZORA" | "ETH"; label: string }>;
  zoraFactory?: `0x${string}`;
  zoraProtocolRewards?: `0x${string}`;
  basemintTokenFactory?: `0x${string}`;
  basemintNftFactory?: `0x${string}`;
  supportsSponsoredMint: boolean;
  metadataUploader: "zora-ipfs";
  fetchedAt: string;
}

const SUPPORTED_CHAINS: Array<{ id: number; name: string }> = [
  { id: 8453, name: "Base" },
  { id: 84532, name: "Base Sepolia" },
];

export const getCreationConfig = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({ chainId: z.number().int().default(8453) })
      .parse(input ?? {}),
  )
  .handler(async ({ data }): Promise<CreationConfig> => {
    const chain = SUPPORTED_CHAINS.find((c) => c.id === data.chainId) ?? SUPPORTED_CHAINS[0];

    // Zora SDK exposes deployment addresses per chain; import lazily so the
    // handler stays edge-friendly and only loads when called.
    let zoraFactory: `0x${string}` | undefined;
    let zoraProtocolRewards: `0x${string}` | undefined;
    try {
      const sdk = (await import("@zoralabs/coins-sdk")) as unknown as Record<string, unknown>;
      const deployments = (sdk.DeployCurrency ?? sdk.deployments ?? {}) as Record<string, unknown>;
      const forChain = (deployments as Record<string, { factory?: string; rewards?: string }>)[
        String(chain.id)
      ];
      if (forChain?.factory) zoraFactory = forChain.factory as `0x${string}`;
      if (forChain?.rewards) zoraProtocolRewards = forChain.rewards as `0x${string}`;
    } catch (err) {
      console.warn("[creation-config] zora sdk lookup failed", err);
    }

    return {
      chainId: chain.id,
      chainName: chain.name,
      currencies: [
        { symbol: "ZORA", label: "ZORA (default, lower fees)" },
        { symbol: "ETH", label: "ETH" },
      ],
      zoraFactory,
      zoraProtocolRewards,
      basemintTokenFactory: (chain.id === 8453
        ? (process.env.VITE_TOKEN_FACTORY_BASE as `0x${string}` | undefined)
        : (process.env.VITE_TOKEN_FACTORY_BASE_SEPOLIA as `0x${string}` | undefined)),
      basemintNftFactory: (chain.id === 8453
        ? (process.env.VITE_NFT_FACTORY_BASE as `0x${string}` | undefined)
        : (process.env.VITE_NFT_FACTORY_BASE_SEPOLIA as `0x${string}` | undefined)),
      supportsSponsoredMint: Boolean(
        chain.id === 8453
          ? process.env.VITE_CDP_PAYMASTER_URL_BASE
          : process.env.VITE_CDP_PAYMASTER_URL_BASE_SEPOLIA,
      ),
      metadataUploader: "zora-ipfs",
      fetchedAt: new Date().toISOString(),
    };
  });


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
  const source = isBase64
    ? Buffer.from(payload, "base64")
    : Buffer.from(decodeURIComponent(payload), "utf8");
  // Copy into a fresh ArrayBuffer so BlobPart typing is satisfied across runtimes.
  const ab = new ArrayBuffer(source.byteLength);
  new Uint8Array(ab).set(source);
  // Normalize jpg -> jpeg so the SDK MIME allow-list accepts it.
  const normalizedMime = mime === "image/jpg" ? "image/jpeg" : mime;
  const ext = normalizedMime.split("/")[1]?.split("+")[0] ?? "bin";
  return new File([ab], `${filename}.${ext}`, { type: normalizedMime });
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

    const { createCoinCall, setApiKey, createMetadataBuilder, ZoraUploader } =
      await import("@zoralabs/coins-sdk");
    setApiKey(apiKey);

    const creator = data.creator as `0x${string}`;
    const symbol = data.symbol
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 11);
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

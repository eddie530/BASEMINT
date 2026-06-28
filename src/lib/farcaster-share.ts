// One-tap Farcaster cast composer.
// Uses the Mini App SDK when the user is inside a Farcaster client; otherwise
// falls back to the Warpcast web intent URL. Both paths return after the user
// is handed off — we don't wait for the cast to be published.

export interface ShareCastInput {
  text: string;
  embeds?: string[]; // URLs (frames, images, links). Max 2 supported by Warpcast.
}

export async function shareCast({ text, embeds = [] }: ShareCastInput): Promise<"sdk" | "intent"> {
  const trimmed = embeds.slice(0, 2);

  // 1) Try Farcaster Mini App SDK (works inside Warpcast / Base App).
  try {
    if (typeof window !== "undefined") {
      const mod = await import("@farcaster/miniapp-sdk");
      const sdk = (mod as { sdk?: unknown }).sdk as
        | {
            actions?: {
              composeCast?: (i: { text: string; embeds?: string[] }) => Promise<unknown>;
            };
          }
        | undefined;
      if (sdk?.actions?.composeCast) {
        await sdk.actions.composeCast({ text, embeds: trimmed });
        return "sdk";
      }
    }
  } catch {
    // fall through to intent URL
  }

  // 2) Warpcast intent URL fallback.
  const params = new URLSearchParams({ text });
  for (const e of trimmed) params.append("embeds[]", e);
  const url = `https://warpcast.com/~/compose?${params.toString()}`;
  if (typeof window !== "undefined") window.open(url, "_blank", "noopener,noreferrer");
  return "intent";
}

export function buildLaunchCastText(opts: {
  kind: "coin" | "nft";
  name: string;
  symbol?: string;
}): string {
  const what = opts.kind === "coin" ? `$${(opts.symbol ?? opts.name).toUpperCase()}` : opts.name;
  return `Just launched ${what} on Base via Basemint 🔥\n\nCreate & discover coins/NFTs directly in Farcaster → basemint.dev`;
}

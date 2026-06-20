import { createFileRoute } from "@tanstack/react-router";

// Farcaster / Base Mini App manifest
// Docs: https://miniapps.farcaster.xyz/docs/specification

export const Route = createFileRoute("/.well-known/farcaster.json")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const origin = `${url.protocol}//${url.host}`;

        const manifest = {
          // Sign this triple with your Farcaster custody wallet via the Warpcast
          // Manifest Tool (Settings → Developer → Mini Apps → Domain manifest) and
          // paste the values here so Farcaster can verify domain ownership.
          accountAssociation: {
            header: "",
            payload: "",
            signature: "",
          },
          frame: {
            version: "1",
            name: "Basemint",
            iconUrl: `${origin}/icon-512.png`,
            homeUrl: origin,
            splashImageUrl: `${origin}/icon-512.png`,
            splashBackgroundColor: "#000000",
            subtitle: "Mint on Base",
            description: "Create coins and NFTs on Base in seconds. Zora Coins under the hood.",
            primaryCategory: "social",
            tags: ["base", "zora", "mint", "coins", "nft"],
            heroImageUrl: `${origin}/icon-512.png`,
            tagline: "Mint on Base",
            ogTitle: "Basemint — Mint on Base",
            ogDescription: "Create coins and NFTs on Base in seconds.",
            ogImageUrl: `${origin}/icon-512.png`,
            buttonTitle: "Open Basemint",
          },
          baseBuilder: {
            // Base App ID (already configured via meta tag for legacy unfurlers)
            appId: "6a359ca4b5c7cf28ed894db2",
          },
        };

        return new Response(JSON.stringify(manifest, null, 2), {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=300",
          },
        });
      },
    },
  },
});

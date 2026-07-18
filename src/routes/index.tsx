import { createFileRoute } from "@tanstack/react-router";
import { MiniAppShell } from "@/components/MiniAppShell";
import { DiscoverFeed, trendingQO, recentQO } from "@/components/pages/DiscoverFeed";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Resident Labs — Discover on Base" },
      {
        name: "description",
        content:
          "Live Zora coin feed on Base. Trending tokens, recent launches, and one-tap minting — powered by BaseMint.",
      },
      { property: "og:title", content: "Resident Labs — Discover on Base" },
      {
        property: "og:description",
        content:
          "Live Zora coin feed on Base. Trending tokens, recent launches, and one-tap minting — powered by BaseMint.",
      },
      { property: "og:url", content: "https://basemint.dev/" },
    ],
    links: [{ rel: "canonical", href: "https://basemint.dev/" }],
  }),
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(trendingQO);
    void context.queryClient.prefetchQuery(recentQO);
  },
  component: FeedPage,
});

function FeedPage() {
  return (
    <MiniAppShell>
      <DiscoverFeed />
    </MiniAppShell>
  );
}

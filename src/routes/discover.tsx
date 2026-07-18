import { createFileRoute } from "@tanstack/react-router";
import { MiniAppShell } from "@/components/MiniAppShell";
import { DiscoverFeed, trendingQO, recentQO } from "@/components/pages/DiscoverFeed";

export const Route = createFileRoute("/discover")({
  head: () => ({
    meta: [
      { title: "Discover — Resident Labs" },
      {
        name: "description",
        content:
          "Discover tokens on Base. Trending, new launches, and curated Signal — powered by BaseMint.",
      },
      { property: "og:title", content: "Discover — Resident Labs" },
      {
        property: "og:description",
        content:
          "Discover tokens on Base. Trending, new launches, and curated Signal — powered by BaseMint.",
      },
    ],
  }),
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(trendingQO);
    void context.queryClient.prefetchQuery(recentQO);
  },
  component: DiscoverPage,
});

function DiscoverPage() {
  return (
    <MiniAppShell>
      <header className="space-y-1">
        <p className="text-[10px] uppercase tracking-widest text-accent font-mono">
          Powered by BaseMint
        </p>
        <h1 className="font-display font-bold text-3xl tracking-tight">Discover</h1>
      </header>
      <DiscoverFeed />
    </MiniAppShell>
  );
}

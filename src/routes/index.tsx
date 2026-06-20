import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { MiniAppShell } from "@/components/MiniAppShell";
import { CoinCard } from "@/components/feed/CoinCard";
import { NFTCard } from "@/components/feed/NFTCard";
import { getTrendingCoins, getRecentCoins } from "@/lib/zora.functions";

const trendingQO = queryOptions({
  queryKey: ["zora", "trending", 8],
  queryFn: () => getTrendingCoins({ data: { count: 8 } }),
  staleTime: 30_000,
});

const recentQO = queryOptions({
  queryKey: ["zora", "recent", 4],
  queryFn: () => getRecentCoins({ data: { count: 4 } }),
  staleTime: 10_000,
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Basemint — Mint on Base" },
      { name: "description", content: "Live Zora coin feed on Base. Trending tokens, recent launches, and one-tap minting." },
      { property: "og:title", content: "Basemint — Mint on Base" },
      { property: "og:description", content: "Live Zora coin feed on Base. Trending tokens, recent launches, and one-tap minting." },
      { property: "og:url", content: "https://foxy-token-forge.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://foxy-token-forge.lovable.app/" }],
  }),
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(trendingQO);
    void context.queryClient.prefetchQuery(recentQO);
  },
  component: FeedPage,
});

function FeedPage() {
  const { data: trending } = useSuspenseQuery(trendingQO);
  const { data: recent } = useSuspenseQuery(recentQO);

  return (
    <MiniAppShell>
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-xl uppercase tracking-wider">Trending</h2>
          <span className="text-xs text-accent font-medium font-mono flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-accent animate-pulse" />
            Live · Base
          </span>
        </div>

        {trending.length === 0 ? (
          <p className="text-sm text-white/50 font-mono">Zora feed temporarily unavailable.</p>
        ) : (
          <div className="space-y-4">
            {trending.map((coin) => (
              <CoinCard key={coin.address} coin={coin} />
            ))}
          </div>
        )}
      </section>

      {recent.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-xl uppercase tracking-wider">Just Launched</h2>
            <span className="text-[10px] text-white/40 font-mono uppercase tracking-widest">Newest first</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {recent.map((c) => (
              <NFTCard key={c.address} nft={c} />
            ))}
          </div>
        </section>
      )}

      <section className="bg-accent/10 border border-accent/20 rounded-3xl p-6">
        <h2 className="font-display font-bold text-2xl mb-2 text-accent">Deploy on Base</h2>
        <p className="text-white/70 text-sm mb-6">
          Launch your own ERC-20 token or NFT collection in seconds. Zora Coins under the hood.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/create"
            search={{ kind: "coin" }}
            className="bg-black/40 border border-white/5 p-4 rounded-2xl hover:border-accent/30 transition"
          >
            <div className="size-8 bg-accent/20 rounded-lg mb-3 grid place-items-center text-accent font-display font-bold">
              $
            </div>
            <p className="font-bold text-sm">New Token</p>
            <p className="text-[11px] text-white/50 mt-0.5">ERC-20 · Zora Coins</p>
          </Link>
          <Link
            to="/create"
            search={{ kind: "nft" }}
            className="bg-black/40 border border-white/5 p-4 rounded-2xl hover:border-primary/40 transition"
          >
            <div className="size-8 bg-primary/20 rounded-lg mb-3 grid place-items-center text-primary font-bold">
              ◉
            </div>
            <p className="font-bold text-sm">New NFT</p>
            <p className="text-[11px] text-white/50 mt-0.5">Edition · 1155</p>
          </Link>
        </div>
      </section>
    </MiniAppShell>
  );
}

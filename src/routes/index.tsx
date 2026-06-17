import { createFileRoute, Link } from "@tanstack/react-router";
import { MiniAppShell } from "@/components/MiniAppShell";
import { CoinCard } from "@/components/feed/CoinCard";
import { NFTCard } from "@/components/feed/NFTCard";
import { trendingFeed } from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Basemint — Create coins & NFTs on Base" },
      { name: "description", content: "A Farcaster mini app to launch ERC-20 coins and mint NFTs on Base in seconds." },
      { property: "og:title", content: "Basemint" },
      { property: "og:description", content: "Launch coins and NFTs on Base from Farcaster." },
    ],
  }),
  component: FeedPage,
});

function FeedPage() {
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

        <div className="space-y-4">
          {trendingFeed.map((item) =>
            item.kind === "coin" ? (
              <CoinCard key={item.id} coin={item} />
            ) : (
              <NFTCard key={item.id} nft={item} />
            ),
          )}
        </div>
      </section>

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

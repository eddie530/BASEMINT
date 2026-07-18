import { Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { CoinCard } from "@/components/feed/CoinCard";
import { NFTCard } from "@/components/feed/NFTCard";
import { SpinDiscover } from "@/components/feed/SpinDiscover";
import { getTrendingCoins, getRecentCoins } from "@/lib/zora.functions";
import { isCurated, RESIDENT_LABS } from "@/lib/curated";
import type { CoinDTO } from "@/lib/zora.types";

export const trendingQO = queryOptions({
  queryKey: ["zora", "trending", 8],
  queryFn: () => getTrendingCoins({ data: { count: 8 } }),
  staleTime: 30_000,
});

export const recentQO = queryOptions({
  queryKey: ["zora", "recent", 4],
  queryFn: () => getRecentCoins({ data: { count: 4 } }),
  staleTime: 10_000,
});

function matchesSearch(coin: CoinDTO, query: string): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return true;
  return (
    coin.name.toLowerCase().includes(q) ||
    coin.symbol.toLowerCase().includes(q) ||
    coin.address.toLowerCase().includes(q) ||
    coin.creatorHandle?.toLowerCase().includes(q) === true
  );
}

/**
 * Discover feed body — shared by `/` (legacy) and `/discover` (Resident Labs).
 * Renders inside a `MiniAppShell` provided by the calling route.
 */
export function DiscoverFeed({ showLaunchCta = true }: { showLaunchCta?: boolean }) {
  const { data: trending } = useSuspenseQuery(trendingQO);
  const { data: recent } = useSuspenseQuery(recentQO);
  const [query, setQuery] = useState("");

  const curated = useMemo(
    () => [...trending, ...recent].filter((c) => isCurated(c.address) && matchesSearch(c, query)),
    [trending, recent, query],
  );
  const spinPool = useMemo(
    () => (trending.length > 0 ? trending : recent).filter((c) => matchesSearch(c, query)),
    [trending, recent, query],
  );
  const filteredTrending = useMemo(
    () => trending.filter((c) => matchesSearch(c, query)),
    [trending, query],
  );
  const filteredRecent = useMemo(
    () => recent.filter((c) => matchesSearch(c, query)),
    [recent, query],
  );

  const hasResults =
    curated.length > 0 || filteredTrending.length > 0 || filteredRecent.length > 0;

  const navigate = useNavigate();
  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    navigate({ to: "/search", search: { q, type: "all", page: 1 } });
  };

  return (
    <>
      <section className="relative">
        <label htmlFor="coin-search" className="sr-only">
          Search tokens, creators, or addresses
        </label>
        <form onSubmit={submitSearch} className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/40"
            aria-hidden="true"
          />
          <input
            id="coin-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tokens, creators, or addresses…"
            className="w-full bg-card border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm placeholder:text-white/40 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition"
          />
        </form>
        {query.trim() && (
          <Link
            to="/search"
            search={{ q: query.trim(), type: "all", page: 1 }}
            className="mt-2 block text-[11px] text-accent font-mono uppercase tracking-widest text-right"
          >
            See all results →
          </Link>
        )}
      </section>

      {query && !hasResults ? (
        <p className="text-sm text-white/50 font-mono text-center py-6">
          No tokens match “{query}”.
        </p>
      ) : null}

      {curated.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-xl uppercase tracking-wider">
              {RESIDENT_LABS.name} Signal
            </h2>
            <span className="text-[10px] text-accent font-mono uppercase tracking-widest">
              Curated
            </span>
          </div>
          <div className="space-y-4">
            {curated.map((coin) => (
              <CoinCard key={`curated-${coin.address}`} coin={coin} />
            ))}
          </div>
        </section>
      )}

      <SpinDiscover pool={spinPool} />

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-xl uppercase tracking-wider">Trending</h2>
          <span className="text-xs text-accent font-medium font-mono flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-accent animate-pulse" />
            Live · Base
          </span>
        </div>

        {filteredTrending.length === 0 ? (
          <p className="text-sm text-white/50 font-mono">
            {query ? "No tokens match your search." : "Zora feed temporarily unavailable."}
          </p>
        ) : (
          <div className="space-y-4">
            {filteredTrending.map((coin) => (
              <CoinCard key={coin.address} coin={coin} />
            ))}
          </div>
        )}
      </section>

      {filteredRecent.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-xl uppercase tracking-wider">
              Just Launched
            </h2>
            <span className="text-[10px] text-white/40 font-mono uppercase tracking-widest">
              Newest first
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {filteredRecent.map((c) => (
              <NFTCard key={c.address} nft={c} />
            ))}
          </div>
        </section>
      )}

      {showLaunchCta ? (
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
      ) : null}
    </>
  );
}

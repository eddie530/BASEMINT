import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { Search as SearchIcon, ArrowLeft } from "lucide-react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { MiniAppShell } from "@/components/MiniAppShell";
import { CoinCard } from "@/components/feed/CoinCard";
import { getTrendingCoins, getRecentCoins, getCoinDetail } from "@/lib/zora.functions";
import type { CoinDTO } from "@/lib/zora.types";

const PAGE_SIZE = 10;

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  type: fallback(z.string(), "all").default("all"),
  page: fallback(z.number().int(), 1).default(1),
});

const poolQO = queryOptions({
  queryKey: ["zora", "search-pool"],
  queryFn: async () => {
    const [trending, recent] = await Promise.all([
      getTrendingCoins({ data: { count: 50 } }),
      getRecentCoins({ data: { count: 50 } }),
    ]);
    const seen = new Set<string>();
    return [...trending, ...recent].filter((c) => {
      const k = c.address.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  },
  staleTime: 30_000,
});

const isAddress = (s: string) => /^0x[a-fA-F0-9]{40}$/.test(s.trim());

const addressLookupQO = (addr: string) =>
  queryOptions({
    queryKey: ["zora", "coin-detail", addr.toLowerCase()],
    queryFn: () =>
      isAddress(addr) ? getCoinDetail({ data: { address: addr, chainId: 8453 } }) : null,
    staleTime: 60_000,
  });

export const Route = createFileRoute("/search")({
  validateSearch: zodValidator(searchSchema),
  head: ({ match }) => {
    const q = (match.search as { q?: string })?.q ?? "";
    const title = q ? `Search: ${q} — Basemint` : "Search — Basemint";
    const desc = q
      ? `Search results for "${q}" on Basemint. Tokens, creators, and addresses on Base.`
      : "Search tokens, creators, and addresses on Base.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { name: "robots", content: q ? "noindex,follow" : "index,follow" },
      ],
      links: [{ rel: "canonical", href: "https://basemint.dev/search" }],
    };
  },
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(poolQO);
  },
  component: SearchPage,
});

type Kind = "all" | "token" | "creator" | "address";

function matchCoin(coin: CoinDTO, q: string, kind: Kind): boolean {
  const s = q.toLowerCase().trim();
  if (!s) return true;
  const name = coin.name.toLowerCase();
  const sym = coin.symbol.toLowerCase();
  const addr = coin.address.toLowerCase();
  const handle = coin.creatorHandle?.toLowerCase() ?? "";
  const creator = coin.creatorAddress?.toLowerCase() ?? "";

  const tokenHit = name.includes(s) || sym.includes(s);
  const creatorHit = handle.includes(s) || creator.includes(s);
  const addressHit = addr.includes(s) || creator.includes(s);

  if (kind === "token") return tokenHit;
  if (kind === "creator") return creatorHit;
  if (kind === "address") return addressHit;
  return tokenHit || creatorHit || addressHit;
}

function SearchPage() {
  const { q, type, page } = Route.useSearch();
  const navigate = useNavigate({ from: "/search" });
  const [input, setInput] = useState(q);

  useEffect(() => {
    setInput(q);
  }, [q]);

  const { data: pool } = useSuspenseQuery(poolQO);
  const { data: directHit } = useSuspenseQuery(addressLookupQO(q));

  const kind = (["all", "token", "creator", "address"].includes(type) ? type : "all") as Kind;

  const results = useMemo(() => {
    const list = pool.filter((c) => matchCoin(c, q, kind));
    if (directHit && !list.find((c) => c.address.toLowerCase() === directHit.address.toLowerCase())) {
      list.unshift(directHit);
    }
    return list;
  }, [pool, q, kind, directHit]);

  const total = results.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = results.slice(start, start + PAGE_SIZE);

  type SearchState = { q: string; type: string; page: number };
  const setKind = (next: Kind) => {
    navigate({ search: (prev: SearchState) => ({ ...prev, type: next, page: 1 }) });
  };

  const goToPage = (p: number) => {
    navigate({ search: (prev: SearchState) => ({ ...prev, page: p }) });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ search: (prev: SearchState) => ({ ...prev, q: input.trim(), page: 1 }) });
  };

  const tabs: { label: string; value: Kind }[] = [
    { label: "All", value: "all" },
    { label: "Tokens", value: "token" },
    { label: "Creators", value: "creator" },
    { label: "Addresses", value: "address" },
  ];

  return (
    <MiniAppShell>
      <div className="flex items-center gap-2">
        <Link
          to="/"
          className="size-9 grid place-items-center rounded-xl bg-card border border-white/10 text-white/70 hover:text-white"
          aria-label="Back to home"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="font-display font-bold text-xl uppercase tracking-wider">Search</h1>
      </div>

      <form onSubmit={submit} className="relative">
        <label htmlFor="search-input" className="sr-only">
          Search tokens, creators, or addresses
        </label>
        <SearchIcon
          className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/40"
          aria-hidden="true"
        />
        <input
          id="search-input"
          type="search"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Search tokens, creators, or 0x addresses…"
          className="w-full bg-card border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm placeholder:text-white/40 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition"
        />
      </form>

      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
        {tabs.map((t) => {
          const active = t.value === kind;
          return (
            <button
              key={t.value}
              onClick={() => setKind(t.value)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-mono uppercase tracking-widest whitespace-nowrap border transition ${
                active
                  ? "bg-accent text-accent-foreground border-accent"
                  : "bg-card text-white/60 border-white/10 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-xs text-white/50 font-mono">
        <span>
          {q ? (
            <>
              {total} result{total === 1 ? "" : "s"} for “{q}”
            </>
          ) : (
            "Type a query to search"
          )}
        </span>
        {totalPages > 1 && (
          <span>
            Page {currentPage} / {totalPages}
          </span>
        )}
      </div>

      {q && total === 0 ? (
        <div className="bg-card border border-white/10 rounded-2xl p-6 text-center">
          <p className="text-sm text-white/60">No matches found.</p>
          <p className="text-xs text-white/40 mt-1">
            Try a different token name, symbol, handle, or wallet address.
          </p>
        </div>
      ) : (
        <section className="space-y-4">
          {pageItems.map((coin) => (
            <CoinCard key={coin.address} coin={coin} />
          ))}
        </section>
      )}

      {totalPages > 1 && (
        <nav className="flex items-center justify-between gap-2 pt-2" aria-label="Pagination">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="px-4 py-2 rounded-xl bg-card border border-white/10 text-xs font-mono uppercase tracking-widest disabled:opacity-30"
          >
            Prev
          </button>
          <div className="flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (p) =>
                  p === 1 ||
                  p === totalPages ||
                  (p >= currentPage - 1 && p <= currentPage + 1),
              )
              .map((p, i, arr) => {
                const prev = arr[i - 1];
                const gap = prev && p - prev > 1;
                return (
                  <span key={p} className="flex items-center gap-1">
                    {gap && <span className="text-white/30 text-xs px-1">…</span>}
                    <button
                      onClick={() => goToPage(p)}
                      className={`size-8 rounded-lg text-xs font-mono ${
                        p === currentPage
                          ? "bg-accent text-accent-foreground"
                          : "bg-card border border-white/10 text-white/60 hover:text-white"
                      }`}
                    >
                      {p}
                    </button>
                  </span>
                );
              })}
          </div>
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="px-4 py-2 rounded-xl bg-card border border-white/10 text-xs font-mono uppercase tracking-widest disabled:opacity-30"
          >
            Next
          </button>
        </nav>
      )}
    </MiniAppShell>
  );
}

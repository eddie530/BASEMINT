import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Star, RefreshCw, Activity, ShieldAlert } from "lucide-react";
import { MiniAppShell } from "@/components/MiniAppShell";
import { Button } from "@/components/ui/button";
import { getTokenRadar, getProRadar } from "@/lib/resident-v3.functions";
import { readWatchlist, subscribeWatchlist, toggleWatchlist } from "@/lib/watchlist";
import { useResidentPro } from "@/hooks/useResidentPro";
import { residentHead } from "@/lib/resident-head";
const radarOptions = queryOptions({
  queryKey: ["token-radar"],
  queryFn: () => getTokenRadar(),
  staleTime: 60000,
});
export const Route = createFileRoute("/radar")({
  head: () =>
    residentHead(
      "Token Radar · Resident Labs",
      "Live Base token liquidity, volume, market cap, price movements, watchlists and transparent risk indicators.",
    ),
  loader: ({ context }) => context.queryClient.ensureQueryData(radarOptions),
  component: RadarPage,
});
const money = (value: number | null) =>
  value === null
    ? "Unavailable"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        notation: value >= 10000 ? "compact" : "standard",
        maximumFractionDigits: value < 1 ? 6 : 2,
      }).format(value);
function RadarPage() {
  // The existing router does not dehydrate Query; reuse the serialized loader
  // snapshot so hydration cannot refetch a different price or timestamp.
  const initialData = Route.useLoaderData();
  const radar = useSuspenseQuery({ ...radarOptions, initialData });
  const { isPro, account } = useResidentPro();
  const [hydrated, setHydrated] = useState(false);
  const proFetch = useServerFn(getProRadar);
  const advanced = useQuery({
    queryKey: ["pro-radar", account?.id],
    queryFn: () => proFetch(),
    enabled: isPro && hydrated,
    staleTime: 60000,
  });
  const [search, setSearch] = useState("");
  const [liquidity, setLiquidity] = useState("0");
  const [volume, setVolume] = useState("0");
  const [sort, setSort] = useState("volume");
  const [watchedOnly, setWatchedOnly] = useState(false);
  const [watched, setWatched] = useState<string[]>([]);
  useEffect(() => {
    setHydrated(true);
    const update = () =>
      setWatched(
        readWatchlist()
          .filter((t) => t.chainId === 8453)
          .map((t) => t.address.toLowerCase()),
      );
    update();
    return subscribeWatchlist(update);
  }, []);
  const data = hydrated && isPro && advanced.data ? advanced.data : radar.data;
  const tokens = data.tokens
    .filter(
      (t) =>
        `${t.name} ${t.symbol} ${t.address}`.toLowerCase().includes(search.toLowerCase()) &&
        (!watchedOnly || watched.includes(t.address.toLowerCase())) &&
        (!Number(liquidity) || (t.liquidity ?? 0) >= Number(liquidity)) &&
        (!Number(volume) || (t.volume24h ?? 0) >= Number(volume)),
    )
    .sort((a, b) =>
      sort === "change"
        ? (b.change24h ?? -Infinity) - (a.change24h ?? -Infinity)
        : sort === "liquidity"
          ? (b.liquidity ?? 0) - (a.liquidity ?? 0)
          : (b.volume24h ?? 0) - (a.volume24h ?? 0),
    );
  return (
    <MiniAppShell>
      <header className="space-y-3">
        <p className="font-mono text-xs uppercase text-accent flex gap-2 items-center">
          <Activity className="size-4" /> Base market intelligence
        </p>
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-display text-3xl font-bold">Token Radar</h1>
          <Button
            variant="outline"
            size="icon"
            aria-label="Refresh tokens"
            disabled={radar.isFetching || advanced.isFetching}
            onClick={() => {
              void radar.refetch();
              if (isPro) void advanced.refetch();
            }}
          >
            <RefreshCw className={radar.isFetching ? "animate-spin" : ""} />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">Live pairs · ranked by 24-hour volume</p>
        <p className="text-xs text-muted-foreground">
          Discovery source: paid Dexscreener boosts, not organic popularity or endorsement. Updated{" "}
          {data.fetchedAt.slice(11, 19)} UTC.
        </p>
      </header>
      <section className="space-y-3">
        <label htmlFor="radar-search" className="text-xs text-muted-foreground">
          Search name, symbol or address
        </label>
        <input
          id="radar-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full p-3 rounded-md border border-input bg-background text-sm"
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <label className="text-xs space-y-2">
            Minimum liquidity
            <input
              aria-label="Minimum liquidity"
              type="number"
              min="0"
              value={liquidity}
              onChange={(e) => setLiquidity(e.target.value)}
              className="block w-full border border-input bg-background rounded-md p-2"
            />
          </label>
          <label className="text-xs space-y-2">
            Minimum 24h volume
            <input
              aria-label="Minimum volume"
              type="number"
              min="0"
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
              className="block w-full border border-input bg-background rounded-md p-2"
            />
          </label>
          <label className="text-xs space-y-2">
            Sort by
            <select
              aria-label="Sort tokens"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="block w-full border border-input bg-background rounded-md p-2"
            >
              <option value="volume">24h volume</option>
              <option value="liquidity">Liquidity</option>
              <option value="change">24h movement</option>
            </select>
          </label>
        </div>
        <label className="flex gap-2 text-sm items-center">
          <input
            type="checkbox"
            checked={watchedOnly}
            onChange={(e) => setWatchedOnly(e.target.checked)}
            className="accent-accent"
          />
          Watchlist only
        </label>
      </section>
      {data.error ? (
        <p role="status" className="text-muted-foreground border-y border-border py-5">
          {data.error}
        </p>
      ) : !tokens.length ? (
        <p className="text-muted-foreground">
          No tokens match your filters. Saved tokens outside the current discovery feed are not
          shown.
        </p>
      ) : (
        <section className="divide-y divide-border border-y border-border">
          {tokens.map((t) => {
            const pro = advanced.data?.tokens.find((p) => p.address === t.address);
            return (
              <article key={t.address} className="py-5 space-y-4">
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <h2 className="font-semibold break-words">
                      {t.name} <span className="text-accent">${t.symbol}</span>
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1 break-all">{t.address}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`${watched.includes(t.address.toLowerCase()) ? "Remove" : "Watch"} ${t.symbol}`}
                    aria-pressed={watched.includes(t.address.toLowerCase())}
                    onClick={() =>
                      toggleWatchlist({
                        chainId: 8453,
                        address: t.address,
                        name: t.name,
                        symbol: t.symbol,
                      })
                    }
                  >
                    <Star
                      className={
                        watched.includes(t.address.toLowerCase())
                          ? "text-accent fill-accent"
                          : "text-muted-foreground"
                      }
                    />
                  </Button>
                </div>
                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  {[
                    ["Price", money(t.price)],
                    ["Liquidity", money(t.liquidity)],
                    ["24h volume", money(t.volume24h)],
                    ["Market cap", money(t.marketCap)],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-xs text-muted-foreground">{label}</dt>
                      <dd className="font-mono mt-1">{value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="font-mono text-sm">
                  24h:{" "}
                  <span
                    className={
                      t.change24h !== null && t.change24h < 0 ? "text-destructive" : "text-accent"
                    }
                  >
                    {t.change24h === null
                      ? "Unavailable"
                      : `${t.change24h > 0 ? "+" : ""}${t.change24h.toFixed(2)}%`}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground flex gap-2 items-start">
                  <ShieldAlert className="size-4 shrink-0" />
                  {t.risks.join(" · ")}
                </p>
                {isPro && pro && (
                  <div className="text-xs border-l-2 border-accent pl-3">
                    <p className="text-accent font-mono mb-2">PRO ANALYTICS</p>
                    <p>
                      FDV: {money(pro.fdv)} · 1h:{" "}
                      {pro.change1h === null ? "Unavailable" : `${pro.change1h.toFixed(2)}%`}
                    </p>
                    <p className="mt-1">
                      24h volume / liquidity:{" "}
                      {pro.liquidity
                        ? `${((pro.volume24h ?? 0) / pro.liquidity).toFixed(2)}×`
                        : "Unavailable"}
                    </p>
                  </div>
                )}
              </article>
            );
          })}
        </section>
      )}
      {!isPro && (
        <Button asChild variant="outline">
          <Link to="/pro">Unlock enhanced analytics · Resident Pro</Link>
        </Button>
      )}
      <p className="text-xs text-muted-foreground">
        Risk indicators are not a security audit. Low liquidity means less than $50,000 in the
        selected pair. Honeypot checks, holder concentration and verified contract audits are
        unavailable.
      </p>
    </MiniAppShell>
  );
}

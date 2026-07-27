import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Check, Copy, ExternalLink, Share2, Users, Timer } from "lucide-react";
import { MiniAppShell } from "@/components/MiniAppShell";
import { LaunchTile } from "@/components/launches/LaunchTile";
import { getRecentCoins, getTopGainers } from "@/lib/zora.functions";
import { shareCast } from "@/lib/farcaster-share";
import { countdownParts, mintLink, mintProgress, nextReleaseAt } from "@/lib/launches";
import { RESIDENT_LABS } from "@/lib/curated";
import type { CoinDTO } from "@/lib/zora.types";

const recentLaunchesQO = queryOptions({
  queryKey: ["zora", "recent", 12],
  queryFn: () => getRecentCoins({ data: { count: 12 } }),
  staleTime: 15_000,
});

const featuredQO = queryOptions({
  queryKey: ["zora", "gainers", 6],
  queryFn: () => getTopGainers({ data: { count: 6 } }),
  staleTime: 30_000,
});

export const Route = createFileRoute("/launches")({
  head: () => ({
    meta: [
      { title: "Launch Hub — Resident Labs on Base" },
      {
        name: "description",
        content:
          "Featured creator coin, live mint progress, and the newest Base launches. Share to Farcaster or copy a mint link in one tap.",
      },
      { property: "og:title", content: "Launch Hub — Resident Labs on Base" },
      {
        property: "og:description",
        content:
          "Featured creator coin, live mint progress, and the newest Base launches on Resident Labs.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://basemint.dev/launches" }],
  }),
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(featuredQO);
    void context.queryClient.prefetchQuery(recentLaunchesQO);
  },
  component: LaunchesPage,
});

function Countdown() {
  const target = useMemo(() => nextReleaseAt(), []);
  const [parts, setParts] = useState(() => countdownParts(target));

  useEffect(() => {
    const id = setInterval(() => setParts(countdownParts(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  const cells: [string, number][] = [
    ["Days", parts.days],
    ["Hrs", parts.hours],
    ["Min", parts.minutes],
    ["Sec", parts.seconds],
  ];

  return (
    <section className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <Timer className="size-4 shrink-0 text-accent" />
          <p className="truncate text-[10px] font-mono uppercase tracking-widest text-white/50">
            Next Resident drop
          </p>
        </div>
        <span className="shrink-0 text-[10px] font-mono uppercase tracking-widest text-white/40">
          Fri 18:00 UTC
        </span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {cells.map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-white/10 bg-white/[0.03] py-2 text-center"
          >
            <p className="font-display text-2xl font-bold tabular-nums text-accent">
              {String(value).padStart(2, "0")}
            </p>
            <p className="text-[9px] font-mono uppercase tracking-widest text-white/40">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FeaturedHero({ coin }: { coin: CoinDTO }) {
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const url = mintLink(coin.address);
  const pct = mintProgress(coin);

  async function onShare() {
    setSharing(true);
    try {
      await shareCast({
        text: `Featured on Resident Labs Launch Hub: ${coin.name} ($${coin.symbol?.toUpperCase()}) on Base 🔵\n\nMint it →`,
        embeds: [url],
      });
    } finally {
      setSharing(false);
    }
  }

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* noop */
    }
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border border-accent/30 bg-black">
      <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-accent/20 [box-shadow:0_0_60px_-20px_hsl(var(--accent)/0.6)_inset]" />
      <div className="relative aspect-[4/3] sm:aspect-[16/9]">
        <img src={coin.image} alt={coin.name} className="h-full w-full object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
        <span className="absolute left-4 top-4 rounded-full bg-accent px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-accent-foreground">
          Featured creator coin
        </span>
      </div>

      <div className="relative -mt-12 space-y-4 p-4">
        <div className="min-w-0">
          <h2 className="font-display truncate text-3xl font-bold tracking-tight">{coin.name}</h2>
          <p className="font-mono text-sm text-accent">${coin.symbol?.toUpperCase()}</p>
          {coin.description && (
            <p className="mt-2 line-clamp-2 text-sm text-white/60">{coin.description}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-white/40">
            <span className="inline-flex items-center gap-1">
              <Users className="size-3" /> {coin.uniqueHolders.toLocaleString()} collectors
            </span>
            <span>{pct}% minted</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="space-y-2">
          <Link
            to="/coin/$id"
            params={{ id: coin.address }}
            className="block w-full rounded-2xl bg-accent py-4 text-center text-sm font-bold uppercase tracking-widest text-accent-foreground"
          >
            View collection
          </Link>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onShare}
              disabled={sharing}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-3 text-xs font-bold uppercase tracking-widest hover:border-white/25 disabled:opacity-60"
            >
              <Share2 className="size-3.5" /> Share
            </button>
            <button
              onClick={onCopy}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-3 text-xs font-bold uppercase tracking-widest hover:border-white/25"
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? "Copied" : "Mint link"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function LaunchesPage() {
  const { data: featuredList } = useSuspenseQuery(featuredQO);
  const { data: recent } = useSuspenseQuery(recentLaunchesQO);

  const featured = featuredList[0] ?? recent[0];
  const grid = useMemo(
    () => recent.filter((c) => c.address !== featured?.address).slice(0, 9),
    [recent, featured],
  );

  return (
    <MiniAppShell>
      <header className="space-y-1">
        <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
          {RESIDENT_LABS.name} · Launch Hub
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight">Launches</h1>
        <p className="text-sm text-white/60">
          Featured creator coin, live mint progress, and the freshest drops on Base.
        </p>
      </header>

      {featured ? (
        <FeaturedHero coin={featured} />
      ) : (
        <p className="rounded-2xl border border-white/10 bg-black/40 p-6 text-center text-sm text-white/50">
          No launches available right now — check back shortly.
        </p>
      )}

      <Countdown />

      <section className="space-y-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <h2 className="font-display truncate text-lg font-bold uppercase tracking-widest">
            Recent launches
          </h2>
          <Link
            to="/discover"
            className="shrink-0 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-accent"
          >
            All <ExternalLink className="size-3" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {grid.map((c) => (
            <LaunchTile key={c.address} coin={c} />
          ))}
        </div>
      </section>

      <p className="text-[11px] leading-relaxed text-white/40">
        Mint progress tracks collector milestones, not a hard cap. Always review the contract before
        minting — nothing here is financial advice.
      </p>
    </MiniAppShell>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ExternalLink, Rocket } from "lucide-react";
import { MiniAppShell } from "@/components/MiniAppShell";
import { LaunchTile } from "@/components/launches/LaunchTile";
import { FeaturedLaunchHero } from "@/components/launches/FeaturedLaunchHero";
import { ResidentLaunchCard } from "@/components/launches/ResidentLaunchCard";
import { LaunchProgressPanel } from "@/components/launches/LaunchProgressPanel";
import { ReleaseCountdown } from "@/components/launches/ReleaseCountdown";
import { getRecentCoins } from "@/lib/zora.functions";
import { RESIDENT_LABS } from "@/lib/curated";
import {
  ACTIVE_COLLECTION,
  type LaunchCollection,
  type ResidentLaunch,
} from "@/lib/resident-launches";
import { CollectionRail } from "@/components/launches/CollectionRail";
import { LaunchMetrics } from "@/components/launches/LaunchMetrics";
import { residentLaunchesQO } from "@/lib/launch-queries";
import { useLaunchFeed } from "@/components/launches/useLaunchFeed";

const recentLaunchesQO = queryOptions({
  queryKey: ["zora", "recent", 12],
  queryFn: () => getRecentCoins({ data: { count: 12 } }),
  staleTime: 15_000,
});

export const Route = createFileRoute("/launches")({
  head: () => ({
    meta: [
      { title: "Launch Hub — Resident Labs on Base" },
      {
        name: "description",
        content:
          "The Resident Labs release pipeline: featured creator coin, collection structure, launch progress, and one-tap sharing to Farcaster and X.",
      },
      { property: "og:title", content: "Launch Hub — Resident Labs on Base" },
      {
        property: "og:description",
        content:
          "Featured creator coin, launch progress tracking, and the newest Base releases from Resident Labs.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://basemint.dev/launches" }],
  }),
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(recentLaunchesQO);
    return context.queryClient.ensureQueryData(residentLaunchesQO);
  },
  component: LaunchesPage,
});

function LaunchesPage() {
  const { data: liveCoins } = useSuspenseQuery(recentLaunchesQO);
  const { data: serverLaunches } = useSuspenseQuery(residentLaunchesQO);
  const launches = useLaunchFeed(serverLaunches);
  const featured = useMemo<ResidentLaunch | undefined>(
    () => launches.find((l) => l.featured) ?? launches[0],
    [launches],
  );
  const [collection, setCollection] = useState<LaunchCollection | null>(ACTIVE_COLLECTION);
  const visible = useMemo(
    () => (collection ? launches.filter((l) => l.collection === collection) : launches),
    [launches, collection],
  );

  return (
    <MiniAppShell>
      <header className="space-y-1">
        <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
          {RESIDENT_LABS.name} · Launch Hub
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight">Launches</h1>
        <p className="text-sm text-white/60">
          The standard release pipeline for every Resident Labs creator coin.
        </p>
      </header>

      {featured ? (
        <div className="launch-rise">
          <FeaturedLaunchHero launch={featured} />
        </div>
      ) : (
        <p className="rounded-2xl border border-white/10 bg-black/40 p-6 text-center text-sm text-white/50">
          No featured launch yet.
        </p>
      )}

      <LaunchMetrics launches={launches} className="launch-rise" />

      <ReleaseCountdown />

      <Link
        to="/launches/new"
        className="launch-glow inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-accent/30 bg-accent/10 py-3 text-xs font-bold uppercase tracking-widest text-accent"
      >
        <Rocket className="size-3.5" /> Start a new launch
      </Link>

      {featured && <LaunchProgressPanel progress={featured.progress} />}

      <section className="launch-rise space-y-3">
        <h2 className="font-display text-lg font-bold uppercase tracking-widest">Collections</h2>
        <CollectionRail launches={launches} value={collection} onChange={setCollection} />
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold uppercase tracking-widest">
          Recent launches
        </h2>
        {visible.length ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {visible.map((l) => (
              <ResidentLaunchCard key={l.slug} launch={l} />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-white/10 bg-black/40 p-6 text-center text-sm text-white/50">
            No releases in this collection yet.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <h2 className="font-display truncate text-lg font-bold uppercase tracking-widest">
            Live on Base
          </h2>
          <Link
            to="/discover"
            className="inline-flex shrink-0 items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-accent"
          >
            All <ExternalLink className="size-3" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {liveCoins.slice(0, 9).map((c) => (
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

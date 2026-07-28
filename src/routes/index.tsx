import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Rocket } from "lucide-react";
import { MiniAppShell } from "@/components/MiniAppShell";
import {
  FeaturedLaunchSkeleton,
  LaunchGridSkeleton,
} from "@/components/launches/LaunchSkeletons";
import { DiscoverFeed, trendingQO, recentQO } from "@/components/pages/DiscoverFeed";
import { FeaturedLaunchHero } from "@/components/launches/FeaturedLaunchHero";
import { ReleaseCountdown } from "@/components/launches/ReleaseCountdown";
import { useLaunchFeed } from "@/components/launches/useLaunchFeed";
import { CollectionRail } from "@/components/launches/CollectionRail";
import { LaunchMetrics } from "@/components/launches/LaunchMetrics";
import { EcosystemRail } from "@/components/launches/EcosystemRail";
import { CommunityTokenCard } from "@/components/launches/CommunityTokenCard";


import { ResidentLaunchCard } from "@/components/launches/ResidentLaunchCard";
import { residentLaunchesQO } from "@/lib/launch-queries";
import { ACTIVE_COLLECTION, type LaunchCollection } from "@/lib/resident-launches";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Launch Hub — Resident Labs creator coins on Base" },
      {
        name: "description",
        content:
          "The Resident Labs Launch Hub: featured creator coin, collections, and every new Base release — collect, view onchain, and share in one tap.",
      },
      { property: "og:title", content: "Launch Hub — Resident Labs creator coins on Base" },
      {
        property: "og:description",
        content:
          "Featured creator coin, Resident Labs collections, and live Base launches on BaseMint.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://basemint.dev/" },
    ],
    links: [{ rel: "canonical", href: "https://basemint.dev/" }],
  }),
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(trendingQO);
    void context.queryClient.prefetchQuery(recentQO);
    return context.queryClient.ensureQueryData(residentLaunchesQO);
  },
  pendingComponent: LaunchHubPending,
  component: FeedPage,
});

function LaunchHubPending() {
  return (
    <MiniAppShell>
      <FeaturedLaunchSkeleton />
      <LaunchGridSkeleton />
    </MiniAppShell>
  );
}

function FeedPage() {
  const { data: serverLaunches } = useSuspenseQuery(residentLaunchesQO);
  const launches = useLaunchFeed(serverLaunches);
  const featured = useMemo(
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
          Resident Labs · Launch Hub
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight">Featured Launch</h1>
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

      <CommunityTokenCard />

      <EcosystemRail />


      <section className="launch-rise space-y-3">
        <h2 className="font-display text-lg font-bold uppercase tracking-widest">Collections</h2>
        <CollectionRail launches={launches} value={collection} onChange={setCollection} />
      </section>


      <section className="launch-rise space-y-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <h2 className="truncate font-display text-lg font-bold uppercase tracking-widest">
            Recent launches
          </h2>
          <Link
            to="/launches"
            className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-accent"
          >
            View all
          </Link>
        </div>
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

      <div className="grid grid-cols-2 gap-2">
        <Link
          to="/launches"
          className="launch-glow rounded-2xl border border-white/10 bg-white/5 py-3 text-center text-[11px] font-bold uppercase tracking-widest"
        >
          All launches
        </Link>
        <Link
          to="/launches/new"
          className="launch-glow inline-flex items-center justify-center gap-1.5 rounded-2xl border border-accent/30 bg-accent/10 py-3 text-[11px] font-bold uppercase tracking-widest text-accent"
        >
          <Rocket className="size-3.5" /> New launch
        </Link>
      </div>

      <DiscoverFeed />
    </MiniAppShell>
  );
}

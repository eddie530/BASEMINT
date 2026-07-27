import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Rocket } from "lucide-react";
import { MiniAppShell } from "@/components/MiniAppShell";
import { DiscoverFeed, trendingQO, recentQO } from "@/components/pages/DiscoverFeed";
import { FeaturedLaunchHero } from "@/components/launches/FeaturedLaunchHero";
import { ReleaseCountdown } from "@/components/launches/ReleaseCountdown";
import { useLaunchFeed } from "@/components/launches/useLaunchFeed";
import { residentLaunchesQO } from "@/lib/launch-queries";

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
  component: FeedPage,
});

function FeedPage() {
  const { data: serverLaunches } = useSuspenseQuery(residentLaunchesQO);
  const launches = useLaunchFeed(serverLaunches);
  const featured = useMemo(
    () => launches.find((l) => l.featured) ?? launches[0],
    [launches],
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
        <FeaturedLaunchHero launch={featured} />
      ) : (
        <p className="rounded-2xl border border-white/10 bg-black/40 p-6 text-center text-sm text-white/50">
          No featured launch yet.
        </p>
      )}

      <ReleaseCountdown />

      <div className="grid grid-cols-2 gap-2">
        <Link
          to="/launches"
          className="rounded-2xl border border-white/10 bg-white/5 py-3 text-center text-[11px] font-bold uppercase tracking-widest hover:border-accent/40"
        >
          All launches
        </Link>
        <Link
          to="/launches/new"
          className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-accent/30 bg-accent/10 py-3 text-[11px] font-bold uppercase tracking-widest text-accent"
        >
          <Rocket className="size-3.5" /> New launch
        </Link>
      </div>

      <DiscoverFeed />
    </MiniAppShell>
  );
}

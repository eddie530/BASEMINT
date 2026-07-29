import { createFileRoute, Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { MiniAppShell } from "@/components/MiniAppShell";
import { CommunityTokenCard } from "@/components/launches/CommunityTokenCard";
import { EcosystemRoadmap } from "@/components/launches/EcosystemRoadmap";
import { EcosystemTimeline } from "@/components/launches/EcosystemTimeline";
import { AboutResidentLabs } from "@/components/launches/AboutResidentLabs";

const MINT_ADDRESS = "5cGDB5noeZvSKhGEvc7n5GHQUmiQUWMvFVjxn1P7pump";

const LINKS: { label: string; href: string; note: string }[] = [
  {
    label: "Trade on pump.fun",
    href: `https://pump.fun/coin/${MINT_ADDRESS}`,
    note: "Solana",
  },
  {
    label: "DexScreener",
    href: `https://dexscreener.com/solana/${MINT_ADDRESS}`,
    note: "Charts",
  },
  { label: "BaseMint", href: "https://basemint.dev", note: "Launch platform" },
  { label: "X", href: "https://x.com/residentlabs", note: "Updates" },
  {
    label: "Farcaster",
    href: "https://farcaster.xyz/residentlabs",
    note: "Community",
  },
];

export const Route = createFileRoute("/community")({
  head: () => ({
    meta: [
      { title: "Community · Resident Signal ($RSIG) — Resident Labs" },
      {
        name: "description",
        content:
          "The official home of Resident Signal ($RSIG), the Resident Labs community token on Solana: mint address, official links, ecosystem status and roadmap.",
      },
      { property: "og:title", content: "Community · Resident Signal ($RSIG)" },
      {
        property: "og:description",
        content:
          "Resident Signal ($RSIG) on Solana — mint address, official links, and the Resident Labs ecosystem roadmap.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CommunityPage,
});

function CommunityPage() {
  return (
    <MiniAppShell>
      <header className="space-y-1">
        <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
          Resident Labs · Community
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight">Resident Signal</h1>
        <p className="text-sm leading-relaxed text-white/60">
          The official home of $RSIG — our live community token on Solana — plus the Resident
          Labs ecosystem status and roadmap.
        </p>
      </header>

      <CommunityTokenCard />

      <section className="launch-rise space-y-3">
        <h2 className="font-display text-lg font-bold uppercase tracking-widest">
          Official Links
        </h2>
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40">
          {LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-white/5 px-4 py-3 transition last:border-b-0 hover:bg-white/5"
            >
              <span className="min-w-0">
                <span className="block truncate font-display text-sm font-bold">{l.label}</span>
                <span className="block font-mono text-[10px] uppercase tracking-widest text-white/40">
                  {l.note}
                </span>
              </span>
              <ExternalLink className="size-4 shrink-0 text-accent" />
            </a>
          ))}
        </div>
      </section>

      <EcosystemRoadmap />

      <EcosystemTimeline />

      <AboutResidentLabs />

      <Link
        to="/launches"
        className="launch-glow block rounded-2xl border border-accent/30 bg-accent/10 py-3 text-center text-[11px] font-bold uppercase tracking-widest text-accent"
      >
        Explore Base launches
      </Link>
    </MiniAppShell>
  );
}

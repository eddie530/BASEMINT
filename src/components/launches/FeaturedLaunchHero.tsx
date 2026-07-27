import { Link } from "@tanstack/react-router";
import { ExternalLink, Users } from "lucide-react";
import { ShareRow } from "./ShareRow";
import {
  collectionLabel,
  formatLaunchDate,
  launchStatus,
  launchUrl,
  type ResidentLaunch,
} from "@/lib/resident-launches";

/** Hero for the latest featured Resident Labs creator coin. */
export function FeaturedLaunchHero({ launch }: { launch: ResidentLaunch }) {
  const url = launchUrl(launch);
  const status = launchStatus(launch);
  const onchainUrl = launch.address
    ? `https://basescan.org/token/${launch.address}`
    : launch.zoraUrl;

  return (
    <section className="relative overflow-hidden rounded-3xl border border-accent/30 bg-black">
      <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-accent/20 [box-shadow:0_0_60px_-20px_hsl(var(--accent)/0.6)_inset]" />

      <div className="relative aspect-[4/3] sm:aspect-[16/9]">
        <img
          src={launch.image}
          alt={launch.name}
          width={1024}
          height={1024}
          className="h-full w-full object-cover opacity-85"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
        <span className="absolute left-4 top-4 rounded-full bg-accent px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-accent-foreground">
          Featured · {collectionLabel(launch.collection)}
        </span>
        <span className="absolute right-4 top-4 rounded-full border border-white/15 bg-black/70 px-2.5 py-1 font-mono text-[9px] uppercase tracking-widest text-white/70 backdrop-blur">
          {status === "live" ? "Live" : "Coming soon"}
        </span>
      </div>

      <div className="relative -mt-12 space-y-4 p-4">
        <div className="min-w-0 space-y-1">
          <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {launch.name}
          </h2>
          <p className="font-mono text-sm text-accent">${launch.ticker}</p>
          <p className="text-sm leading-relaxed text-white/60">{launch.description}</p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {launch.tags.map((t) => (
            <span
              key={t}
              className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] text-white/50"
            >
              #{t}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-white/40">
          <span className="inline-flex items-center gap-1">
            <Users className="size-3" /> {launch.collectors.toLocaleString()} collectors
          </span>
          <span>{formatLaunchDate(launch.launchDate)}</span>
        </div>

        <div className="space-y-2">
          {launch.address ? (
            <Link
              to="/coin/$id"
              params={{ id: launch.address }}
              className="block w-full rounded-2xl bg-accent py-4 text-center text-sm font-bold uppercase tracking-widest text-accent-foreground"
            >
              Collect
            </Link>
          ) : (
            <span className="block w-full rounded-2xl border border-accent/30 bg-accent/10 py-4 text-center text-sm font-bold uppercase tracking-widest text-accent">
              Collect · Coming soon
            </span>
          )}

          {onchainUrl && (
            <a
              href={onchainUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-3 text-xs font-bold uppercase tracking-widest hover:border-white/25"
            >
              View onchain <ExternalLink className="size-3.5" />
            </a>
          )}

          <ShareRow
            url={url}
            text={`${launch.name} ($${launch.ticker}) is live from ${collectionLabel(launch.collection)} on Base 🔵\n\n${launch.tags.map((t) => `#${t}`).join(" ")}`}
          />
        </div>
      </div>
    </section>
  );
}

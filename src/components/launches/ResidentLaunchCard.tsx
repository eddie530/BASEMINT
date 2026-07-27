import { Link } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { ShareRow } from "./ShareRow";
import {
  collectionLabel,
  formatLaunchDate,
  launchStatus,
  launchUrl,
  type ResidentLaunch,
} from "@/lib/resident-launches";

/** Launch card used in the Recent Launches grid. */
export function ResidentLaunchCard({ launch }: { launch: ResidentLaunch }) {
  const url = launchUrl(launch);

  return (
    <article
      id={launch.slug}
      className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/40 transition hover:border-accent/40"
    >
      <div className="relative aspect-square">
        <img
          src={launch.image}
          alt={launch.name}
          loading="lazy"
          width={1024}
          height={1024}
          className="h-full w-full object-cover"
        />
        <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-accent backdrop-blur">
          {collectionLabel(launch.collection)}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-3">
        <div className="min-w-0 space-y-1">
          <h3 className="truncate text-sm font-bold">{launch.name}</h3>
          <p className="font-mono text-[11px] text-white/40">
            ${launch.ticker} · {formatLaunchDate(launch.launchDate)}
          </p>
          <p className="line-clamp-2 text-xs text-white/50">{launch.description}</p>
        </div>

        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-white/40">
          <span className="inline-flex items-center gap-1">
            <Users className="size-3 shrink-0" />
            {launch.collectors.toLocaleString()}
          </span>
          <span>{launchStatus(launch) === "live" ? "Live" : "Coming soon"}</span>
        </div>

        <div className="mt-auto space-y-2">
          {launch.address ? (
            <Link
              to="/coin/$id"
              params={{ id: launch.address }}
              className="block w-full rounded-xl bg-accent py-2.5 text-center text-[11px] font-bold uppercase tracking-widest text-accent-foreground"
            >
              Open details
            </Link>
          ) : (
            <span className="block w-full rounded-xl border border-white/10 bg-white/5 py-2.5 text-center text-[11px] font-bold uppercase tracking-widest text-white/40">
              Mint soon
            </span>
          )}
          <ShareRow
            compact
            url={url}
            text={`${launch.name} ($${launch.ticker}) — a Resident Labs ${launch.collection} release on Base.`}
          />
        </div>
      </div>
    </article>
  );
}

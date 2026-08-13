import { Link } from "@tanstack/react-router";
import { ArrowRight, BadgeCheck } from "lucide-react";
import { GENESIS, genesisPhase } from "@/lib/genesis";

const PHASE_BADGE = {
  "coming-soon": { text: "Coming Soon", dot: "bg-amber-400", cls: "text-amber-300" },
  live: { text: "Live", dot: "bg-emerald-400", cls: "text-emerald-300" },
  ended: { text: "Mint closed", dot: "bg-white/40", cls: "text-white/50" },
} as const;

/** Compact GENESIS PASS entry point for the homepage / ecosystem section. */
export function GenesisPassCard() {
  const badge = PHASE_BADGE[genesisPhase()];

  return (
    <section className="launch-rise space-y-3">
      <h2 className="font-display text-lg font-bold uppercase tracking-widest">Genesis Pass</h2>
      <Link
        to="/genesis"
        className="block overflow-hidden rounded-2xl border border-white/10 bg-black/40 transition hover:border-accent/40"
      >
        <div className="flex gap-3 p-3">
          <img
            src={GENESIS.artwork}
            alt="Resident Labs GENESIS PASS artwork"
            width={96}
            height={96}
            className="size-24 shrink-0 rounded-xl border border-white/10 object-cover"
          />
          <div className="min-w-0 space-y-1.5">
            <span
              className={`inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest ${badge.cls}`}
            >
              <span className={`size-2 rounded-full ${badge.dot}`} />
              {badge.text}
            </span>
            <p className="truncate font-display text-sm font-bold uppercase tracking-wider">
              {GENESIS.name}
            </p>
            <p className="line-clamp-2 text-xs text-white/60">{GENESIS.tagline} Early-supporter provenance on Base.</p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">
              {GENESIS.priceEth} ETH · {GENESIS.supply} · {GENESIS.perWallet} per wallet
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-white/5 px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-white/50">
          <span className="inline-flex items-center gap-2">
            <BadgeCheck className="size-3.5 text-accent" /> Genesis Holder badge
          </span>
          <span className="inline-flex items-center gap-1 text-accent">
            View <ArrowRight className="size-3" />
          </span>
        </div>
      </Link>
    </section>
  );
}

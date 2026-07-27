import { Link } from "@tanstack/react-router";
import { Users } from "lucide-react";
import type { CoinDTO } from "@/lib/zora.types";
import { mintProgress } from "@/lib/launches";

/** Compact launch tile used in the "Recent launches" grid. */
export function LaunchTile({ coin }: { coin: CoinDTO }) {
  const pct = mintProgress(coin);

  return (
    <Link
      to="/coin/$id"
      params={{ id: coin.address }}
      className="group block rounded-2xl border border-white/10 bg-black/40 overflow-hidden hover:border-accent/50 transition"
    >
      <div className="relative aspect-square">
        <img
          src={coin.image}
          alt={coin.name}
          loading="lazy"
          className="w-full h-full object-cover"
        />
        <span className="absolute top-2 left-2 rounded-full bg-black/70 backdrop-blur px-2 py-0.5 text-[9px] font-mono uppercase tracking-widest text-accent">
          Live
        </span>
      </div>
      <div className="p-3 space-y-2">
        <div className="min-w-0">
          <h3 className="font-bold text-sm truncate">{coin.name}</h3>
          <p className="text-[11px] text-white/40 font-mono truncate">
            ${coin.symbol?.toUpperCase()}
          </p>
        </div>

        <div className="space-y-1">
          <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-white/40">
            <span className="inline-flex items-center gap-1">
              <Users className="size-3 shrink-0" />
              {coin.uniqueHolders.toLocaleString()}
            </span>
            <span>{pct}%</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

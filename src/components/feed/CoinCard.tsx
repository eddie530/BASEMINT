import { Link } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { useEffect, useState } from "react";
import type { CoinDTO } from "@/lib/zora.types";
import { isCurated, RESIDENT_LABS } from "@/lib/curated";
import {
  isWatched,
  subscribeWatchlist,
  toggleWatchlist,
} from "@/lib/watchlist";

function fmtPrice(p?: number): string {
  if (p == null || !Number.isFinite(p)) return "—";
  if (p < 0.0001) return `$${p.toExponential(2)}`;
  if (p < 1) return `$${p.toFixed(5)}`;
  return `$${p.toLocaleString(undefined, { maximumFractionDigits: 4 })}`;
}

// Resident Labs branding: curated picks get a neon-edged Signal badge
// and every card carries a quiet "Built by Resident Labs" footer.
export function CoinCard({ coin }: { coin: CoinDTO }) {
  const delta = coin.marketCapDelta24h;
  const mc = coin.marketCap;
  const pct = mc && delta && mc - delta !== 0 ? (delta / Math.max(1, mc - delta)) * 100 : undefined;
  const up = (pct ?? 0) >= 0;
  const curated = isCurated(coin.address);

  const [watched, setWatched] = useState(false);
  useEffect(() => {
    setWatched(isWatched(coin.chainId, coin.address));
    return subscribeWatchlist(() =>
      setWatched(isWatched(coin.chainId, coin.address)),
    );
  }, [coin.chainId, coin.address]);

  const onToggleWatch = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = toggleWatchlist({
      address: coin.address,
      chainId: coin.chainId,
      name: coin.name,
      symbol: coin.symbol,
      image: coin.image,
    });
    setWatched(next);
  };

  return (
    <Link
      to="/coin/$id"
      params={{ id: coin.address }}
      className={`block bg-card rounded-3xl p-4 border transition relative ${
        curated
          ? "border-accent/40 [box-shadow:0_0_30px_-12px_hsl(var(--accent)/0.6)]"
          : "border-white/5 hover:border-white/10"
      }`}
    >
      {curated && (
        <span className="absolute -top-2 left-4 px-2 py-0.5 text-[9px] font-mono uppercase tracking-widest bg-accent text-accent-foreground rounded-full">
          RL · Signal
        </span>
      )}
      <button
        type="button"
        onClick={onToggleWatch}
        aria-label={watched ? "Remove from watchlist" : "Add to watchlist"}
        aria-pressed={watched}
        className={`absolute top-3 right-3 size-8 rounded-full grid place-items-center border transition ${
          watched
            ? "bg-accent/15 border-accent/40 text-accent"
            : "bg-white/5 border-white/10 text-white/50 hover:text-white/80"
        }`}
      >
        <Star className="size-4" fill={watched ? "currentColor" : "none"} />
      </button>
      <div className="flex gap-4">
        <div className="size-16 rounded-2xl overflow-hidden shrink-0 bg-white/5">
          <img
            src={coin.image}
            alt={coin.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2">
            <div className="min-w-0">
              <h3 className="font-bold text-base truncate">{coin.name}</h3>
              <p className="text-white/40 text-xs tracking-widest uppercase font-mono truncate">
                ${coin.symbol}
              </p>
            </div>
            {pct !== undefined && (
              <span
                className={`font-display font-bold text-sm ${up ? "text-accent" : "text-destructive"}`}
              >
                {up ? "+" : ""}
                {pct.toFixed(1)}%
              </span>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-white/50 font-mono">
            <span>{fmtPrice(coin.priceUsd)}</span>
            <span>{coin.uniqueHolders.toLocaleString()} holders</span>
          </div>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <span className="flex-1 bg-primary py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest text-center text-white">
          Trade
        </span>
        <span className="px-4 bg-white/5 rounded-xl border border-white/10 grid place-items-center text-white/60 text-xs">
          ⋮
        </span>
      </div>
      <p className="mt-2 text-[9px] text-white/30 font-mono uppercase tracking-widest text-center">
        Built by {RESIDENT_LABS.name}
      </p>
    </Link>
  );
}

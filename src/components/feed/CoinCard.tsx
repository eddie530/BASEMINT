import { Link } from "@tanstack/react-router";
import type { FeedItem } from "@/lib/mock-data";

type Coin = Extract<FeedItem, { kind: "coin" }>;

export function CoinCard({ coin }: { coin: Coin }) {
  const up = coin.change24h >= 0;
  return (
    <Link
      to="/coin/$id"
      params={{ id: coin.id }}
      className="block bg-card rounded-3xl p-4 border border-white/5 hover:border-white/10 transition"
    >
      <div className="flex gap-4">
        <div className="size-16 rounded-2xl overflow-hidden shrink-0 bg-white/5">
          <img src={coin.image} alt={coin.name} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2">
            <div className="min-w-0">
              <h3 className="font-bold text-base truncate">{coin.name}</h3>
              <p className="text-white/40 text-xs tracking-widest uppercase font-mono">${coin.symbol}</p>
            </div>
            <span className={`font-display font-bold text-sm ${up ? "text-accent" : "text-destructive"}`}>
              {up ? "+" : ""}{coin.change24h.toFixed(1)}%
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-white/50 font-mono">
            <span>${coin.priceUsd.toFixed(coin.priceUsd < 0.01 ? 5 : 3)}</span>
            <span>{coin.holders.toLocaleString()} holders</span>
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
    </Link>
  );
}

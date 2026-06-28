import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Shuffle } from "lucide-react";
import type { CoinDTO } from "@/lib/zora.types";

// Priority 4: lightweight "Spin to discover" — picks a random coin from the
// trending/recent pool and surfaces it as a single highlight card. Pure
// client-side; ties into existing SpinBase-style mechanics in spirit.
export function SpinDiscover({ pool }: { pool: CoinDTO[] }) {
  const [pick, setPick] = useState<CoinDTO | null>(null);
  const [spinning, setSpinning] = useState(false);

  function spin() {
    if (pool.length === 0) return;
    setSpinning(true);
    let i = 0;
    const id = setInterval(() => {
      setPick(pool[Math.floor(Math.random() * pool.length)]);
      i++;
      if (i > 10) {
        clearInterval(id);
        setSpinning(false);
      }
    }, 80);
  }

  return (
    <section className="bg-gradient-to-br from-primary/15 via-accent/5 to-transparent border border-white/10 rounded-3xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display font-bold text-lg uppercase tracking-wider">
          Spin to Discover
        </h2>
        <button
          onClick={spin}
          disabled={spinning || pool.length === 0}
          className="inline-flex items-center gap-1.5 bg-accent text-accent-foreground px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest disabled:opacity-50"
        >
          <Shuffle className={`size-3 ${spinning ? "animate-spin" : ""}`} />
          Spin
        </button>
      </div>

      {pick ? (
        <Link
          to="/coin/$id"
          params={{ id: pick.address }}
          className="flex gap-3 items-center bg-black/40 rounded-2xl p-3 border border-white/10"
        >
          <img
            src={pick.image}
            alt={pick.name}
            className="size-14 rounded-xl object-cover bg-white/5"
            loading="lazy"
          />
          <div className="min-w-0 flex-1">
            <p className="font-bold truncate">{pick.name}</p>
            <p className="text-[11px] text-white/50 font-mono truncate">
              ${pick.symbol} · {pick.uniqueHolders.toLocaleString()} holders
            </p>
          </div>
          <span className="text-[10px] text-accent font-mono uppercase tracking-widest">
            Open →
          </span>
        </Link>
      ) : (
        <p className="text-xs text-white/50 font-mono">Tap Spin for a random Base launch.</p>
      )}
    </section>
  );
}

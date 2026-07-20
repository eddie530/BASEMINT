import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MiniAppShell } from "@/components/MiniAppShell";
import {
  loadBalance,
  loadPositions,
  polymarketUrl,
  priceFor,
  resetPredictions,
  trade,
  type Outcome,
  type PredictionMarket,
  type Position,
} from "@/lib/predictions";
import { fetchLiveMarkets } from "@/lib/predictions.functions";
import { TrendingUp, Clock, Wallet, RotateCcw, X, ExternalLink, Loader2 } from "lucide-react";

export const Route = createFileRoute("/predictions")({
  head: () => ({
    meta: [
      { title: "Predictions · Basemint" },
      {
        name: "description",
        content: "Trade YES/NO shares on crypto, Base, and culture prediction markets.",
      },
      { property: "og:title", content: "Predictions · Basemint" },
      {
        property: "og:description",
        content: "Trade YES/NO shares on crypto, Base, and culture prediction markets.",
      },
    ],
  }),
  component: PredictionsPage,
});

const CATS = ["All", "Crypto", "Base", "Culture", "Sports"] as const;

function PredictionsPage() {
  const [balance, setBalance] = useState<number>(() => loadBalance());
  const [positions, setPositions] = useState<Position[]>(() => loadPositions());
  const [cat, setCat] = useState<(typeof CATS)[number]>("All");
  const [openTrade, setOpenTrade] = useState<{ market: PredictionMarket; outcome: Outcome } | null>(
    null,
  );

  const { data: liveMarkets, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["predictions", "live"],
    queryFn: () => fetchLiveMarkets(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const allMarkets = liveMarkets ?? [];

  const markets = useMemo(
    () => (cat === "All" ? allMarkets : allMarkets.filter((m) => m.category === cat)),
    [cat, allMarkets],
  );

  const portfolioValue = useMemo(() => {
    return positions.reduce((sum, p) => {
      const m = allMarkets.find((x) => x.id === p.marketId);
      if (!m) return sum;
      return sum + priceFor(m, p.outcome) * p.shares;
    }, 0);
  }, [positions, allMarkets]);

  const refresh = () => {
    setBalance(loadBalance());
    setPositions(loadPositions());
  };

  return (
    <MiniAppShell>
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <p className="text-[10px] uppercase tracking-widest text-white/40 font-mono">
            Prediction Markets
          </p>
          <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-widest font-mono text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 rounded-full px-1.5 py-0.5">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
          </span>
          {isFetching && !isLoading && (
            <Loader2 className="size-3 text-white/40 animate-spin" />
          )}
        </div>
        <h1 className="font-display font-bold text-3xl">Trade the future</h1>
        <p className="text-sm text-white/60">
          Live odds from Polymarket. Practice with play money here, or trade for real on Polymarket.
        </p>
      </header>

      {/* Balance / portfolio */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-1.5 text-white/40 text-[10px] uppercase tracking-widest font-mono">
            <Wallet className="size-3" /> Balance
          </div>
          <p className="font-display font-bold text-2xl mt-1">${balance.toFixed(2)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-1.5 text-white/40 text-[10px] uppercase tracking-widest font-mono">
            <TrendingUp className="size-3" /> Positions
          </div>
          <p className="font-display font-bold text-2xl mt-1 text-accent">
            ${portfolioValue.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 no-scrollbar">
        {CATS.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-widest border transition ${
              cat === c
                ? "bg-accent text-accent-foreground border-accent"
                : "border-white/10 bg-white/5 text-white/70"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Markets */}
      <div className="space-y-3">
        {isLoading && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 flex flex-col items-center gap-2 text-white/50">
            <Loader2 className="size-5 animate-spin" />
            <p className="text-xs font-mono uppercase tracking-widest">Loading live markets…</p>
          </div>
        )}
        {isError && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-200 text-sm">
            Couldn't reach Polymarket.{" "}
            <button onClick={() => refetch()} className="underline font-bold">
              Retry
            </button>
          </div>
        )}
        {!isLoading && !isError && markets.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/60 text-sm text-center">
            No open {cat === "All" ? "" : cat.toLowerCase()} markets right now.
          </div>
        )}
        {markets.map((m) => (
          <MarketCard
            key={m.id}
            market={m}
            onTrade={(outcome) => setOpenTrade({ market: m, outcome })}
          />
        ))}
      </div>

      {/* Positions list */}
      {positions.length > 0 && (
        <section className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-widest text-white/40 font-mono">
              Your positions
            </p>
            <button
              onClick={() => {
                resetPredictions();
                refresh();
              }}
              className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-white/40 font-mono hover:text-white"
            >
              <RotateCcw className="size-3" /> Reset
            </button>
          </div>
          {positions.map((p) => {
            const m = allMarkets.find((x) => x.id === p.marketId);
            if (!m) return null;
            const price = priceFor(m, p.outcome);
            const pnl = (price - p.avgPrice) * p.shares;
            const pnlPct = ((price - p.avgPrice) / p.avgPrice) * 100;
            return (
              <button
                key={`${p.marketId}-${p.outcome}`}
                onClick={() => setOpenTrade({ market: m, outcome: p.outcome })}
                className="w-full text-left rounded-2xl border border-white/10 bg-white/5 p-3 hover:bg-white/10"
              >
                <p className="text-sm font-semibold line-clamp-1">{m.question}</p>
                <div className="flex items-center justify-between mt-1.5 text-xs">
                  <span
                    className={`font-mono uppercase tracking-widest ${p.outcome === "yes" ? "text-emerald-400" : "text-rose-400"}`}
                  >
                    {p.outcome} · {p.shares} sh
                  </span>
                  <span
                    className={`font-mono ${pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}
                  >
                    {pnl >= 0 ? "+" : ""}
                    {pnl.toFixed(2)} ({pnlPct.toFixed(1)}%)
                  </span>
                </div>
              </button>
            );
          })}
        </section>
      )}

      {openTrade && (
        <TradeSheet
          market={openTrade.market}
          outcome={openTrade.outcome}
          positions={positions}
          balance={balance}
          onClose={() => setOpenTrade(null)}
          onDone={() => {
            refresh();
            setOpenTrade(null);
          }}
        />
      )}
    </MiniAppShell>
  );
}

function MarketCard({
  market,
  onTrade,
}: {
  market: PredictionMarket;
  onTrade: (o: Outcome) => void;
}) {
  const yesPrice = priceFor(market, "yes");
  const noPrice = priceFor(market, "no");
  const days = Math.max(0, Math.ceil((new Date(market.endsAt).getTime() - Date.now()) / 86_400_000));
  return (
    <div className="rounded-2xl border border-white/10 bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-accent font-mono">
            {market.category}
          </p>
          <h3 className="font-semibold text-sm mt-1 leading-snug">{market.question}</h3>
        </div>
      </div>

      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500"
          style={{ width: `${yesPrice * 100}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[10px] text-white/40 font-mono uppercase tracking-widest">
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3" /> {days}d left
        </span>
        <span>Vol ${Math.round(market.volumeUsd / 1000)}k</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onTrade("yes")}
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-3 text-emerald-300 font-bold text-sm hover:bg-emerald-500/20"
        >
          Yes · ${yesPrice.toFixed(2)}
        </button>
        <button
          onClick={() => onTrade("no")}
          className="rounded-xl border border-rose-500/30 bg-rose-500/10 py-3 text-rose-300 font-bold text-sm hover:bg-rose-500/20"
        >
          No · ${noPrice.toFixed(2)}
        </button>
      </div>
    </div>
  );
}

function TradeSheet({
  market,
  outcome,
  positions,
  balance,
  onClose,
  onDone,
}: {
  market: PredictionMarket;
  outcome: Outcome;
  positions: Position[];
  balance: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [shares, setShares] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const price = priceFor(market, outcome);
  const cost = price * shares;
  const held = positions.find((p) => p.marketId === market.id && p.outcome === outcome);

  const submit = () => {
    setError(null);
    try {
      trade(market, outcome, side, shares);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Trade failed");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-white/10 bg-[#0a0a0a] p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/40 font-mono">
              {outcome === "yes" ? "Yes" : "No"} @ ${price.toFixed(2)}
            </p>
            <h3 className="font-display font-bold text-lg mt-1 leading-snug">{market.question}</h3>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white">
            <X className="size-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setSide("buy")}
            className={`rounded-xl py-2 text-sm font-bold uppercase tracking-widest ${side === "buy" ? "bg-accent text-accent-foreground" : "bg-white/5 border border-white/10"}`}
          >
            Buy
          </button>
          <button
            onClick={() => setSide("sell")}
            disabled={!held}
            className={`rounded-xl py-2 text-sm font-bold uppercase tracking-widest disabled:opacity-40 ${side === "sell" ? "bg-accent text-accent-foreground" : "bg-white/5 border border-white/10"}`}
          >
            Sell {held ? `(${held.shares})` : ""}
          </button>
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-widest text-white/40 font-mono">
            Shares
          </label>
          <input
            type="number"
            min={1}
            value={shares}
            onChange={(e) => setShares(Math.max(1, Math.floor(Number(e.target.value) || 0)))}
            className="mt-1 w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-lg font-mono"
          />
          <div className="flex gap-2 mt-2">
            {[10, 25, 100, 500].map((n) => (
              <button
                key={n}
                onClick={() => setShares(n)}
                className="flex-1 rounded-lg border border-white/10 bg-white/5 py-1.5 text-xs font-mono"
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-white/5 border border-white/10 p-3 space-y-1 text-xs font-mono">
          <Row label={side === "buy" ? "Cost" : "Proceeds"} value={`$${cost.toFixed(2)}`} />
          <Row
            label="Max payout if wins"
            value={`$${shares.toFixed(2)}`}
            hint={`+${((1 / price - 1) * 100).toFixed(0)}%`}
          />
          <Row label="Balance" value={`$${balance.toFixed(2)}`} />
        </div>

        {error && <p className="text-rose-400 text-xs">{error}</p>}

        <button
          onClick={submit}
          className="w-full bg-accent text-accent-foreground rounded-2xl py-4 font-bold uppercase tracking-widest text-sm"
        >
          {side === "buy" ? "Buy" : "Sell"} {shares} {outcome.toUpperCase()}
        </button>
      </div>
    </div>
  );
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/50 uppercase tracking-widest text-[10px]">{label}</span>
      <span className="text-white">
        {value} {hint && <span className="text-emerald-400 ml-1">{hint}</span>}
      </span>
    </div>
  );
}

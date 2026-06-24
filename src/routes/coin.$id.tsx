import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { MiniAppShell } from "@/components/MiniAppShell";
import { getCoinDetail } from "@/lib/zora.functions";
import { ArrowLeft } from "lucide-react";
import { useAccount } from "wagmi";
import { TradeDialog } from "@/components/coin/TradeDialog";

const coinQO = (address: string) =>
  queryOptions({
    queryKey: ["coin", address.toLowerCase()],
    queryFn: () => getCoinDetail({ data: { address, chainId: 8453 } }),
    staleTime: 30_000,
  });

export const Route = createFileRoute("/coin/$id")({
  head: ({ params }) => {
    const url = `https://foxy-token-forge.lovable.app/coin/${params.id}`;
    return {
      meta: [
        { title: `${params.id.slice(0, 8)}… · Basemint` },
        { name: "description", content: "Zora coin on Base. Trade, view stats and creator details." },
        { property: "og:title", content: `Basemint · Coin ${params.id.slice(0, 10)}…` },
        { property: "og:description", content: "Zora coin on Base. Trade, view stats and creator details." },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  loader: async ({ params, context }) => {
    const data = await context.queryClient.ensureQueryData(coinQO(params.id));
    if (!data) throw notFound();
  },
  notFoundComponent: () => (
    <MiniAppShell>
      <p className="text-white/60">Coin not found on Base.</p>
    </MiniAppShell>
  ),
  errorComponent: ({ error }) => (
    <MiniAppShell>
      <p className="text-destructive text-sm">{error.message}</p>
    </MiniAppShell>
  ),
  component: DetailPage,
});

function DetailPage() {
  const { id } = Route.useParams();
  const { data: item } = useSuspenseQuery(coinQO(id));
  useAccount();
  const [trade, setTrade] = useState<"buy" | "sell" | null>(null);
  if (!item) return null;

  const delta = item.marketCapDelta24h;
  const mc = item.marketCap;
  const pct = mc && delta && mc - delta !== 0 ? (delta / Math.max(1, mc - delta)) * 100 : undefined;

  return (
    <MiniAppShell>
      <Link to="/" className="inline-flex items-center gap-1.5 text-white/60 text-xs font-mono hover:text-white transition">
        <ArrowLeft className="size-3.5" /> back
      </Link>

      <div className="rounded-3xl overflow-hidden border border-white/5 bg-card">
        <div className="aspect-square">
          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
        </div>
        <div className="p-5 space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/40 font-mono">${item.symbol}</p>
            <h1 className="font-display font-bold text-2xl mt-1">{item.name}</h1>
            {item.creatorAddress && (
              <Link
                to="/profile/$address"
                params={{ address: item.creatorAddress }}
                className="text-white/50 text-sm mt-0.5 inline-block hover:text-accent"
              >
                by {item.creatorHandle ? `@${item.creatorHandle}` : `${item.creatorAddress.slice(0, 6)}…${item.creatorAddress.slice(-4)}`}
              </Link>
            )}
          </div>

          {item.description && (
            <p className="text-sm text-white/70 leading-relaxed">{item.description}</p>
          )}

          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label="Price" value={item.priceUsd ? `$${item.priceUsd < 0.01 ? item.priceUsd.toExponential(2) : item.priceUsd.toFixed(4)}` : "—"} />
            <Stat
              label="24h"
              value={pct !== undefined ? `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%` : "—"}
              accent={pct !== undefined && pct >= 0}
            />
            <Stat label="Holders" value={item.uniqueHolders.toLocaleString()} />
          </div>

          <p className="text-[10px] font-mono text-white/40 break-all bg-white/5 px-3 py-2 rounded-lg">
            {item.address}
          </p>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setTrade("buy")}
              className="bg-accent text-accent-foreground py-4 rounded-2xl font-bold uppercase tracking-widest text-sm"
            >
              Buy
            </button>
            <button
              onClick={() => setTrade("sell")}
              className="bg-white/5 border border-white/10 py-4 rounded-2xl font-bold uppercase tracking-widest text-sm"
            >
              Sell
            </button>
          </div>

          {/* Zora content coins are ERC-20s; "Collect Edition" routes to the buy flow,
              which is the on-chain action that mints/acquires a unit of the edition. */}
          <button
            onClick={() => setTrade("buy")}
            className="w-full bg-white text-black py-4 rounded-2xl font-bold uppercase tracking-widest text-sm"
          >
            Collect Edition
          </button>
        </div>
      </div>

      </div>

      {trade && (
        <TradeDialog
          side={trade}
          coinAddress={item.address as `0x${string}`}
          coinSymbol={item.symbol}
          onClose={() => setTrade(null)}
        />
      )}
    </MiniAppShell>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-white/5 rounded-xl py-2.5 border border-white/5">
      <p className="text-[9px] uppercase tracking-widest text-white/40 font-mono">{label}</p>
      <p className={`font-display font-bold text-sm mt-0.5 ${accent ? "text-accent" : ""}`}>{value}</p>
    </div>
  );
}

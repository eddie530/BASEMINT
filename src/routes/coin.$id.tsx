import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { MiniAppShell } from "@/components/MiniAppShell";
import { getItem } from "@/lib/mock-data";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/coin/$id")({
  head: ({ params }) => {
    const url = `https://foxy-token-forge.lovable.app/coin/${params.id}`;
    return {
      meta: [
        { title: `Asset ${params.id} · Basemint` },
        { name: "description", content: "Token / NFT detail on Basemint." },
        { property: "og:title", content: `Asset ${params.id} · Basemint` },
        { property: "og:description", content: "Token / NFT detail on Basemint." },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  loader: ({ params }) => {
    const item = getItem(params.id);
    if (!item) throw notFound();
    return { item };
  },
  notFoundComponent: () => (
    <MiniAppShell>
      <p className="text-white/60">Asset not found.</p>
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
  const { item } = Route.useLoaderData();

  return (
    <MiniAppShell>
      <Link to="/" className="inline-flex items-center gap-1.5 text-white/60 text-xs font-mono hover:text-white transition">
        <ArrowLeft className="size-3.5" /> back
      </Link>

      <div className="rounded-3xl overflow-hidden border border-white/5 bg-card">
        <div className="aspect-square">
          <img src={item.image} alt={item.kind === "coin" ? item.name : item.name} className="w-full h-full object-cover" />
        </div>
        <div className="p-5 space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/40 font-mono">
              {item.kind === "coin" ? `$${item.symbol}` : "Edition"}
            </p>
            <h1 className="font-display font-bold text-2xl mt-1">{item.name}</h1>
            <p className="text-white/50 text-sm mt-0.5">by @{item.creator}</p>
          </div>

          {item.kind === "coin" ? (
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat label="Price" value={`$${item.priceUsd.toFixed(5)}`} />
              <Stat label="24h" value={`${item.change24h >= 0 ? "+" : ""}${item.change24h}%`} accent={item.change24h >= 0} />
              <Stat label="Holders" value={item.holders.toLocaleString()} />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 text-center">
              <Stat label="Price" value={`${item.priceEth} ETH`} />
              <Stat label="Minted" value={`${item.minted}/${item.supply}`} />
            </div>
          )}

          <p className="text-[10px] font-mono text-white/40 break-all bg-white/5 px-3 py-2 rounded-lg">
            {item.address}
          </p>

          {item.kind === "coin" ? (
            <div className="grid grid-cols-2 gap-2">
              <button className="bg-accent text-accent-foreground py-4 rounded-2xl font-bold uppercase tracking-widest text-sm">Buy</button>
              <button className="bg-white/5 border border-white/10 py-4 rounded-2xl font-bold uppercase tracking-widest text-sm">Sell</button>
            </div>
          ) : (
            <button className="w-full bg-white text-black py-4 rounded-2xl font-bold uppercase tracking-widest text-sm">
              Collect for {item.priceEth} ETH
            </button>
          )}
        </div>
      </div>
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

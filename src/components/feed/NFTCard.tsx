import { Link } from "@tanstack/react-router";
import type { CoinDTO } from "@/lib/zora.types";

// Repurposed: used to render newer / image-forward "drops" from Zora.
export function NFTCard({ nft }: { nft: CoinDTO }) {
  return (
    <Link
      to="/coin/$id"
      params={{ id: nft.address }}
      className="block bg-card rounded-3xl overflow-hidden border border-white/5 hover:border-white/10 transition"
    >
      <div className="relative aspect-square">
        <img src={nft.image} alt={nft.name} className="w-full h-full object-cover" loading="lazy" />
        <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full">
          <p className="text-[11px] font-bold tracking-tight text-white font-mono">
            {nft.uniqueHolders.toLocaleString()} holders
          </p>
        </div>
      </div>
      <div className="p-4">
        <div className="flex justify-between items-end mb-3">
          <div className="min-w-0">
            <h3 className="font-bold text-base truncate">{nft.name}</h3>
            <p className="text-white/40 text-xs truncate">
              by {nft.creatorHandle ? `@${nft.creatorHandle}` : (nft.creatorAddress?.slice(0, 6) ?? "—")}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-white/40 uppercase tracking-wider">Vol 24h</p>
            <p className="font-display font-bold text-accent text-base">
              ${(nft.volume24h ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>
        <span className="block w-full bg-white text-black py-3 rounded-2xl font-bold uppercase tracking-widest text-xs text-center">
          Collect
        </span>
      </div>
    </Link>
  );
}

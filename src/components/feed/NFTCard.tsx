import { Link } from "@tanstack/react-router";
import type { FeedItem } from "@/lib/mock-data";

type NFT = Extract<FeedItem, { kind: "nft" }>;

export function NFTCard({ nft }: { nft: NFT }) {
  return (
    <Link
      to="/coin/$id"
      params={{ id: nft.id }}
      className="block bg-card rounded-3xl overflow-hidden border border-white/5 hover:border-white/10 transition"
    >
      <div className="relative aspect-square">
        <img src={nft.image} alt={nft.name} className="w-full h-full object-cover" />
        <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full">
          <p className="text-[11px] font-bold tracking-tight text-white font-mono">
            {nft.minted}/{nft.supply} minted
          </p>
        </div>
      </div>
      <div className="p-4">
        <div className="flex justify-between items-end mb-3">
          <div className="min-w-0">
            <h3 className="font-bold text-base truncate">{nft.name}</h3>
            <p className="text-white/40 text-xs">by @{nft.creator}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-white/40 uppercase tracking-wider">Price</p>
            <p className="font-display font-bold text-accent text-base">{nft.priceEth} ETH</p>
          </div>
        </div>
        <span className="block w-full bg-white text-black py-3 rounded-2xl font-bold uppercase tracking-widest text-xs text-center">
          Collect
        </span>
      </div>
    </Link>
  );
}

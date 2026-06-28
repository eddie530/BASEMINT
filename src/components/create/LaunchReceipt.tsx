import { useState } from "react";
import { Loader2, Share2, X, Check } from "lucide-react";
import { shareCast, buildLaunchCastText } from "@/lib/farcaster-share";
import { RESIDENT_LABS } from "@/lib/curated";

// LaunchReceipt — shown after a successful coin or NFT deploy.
// Doubles as Priority 1 (one-tap share) and Priority 5 (styled receipt /
// artifact) for the Resident Labs positioning.

export interface LaunchReceiptProps {
  kind: "coin" | "nft";
  name: string;
  symbol?: string;
  contractAddress?: string;
  txHash?: string;
  imageUrl?: string;
  onClose: () => void;
}

export function LaunchReceipt({
  kind,
  name,
  symbol,
  contractAddress,
  txHash,
  imageUrl,
  onClose,
}: LaunchReceiptProps) {
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState(false);
  const [copied, setCopied] = useState(false);

  const detailPath = contractAddress ? `/coin/${contractAddress}` : "/";
  const detailUrl = `https://basemint.dev${detailPath}`;
  const castText = buildLaunchCastText({ kind, name, symbol });

  async function onShare() {
    setSharing(true);
    try {
      await shareCast({ text: castText, embeds: [detailUrl] });
      setShared(true);
    } finally {
      setSharing(false);
    }
  }

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(`${castText}\n\n${detailUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* noop */
    }
  }

  const stamp = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-card rounded-3xl border border-accent/30 p-5 space-y-5 max-h-[92vh] overflow-y-auto relative">
        {/* Neon edge — Resident Labs visual signature */}
        <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-accent/20 [box-shadow:0_0_40px_-10px_hsl(var(--accent)/0.5)_inset]" />

        <div className="flex items-center justify-between relative">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-accent animate-pulse" />
            <h2 className="font-display font-bold text-lg uppercase tracking-widest">
              Launch Receipt
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white p-1"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex gap-4 relative">
          {imageUrl && (
            <img
              src={imageUrl}
              alt={name}
              className="size-20 rounded-2xl object-cover border border-white/10 shrink-0"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-widest text-white/40 font-mono">
              {kind === "coin" ? "Zora Coin · ERC-20" : "Zora 1155 · NFT"}
            </p>
            <h3 className="font-display font-bold text-2xl truncate">{name}</h3>
            {symbol && kind === "coin" && (
              <p className="text-accent font-mono text-sm">${symbol.toUpperCase()}</p>
            )}
          </div>
        </div>

        <dl className="text-[11px] font-mono text-white/60 space-y-1.5 relative">
          {contractAddress && (
            <div className="flex justify-between gap-2">
              <dt className="text-white/40 uppercase tracking-widest">Address</dt>
              <dd className="truncate text-accent">{contractAddress}</dd>
            </div>
          )}
          {txHash && (
            <div className="flex justify-between gap-2">
              <dt className="text-white/40 uppercase tracking-widest">Tx</dt>
              <dd className="truncate">
                {txHash.slice(0, 14)}…{txHash.slice(-6)}
              </dd>
            </div>
          )}
          <div className="flex justify-between gap-2">
            <dt className="text-white/40 uppercase tracking-widest">Timestamp</dt>
            <dd>{stamp}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-white/40 uppercase tracking-widest">Issued by</dt>
            <dd>{RESIDENT_LABS.agentIdLabel}</dd>
          </div>
        </dl>

        <div className="relative space-y-2">
          <button
            onClick={onShare}
            disabled={sharing}
            className="w-full bg-accent text-accent-foreground py-4 rounded-2xl font-bold uppercase tracking-widest text-sm disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {sharing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : shared ? (
              <Check className="size-4" />
            ) : (
              <Share2 className="size-4" />
            )}
            {shared ? "Shared" : "Share to Farcaster"}
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onCopy}
              className="bg-white/5 border border-white/10 rounded-2xl py-3 text-xs font-bold uppercase tracking-widest hover:border-white/20"
            >
              {copied ? "Copied" : "Copy Cast"}
            </button>
            {contractAddress && (
              <a
                href={`https://basescan.org/address/${contractAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/5 border border-white/10 rounded-2xl py-3 text-xs font-bold uppercase tracking-widest text-center hover:border-white/20"
              >
                Basescan
              </a>
            )}
          </div>
        </div>

        <p className="text-[10px] text-white/40 text-center font-mono relative">
          Built by {RESIDENT_LABS.name} · {RESIDENT_LABS.agentIdLabel}
        </p>
      </div>
    </div>
  );
}

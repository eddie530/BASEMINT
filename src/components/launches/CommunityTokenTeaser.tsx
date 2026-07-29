import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, Copy, ExternalLink } from "lucide-react";
import { RSIG, RSIG_PUMP_URL, shortMint } from "@/lib/rsig";

/** Compact homepage strip for the live Resident Labs community token. */
export function CommunityTokenTeaser() {
  const [copied, setCopied] = useState(false);

  async function copyMint() {
    try {
      await navigator.clipboard.writeText(RSIG.mint);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* noop */
    }
  }

  return (
    <section className="launch-rise rounded-2xl border border-accent/25 bg-black/50 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">
          Community Token
        </p>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-emerald-300">
          <span className="size-1.5 rounded-full bg-emerald-400" />
          {RSIG.status}
        </span>
      </div>

      <h3 className="mt-2 font-display text-xl font-bold tracking-tight">
        {RSIG.name} <span className="text-accent">${RSIG.ticker}</span>
      </h3>
      <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">
        {RSIG.network}
      </p>

      <button
        onClick={copyMint}
        className="mt-3 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-mono text-[11px] text-white/70"
      >
        {shortMint()}
        {copied ? (
          <Check className="size-3.5 text-emerald-300" />
        ) : (
          <Copy className="size-3.5 text-accent" />
        )}
        <span className="sr-only">Copy mint address</span>
      </button>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Link
          to="/community"
          className="launch-glow rounded-2xl border border-accent/30 bg-accent/10 py-3 text-center text-[11px] font-bold uppercase tracking-widest text-accent"
        >
          Explore RSIG
        </Link>
        <a
          href={RSIG_PUMP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="launch-glow inline-flex items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 py-3 text-[11px] font-bold uppercase tracking-widest"
        >
          pump.fun <ExternalLink className="size-3.5" />
        </a>
      </div>
    </section>
  );
}

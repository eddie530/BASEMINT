import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import rsigArtwork from "@/assets/rsig-artwork.png";

const MINT_ADDRESS = "5cGDB5noeZvSKhGEvc7n5GHQUmiQUWMvFVjxn1P7pump";
const PUMP_FUN_URL = `https://pump.fun/coin/${MINT_ADDRESS}`;
/** Set once a DexScreener pair exists — the button stays hidden until then. */
const DEXSCREENER_URL: string | null = null;

/** Resident Signal ($RSIG) — the Resident Labs community token on Solana. */
export function CommunityTokenCard() {
  const [copied, setCopied] = useState(false);

  async function copyMint() {
    try {
      await navigator.clipboard.writeText(MINT_ADDRESS);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* noop */
    }
  }

  return (
    <section className="launch-rise space-y-3">
      <h2 className="font-display text-lg font-bold uppercase tracking-widest">
        Community Token
      </h2>

      <article className="relative overflow-hidden rounded-3xl border border-accent/30 bg-black">
        <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-accent/20 [box-shadow:0_0_80px_-20px_color-mix(in_oklab,var(--primary)_70%,transparent)_inset]" />

        <div className="relative aspect-square sm:aspect-[16/10]">
          <img
            src={rsigArtwork}
            alt="Resident Signal RSIG token artwork"
            loading="lazy"
            width={1024}
            height={1024}
            className="h-full w-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          <span className="absolute left-4 top-4 rounded-full bg-accent px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-accent-foreground">
            Community Token
          </span>
          <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/70 px-2.5 py-1 font-mono text-[9px] uppercase tracking-widest text-white/80 backdrop-blur">
            <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_2px] shadow-emerald-400/60" />
            Live
          </span>
        </div>

        <div className="relative -mt-12 space-y-4 p-4">
          <div className="min-w-0 space-y-1">
            <h3 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Resident Signal
            </h3>
            <p className="font-mono text-sm text-accent">$RSIG</p>
            <p className="text-sm leading-relaxed text-white/60">
              Resident Signal ($RSIG) is the official community token of Resident Labs. It
              connects builders, creators, collectors, AI experiments, Base applications, and
              Solana into one growing ecosystem.
            </p>
          </div>

          <dl className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 font-mono text-[11px]">
            {[
              ["Token", "Resident Signal"],
              ["Ticker", "RSIG"],
              ["Network", "Solana"],
              ["Status", "LIVE"],
              ["Category", "Community Token"],
            ].map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-3 py-1">
                <dt className="uppercase tracking-widest text-white/40">{k}</dt>
                <dd className="truncate text-white/80">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">
              Mint address
            </p>
            <p className="mt-1 break-all font-mono text-[11px] text-white/70">{MINT_ADDRESS}</p>
          </div>

          <div className="space-y-2">
            <a
              href={PUMP_FUN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="launch-glow inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-4 text-sm font-bold uppercase tracking-widest text-accent-foreground"
            >
              View on pump.fun <ExternalLink className="size-3.5" />
            </a>

            <button
              onClick={copyMint}
              className="launch-glow inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-3 text-xs font-bold uppercase tracking-widest"
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? "Copied" : "Copy mint address"}
            </button>

            {DEXSCREENER_URL && (
              <a
                href={DEXSCREENER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="launch-glow inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-3 text-xs font-bold uppercase tracking-widest"
              >
                View on DexScreener <ExternalLink className="size-3.5" />
              </a>
            )}
          </div>
        </div>
      </article>
    </section>
  );
}

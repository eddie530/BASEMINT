import { Link } from "@tanstack/react-router";
import {
  Boxes,
  Coins,
  ExternalLink,
  Gamepad2,
  Radio,
  Sparkles,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type EcoStatus = "live" | "soon" | "active" | "planned";

type EcoCard = {
  label: string;
  blurb: string;
  icon: LucideIcon;
  status: EcoStatus;
  to?: string;
  href?: string;
};

const STATUS: Record<EcoStatus, { text: string; cls: string }> = {
  live: { text: "🟢 Live", cls: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" },
  soon: { text: "🟡 Coming Soon", cls: "border-amber-400/30 bg-amber-400/10 text-amber-300" },
  active: { text: "🔵 Active", cls: "border-primary/40 bg-primary/10 text-primary" },
  planned: { text: "🔒 Planned", cls: "border-white/10 bg-white/5 text-white/45" },
};

/** The Resident Labs ecosystem — reinforces that this is more than one coin. */
const CARDS: EcoCard[] = [
  { label: "BaseMint", blurb: "Launch onchain", icon: Boxes, status: "live", to: "/launch" },
  {
    label: "Resident Signal",
    blurb: "$RSIG on Solana",
    icon: Radio,
    status: "live",
    href: "https://pump.fun/coin/5cGDB5noeZvSKhGEvc7n5GHQUmiQUWMvFVjxn1P7pump",
  },
  { label: "SIGNAL-001", blurb: "Genesis release", icon: Sparkles, status: "soon", to: "/launches" },
  { label: "Creator Coins", blurb: "Live on Base", icon: Coins, status: "active", to: "/discover" },
  { label: "Mini Apps", blurb: "Arcade & games", icon: Gamepad2, status: "active", to: "/arcade" },
  { label: "Vault", blurb: "Assets & rewards", icon: Wallet, status: "active", to: "/vault" },
];

export function EcosystemRail() {
  return (
    <section className="launch-rise space-y-3">
      <h2 className="font-display text-lg font-bold uppercase tracking-widest">Ecosystem</h2>
      <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1">
        {CARDS.map((c) => {
          const s = STATUS[c.status];
          const inner = (
            <>
              <span className="flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-accent/30 bg-accent/10 text-accent">
                  <c.icon className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1 truncate font-display text-sm font-bold">
                    {c.label}
                    {c.href && <ExternalLink className="size-3 shrink-0 text-white/30" />}
                  </span>
                  <span className="block truncate font-mono text-[10px] uppercase tracking-widest text-white/40">
                    {c.blurb}
                  </span>
                </span>
              </span>
              <span
                className={cn(
                  "inline-flex w-fit rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest",
                  s.cls,
                )}
              >
                {s.text}
              </span>
            </>
          );

          const cls =
            "launch-glow flex w-44 shrink-0 snap-start flex-col justify-between gap-3 rounded-2xl border border-white/10 bg-black/40 p-3 transition hover:border-accent/40";

          return c.to ? (
            <Link key={c.label} to={c.to} className={cls}>
              {inner}
            </Link>
          ) : (
            <a
              key={c.label}
              href={c.href}
              target="_blank"
              rel="noopener noreferrer"
              className={cls}
            >
              {inner}
            </a>
          );
        })}
      </div>
    </section>
  );
}

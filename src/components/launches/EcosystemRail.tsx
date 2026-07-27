import { Link } from "@tanstack/react-router";
import {
  BookOpen,
  Boxes,
  Coins,
  ExternalLink,
  Gamepad2,
  Sparkles,
  Wallet,
  type LucideIcon,
} from "lucide-react";

type EcoCard = {
  label: string;
  blurb: string;
  icon: LucideIcon;
  to?: string;
  href?: string;
};

/** The Resident Labs ecosystem — reinforces that this is more than one coin. */
const CARDS: EcoCard[] = [
  { label: "BaseMint", blurb: "Launch onchain", icon: Boxes, to: "/launch" },
  { label: "Creator Coins", blurb: "Live on Base", icon: Coins, to: "/discover" },
  { label: "Mini Apps", blurb: "Arcade & games", icon: Gamepad2, to: "/arcade" },
  { label: "Vault", blurb: "Assets & rewards", icon: Wallet, to: "/vault" },
  { label: "Genesis", blurb: "Origin collection", icon: Sparkles, to: "/launches" },
  { label: "Documentation", blurb: "How it works", icon: BookOpen, href: "/llms.txt" },
];

export function EcosystemRail() {
  return (
    <section className="launch-rise space-y-3">
      <h2 className="font-display text-lg font-bold uppercase tracking-widest">
        Resident Labs Ecosystem
      </h2>
      <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1">
        {CARDS.map((c) => {
          const inner = (
            <>
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
            </>
          );

          const cls =
            "launch-glow flex w-40 shrink-0 snap-start items-center gap-3 rounded-2xl border border-white/10 bg-black/40 p-3 transition hover:border-accent/40";

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

import { createFileRoute, Link } from "@tanstack/react-router";
import { MiniAppShell } from "@/components/MiniAppShell";
import { Coins, Image as ImageIcon, Factory, Sparkles } from "lucide-react";

export const Route = createFileRoute("/launch")({
  head: () => ({
    meta: [
      { title: "Launch — Resident Labs" },
      {
        name: "description",
        content:
          "Create and deploy onchain assets through Resident Labs. Powered by BaseMint — Zora Coins, ERC-1155 editions, and Basemint factories.",
      },
      { property: "og:title", content: "Launch — Resident Labs" },
      {
        property: "og:description",
        content: "Create and deploy onchain assets through Resident Labs.",
      },
    ],
  }),
  component: LaunchHub,
});

type LaunchCard = {
  to: "/create" | "/deploy";
  search?: Record<string, string>;
  icon: typeof Coins;
  label: string;
  hint: string;
  status: "live" | "soon";
};

const CARDS: LaunchCard[] = [
  {
    to: "/create",
    search: { kind: "coin" },
    icon: Coins,
    label: "Create Token",
    hint: "Zora Coins · ERC-20",
    status: "live",
  },
  {
    to: "/create",
    search: { kind: "nft" },
    icon: ImageIcon,
    label: "Create NFT",
    hint: "ERC-1155 · Edition",
    status: "live",
  },
  {
    to: "/deploy",
    icon: Factory,
    label: "Deploy Factory",
    hint: "BaseMint ERC-20 / ERC-721",
    status: "live",
  },
];

const SOON: { icon: typeof Coins; label: string; hint: string }[] = [
  { icon: Sparkles, label: "Create App Coin", hint: "Coming Soon" },
  { icon: Sparkles, label: "Create Creator Coin", hint: "Coming Soon" },
  { icon: Sparkles, label: "B20 Token", hint: "Coming Soon" },
];

function LaunchHub() {
  return (
    <MiniAppShell>
      <header className="space-y-1">
        <p className="text-[10px] uppercase tracking-widest text-accent font-mono">
          Powered by BaseMint
        </p>
        <h1 className="font-display font-bold text-3xl tracking-tight">Launch</h1>
        <p className="text-white/60 text-sm">
          Create and deploy onchain assets through Resident Labs.
        </p>
      </header>

      <section className="space-y-3">
        {CARDS.map((c) => (
          <Link
            key={`${c.to}-${c.label}`}
            to={c.to}
            search={c.search as never}
            className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/40 p-4 hover:border-accent/40 transition"
          >
            <div className="size-11 rounded-xl bg-accent/15 grid place-items-center text-accent shrink-0">
              <c.icon className="size-5" strokeWidth={2.2} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sm">{c.label}</p>
              <p className="text-[11px] text-white/50 font-mono uppercase tracking-widest">
                {c.hint}
              </p>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-accent">
              Open →
            </span>
          </Link>
        ))}
      </section>

      <section>
        <p className="text-[10px] uppercase tracking-widest text-white/40 font-mono mb-3">
          On the roadmap
        </p>
        <div className="grid grid-cols-1 gap-3">
          {SOON.map((c) => (
            <div
              key={c.label}
              className="flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-4 opacity-60"
            >
              <div className="size-11 rounded-xl bg-white/5 grid place-items-center text-white/40 shrink-0">
                <c.icon className="size-5" strokeWidth={2.2} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm">{c.label}</p>
                <p className="text-[11px] text-white/40 font-mono uppercase tracking-widest">
                  {c.hint}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <p className="text-[11px] text-white/40 leading-relaxed">
        Deployments are real onchain transactions on Base. Review contract details and gas
        estimates before signing. Nothing here is financial advice.
      </p>
    </MiniAppShell>
  );
}

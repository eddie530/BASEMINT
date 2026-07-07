import { createFileRoute } from "@tanstack/react-router";
import { MiniAppShell } from "@/components/MiniAppShell";
import { Gamepad2, Zap, Trophy, Sparkles } from "lucide-react";

export const Route = createFileRoute("/arcade")({
  head: () => ({
    meta: [
      { title: "Neon Arcade Hub · Basemint" },
      {
        name: "description",
        content:
          "Neon Arcade Hub — play, compete, and earn onchain rewards on Base. Games and challenges coming soon.",
      },
      { property: "og:title", content: "Neon Arcade Hub · Basemint" },
      {
        property: "og:description",
        content: "Play, compete, and earn onchain rewards on Base.",
      },
    ],
  }),
  component: ArcadePage,
});

function ArcadePage() {
  return (
    <MiniAppShell>
      <section className="relative overflow-hidden rounded-3xl border border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-500/10 via-black to-cyan-400/10 p-6">
        <div className="absolute -top-20 -right-20 size-56 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 size-56 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-fuchsia-400/40 bg-black/40 px-3 py-1 text-[10px] font-mono uppercase tracking-widest text-fuchsia-300">
            <Zap className="size-3" /> Beta
          </span>
          <h1
            className="mt-3 font-display text-3xl font-black uppercase tracking-tight"
            style={{
              textShadow:
                "0 0 12px rgba(217,70,239,0.6), 0 0 24px rgba(34,211,238,0.35)",
            }}
          >
            Neon Arcade Hub
          </h1>
          <p className="mt-2 text-sm text-white/70">
            Onchain mini-games, tournaments, and daily challenges. Earn points, mint rewards, climb the board.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <ArcadeTile icon={<Gamepad2 className="size-5" />} label="Games" hint="Coming soon" tone="fuchsia" />
        <ArcadeTile icon={<Trophy className="size-5" />} label="Tournaments" hint="Coming soon" tone="cyan" />
        <ArcadeTile icon={<Sparkles className="size-5" />} label="Daily Runs" hint="Coming soon" tone="cyan" />
        <ArcadeTile icon={<Zap className="size-5" />} label="Rewards" hint="Coming soon" tone="fuchsia" />
      </section>
    </MiniAppShell>
  );
}

function ArcadeTile({
  icon,
  label,
  hint,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  tone: "fuchsia" | "cyan";
}) {
  const ring = tone === "fuchsia" ? "border-fuchsia-500/30" : "border-cyan-400/30";
  const glow = tone === "fuchsia" ? "text-fuchsia-300" : "text-cyan-300";
  return (
    <div className={`rounded-2xl border ${ring} bg-black/40 p-4`}>
      <div className={`mb-3 grid size-9 place-items-center rounded-lg bg-white/5 ${glow}`}>{icon}</div>
      <p className="text-sm font-bold">{label}</p>
      <p className="mt-0.5 text-[10px] font-mono uppercase tracking-widest text-white/40">{hint}</p>
    </div>
  );
}

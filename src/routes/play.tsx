import { createFileRoute, Link } from "@tanstack/react-router";
import { MiniAppShell } from "@/components/MiniAppShell";
import { Gamepad2 } from "lucide-react";

export const Route = createFileRoute("/play")({
  head: () => ({
    meta: [
      { title: "Play — SpinBase · Resident Labs" },
      {
        name: "description",
        content:
          "SpinBase — spin, earn Resident Points, and unlock rewards inside Resident Labs. Entertainment only.",
      },
      { property: "og:title", content: "Play — SpinBase" },
      {
        property: "og:description",
        content: "Spin, earn points, and unlock rewards.",
      },
    ],
  }),
  component: PlayPage,
});

function PlayPage() {
  return (
    <MiniAppShell>
      <header className="space-y-1">
        <p className="text-[10px] uppercase tracking-widest text-accent font-mono">SpinBase</p>
        <h1 className="font-display font-bold text-3xl tracking-tight">Play</h1>
        <p className="text-white/60 text-sm">
          Daily spins, streak bonuses, and Resident Points — entertainment only, no wagering.
        </p>
      </header>

      <section className="rounded-3xl border border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-500/10 via-black/40 to-accent/10 p-6 text-center">
        <Gamepad2 className="mx-auto size-10 text-fuchsia-300 mb-3" strokeWidth={2} />
        <p className="text-[10px] uppercase tracking-widest text-fuchsia-300/80 font-mono mb-2">
          Full SpinBase shipping soon
        </p>
        <p className="text-sm text-white/70 mb-5">
          The wheel, daily free spin, prizes, and streaks are being wired up. In the meantime,
          preview the current arcade hub or check today's quests.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/arcade"
            className="rounded-full bg-white text-black px-5 py-2.5 text-xs font-bold uppercase tracking-widest"
          >
            Open Arcade preview
          </Link>
          <Link
            to="/points"
            className="rounded-full border border-white/20 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white/80 hover:bg-white/5"
          >
            View quests
          </Link>
        </div>
      </section>

      <p className="text-[11px] text-white/40 leading-relaxed">
        SpinBase is a gameplay experience for engagement. Rewards are cosmetic or non-monetary
        Resident Points — not securities, not currency, and not a promise of future value.
      </p>
    </MiniAppShell>
  );
}

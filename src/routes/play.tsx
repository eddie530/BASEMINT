import { createFileRoute } from "@tanstack/react-router";
import { MiniAppShell } from "@/components/MiniAppShell";

export const Route = createFileRoute("/play")({
  head: () => ({
    meta: [
      { title: "Play — SpinBase · Resident Labs" },
      {
        name: "description",
        content:
          "SpinBase — spin the wheel, earn Resident Points, and unlock rewards on Base. Entertainment only.",
      },
      { property: "og:title", content: "Play — SpinBase" },
      {
        property: "og:description",
        content: "Spin, earn points, and unlock rewards on Base.",
      },
    ],
  }),
  component: PlayPage,
});

function PlayPage() {
  return (
    <MiniAppShell>
      <header className="space-y-1">
        <p className="text-[10px] uppercase tracking-widest text-accent font-mono">
          SpinBase · Live
        </p>
        <h1 className="font-display font-bold text-3xl tracking-tight">Play</h1>
        <p className="text-white/60 text-sm">
          Spin the wheel to earn on Base. Entertainment only — rewards are cosmetic
          Resident Points and campaign prizes, not a security.
        </p>
      </header>

      <div className="rounded-3xl overflow-hidden border border-white/10 bg-black shadow-[0_0_60px_-20px_hsl(var(--accent))]">
        <iframe
          src="/spinbase.html"
          title="SpinBase"
          className="w-full block"
          style={{ height: "calc(100vh - 220px)", minHeight: 560, border: 0 }}
          allow="clipboard-write; clipboard-read"
        />
      </div>

      <p className="text-[11px] text-white/40 leading-relaxed">
        SpinBase is a gameplay experience for engagement inside Resident Labs.
        Rewards are non-monetary Resident Points or campaign prizes — not
        securities, not currency, and not a promise of future value.
      </p>
    </MiniAppShell>
  );
}

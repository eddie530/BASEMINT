import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS: { label: string; done: boolean }[] = [
  { label: "Resident Signal launched", done: true },
  { label: "BaseMint launched", done: true },
  { label: "SIGNAL-001 Creator Coin", done: false },
  { label: "Genesis Collection", done: false },
  { label: "AI Trading Assistant", done: false },
  { label: "Resident Labs Vault", done: false },
];

/** Compact 2026 roadmap for the Resident Labs ecosystem. */
export function EcosystemTimeline() {
  return (
    <section className="launch-rise space-y-3">
      <h2 className="font-display text-lg font-bold uppercase tracking-widest">Timeline</h2>
      <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-accent">2026</p>
        <ol className="mt-3 space-y-3">
          {ITEMS.map((i) => (
            <li key={i.label} className="relative flex items-center gap-3">
              <span
                className={cn(
                  "grid size-5 shrink-0 place-items-center rounded-full border",
                  i.done
                    ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-300"
                    : "border-white/15 bg-white/5 text-white/30",
                )}
              >
                {i.done ? <Check className="size-3" /> : <span className="size-1.5 rounded-full bg-white/30" />}
              </span>
              <span
                className={cn(
                  "truncate text-sm",
                  i.done ? "text-white/80" : "text-white/45",
                )}
              >
                {i.label}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

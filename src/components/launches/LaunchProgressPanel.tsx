import { Check } from "lucide-react";
import { LAUNCH_STEPS, progressPercent, type LaunchProgress } from "@/lib/resident-launches";

/** Reusable release checklist — same six steps for every Resident Labs launch. */
export function LaunchProgressPanel({ progress }: { progress: LaunchProgress }) {
  const pct = progressPercent(progress);

  return (
    <section className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <h3 className="truncate font-mono text-[10px] uppercase tracking-widest text-white/50">
          Launch progress
        </h3>
        <span className="shrink-0 font-mono text-[10px] tabular-nums text-accent">{pct}%</span>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
      </div>

      <ul className="grid gap-2 sm:grid-cols-2">
        {LAUNCH_STEPS.map((step) => {
          const done = progress[step.key];
          return (
            <li key={step.key} className="flex items-center gap-2 text-sm">
              <span
                className={
                  done
                    ? "grid size-5 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground"
                    : "grid size-5 shrink-0 place-items-center rounded-full border border-white/15"
                }
              >
                {done && <Check className="size-3" strokeWidth={3} />}
              </span>
              <span className={done ? "text-white/80" : "text-white/40"}>{step.label}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

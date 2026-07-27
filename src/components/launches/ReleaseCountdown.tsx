import { useEffect, useMemo, useState } from "react";
import { Timer } from "lucide-react";
import { countdownParts } from "@/lib/launches";
import { NEXT_RELEASE_AT, NO_RELEASE_MESSAGE } from "@/lib/resident-launches";

/** Countdown to the next scheduled Resident Labs release. */
export function ReleaseCountdown() {
  const target = useMemo(() => (NEXT_RELEASE_AT ? new Date(NEXT_RELEASE_AT) : null), []);
  const [parts, setParts] = useState(() => (target ? countdownParts(target) : null));

  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setParts(countdownParts(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  return (
    <section className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-3">
      <div className="flex min-w-0 items-center gap-2">
        <Timer className="size-4 shrink-0 text-accent" />
        <p className="truncate font-mono text-[10px] uppercase tracking-widest text-white/50">
          Next Resident release
        </p>
      </div>

      {parts ? (
        <div className="grid grid-cols-4 gap-2">
          {(
            [
              ["Days", parts.days],
              ["Hrs", parts.hours],
              ["Min", parts.minutes],
              ["Sec", parts.seconds],
            ] as [string, number][]
          ).map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl border border-white/10 bg-white/[0.03] py-2 text-center"
            >
              <p className="font-display text-2xl font-bold tabular-nums text-accent">
                {String(value).padStart(2, "0")}
              </p>
              <p className="font-mono text-[9px] uppercase tracking-widest text-white/40">{label}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-white/60">{NO_RELEASE_MESSAGE}</p>
      )}
    </section>
  );
}

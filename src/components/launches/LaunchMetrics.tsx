import { Activity, BarChart3, Rocket, Users } from "lucide-react";
import type { ResidentLaunch } from "@/lib/resident-launches";
import { cn } from "@/lib/utils";

interface Metric {
  key: string;
  label: string;
  value: string;
  icon: typeof Users;
  placeholder?: boolean;
}

/**
 * Ecosystem metrics strip. Collectors and total launches are derived from the
 * feed; volume and onchain activity are reserved placeholders until indexed
 * data is wired up.
 */
export function LaunchMetrics({
  launches,
  className,
}: {
  launches: ResidentLaunch[];
  className?: string;
}) {
  const collectors = launches.reduce((sum, l) => sum + (l.collectors ?? 0), 0);

  const metrics: Metric[] = [
    { key: "collectors", label: "Collectors", value: collectors.toLocaleString(), icon: Users },
    { key: "launches", label: "Total launches", value: String(launches.length), icon: Rocket },
    { key: "volume", label: "Volume", value: "—", icon: BarChart3, placeholder: true },
    { key: "activity", label: "Onchain activity", value: "—", icon: Activity, placeholder: true },
  ];

  return (
    <section
      aria-label="Resident Labs ecosystem metrics"
      className={cn("grid grid-cols-2 gap-2 sm:grid-cols-4", className)}
    >
      {metrics.map((m) => (
        <div key={m.key} className="launch-glow rounded-2xl border border-white/10 bg-black/40 p-3">
          <p className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-white/40">
            <m.icon className="size-3 shrink-0" />
            <span className="truncate">{m.label}</span>
          </p>
          <p
            className={cn(
              "mt-1 font-display text-xl font-bold tracking-tight",
              m.placeholder && "text-white/25",
            )}
          >
            {m.value}
          </p>
          {m.placeholder && (
            <p className="font-mono text-[8px] uppercase tracking-widest text-white/25">
              Coming soon
            </p>
          )}
        </div>
      ))}
    </section>
  );
}

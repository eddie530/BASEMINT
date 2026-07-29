import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

type Status = "live" | "soon" | "planned" | "active";

const STATUS: Record<Status, { dot: string; text: string; cls: string }> = {
  live: { dot: "bg-emerald-400", text: "Live", cls: "text-emerald-300" },
  soon: { dot: "bg-amber-400", text: "Coming Soon", cls: "text-amber-300" },
  planned: { dot: "bg-sky-400", text: "Planned", cls: "text-sky-300" },
  active: { dot: "bg-sky-400", text: "Active", cls: "text-sky-300" },
};

type Row = { label: string; status: Status; to?: string; href?: string };

const ROWS: Row[] = [
  { label: "BaseMint", status: "live", to: "/launch" },
  {
    label: "Resident Signal (RSIG)",
    status: "live",
    href: "https://pump.fun/coin/5cGDB5noeZvSKhGEvc7n5GHQUmiQUWMvFVjxn1P7pump",
  },
  { label: "SIGNAL-001", status: "soon", to: "/launches" },
  { label: "Resident Genesis", status: "planned" },
  { label: "Mini Apps", status: "active", to: "/arcade" },
  { label: "Vault", status: "active", to: "/vault" },
];

/** Progress-based ecosystem roadmap — where every Resident Labs project stands. */
export function EcosystemRoadmap() {
  return (
    <section className="launch-rise space-y-3">
      <h2 className="font-display text-lg font-bold uppercase tracking-widest">Ecosystem</h2>
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-white/10 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-white/40">
          <span>Project</span>
          <span>Status</span>
        </div>
        {ROWS.map((r) => {
          const s = STATUS[r.status];
          const inner = (
            <>
              <span className="truncate font-display text-sm font-bold">{r.label}</span>
              <span
                className={cn(
                  "inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest",
                  s.cls,
                )}
              >
                <span className={cn("size-2 rounded-full", s.dot)} />
                {s.text}
              </span>
            </>
          );
          const cls =
            "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-white/5 px-4 py-3 last:border-b-0 transition hover:bg-white/5";

          if (r.to) {
            return (
              <Link key={r.label} to={r.to} className={cls}>
                {inner}
              </Link>
            );
          }
          if (r.href) {
            return (
              <a
                key={r.label}
                href={r.href}
                target="_blank"
                rel="noopener noreferrer"
                className={cls}
              >
                {inner}
              </a>
            );
          }
          return (
            <div key={r.label} className={cls}>
              {inner}
            </div>
          );
        })}
      </div>
      <p className="font-mono text-[10px] uppercase tracking-widest text-white/35">
        Where the ecosystem stands at a glance
      </p>
    </section>
  );
}

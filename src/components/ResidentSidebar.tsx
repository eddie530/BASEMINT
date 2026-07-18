import { Link } from "@tanstack/react-router";
import basemintIcon from "@/assets/basemint-icon.png.asset.json";
import { RESIDENT_NAV } from "@/lib/nav";

/**
 * Desktop-only left sidebar for the Resident Labs shell. On mobile the
 * nav lives in `AppHeader` + `BottomNav`.
 */
export function ResidentSidebar() {
  return (
    <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-white/5 bg-black/60 backdrop-blur-xl sticky top-0 h-screen">
      <Link to="/home" className="flex items-center gap-3 px-5 py-5 border-b border-white/5">
        <img
          src={basemintIcon.url}
          alt=""
          aria-hidden="true"
          className="size-9 rounded-full object-cover ring-1 ring-white/10"
        />
        <div className="min-w-0">
          <p className="font-display font-bold text-[15px] leading-tight tracking-tight truncate">
            Resident Labs
          </p>
          <p className="text-[10px] uppercase tracking-widest text-accent/80 font-mono">
            Built on Base
          </p>
        </div>
      </Link>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {RESIDENT_NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeProps={{
              className:
                "bg-accent/15 text-white border-accent/40 shadow-[0_0_20px_-8px_hsl(var(--accent))]",
            }}
            inactiveProps={{
              className:
                "text-white/60 hover:text-white hover:bg-white/5 border-transparent",
            }}
            className="flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition"
          >
            <item.icon className="size-4 shrink-0" strokeWidth={2.2} />
            <span className="truncate">{item.label}</span>
            {item.hint ? (
              <span className="ml-auto text-[10px] uppercase tracking-widest text-white/30 font-mono truncate">
                {item.hint}
              </span>
            ) : null}
          </Link>
        ))}
      </nav>

      <div className="px-5 py-4 border-t border-white/5">
        <p className="text-[10px] uppercase tracking-widest text-white/30 font-mono">
          Powered by BaseMint · SpinBase
        </p>
      </div>
    </aside>
  );
}

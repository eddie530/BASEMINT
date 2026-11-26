import { Link } from "@tanstack/react-router";
import basemintIcon from "@/assets/basemint-icon.png.asset.json";
import { Button } from "@/components/ui/button";
import { Crown } from "lucide-react";
import { RESIDENT_NAV } from "@/lib/nav";

/**
 * Desktop-only left sidebar for the Resident Labs shell. On mobile the
 * nav lives in `AppHeader` + `BottomNav`.
 */
export function ResidentSidebar() {
  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-border bg-background/90 backdrop-blur-xl sticky top-0 h-screen">
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

      <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-1">
        {RESIDENT_NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeProps={{
              className: "bg-accent/15 text-foreground border-accent/40",
            }}
            inactiveProps={{
              className:
                "text-muted-foreground hover:text-foreground hover:bg-muted border-transparent",
            }}
            className="flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition"
          >
            <item.icon className="size-4 shrink-0" strokeWidth={2.2} />
            <span className="min-w-0 flex-1">
              <span className="block leading-snug">{item.label}</span>
              {item.hint && (
                <span className="block text-[10px] text-muted-foreground leading-normal mt-0.5">
                  {item.hint}
                </span>
              )}
            </span>
          </Link>
        ))}
      </nav>

      <div className="px-5 py-4 border-t border-border">
        <Button asChild className="w-full mb-3 bg-accent text-accent-foreground hover:bg-accent/90">
          <Link to="/pro">
            <Crown /> Resident Pro
          </Link>
        </Button>
        <p className="text-[10px] uppercase tracking-widest text-white/30 font-mono">
          Powered by BaseMint · SpinBase
        </p>
      </div>
    </aside>
  );
}

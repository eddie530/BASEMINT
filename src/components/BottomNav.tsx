import { Link, useRouterState } from "@tanstack/react-router";
import { MoreHorizontal, Rocket } from "lucide-react";
import { useState } from "react";
import { MOBILE_PRIMARY, MOBILE_SECONDARY } from "@/lib/nav";

export function BottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (p: string) =>
    p === "/home" ? path === "/home" || path === "/" : path === p || path.startsWith(p + "/");

  return (
    <>
      <nav
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-black/90 backdrop-blur-xl border-t border-white/10 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-end justify-between z-40 md:hidden"
        aria-label="Primary"
      >
        {MOBILE_PRIMARY.map((item, i) => {
          const active = isActive(item.to);
          const isCenter = item.to === "/launch";
          if (isCenter) {
            return (
              <Link
                key={item.to}
                to={item.to}
                className="flex flex-col items-center gap-1"
                aria-label={item.label}
              >
                <span className="size-12 bg-gradient-to-br from-accent to-primary rounded-full grid place-items-center -mt-7 border-4 border-black shadow-xl shadow-accent/30 ring-1 ring-white/10">
                  <Rocket className="size-5 text-black" strokeWidth={2.5} />
                </span>
                <span
                  className={`text-[10px] font-bold uppercase tracking-tighter ${active ? "text-accent" : "text-white/50"}`}
                >
                  {item.label}
                </span>
              </Link>
            );
          }
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center gap-1 transition-opacity ${active ? "opacity-100" : "opacity-40"}`}
              aria-current={active ? "page" : undefined}
            >
              <item.icon
                className={`size-5 ${active ? "text-accent" : ""}`}
                strokeWidth={2.4}
              />
              <span
                className={`text-[10px] font-bold uppercase tracking-tighter ${active ? "text-accent" : ""}`}
              >
                {item.label}
              </span>
              {i === -1 ? null : null}
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className="flex flex-col items-center gap-1 opacity-40 hover:opacity-100"
          aria-label="More"
        >
          <MoreHorizontal className="size-5" strokeWidth={2.4} />
          <span className="text-[10px] font-bold uppercase tracking-tighter">More</span>
        </button>
      </nav>

      {moreOpen ? (
        <div
          className="fixed inset-0 z-50 bg-black/70 md:hidden"
          role="dialog"
          aria-modal="true"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] rounded-t-3xl border-t border-white/10 bg-[#0a0a0a] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-white/20" />
            <p className="text-[10px] uppercase tracking-widest text-white/40 font-mono mb-3">
              More
            </p>
            <div className="space-y-2">
              {MOBILE_SECONDARY.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 hover:bg-white/10"
                >
                  <item.icon className="size-5 text-accent" strokeWidth={2.2} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{item.label}</p>
                    {item.hint ? (
                      <p className="text-[10px] uppercase tracking-widest text-white/40 font-mono">
                        {item.hint}
                      </p>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
            <button
              onClick={() => setMoreOpen(false)}
              className="mt-4 w-full rounded-lg border border-white/10 px-3 py-2 text-xs uppercase tracking-widest text-white/60 hover:bg-white/5"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

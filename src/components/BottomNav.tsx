import { Link, useRouterState } from "@tanstack/react-router";
import { Compass, Plus, Wallet } from "lucide-react";

export function BottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });

  const isActive = (p: string) => (p === "/" ? path === "/" : path.startsWith(p));

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-black/90 backdrop-blur-xl border-t border-white/10 px-8 py-3 flex justify-between items-end z-40">
      <Link
        to="/"
        className={`flex flex-col items-center gap-1 transition-opacity ${isActive("/") && !isActive("/create") && !isActive("/vault") ? "opacity-100" : "opacity-40"}`}
      >
        <Compass className="size-5 text-accent" strokeWidth={2.4} />
        <span className="text-[10px] font-bold uppercase tracking-tighter text-accent">Feed</span>
      </Link>

      <Link
        to="/create"
        className="flex flex-col items-center gap-1"
        aria-label="Create"
      >
        <span className="size-12 bg-white rounded-full grid place-items-center -mt-7 border-4 border-black shadow-xl shadow-primary/30 ring-1 ring-white/10">
          <Plus className="size-6 text-black" strokeWidth={2.5} />
        </span>
        <span className={`text-[10px] font-bold uppercase tracking-tighter ${isActive("/create") ? "text-accent" : "text-white/50"}`}>
          Create
        </span>
      </Link>

      <Link
        to="/vault"
        className={`flex flex-col items-center gap-1 transition-opacity ${isActive("/vault") ? "opacity-100" : "opacity-40"}`}
      >
        <Wallet className="size-5" strokeWidth={2.4} />
        <span className="text-[10px] font-bold uppercase tracking-tighter">Vault</span>
      </Link>
    </nav>
  );
}

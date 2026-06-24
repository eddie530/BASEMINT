import type { ReactNode } from "react";
import { AppHeader } from "./AppHeader";
import { BottomNav } from "./BottomNav";
import { RESIDENT_LABS } from "@/lib/curated";

export function MiniAppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full flex justify-center">
      <div className="w-full max-w-[430px] min-h-screen relative pb-28">
        <AppHeader />
        <main className="p-4 space-y-6">{children}</main>
        {/* Resident Labs micro-credit — keeps the brand attribution everywhere
            without taking screen real estate. */}
        <p className="text-center text-[9px] text-white/30 font-mono uppercase tracking-widest pb-4">
          Built by {RESIDENT_LABS.name} · {RESIDENT_LABS.agentIdLabel}
        </p>
        <BottomNav />
      </div>
    </div>
  );
}

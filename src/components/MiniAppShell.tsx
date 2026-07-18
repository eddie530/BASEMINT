import type { ReactNode } from "react";
import { AppHeader } from "./AppHeader";
import { BottomNav } from "./BottomNav";
import { ResidentSidebar } from "./ResidentSidebar";
import { RESIDENT_LABS } from "@/lib/curated";

/**
 * Responsive Resident Labs shell.
 * - Mobile (<md): phone-frame layout (max-w-[430px]) with top header + bottom nav.
 * - Desktop (md+): left sidebar + wider content column, no bottom nav.
 * The mobile chrome is preserved so Farcaster / Base mini-app viewports
 * render exactly as before.
 */
export function MiniAppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full md:flex">
      <ResidentSidebar />

      <div className="flex-1 min-w-0 flex justify-center">
        <div className="w-full max-w-[430px] md:max-w-3xl min-h-screen relative pb-28 md:pb-10">
          <div className="md:hidden">
            <AppHeader />
          </div>
          <main className="p-4 md:p-8 space-y-6">{children}</main>
          <p className="text-center text-[9px] text-white/30 font-mono uppercase tracking-widest pb-4">
            Built by {RESIDENT_LABS.name} · {RESIDENT_LABS.agentIdLabel}
          </p>
          <div className="md:hidden">
            <BottomNav />
          </div>
        </div>
      </div>
    </div>
  );
}

import type { ReactNode } from "react";
import { AppHeader } from "./AppHeader";
import { BottomNav } from "./BottomNav";

export function MiniAppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full flex justify-center">
      <div className="w-full max-w-[430px] min-h-screen relative pb-28">
        <AppHeader />
        <main className="p-4 space-y-6">{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}

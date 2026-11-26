import { createFileRoute } from "@tanstack/react-router";
import { MiniAppShell } from "@/components/MiniAppShell";
import { ResidentProPanel } from "@/components/ResidentProPanel";
import { residentHead } from "@/lib/resident-head";
export const Route = createFileRoute("/pro")({
  head: () =>
    residentHead(
      "Resident Pro · BaseMint",
      "Resident Pro membership: 4.99 USDC for 30 days. Simulated checkout only, no automatic renewal.",
    ),
  component: ProPage,
});
function ProPage() {
  return (
    <MiniAppShell>
      <header>
        <p className="font-mono text-xs text-accent uppercase">Resident Labs 3.0</p>
        <h1 className="font-display text-3xl font-bold mt-2">Your membership</h1>
      </header>
      <ResidentProPanel history />
    </MiniAppShell>
  );
}

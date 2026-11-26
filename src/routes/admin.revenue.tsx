import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MiniAppShell } from "@/components/MiniAppShell";
import { Button } from "@/components/ui/button";
import { getResidentRevenue } from "@/lib/resident-v3.functions";
import { useResidentPro } from "@/hooks/useResidentPro";
import { residentHead } from "@/lib/resident-head";
import { Loader2, ShieldCheck } from "lucide-react";
export const Route = createFileRoute("/admin/revenue")({
  head: () =>
    residentHead(
      "Revenue dashboard · Resident Labs",
      "Administrator-only membership, simulated revenue, AI usage and retention reporting.",
    ),
  component: RevenuePage,
});
function RevenuePage() {
  const { account, status } = useResidentPro();
  const fetchRevenue = useServerFn(getResidentRevenue);
  const revenue = useQuery({
    queryKey: ["resident-revenue", account?.id],
    queryFn: () => fetchRevenue(),
    enabled: status.data?.isAdmin === true,
  });
  const r = revenue.data;
  const percent = (value: number | null) => (value === null ? "No data" : `${value.toFixed(1)}%`);
  return (
    <MiniAppShell>
      <header>
        <p className="text-accent text-xs font-mono flex gap-2 items-center">
          <ShieldCheck className="size-4" /> ADMINISTRATOR
        </p>
        <h1 className="text-3xl font-display font-bold mt-3">Revenue & engagement</h1>
      </header>
      {!status.data?.isAdmin ? (
        <p className="text-muted-foreground">
          Administrator access required. Your account must have a verified administrator assignment.
        </p>
      ) : revenue.isPending ? (
        <Loader2 className="animate-spin" />
      ) : revenue.isError ? (
        <div>
          <p role="alert">Revenue could not be loaded.</p>
          <Button variant="outline" onClick={() => revenue.refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        r && (
          <>
            <section className="border-y border-border py-5">
              <p className="text-accent text-xs font-mono mb-4">SIMULATED · NO FUNDS RECEIVED</p>
              <div className="grid grid-cols-2 gap-6">
                <Metric title="Simulated revenue" value={`${r.simulatedRevenue.toFixed(2)} USDC`} />
                <Metric title="Active simulated members" value={String(r.simulatedMembers)} />
                <Metric title="Checkout conversion" value={percent(r.conversion)} />
                <Metric title="Repeat purchase rate" value={percent(r.retention)} />
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                {r.buyers} buyers / {r.checkoutUsers} users who opened checkout. Repeat rate: buyers
                with two or more completed simulated purchases.
              </p>
            </section>
            <section className="border-b border-border pb-5">
              <p className="text-xs font-mono mb-4">ACTUAL · VERIFIED BASE USDC RECEIPTS</p>
              <div className="grid grid-cols-2 gap-6">
                <Metric
                  title="Actual USDC received"
                  value={`${r.actualUsdcRevenue.toFixed(2)} USDC`}
                />
                <Metric title="Active actual members" value={String(r.actualMembers)} />
              </div>
              <p className="text-xs text-muted-foreground mt-4">{r.actualRevenueNote}</p>
            </section>
            <section>
              <h2 className="font-semibold mb-4">AI usage & retention</h2>
              <div className="grid grid-cols-2 gap-6">
                <Metric title="Requests today · UTC" value={String(r.aiToday)} />
                <Metric title="Completed · all time" value={String(r.aiCompleted)} />
                <Metric title="Failed · all time" value={String(r.aiFailed)} />
                <Metric title="Returning AI users" value={String(r.returningAiUsers)} />
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Returning AI users have requests on at least two different UTC days.
              </p>
            </section>
            <Button variant="outline" onClick={() => revenue.refetch()}>
              Refresh metrics
            </Button>
          </>
        )
      )}
    </MiniAppShell>
  );
}
function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="text-2xl font-mono mt-2 break-words">{value}</p>
    </div>
  );
}

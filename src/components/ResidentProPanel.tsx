import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Crown, Check, ArrowUpRight, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useResidentPro } from "@/hooks/useResidentPro";
import { simulationCheckout } from "@/lib/resident-v3.functions";
import { RESIDENT_PRO } from "@/lib/resident-pro";

export function ResidentProPanel({ history = false }: { history?: boolean }) {
  const { account, accountLoading, status, isPro } = useResidentPro();
  const checkout = useServerFn(simulationCheckout);
  const queryClient = useQueryClient();
  const [requestId, setRequestId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const simulationActive = status.data?.active?.environment === "resident_v3_simulation";

  async function purchase(confirm: boolean) {
    setBusy(true);
    setError(null);
    const id = requestId ?? crypto.randomUUID();
    setRequestId(id);
    try {
      await checkout({ data: { requestId: id, confirm, mode: "simulation" } });
      if (confirm) {
        setConfirmed(true);
        setRequestId(null);
      }
      await queryClient.invalidateQueries({ queryKey: ["resident-v3-status"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Purchase unavailable.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-5 border-y border-border py-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase text-accent flex items-center gap-2">
            <Crown className="size-4" /> Resident Pro
          </p>
          <h2 className="font-display text-3xl font-bold mt-3">More signal. Less noise.</h2>
          <p className="mt-2 text-muted-foreground text-sm">
            {RESIDENT_PRO.amountUsdc.toFixed(2)} USDC / {RESIDENT_PRO.days} days · No automatic
            renewal
          </p>
        </div>
        <span className="text-xs font-mono border border-accent/30 bg-accent/10 text-accent rounded-md px-3 py-2">
          SIMULATION ONLY
        </span>
      </div>
      <ul className="grid sm:grid-cols-2 gap-3 text-sm">
        {[
          "50 AI requests per UTC day",
          "Enhanced Token Radar analytics",
          "Membership dashboard & expiration",
          "No trading or transaction signing",
        ].map((perk) => (
          <li key={perk} className="flex gap-2">
            <Check className="size-4 shrink-0 text-accent" />
            {perk}
          </li>
        ))}
      </ul>
      <div className="flex items-start gap-2 text-sm text-muted-foreground">
        <ShieldCheck className="size-4 shrink-0 mt-0.5" />
        <p>
          No funds move. Simulated membership is distinct from existing paid memberships and game
          rewards.
        </p>
      </div>
      {status.isError && (
        <p role="alert" className="text-destructive text-sm">
          Membership could not be loaded. Try again.
        </p>
      )}
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      {confirmed && (
        <p role="status" className="text-accent text-sm">
          Simulated purchase confirmed. Your membership is stored securely.
        </p>
      )}
      {accountLoading || (account && status.isPending) ? (
        <Loader2 className="size-5 animate-spin" />
      ) : !account ? (
        <p className="text-sm text-muted-foreground">
          Your existing Resident account is required. Connecting a wallet alone does not create an
          account.
        </p>
      ) : isPro ? (
        <div className="space-y-2">
          <p className="text-accent font-semibold">
            {simulationActive ? "Simulated Pro active" : "Resident Pro active"}
          </p>
          <p className="text-sm">
            Expires{" "}
            {status.data?.active?.current_period_end
              ? new Date(status.data.active.current_period_end).toLocaleString()
              : "—"}
          </p>
          <p className="text-xs text-muted-foreground">
            Access ends automatically at expiration. Renew manually after expiry.
          </p>
        </div>
      ) : requestId ? (
        <div className="border border-border rounded-lg p-4 space-y-3">
          <p className="font-semibold">Confirm simulated purchase · 4.99 USDC</p>
          <p className="text-xs text-muted-foreground">
            30 days of simulated Pro access. No wallet approval, payment, or renewal.
          </p>
          <div className="flex gap-2">
            <Button
              disabled={busy}
              onClick={() => purchase(true)}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {busy && <Loader2 className="animate-spin" />}Confirm simulation
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setRequestId(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          disabled={busy || status.isError}
          onClick={() => purchase(false)}
          className="bg-accent text-accent-foreground hover:bg-accent/90"
        >
          <Crown />
          {busy ? "Preparing…" : "Upgrade · 4.99 USDC"}
        </Button>
      )}
      <div className="flex flex-wrap gap-4 text-xs">
        <Link to="/ai" className="text-accent inline-flex gap-1 items-center">
          AI Copilot <ArrowUpRight className="size-3" />
        </Link>
        <Link to="/radar" className="text-accent inline-flex gap-1 items-center">
          Token Radar <ArrowUpRight className="size-3" />
        </Link>
        {status.data?.isAdmin && (
          <Link to="/admin/revenue" className="text-accent">
            Revenue dashboard
          </Link>
        )}
      </div>
      {history && (
        <div className="pt-5 border-t border-border">
          <h3 className="font-semibold mb-3">Simulated purchase history</h3>
          {!status.data?.orders.length ? (
            <p className="text-sm text-muted-foreground">No simulated purchases yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {status.data.orders.map((order) => (
                <li key={order.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
                  <span>
                    {new Date(order.created_at).toLocaleDateString()} ·{" "}
                    {order.amount_usdc.toFixed(2)} USDC
                  </span>
                  <span
                    className={
                      order.status === "completed" ? "text-accent" : "text-muted-foreground"
                    }
                  >
                    {order.status === "completed" ? "Simulated · confirmed" : "Not completed"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

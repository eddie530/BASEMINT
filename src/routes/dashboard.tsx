import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { MiniAppShell } from "@/components/MiniAppShell";
import { getReferralStats, getSiteAnalytics } from "@/lib/profiles.functions";
import { useConnectWallet } from "@/lib/use-connect-wallet";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · Basemint" },
      { name: "description", content: "Your referral stats and site analytics on Basemint." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { address, isConnected } = useAccount();
  const { connectWallet, isPending, message } = useConnectWallet();

  const refStats = useQuery({
    queryKey: ["ref-stats", address?.toLowerCase()],
    queryFn: () => getReferralStats({ data: { address: address! } }),
    enabled: Boolean(address),
  });
  const siteStats = useQuery({
    queryKey: ["site-analytics"],
    queryFn: () => getSiteAnalytics(),
    staleTime: 60_000,
  });

  if (!isConnected) {
    return (
      <MiniAppShell>
        <div className="mt-12 text-center space-y-4">
          <h1 className="font-display font-bold text-2xl uppercase">Dashboard</h1>
          <p className="text-white/60 text-sm">Connect a wallet to see your referral stats.</p>
          <button
            onClick={connectWallet}
            disabled={isPending}
            className="bg-accent text-accent-foreground px-6 py-3 rounded-2xl font-bold uppercase tracking-widest text-sm disabled:opacity-60"
          >
            {isPending ? "Connecting…" : "Connect Wallet"}
          </button>
          {message && <p className="text-xs text-white/60 max-w-xs mx-auto">{message}</p>}
        </div>
      </MiniAppShell>
    );
  }

  const totals = refStats.data?.totals ?? { visit: 0, connect: 0, mint: 0, trade: 0 };
  const refUrl =
    typeof window !== "undefined" && refStats.data
      ? `${window.location.origin}/?ref=${refStats.data.code}`
      : "";

  return (
    <MiniAppShell>
      <h1 className="font-display font-bold text-2xl uppercase">Dashboard</h1>

      <section className="bg-card border border-white/5 rounded-3xl p-5 space-y-3">
        <h2 className="text-sm uppercase tracking-widest text-white/60 font-bold">Your referral</h2>
        <button
          onClick={() => {
            if (refUrl) void navigator.clipboard?.writeText(refUrl);
          }}
          className="w-full text-left text-[11px] font-mono text-accent bg-accent/10 hover:bg-accent/20 px-3 py-2 rounded-lg break-all"
        >
          {refUrl || "Generating…"}
        </button>
        <div className="grid grid-cols-4 gap-2 text-center">
          <Tile label="Visits" value={totals.visit} />
          <Tile label="Connects" value={totals.connect} />
          <Tile label="Mints" value={totals.mint} />
          <Tile label="Trades" value={totals.trade} />
        </div>
      </section>

      <section className="bg-card border border-white/5 rounded-3xl p-5">
        <h2 className="text-sm uppercase tracking-widest text-white/60 font-bold mb-3">Site analytics · 7d</h2>
        {siteStats.isLoading ? (
          <p className="text-white/40 text-xs font-mono">Loading…</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 text-center">
              <Tile label="Views" value={siteStats.data?.totals.views_7d ?? 0} />
              <Tile label="Visitors" value={siteStats.data?.totals.unique_visitors_7d ?? 0} />
            </div>
            <Sparkline data={(siteStats.data?.by_day ?? []).map((d) => d.views)} />
            <div className="mt-4 grid grid-cols-2 gap-4">
              <SmallList title="Top paths" rows={siteStats.data?.top_paths?.map((p) => [p.path, p.views]) ?? []} />
              <SmallList title="Top refs" rows={siteStats.data?.top_refs?.map((p) => [p.ref_code, p.views]) ?? []} />
            </div>
          </>
        )}
      </section>

      {address && (
        <Link
          to="/profile/$address"
          params={{ address }}
          className="block text-center text-xs uppercase tracking-widest text-accent"
        >
          View public profile →
        </Link>
      )}
    </MiniAppShell>
  );
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white/5 rounded-xl py-3 border border-white/5">
      <p className="text-[9px] uppercase tracking-widest text-white/40 font-mono">{label}</p>
      <p className="font-display font-bold text-lg mt-0.5">{value.toLocaleString()}</p>
    </div>
  );
}

function Sparkline({ data }: { data: number[] }) {
  if (data.length === 0) return null;
  const max = Math.max(...data, 1);
  return (
    <div className="mt-4 flex items-end gap-1 h-16">
      {data.map((v, i) => (
        <div
          key={i}
          className="flex-1 bg-accent/60 rounded-sm"
          style={{ height: `${Math.max(4, (v / max) * 100)}%` }}
          title={`${v} views`}
        />
      ))}
    </div>
  );
}

function SmallList({ title, rows }: { title: string; rows: Array<[string, number]> }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-white/40 font-mono mb-2">{title}</p>
      {rows.length === 0 ? (
        <p className="text-white/30 text-xs font-mono">—</p>
      ) : (
        <ul className="space-y-1 text-[11px]">
          {rows.slice(0, 5).map(([k, v]) => (
            <li key={k} className="flex justify-between gap-2">
              <span className="truncate text-white/70">{k}</span>
              <span className="font-mono text-white/50">{v}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

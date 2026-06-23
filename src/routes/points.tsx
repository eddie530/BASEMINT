import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { useConnectWallet } from "@/lib/use-connect-wallet";
import { Sparkles, Flame, Trophy, CheckCircle2 } from "lucide-react";
import { MiniAppShell } from "@/components/MiniAppShell";
import {
  claimDailyCheckin,
  getPointsSummary,
  getQuestsForWallet,
  getLeaderboard,
} from "@/lib/points.functions";

export const Route = createFileRoute("/points")({
  head: () => ({
    meta: [
      { title: "Points · Basemint" },
      { name: "description", content: "Earn Basemint Points for creating, collecting, referring, and showing up daily." },
    ],
  }),
  component: PointsPage,
});

function PointsPage() {
  const { address, isConnected } = useAccount();
  const { connectWallet, isPending, message } = useConnectWallet();
  const qc = useQueryClient();
  const wallet = address?.toLowerCase();

  const summary = useQuery({
    queryKey: ["points-summary", wallet],
    queryFn: () => getPointsSummary({ data: { address: address! } }),
    enabled: Boolean(address),
  });

  const quests = useQuery({
    queryKey: ["quests", wallet],
    queryFn: () => getQuestsForWallet({ data: { address } }),
  });

  const board = useQuery({
    queryKey: ["leaderboard"],
    queryFn: () => getLeaderboard(),
    staleTime: 60_000,
  });

  const checkin = useMutation({
    mutationFn: () => claimDailyCheckin({ data: { address: address! } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["points-summary", wallet] });
      qc.invalidateQueries({ queryKey: ["quests", wallet] });
      qc.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  });

  if (!isConnected || !address) {
    return (
      <MiniAppShell>
        <div className="mt-12 text-center space-y-4">
          <Sparkles className="size-10 text-accent mx-auto" />
          <h1 className="font-display font-bold text-2xl uppercase">Basemint Points</h1>
          <p className="text-white/60 text-sm px-6">
            Earn points for launching, collecting, referring, and checking in daily. Connect your wallet to start.
          </p>
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

  const s = summary.data;

  return (
    <MiniAppShell>
      <div className="flex items-center justify-between">
        <h1 className="font-display font-bold text-2xl uppercase tracking-tight">Points</h1>
        <Link
          to="/leaderboard"
          className="text-[11px] font-bold uppercase tracking-widest text-accent flex items-center gap-1"
        >
          <Trophy className="size-3.5" />
          Leaderboard
        </Link>
      </div>

      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-accent/20 via-black to-black p-5">
        <div className="text-[11px] font-bold uppercase tracking-widest text-white/50">Your balance</div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-display font-bold text-5xl text-accent">{s?.balance ?? 0}</span>
          <span className="text-xs font-mono text-white/60">pts</span>
        </div>
        <div className="text-[11px] text-white/40 mt-1">Lifetime: {s?.lifetime ?? 0}</div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center gap-3">
        <div className="size-10 rounded-full bg-orange-500/20 grid place-items-center">
          <Flame className="size-5 text-orange-400" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-bold">Daily check-in</div>
          <div className="text-[11px] text-white/50">
            Streak: {s?.daily.streak ?? 0} day{(s?.daily.streak ?? 0) === 1 ? "" : "s"} · Next: +{s?.daily.next_reward ?? 10}
          </div>
        </div>
        <button
          disabled={s?.daily.claimed_today || checkin.isPending}
          onClick={() => checkin.mutate()}
          className="px-4 py-2 rounded-full bg-accent text-accent-foreground text-[11px] font-bold uppercase tracking-widest disabled:opacity-40"
        >
          {s?.daily.claimed_today ? "Claimed" : checkin.isPending ? "…" : "Claim"}
        </button>
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-widest text-white/50 px-1">Quests</h2>
        <div className="space-y-2">
          {(quests.data ?? []).map((q) => {
            const pct = Math.min(100, Math.round((q.progress / q.goal_count) * 100));
            return (
              <div key={q.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{q.title}</span>
                      {q.completed ? <CheckCircle2 className="size-4 text-green-400" /> : null}
                    </div>
                    <p className="text-[11px] text-white/60 mt-0.5">{q.description}</p>
                  </div>
                  <div className="text-[11px] font-mono text-accent">+{q.points_reward}</div>
                </div>
                <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-1 text-[10px] text-white/40 font-mono">
                  {q.progress}/{q.goal_count}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-widest text-white/50 px-1">Recent activity</h2>
        <div className="rounded-2xl border border-white/10 bg-white/5 divide-y divide-white/5">
          {(s?.recent ?? []).slice(0, 8).map((e) => (
            <div key={e.id} className="px-4 py-2.5 flex items-center justify-between text-xs">
              <div>
                <div className="font-medium capitalize">{e.kind.replace(/_/g, " ")}</div>
                <div className="text-[10px] text-white/40 font-mono">
                  {new Date(e.created_at).toLocaleString()}
                </div>
              </div>
              <div className={`font-mono ${e.points >= 0 ? "text-green-400" : "text-red-400"}`}>
                {e.points >= 0 ? "+" : ""}
                {e.points}
              </div>
            </div>
          ))}
          {(s?.recent ?? []).length === 0 ? (
            <div className="px-4 py-6 text-[11px] text-white/40 text-center">
              No activity yet. Claim your check-in or launch a coin to start earning.
            </div>
          ) : null}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-widest text-white/50 px-1">Top earners</h2>
        <div className="rounded-2xl border border-white/10 bg-white/5 divide-y divide-white/5">
          {(board.data ?? []).slice(0, 5).map((r, i) => (
            <Link
              to="/profile/$address"
              params={{ address: r.wallet_address }}
              key={r.wallet_address}
              className="px-4 py-2.5 flex items-center justify-between text-xs hover:bg-white/5"
            >
              <div className="flex items-center gap-3">
                <span className="text-white/40 font-mono w-5">{i + 1}</span>
                <span className="font-medium truncate max-w-[160px]">
                  {r.display_name || `${r.wallet_address.slice(0, 6)}…${r.wallet_address.slice(-4)}`}
                </span>
              </div>
              <span className="font-mono text-accent">{r.total}</span>
            </Link>
          ))}
        </div>
        <Link
          to="/leaderboard"
          className="block text-center text-[11px] font-bold uppercase tracking-widest text-white/60 py-2"
        >
          See full leaderboard →
        </Link>
      </section>
    </MiniAppShell>
  );
}

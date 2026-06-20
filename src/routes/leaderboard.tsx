import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react";
import { MiniAppShell } from "@/components/MiniAppShell";
import { getLeaderboard } from "@/lib/points.functions";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard · Basemint" },
      { name: "description", content: "Top earners on Basemint by points." },
    ],
  }),
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const board = useQuery({
    queryKey: ["leaderboard"],
    queryFn: () => getLeaderboard(),
    staleTime: 60_000,
  });

  return (
    <MiniAppShell>
      <div className="flex items-center gap-2">
        <Trophy className="size-5 text-accent" />
        <h1 className="font-display font-bold text-2xl uppercase tracking-tight">Leaderboard</h1>
      </div>
      <p className="text-[11px] text-white/50">Top 50 earners by current points balance.</p>

      <div className="rounded-2xl border border-white/10 bg-white/5 divide-y divide-white/5">
        {(board.data ?? []).map((r, i) => (
          <Link
            to="/profile/$address"
            params={{ address: r.wallet_address }}
            key={r.wallet_address}
            className="px-4 py-3 flex items-center justify-between hover:bg-white/5"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span
                className={`font-mono w-6 text-sm ${
                  i === 0
                    ? "text-yellow-400"
                    : i === 1
                    ? "text-zinc-300"
                    : i === 2
                    ? "text-amber-600"
                    : "text-white/40"
                }`}
              >
                {i + 1}
              </span>
              <div className="min-w-0">
                <div className="text-sm font-bold truncate">
                  {r.display_name || `${r.wallet_address.slice(0, 6)}…${r.wallet_address.slice(-4)}`}
                </div>
                <div className="text-[10px] text-white/40 font-mono truncate">{r.wallet_address}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-accent font-bold">{r.total}</div>
              <div className="text-[10px] text-white/40 font-mono">lifetime {r.lifetime}</div>
            </div>
          </Link>
        ))}
        {(board.data ?? []).length === 0 ? (
          <div className="px-4 py-8 text-[11px] text-white/40 text-center">
            No points awarded yet. Be the first — check in on the points page.
          </div>
        ) : null}
      </div>
    </MiniAppShell>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Flame, Coins, Zap, Info } from "lucide-react";
import { MiniAppShell } from "@/components/MiniAppShell";
import { SpinWheel } from "@/components/spin/SpinWheel";
import { WinModal } from "@/components/spin/WinModal";
import type { SpinResult } from "@/lib/spin/segments";
import {
  claimDailyCheckin,
  getPointsSummary,
  recordPointEvent,
} from "@/lib/points.functions";
import { useConnectWallet } from "@/lib/use-connect-wallet";
import { writeLastAction } from "@/lib/last-action";

export const Route = createFileRoute("/play")({
  head: () => ({
    meta: [
      { title: "Play — SpinBase · Resident Labs" },
      {
        name: "description",
        content:
          "SpinBase — spin the wheel, earn Resident Points, and unlock rewards on Base. Entertainment only.",
      },
      { property: "og:title", content: "Play — SpinBase" },
      {
        property: "og:description",
        content: "Spin, earn points, and unlock rewards on Base.",
      },
    ],
  }),
  component: PlayPage,
});

// ---------------- Local SPIN currency (in-game, localStorage) ----------------
const LS_KEY = "spinbase:v2";

interface LocalState {
  balance: number;
  spinsLeft: number;
  pendingMultiplier: number;
  lastSpinAt: number | null;
}

const DEFAULT_STATE: LocalState = {
  balance: 0,
  spinsLeft: 5,
  pendingMultiplier: 1,
  lastSpinAt: null,
};

const DAILY_REFILL = 5;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function loadState(): LocalState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as LocalState;
    // Refill spins if a UTC day has elapsed since last spin.
    if (parsed.lastSpinAt && Date.now() - parsed.lastSpinAt > MS_PER_DAY) {
      parsed.spinsLeft = Math.max(parsed.spinsLeft, DAILY_REFILL);
    }
    return { ...DEFAULT_STATE, ...parsed };
  } catch {
    return DEFAULT_STATE;
  }
}

function saveState(s: LocalState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LS_KEY, JSON.stringify(s));
}

// ---------------- Page ----------------
function PlayPage() {
  const { address, isConnected } = useAccount();
  const { connectWallet } = useConnectWallet();
  const qc = useQueryClient();

  const [state, setState] = useState<LocalState>(DEFAULT_STATE);
  const [ready, setReady] = useState(false);
  const [result, setResult] = useState<SpinResult | null>(null);

  useEffect(() => {
    setState(loadState());
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) saveState(state);
  }, [state, ready]);

  const claimFn = useServerFn(claimDailyCheckin);
  const recordFn = useServerFn(recordPointEvent);

  const pointsQ = useQuery({
    queryKey: ["points-summary", address],
    queryFn: () => getPointsSummary({ data: { address: address! } }),
    enabled: !!address,
    staleTime: 30_000,
  });

  const claimedToday = pointsQ.data?.daily.claimed_today ?? false;
  const streak = pointsQ.data?.daily.streak ?? 0;
  const nextCheckinReward = pointsQ.data?.daily.next_reward ?? 10;
  const residentPoints = pointsQ.data?.balance ?? 0;

  const handleResult = useCallback(
    async (r: SpinResult) => {
      setResult(r);
      setState((s) => ({
        balance: s.balance + r.reward,
        spinsLeft: Math.max(0, s.spinsLeft - 1),
        pendingMultiplier: r.isMultiplier ? (r.multiplierActivated ?? 1) : 1,
        lastSpinAt: Date.now(),
      }));

      // Award real Resident Points on any positive win (server-side, idempotent).
      if (r.reward > 0 && address) {
        try {
          await recordFn({
            data: {
              address,
              kind: "spin_win",
              ref_key: `spin:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
              metadata: {
                segment: r.segment.label,
                reward_spin: r.reward,
                jackpot: r.isJackpot,
                mystery: r.isMystery,
              },
            },
          });
          qc.invalidateQueries({ queryKey: ["points-summary", address] });
        } catch {
          // best-effort — the local SPIN win still counts.
        }
        writeLastAction({ kind: "spin_win", reward: r.reward, label: r.segment.label });
      }
    },
    [address, recordFn, qc],
  );

  async function handleClaim() {
    if (!address) {
      connectWallet();
      return;
    }
    try {
      const res = await claimFn({ data: { address } });
      if (res.claimed) {
        setState((s) => ({ ...s, spinsLeft: Math.max(s.spinsLeft, DAILY_REFILL) }));
        qc.invalidateQueries({ queryKey: ["points-summary", address] });
      }
    } catch {
      // no-op
    }
  }

  const canSpin = state.spinsLeft > 0;

  return (
    <MiniAppShell>
      <header className="space-y-1">
        <p className="text-[10px] uppercase tracking-widest text-accent font-mono">
          SpinBase · Native
        </p>
        <h1 className="font-display font-bold text-3xl tracking-tight">Play</h1>
        <p className="text-white/60 text-sm">
          Spin to earn SPIN in-game currency. Every win also awards real Resident Points
          on Base.
        </p>
      </header>

      {/* Stat strip */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          icon={<Coins className="size-4 text-amber-300" />}
          label="SPIN"
          value={state.balance.toLocaleString()}
        />
        <StatCard
          icon={<Zap className="size-4 text-fuchsia-300" />}
          label="Spins left"
          value={String(state.spinsLeft)}
        />
        <StatCard
          icon={<Flame className="size-4 text-orange-400" />}
          label="Streak"
          value={`${streak}`}
        />
      </div>

      {/* Wheel */}
      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-fuchsia-500/10 via-black/40 to-amber-500/10 p-5">
        <SpinWheel
          disabled={!canSpin}
          pendingMultiplier={state.pendingMultiplier}
          onResult={handleResult}
        />
        {!canSpin && (
          <p className="mt-4 text-center text-xs text-white/60">
            Out of spins. Claim your daily bonus to refill.
          </p>
        )}
      </section>

      {/* Daily bonus + Resident Points */}
      <section className="grid grid-cols-1 gap-3">
        <div className="rounded-2xl border border-white/10 bg-black/40 p-4 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-white/50 font-mono">
              Daily bonus
            </p>
            <p className="font-bold text-sm">
              {claimedToday
                ? `Claimed. Streak ${streak} 🔥`
                : `+${nextCheckinReward} Resident Points + refill spins`}
            </p>
          </div>
          <button
            onClick={handleClaim}
            disabled={claimedToday}
            className="rounded-full bg-white text-black px-4 py-2 text-[11px] font-bold uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isConnected ? (claimedToday ? "Claimed" : "Claim") : "Connect"}
          </button>
        </div>

        <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-accent font-mono">
              Resident Points
            </p>
            <p className="font-display font-black text-2xl">
              {residentPoints.toLocaleString()}
            </p>
          </div>
          <span className="text-[10px] text-white/40 font-mono uppercase tracking-widest text-right">
            +5 per<br />wheel win
          </span>
        </div>
      </section>

      <p className="flex gap-2 items-start text-[11px] text-white/40 leading-relaxed">
        <Info className="size-3.5 mt-0.5 shrink-0" />
        SpinBase is an engagement experience inside Resident Labs. SPIN is in-game only
        and has no monetary value. Resident Points are non-transferable and not a
        security.
      </p>

      <WinModal result={result} onClose={() => setResult(null)} />
    </MiniAppShell>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-3">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <p className="text-[9px] uppercase tracking-widest text-white/50 font-mono">
          {label}
        </p>
      </div>
      <p className="font-display font-black text-lg leading-tight">{value}</p>
    </div>
  );
}

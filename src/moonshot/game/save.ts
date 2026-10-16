import { SAVE_VERSION, type Runtime, type Save } from "@/moonshot/game/types";

const KEY = "moonshot-save-v1";

function isSave(value: unknown): value is Save {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<Save>;
  return (v.version === 1 || v.version === SAVE_VERSION) && typeof v.balance === "number" && Array.isArray(v.history);
}

export function loadSave(): Save | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isSave(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function applySave(rt: Runtime, save: Save): void {
  rt.balance = Math.max(0, Math.round(save.balance));
  rt.stake = save.stake >= 10 ? save.stake : 25;
  rt.auto = save.auto;
  rt.muted = !!save.muted;
  rt.shake = save.shake !== false;
  rt.peak = save.peak || rt.balance;
  rt.bestCash = save.bestCash || 0;
  rt.biggestWin = save.biggestWin || 0;
  rt.rounds = save.rounds || 0;
  rt.wins = save.wins || 0;
  rt.streak = save.streak || 0;
  rt.bestStreak = save.bestStreak || 0;
  rt.history = save.history.filter((n) => typeof n === "number").slice(0, 16);
  rt.refills = save.refills || 0;
  rt.points = typeof save.points === "number" && save.points > 0 ? Math.floor(save.points) : 0;
  rt.lastDrop = 0;
  rt.phase = "idle";
  rt.result = null;
  rt.mult = 1;
}

export function persist(rt: Runtime): void {
  if (typeof window === "undefined") return;
  const save: Save = {
    version: SAVE_VERSION,
    balance: rt.balance,
    stake: rt.stake,
    auto: rt.auto,
    muted: rt.muted,
    shake: rt.shake,
    peak: rt.peak,
    bestCash: rt.bestCash,
    biggestWin: rt.biggestWin,
    rounds: rt.rounds,
    wins: rt.wins,
    streak: rt.streak,
    bestStreak: rt.bestStreak,
    history: rt.history.slice(0, 16),
    refills: rt.refills,
    points: rt.points,
  };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    /* private mode / quota — the round still played */
  }
}

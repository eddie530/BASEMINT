import {
  GROWTH,
  HISTORY_CAP,
  HOUSE_EDGE,
  MIN_STAKE,
  START_BALANCE,
  type Particle,
  type Runtime,
  type Star,
} from "@/moonshot/game/types";
import { dropPoints } from "@/moonshot/game/points";

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeParticles(): Particle[] {
  return Array.from({ length: 180 }, () => ({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    life: 0,
    max: 1,
    size: 2,
    kind: 0 as const,
    on: false,
  }));
}

function makeStars(): Star[] {
  const rnd = mulberry32(0x51ac);
  return Array.from({ length: 48 }, () => ({
    x: rnd(),
    y: rnd(),
    a: 0.15 + rnd() * 0.55,
    r: rnd() > 0.85 ? 1.4 : 0.8,
  }));
}

export function createRuntime(): Runtime {
  return {
    phase: "idle",
    result: null,
    balance: START_BALANCE,
    stake: 25,
    auto: null,
    crashAt: 1,
    elapsed: 0,
    mult: 1,
    cashedAt: 0,
    payout: 0,
    wager: 0,
    arm: 0,
    impact: 0,
    trauma: 0,
    flash: 0,
    viewM: 2.4,
    viewT: 4.5,
    t: 0,
    muted: false,
    shake: true,
    reduced: false,
    peak: START_BALANCE,
    bestCash: 0,
    biggestWin: 0,
    rounds: 0,
    wins: 0,
    streak: 0,
    bestStreak: 0,
    history: [],
    refills: 0,
    points: 0,
    lastDrop: 0,
    pending: null,
    fx: 0,
    floaterText: "",
    lastExhaust: 0,
    tickBucket: 10,
    lastTick: 0,
    particles: makeParticles(),
    floaters: Array.from({ length: 8 }, () => ({
      text: "",
      x: 0,
      y: 0,
      life: 0,
      max: 1,
      on: false,
      kind: 0 as const,
    })),
    stars: makeStars(),
  };
}

export function crashFromUnit(r: number): number {
  if (r < HOUSE_EDGE) return 1;
  const point = (1 - HOUSE_EDGE) / (1 - r);
  const floored = Math.floor(point * 100) / 100;
  if (floored < 1) return 1;
  if (floored > 1000) return 1000;
  return floored;
}

export function rollCrash(): number {
  try {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return crashFromUnit(buf[0]! / 2 ** 32);
  } catch {
    return crashFromUnit(Math.random());
  }
}

export function formatMult(m: number): string {
  const shown = Math.floor(m * 100 + 1e-4) / 100;
  return `${shown.toFixed(2)}×`;
}

export function formatStack(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export function stampFor(rt: Runtime): string {
  if (rt.result === "rug") return rt.crashAt <= 1.01 ? "INSTANT RUG" : "RUGGED";
  if (rt.result === "cash") return rt.cashedAt >= 10 ? "MOONED" : "BANKED";
  return "";
}

function pushHistory(rt: Runtime) {
  rt.history.unshift(rt.crashAt);
  if (rt.history.length > HISTORY_CAP) rt.history.length = HISTORY_CAP;
}

export function stepParticles(rt: Runtime, dt: number) {
  for (const p of rt.particles) {
    if (!p.on) continue;
    p.life -= dt;
    if (p.life <= 0) {
      p.on = false;
      continue;
    }
    p.vy += (p.kind === 1 ? 320 : 20) * dt;
    p.vx *= Math.exp(-1.4 * dt);
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  for (const f of rt.floaters) {
    if (!f.on) continue;
    f.life -= dt;
    if (f.life <= 0) f.on = false;
    else f.y -= 26 * dt;
  }
}

export function launch(rt: Runtime): boolean {
  if (rt.phase !== "idle" && rt.phase !== "result") return false;
  if (rt.balance < MIN_STAKE) return false;
  const stake = Math.min(rt.stake, rt.balance);
  if (stake < MIN_STAKE) return false;
  rt.wager = stake;
  rt.balance -= stake;
  rt.crashAt = rollCrash();
  rt.elapsed = 0;
  rt.mult = 1;
  rt.cashedAt = 0;
  rt.payout = 0;
  rt.result = null;
  rt.arm = rt.reduced ? 0.04 : 0.16;
  rt.phase = "arming";
  rt.tickBucket = 10;
  rt.pending = null;
  rt.fx = 0;
  rt.viewM = 2.4;
  rt.viewT = 4.5;
  rt.trauma = 0;
  rt.flash = 0;
  for (const p of rt.particles) p.on = false;
  for (const f of rt.floaters) f.on = false;
  return true;
}

export function cash(rt: Runtime, at: number): void {
  if (rt.phase !== "flying") return;
  const mult = Math.floor(at * 100 + 1e-4) / 100;
  if (!(mult >= 1) || mult >= rt.crashAt) {
    rug(rt);
    return;
  }
  const payout = Math.round(rt.wager * mult);
  rt.mult = mult;
  rt.elapsed = mult <= 1 ? 0 : Math.log(mult) / GROWTH;
  rt.cashedAt = mult;
  rt.payout = payout;
  rt.balance += payout;
  rt.peak = Math.max(rt.peak, rt.balance);
  rt.bestCash = Math.max(rt.bestCash, mult);
  rt.biggestWin = Math.max(rt.biggestWin, payout);
  rt.wins += 1;
  rt.streak += 1;
  rt.bestStreak = Math.max(rt.bestStreak, rt.streak);
  rt.rounds += 1;
  rt.lastDrop = dropPoints(mult, rt.streak);
  rt.points += rt.lastDrop;
  pushHistory(rt);
  rt.result = "cash";
  rt.phase = "impact";
  rt.impact = rt.reduced ? 0.02 : 0.06;
  rt.trauma = Math.min(1, rt.trauma + (mult >= 5 ? 0.45 : 0.28));
  rt.flash = rt.reduced ? 0.12 : 0.35;
  rt.pending = "cash";
  rt.fx = 1;
  rt.floaterText = `+${formatStack(payout)}`;
}

export function rug(rt: Runtime): void {
  if (rt.phase !== "flying" && rt.phase !== "arming") return;
  rt.mult = rt.crashAt;
  rt.elapsed = rt.crashAt <= 1 ? 0 : Math.log(rt.crashAt) / GROWTH;
  rt.cashedAt = 0;
  rt.payout = 0;
  rt.result = "rug";
  rt.streak = 0;
  rt.rounds += 1;
  rt.lastDrop = 0;
  pushHistory(rt);
  rt.phase = "impact";
  rt.impact = rt.reduced ? 0.04 : 0.1;
  rt.trauma = Math.min(1, rt.trauma + (rt.crashAt <= 1.01 ? 0.9 : 0.62));
  rt.flash = rt.reduced ? 0.15 : 0.72;
  rt.pending = "rug";
  rt.fx = 2;
  rt.floaterText = rt.crashAt <= 1.01 ? "INSTANT" : "RUGGED";
}

export function restack(rt: Runtime): void {
  if (rt.balance >= MIN_STAKE) return;
  if (rt.phase !== "idle" && rt.phase !== "result") return;
  rt.balance = START_BALANCE;
  rt.stake = Math.min(rt.stake, START_BALANCE);
  rt.refills += 1;
  rt.phase = "idle";
  rt.result = null;
}

export function step(rt: Runtime, dt: number): void {
  rt.t += dt;
  rt.trauma = Math.max(0, rt.trauma - 1.7 * dt);
  rt.flash = Math.max(0, rt.flash - 1.35 * dt);
  stepParticles(rt, dt);

  const headroom = Math.max(2.15, rt.mult * 1.38);
  const targetM =
    rt.auto != null && rt.mult > rt.auto * 0.62
      ? Math.max(headroom, rt.auto * 1.14)
      : headroom;
  const targetT = Math.max(4.2, rt.elapsed * 1.22 + 0.7);
  const km = targetM > rt.viewM ? 9 : 2.4;
  const kt = targetT > rt.viewT ? 6 : 2.2;
  rt.viewM += (targetM - rt.viewM) * (1 - Math.exp(-km * dt));
  rt.viewT += (targetT - rt.viewT) * (1 - Math.exp(-kt * dt));

  if (rt.phase === "arming") {
    rt.arm -= dt;
    if (rt.arm <= 0) rt.phase = "flying";
    return;
  }

  if (rt.phase === "impact") {
    rt.impact -= dt;
    if (rt.impact <= 0) rt.phase = "result";
    return;
  }

  if (rt.phase !== "flying") return;

  rt.elapsed += dt;
  const m = Math.exp(GROWTH * rt.elapsed);
  if (rt.auto != null && m >= rt.auto && rt.crashAt + 1e-9 >= rt.auto) {
    cash(rt, rt.auto);
    return;
  }
  if (m >= rt.crashAt) {
    rug(rt);
    return;
  }
  rt.mult = m;
}

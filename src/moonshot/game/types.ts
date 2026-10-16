export const GROWTH = 0.22;
export const HOUSE_EDGE = 0.03;
export const START_BALANCE = 1000;
export const MIN_STAKE = 10;
export const STAKES = [10, 25, 50, 100, 250] as const;
export const AUTOS = [1.5, 2, 3, 5, 10] as const;
export const HISTORY_CAP = 16;
export const SAVE_VERSION = 2;

export type Phase = "idle" | "arming" | "flying" | "impact" | "result";
export type RoundResult = "cash" | "rug" | null;

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  kind: 0 | 1;
  on: boolean;
};

export type Floater = {
  text: string;
  x: number;
  y: number;
  life: number;
  max: number;
  on: boolean;
  kind: 0 | 1;
};

export type Star = { x: number; y: number; a: number; r: number };

export type Runtime = {
  phase: Phase;
  result: RoundResult;
  balance: number;
  stake: number;
  auto: number | null;
  crashAt: number;
  elapsed: number;
  mult: number;
  cashedAt: number;
  payout: number;
  wager: number;
  arm: number;
  impact: number;
  trauma: number;
  flash: number;
  viewM: number;
  viewT: number;
  t: number;
  muted: boolean;
  shake: boolean;
  reduced: boolean;
  peak: number;
  bestCash: number;
  biggestWin: number;
  rounds: number;
  wins: number;
  streak: number;
  bestStreak: number;
  history: number[];
  refills: number;
  points: number;
  lastDrop: number;
  pending: "cash" | "rug" | null;
  fx: 0 | 1 | 2;
  floaterText: string;
  lastExhaust: number;
  tickBucket: number;
  lastTick: number;
  particles: Particle[];
  floaters: Floater[];
  stars: Star[];
};

export type Save = {
  version: number;
  balance: number;
  stake: number;
  auto: number | null;
  muted: boolean;
  shake: boolean;
  peak: number;
  bestCash: number;
  biggestWin: number;
  rounds: number;
  wins: number;
  streak: number;
  bestStreak: number;
  history: number[];
  refills: number;
  points: number;
};

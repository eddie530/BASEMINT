export const DAILY_ROUNDS = 10;
export const RANKED_STAKE = 100;
export const DAILY_STACK = 1000;
export const RATE = 0.22;
export const PACK = {
  id: "afterhours",
  name: "After Hours",
  price: "5",
  units: "5000000",
  recipient: "0xef1ff71edada68942b6ddfd5187888e84218297b",
  token: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  chainId: 8453,
} as const;
export type Look = "base" | "acid" | "ember" | "violet";
export const LOOKS: { id: Look; name: string; color: string; premium: boolean }[] = [
  { id: "base", name: "Base blue", color: "#4785ff", premium: false },
  { id: "acid", name: "Acid lime", color: "#d4fa59", premium: true },
  { id: "ember", name: "Solar flare", color: "#ff976b", premium: true },
  { id: "violet", name: "Ultraviolet", color: "#ba9cff", premium: true },
];
export type Pilot = {
  id: string;
  name: string;
  avatar: string | null;
  fid: number | null;
  wallet: string | null;
  equipped: Look;
  owned: boolean;
  completed: number;
  best: number;
};
export type RoundView = {
  id: string;
  day: string;
  number: number;
  startMs: number;
  serverNow: number;
  commitment: string;
  auto: number | null;
  status: "flying" | "cash" | "rug";
  multiplier: number | null;
  crash: number | null;
  seed: string | null;
  payout: number;
  balance: number;
  completed: number;
};
export type Daily = {
  day: string;
  used: number;
  completed: number;
  balance: number;
  active: RoundView | null;
};
export type BoardEntry = {
  id: string;
  name: string;
  avatar: string | null;
  score: number;
  days: number;
  rank: number;
  you: boolean;
};
export type Challenge = {
  id: string;
  name: string;
  avatar: string | null;
  multiplier: number;
  day: string;
  url: string;
};
export type Boot = {
  pilot: Pilot | null;
  daily: Daily;
  board: BoardEntry[];
  resetAt: number;
  checkoutEnabled: boolean;
  local: boolean;
  pendingOrder: { id: string; hash: string | null } | null;
};
export function utcDay(now = Date.now()) {
  return new Date(now).toISOString().slice(0, 10);
}
export function weekStart(now = Date.now()) {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
export function multiplierAt(start: number, now: number) {
  return Math.min(
    1000,
    Math.floor(Math.exp((RATE * Math.max(0, now - start)) / 1000) * 100 + 1e-8) / 100,
  );
}
export function crashFromRandom(r: number) {
  return Math.max(1, Math.min(1000, Math.floor((r < 0.03 ? 1 : 0.97 / (1 - r)) * 100) / 100));
}
export function resolveRound(
  start: number,
  crash: number,
  auto: number | null,
  now: number,
  cash = false,
): { status: "cash" | "rug"; mult: number; payout: number } | null {
  const elapsed = Math.max(0, now - start) / 1000;
  if (now < start) return null;
  if (auto !== null && auto < crash && elapsed >= Math.log(auto) / RATE)
    return { status: "cash", mult: auto, payout: Math.floor(RANKED_STAKE * auto) };
  if (elapsed >= Math.log(crash) / RATE) return { status: "rug", mult: crash, payout: 0 };
  if (cash) {
    const mult = multiplierAt(start, now);
    return { status: "cash", mult, payout: Math.floor(RANKED_STAKE * mult) };
  }
  return null;
}

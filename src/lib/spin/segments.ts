/**
 * SpinBase wheel segments — ported 1:1 from the original SpinBase static
 * app so gameplay feels identical. 10 uniform 36° slices.
 *
 * `value` is the in-game SPIN awarded (localStorage currency). Real
 * Resident Points are awarded server-side when `value > 0` via the
 * existing `recordPointEvent` server function (kind: "spin_win").
 */
export interface Segment {
  label: string;
  value: number;
  color: string;
  isMultiplier?: boolean;
  mult?: number;
  isJackpot?: boolean;
  isMystery?: boolean;
}

export const SEGMENTS: Segment[] = [
  { label: "50", value: 50, color: "#64748b" },
  { label: "150", value: 150, color: "#3b82f6" },
  { label: "2×", value: 0, color: "#a855f7", isMultiplier: true, mult: 2 },
  { label: "400", value: 400, color: "#6366f1" },
  { label: "750", value: 750, color: "#ec4899" },
  { label: "1,500", value: 1500, color: "#f43f5e" },
  { label: "3×", value: 0, color: "#eab308", isMultiplier: true, mult: 3 },
  { label: "2,500", value: 2500, color: "#22c55e" },
  { label: "10K", value: 10000, color: "#fbbf24", isJackpot: true },
  { label: "MYSTERY", value: 800, color: "#06b6d4", isMystery: true },
];

export const SEG_ANGLE = 360 / SEGMENTS.length;

export interface SpinResult {
  index: number;
  segment: Segment;
  reward: number;
  isJackpot: boolean;
  isMultiplier: boolean;
  isMystery: boolean;
  multiplierActivated?: number;
}

/**
 * Compute the outcome for a landed segment, applying any pending
 * multiplier and randomising mystery payouts.
 */
export function resolveSpin(index: number, pendingMultiplier: number): SpinResult {
  const seg = SEGMENTS[index];
  let reward = seg.value;
  if (seg.isMystery) reward = Math.floor(Math.random() * 1800) + 300;
  if (!seg.isMultiplier && pendingMultiplier > 1) {
    reward = Math.floor(reward * pendingMultiplier);
  }
  if (seg.isMultiplier) reward = 0;
  return {
    index,
    segment: seg,
    reward,
    isJackpot: !!seg.isJackpot,
    isMultiplier: !!seg.isMultiplier,
    isMystery: !!seg.isMystery,
    multiplierActivated: seg.isMultiplier ? seg.mult : undefined,
  };
}

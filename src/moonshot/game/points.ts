/** Hard cap so one lucky cash-out cannot flood the drop list. */
export const DROP_CAP = 400;

/**
 * Drop points for a successful cash-out. Rugs and restacks score nothing,
 * so refilling the play-money stack cannot farm the list.
 */
export function dropPoints(mult: number, streak: number): number {
  if (!(mult >= 1.01)) return 0;
  const base = Math.round(mult * 10);
  const bonus = Math.min(8, Math.max(0, Math.floor(streak))) * 2;
  return Math.min(DROP_CAP, Math.max(0, base + bonus));
}

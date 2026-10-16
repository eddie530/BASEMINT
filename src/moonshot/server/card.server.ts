import type { Challenge } from "../shared";

const escape = (s: string) =>
  s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!);

/** Social card as SVG (the source used a native PNG renderer that can't run on the edge). */
export function shareCardSvg(c: Challenge) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#080b13"/><path d="M70 520H1130M70 390H1130M70 260H1130M70 130H1130M300 90V550M600 90V550M900 90V550" stroke="#182536"/><path d="M80 520Q620 530 1120 110" fill="none" stroke="#4785ff" stroke-width="6"/><circle cx="1120" cy="110" r="12" fill="#4785ff"/><g font-family="IBM Plex Mono, monospace" fill="#f0f4ff"><text x="75" y="95" font-size="34">MOONSHOT / DAILY FLIGHT</text><text x="75" y="270" font-size="116">${c.multiplier.toFixed(2)}×</text><text x="80" y="340" font-size="26">BANKED BY ${escape(c.name.slice(0, 30))}</text><text x="80" y="390" font-size="23" fill="#9aa8bb">Can you beat this flight?</text><text x="80" y="580" font-size="20" fill="#9aa8bb">${escape(c.day)} · VERIFIED ROUND · PLAY MONEY</text></g></svg>`;
}

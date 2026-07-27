import signal001 from "@/assets/launch-signal-001.jpg";

/**
 * Resident Labs launch system.
 *
 * Adding a future creator coin = append one object to RESIDENT_LAUNCHES.
 * No UI changes required — the Launch Hub derives the hero, grid, progress
 * checklist, and social sharing from this config alone.
 * (Later this can be swapped for a database table with the same shape.)
 */

export const LAUNCH_COLLECTIONS = [
  "Genesis",
  "Signals",
  "Fragments",
  "Core",
  "Experiments",
] as const;

export type LaunchCollection = (typeof LAUNCH_COLLECTIONS)[number];

export const LAUNCH_STEPS = [
  { key: "artwork", label: "Artwork complete" },
  { key: "metadata", label: "Metadata ready" },
  { key: "mint", label: "Mint created" },
  { key: "farcaster", label: "Shared to Farcaster" },
  { key: "x", label: "Shared to X" },
  { key: "listed", label: "Listed in BaseMint" },
] as const;

export type LaunchStepKey = (typeof LAUNCH_STEPS)[number]["key"];

export type LaunchProgress = Record<LaunchStepKey, boolean>;

export interface ResidentLaunch {
  /** URL-safe id used for detail deep links. */
  slug: string;
  name: string;
  ticker: string;
  collection: LaunchCollection;
  description: string;
  tags: string[];
  image: string;
  /** ISO date the launch went (or goes) live. */
  launchDate: string;
  /** Base coin/contract address once deployed — enables Mint + details links. */
  address?: string;
  /** Public Zora URL, when the collection exists there. */
  zoraUrl?: string;
  collectors: number;
  featured?: boolean;
  progress: LaunchProgress;
}

export const RESIDENT_LAUNCHES: ResidentLaunch[] = [
  {
    slug: "signal-001",
    name: "Resident Labs // SIGNAL-001",
    ticker: "SIG001",
    collection: "Signals",
    description:
      "SIGNAL-001 is the first transmission from Resident Labs—a creator coin representing experimentation across Base, Zora, Farcaster, AI agents, and onchain apps. Every future Signal documents another step in building the Resident Labs ecosystem.",
    tags: ["residentlabs", "base", "signal"],
    image: signal001,
    launchDate: "2026-07-24",
    collectors: 0,
    featured: true,
    progress: {
      artwork: true,
      metadata: true,
      mint: false,
      farcaster: false,
      x: false,
      listed: true,
    },
  },
];

/** ISO timestamp of the next scheduled release, or null when unscheduled. */
export const NEXT_RELEASE_AT: string | null = null;

export const NO_RELEASE_MESSAGE = "Next Signal is being prepared.";

export function sortedLaunches(): ResidentLaunch[] {
  return [...RESIDENT_LAUNCHES].sort(
    (a, b) => new Date(b.launchDate).getTime() - new Date(a.launchDate).getTime(),
  );
}

export function featuredLaunch(): ResidentLaunch | undefined {
  return RESIDENT_LAUNCHES.find((l) => l.featured) ?? sortedLaunches()[0];
}

export function launchUrl(l: ResidentLaunch): string {
  return l.address
    ? `https://basemint.dev/coin/${l.address}`
    : `https://basemint.dev/launches#${l.slug}`;
}

export function progressPercent(p: LaunchProgress): number {
  const done = LAUNCH_STEPS.filter((s) => p[s.key]).length;
  return Math.round((done / LAUNCH_STEPS.length) * 100);
}

export function formatLaunchDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Resident Labs creator wallets. Any Zora creator coin deployed by these
 * addresses is pulled into the Launch Hub automatically — no manual entry.
 * Can also be supplied at runtime via the RESIDENT_CREATOR_ADDRESSES env var
 * (comma-separated).
 */
export const RESIDENT_CREATOR_ADDRESSES: string[] = [];

/** Slug used for an auto-discovered (non-configured) coin. */
export function slugForCoin(address: string, symbol?: string): string {
  const base = (symbol ?? "coin").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `${base || "coin"}-${address.slice(2, 8).toLowerCase()}`;
}

/** Which collection an auto-discovered coin lands in, by name/symbol hints. */
export function inferCollection(name: string, symbol: string): LaunchCollection {
  const hay = `${name} ${symbol}`.toLowerCase();
  if (hay.includes("genesis")) return "Genesis";
  if (hay.includes("signal") || hay.includes("sig")) return "Signals";
  if (hay.includes("fragment") || hay.includes("frag")) return "Fragments";
  if (hay.includes("core")) return "Core";
  return "Experiments";
}

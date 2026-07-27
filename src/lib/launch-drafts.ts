import type { LaunchCollection, ResidentLaunch } from "./resident-launches";

/**
 * Local-first launch drafts created by the Launch Wizard.
 * Published drafts are merged into the Launch Hub client-side so a new
 * Resident Labs release can be staged without a deploy.
 */
const KEY = "resident:launch-drafts:v1";

export interface LaunchDraft {
  slug: string;
  name: string;
  ticker: string;
  collection: LaunchCollection;
  description: string;
  image: string;
  tags: string[];
  launchDate: string;
  createdAt: string;
  /** Show this launch as the homepage hero. */
  featured?: boolean;
  /** Deployed coin address — only set after a confirmed on-chain deploy. */
  address?: string;
  /** Deploy transaction hash on Base. */
  txHash?: string;
}


function safeParse(raw: string | null): LaunchDraft[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as LaunchDraft[]) : [];
  } catch {
    return [];
  }
}

export function readDrafts(): LaunchDraft[] {
  if (typeof window === "undefined") return [];
  return safeParse(window.localStorage.getItem(KEY));
}

export function saveDraft(draft: LaunchDraft): LaunchDraft[] {
  const rest = readDrafts()
    .filter((d) => d.slug !== draft.slug)
    .map((d) => (draft.featured ? { ...d, featured: false } : d));
  const next = [draft, ...rest];
  window.localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function removeDraft(slug: string): LaunchDraft[] {
  const next = readDrafts().filter((d) => d.slug !== slug);
  window.localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || `launch-${Date.now().toString(36)}`
  );
}

export function draftToLaunch(d: LaunchDraft): ResidentLaunch {
  return {
    slug: d.slug,
    name: d.name,
    ticker: d.ticker,
    collection: d.collection,
    description: d.description,
    tags: d.tags,
    image: d.image,
    launchDate: d.launchDate,
    collectors: 0,
    featured: d.featured,
    status: "coming-soon",
    progress: {
      artwork: Boolean(d.image),
      metadata: Boolean(d.description),
      mint: false,
      farcaster: false,
      x: false,
      listed: true,
    },
  };
}

type PostInput = Pick<ResidentLaunch, "name" | "ticker" | "collection" | "tags">;

/** Ready-to-post announcement copy for Farcaster / X. */
export function socialPost(l: Pick<ResidentLaunch, "name" | "ticker" | "collection" | "tags">) {
  return [
    `${l.name} ($${l.ticker}) is coming.`,
    ``,
    `A Resident Labs ${l.collection} release on Base 🔵`,
    ``,
    l.tags.map((t) => `#${t}`).join(" "),
  ].join("\n");
}

/** Farcaster-flavoured announcement (longer, emoji, hashtags). */
export function farcasterPost(l: PostInput, url?: string) {
  return [
    `${l.name} ($${l.ticker}) is coming.`,
    ``,
    `A Resident Labs ${l.collection} release on Base 🔵`,
    `Documenting the evolution of Base, Zora, Farcaster, AI agents, and onchain mini-apps.`,
    ``,
    url ?? ``,
    l.tags.map((t) => `#${t}`).join(" "),
  ]
    .filter((line, i, all) => !(line === "" && all[i - 1] === ""))
    .join("\n");
}

/** X-flavoured announcement (tight, under 280 chars). */
export function xPost(l: PostInput, url?: string) {
  const body = `${l.name} ($${l.ticker}) — a Resident Labs ${l.collection} release on Base.`;
  const tags = l.tags.slice(0, 3).map((t) => `#${t}`).join(" ");
  return [body, tags, url ?? ""].filter(Boolean).join("\n\n").slice(0, 279);
}

import type { LaunchCollection, ResidentLaunch } from "./resident-launches";
import { LAUNCH_COLLECTIONS } from "./resident-launches";

/** Shape stored in public.resident_launches. */
export interface LaunchRow {
  slug: string;
  name: string;
  ticker: string;
  collection: string;
  description: string;
  image: string;
  tags: string[];
  launch_date: string;
  address: string | null;
  tx_hash: string | null;
  chain_id: number;
  creator_address: string | null;
  featured: boolean;
}

function asCollection(c: string): LaunchCollection {
  return (LAUNCH_COLLECTIONS as readonly string[]).includes(c)
    ? (c as LaunchCollection)
    : "Experiments";
}

export function rowToLaunch(r: LaunchRow): ResidentLaunch {
  return {
    slug: r.slug,
    name: r.name,
    ticker: r.ticker,
    collection: asCollection(r.collection),
    description: r.description,
    tags: r.tags ?? [],
    image: r.image ?? "",
    launchDate: String(r.launch_date).slice(0, 10),
    address: r.address ?? undefined,
    zoraUrl: r.address ? `https://zora.co/coin/base:${r.address}` : undefined,
    collectors: 0,
    featured: r.featured,
    status: r.address ? "live" : "coming-soon",
    progress: {
      artwork: Boolean(r.image),
      metadata: Boolean(r.description),
      mint: Boolean(r.address),
      farcaster: false,
      x: false,
      listed: true,
    },
  };
}

/** All launches published through the wizard, newest first. */
export async function loadDbLaunches(): Promise<ResidentLaunch[]> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("resident_launches")
      .select(
        "slug,name,ticker,collection,description,image,tags,launch_date,address,tx_hash,chain_id,creator_address,featured",
      )
      .order("launch_date", { ascending: false });
    if (error) throw error;
    return ((data ?? []) as LaunchRow[]).map(rowToLaunch);
  } catch (err) {
    console.error("resident launches: db read failed", err);
    return [];
  }
}

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { ResidentLaunch } from "./resident-launches";

/** Launch Hub feed: curated config hydrated + auto-populated from live Zora data. */
export const getResidentLaunches = createServerFn({ method: "GET" }).handler(
  async (): Promise<ResidentLaunch[]> => {
    const { loadResidentLaunches } = await import("./resident-launches.server");
    return loadResidentLaunches();
  },
);

const publishSchema = z.object({
  slug: z.string().min(1).max(80),
  name: z.string().min(1).max(120),
  ticker: z.string().min(1).max(16),
  collection: z.string().min(1).max(40),
  description: z.string().max(1000).default(""),
  image: z.string().max(2_000_000).default(""),
  tags: z.array(z.string().max(40)).max(10).default([]),
  launchDate: z.string().min(8).max(10),
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  creator: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  featured: z.boolean().default(false),
  chainId: z.number().int().default(8453),
});

export interface PublishResult {
  ok: boolean;
  slug: string;
}

/**
 * Persist a launch so every visitor sees it — not just the browser that
 * deployed it. The transaction is verified on Base before anything is
 * written, so this endpoint cannot be used to inject fake launches.
 */
export const publishLaunch = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => publishSchema.parse(input))
  .handler(async ({ data }): Promise<PublishResult> => {
    const { verifyLaunchTx } = await import("./resident-launches.verify.server");
    await verifyLaunchTx({
      txHash: data.txHash as `0x${string}`,
      creator: data.creator as `0x${string}`,
      chainId: data.chainId,
    });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Data URIs are huge; only keep small ones — the feed rehydrates artwork
    // from Zora once the coin is indexed.
    const image = data.image.length > 400_000 ? "" : data.image;
    const addressLower = data.address.toLowerCase();

    // Resolve a slug that can never clobber another creator's launch.
    // 1) If this coin address is already published, keep its existing slug.
    // 2) Otherwise, if the requested slug is taken by a different coin,
    //    derive a unique variant instead of overwriting the earlier row.
    let slug = data.slug;
    const { data: byAddress } = await supabaseAdmin
      .from("resident_launches")
      .select("slug")
      .ilike("address", addressLower)
      .maybeSingle();

    if (byAddress?.slug) {
      slug = byAddress.slug;
    } else {
      const suffix = addressLower.slice(2, 8);
      for (let attempt = 0; attempt < 12; attempt++) {
        const candidate =
          attempt === 0
            ? data.slug
            : attempt === 1
              ? `${data.slug}-${suffix}`
              : `${data.slug}-${suffix}-${attempt}`;
        const { data: existing } = await supabaseAdmin
          .from("resident_launches")
          .select("slug, address")
          .eq("slug", candidate)
          .maybeSingle();
        if (!existing || (existing.address ?? "").toLowerCase() === addressLower) {
          slug = candidate;
          break;
        }
        slug = candidate; // fallback keeps last candidate if loop exhausts
      }
    }

    const { error } = await supabaseAdmin.from("resident_launches").upsert(
      {
        slug,
        name: data.name,
        ticker: data.ticker,
        collection: data.collection,
        description: data.description,
        image,
        tags: data.tags,
        launch_date: data.launchDate,
        address: data.address,
        tx_hash: data.txHash,
        chain_id: data.chainId,
        creator_address: data.creator.toLowerCase(),
        featured: data.featured,
      },
      { onConflict: "slug" },
    );
    if (error) throw new Error(`Could not save launch: ${error.message}`);


    if (data.featured) {
      await supabaseAdmin
        .from("resident_launches")
        .update({ featured: false })
        .neq("slug", slug);
    }

    return { ok: true, slug };

  });

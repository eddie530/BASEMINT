import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export interface ProfileDTO {
  wallet_address: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  twitter: string | null;
  farcaster: string | null;
  website: string | null;
}

export interface ReferralStats {
  code: string;
  owner_wallet: string;
  totals: { visit: number; connect: number; mint: number; trade: number };
  recent: Array<{ event_type: string; coin_address: string | null; created_at: string }>;
}

const addrSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);

function codeFromWallet(wallet: string): string {
  return wallet.slice(2, 10).toLowerCase();
}

export const getProfile = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ address: addrSchema }).parse(input),
  )
  .handler(async ({ data }): Promise<ProfileDTO | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const wallet = data.address.toLowerCase();
    const { data: row } = await supabaseAdmin
      .from("profiles")
      .select("wallet_address,display_name,bio,avatar_url,twitter,farcaster,website")
      .eq("wallet_address", wallet)
      .maybeSingle();
    return (row as ProfileDTO | null) ?? null;
  });

export const upsertProfile = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        address: addrSchema,
        display_name: z.string().max(60).optional().nullable(),
        bio: z.string().max(280).optional().nullable(),
        avatar_url: z.string().url().max(500).optional().nullable(),
        twitter: z.string().max(60).optional().nullable(),
        farcaster: z.string().max(60).optional().nullable(),
        website: z.string().url().max(200).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<ProfileDTO> => {
    // NOTE: This server fn trusts the caller-supplied address. For a hardened build,
    // require a signed message from the wallet before write. Kept simple here to
    // keep the mini-app UX one-tap. Server route /api/public/track is read-only.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const wallet = data.address.toLowerCase();
    const payload = {
      wallet_address: wallet,
      display_name: data.display_name ?? null,
      bio: data.bio ?? null,
      avatar_url: data.avatar_url ?? null,
      twitter: data.twitter ?? null,
      farcaster: data.farcaster ?? null,
      website: data.website ?? null,
    };
    const { data: row, error } = await supabaseAdmin
      .from("profiles")
      .upsert(payload, { onConflict: "wallet_address" })
      .select("wallet_address,display_name,bio,avatar_url,twitter,farcaster,website")
      .single();
    if (error) throw new Error(error.message);
    // Ensure a referral code exists for this wallet
    const code = codeFromWallet(wallet);
    await supabaseAdmin
      .from("referral_codes")
      .upsert({ code, owner_wallet: wallet }, { onConflict: "code" });
    return row as ProfileDTO;
  });

export const getReferralStats = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ address: addrSchema }).parse(input),
  )
  .handler(async ({ data }): Promise<ReferralStats> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const wallet = data.address.toLowerCase();
    const code = codeFromWallet(wallet);

    // Ensure code exists so dashboards never 404
    await supabaseAdmin
      .from("referral_codes")
      .upsert({ code, owner_wallet: wallet }, { onConflict: "code" });

    const [{ data: events }, { data: recent }] = await Promise.all([
      supabaseAdmin
        .from("referral_events")
        .select("event_type")
        .eq("code", code),
      supabaseAdmin
        .from("referral_events")
        .select("event_type,coin_address,created_at")
        .eq("code", code)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    const totals = { visit: 0, connect: 0, mint: 0, trade: 0 };
    for (const e of (events ?? []) as Array<{ event_type: keyof typeof totals }>) {
      if (e.event_type in totals) totals[e.event_type] += 1;
    }
    return {
      code,
      owner_wallet: wallet,
      totals,
      recent: (recent ?? []) as ReferralStats["recent"],
    };
  });

export interface SiteAnalytics {
  totals: { views_7d: number; unique_visitors_7d: number };
  by_day: Array<{ day: string; views: number }>;
  top_paths: Array<{ path: string; views: number }>;
  top_refs: Array<{ ref_code: string; views: number }>;
}

export const getSiteAnalytics = createServerFn({ method: "GET" })
  .handler(async (): Promise<SiteAnalytics> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: events } = await supabaseAdmin
      .from("page_events")
      .select("path,ref_code,visitor_hash,created_at")
      .gte("created_at", since)
      .limit(5000);
    const rows = (events ?? []) as Array<{
      path: string;
      ref_code: string | null;
      visitor_hash: string | null;
      created_at: string;
    }>;
    const visitors = new Set<string>();
    const byDay = new Map<string, number>();
    const byPath = new Map<string, number>();
    const byRef = new Map<string, number>();
    for (const r of rows) {
      const day = r.created_at.slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + 1);
      byPath.set(r.path, (byPath.get(r.path) ?? 0) + 1);
      if (r.ref_code) byRef.set(r.ref_code, (byRef.get(r.ref_code) ?? 0) + 1);
      if (r.visitor_hash) visitors.add(r.visitor_hash);
    }
    return {
      totals: { views_7d: rows.length, unique_visitors_7d: visitors.size },
      by_day: [...byDay.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([day, views]) => ({ day, views })),
      top_paths: [...byPath.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([path, views]) => ({ path, views })),
      top_refs: [...byRef.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([ref_code, views]) => ({ ref_code, views })),
    };
  });

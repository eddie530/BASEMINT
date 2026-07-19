import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const addrSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);

export type PointKind =
  | "create_coin"
  | "buy_coin"
  | "referral_signup"
  | "referral_mint"
  | "daily_checkin"
  | "share_cast"
  | "spin_win";

export const POINT_RULES: Record<PointKind, number> = {
  create_coin: 100,
  buy_coin: 10,
  referral_signup: 25,
  referral_mint: 50,
  daily_checkin: 10,
  share_cast: 15,
  spin_win: 5,
};

// Maps a PointKind to the quest goal_kind it satisfies (1:1 for now).
const QUEST_KIND_MAP: Partial<Record<PointKind, string>> = {
  create_coin: "create_coin",
  buy_coin: "buy_coin",
  referral_mint: "referral_mint",
};

export interface PointEventDTO {
  id: string;
  kind: PointKind;
  points: number;
  metadata: Record<string, string | number | boolean | null>;
  created_at: string;
}

export interface PointsSummary {
  wallet_address: string;
  balance: number;
  lifetime: number;
  recent: PointEventDTO[];
  daily: { claimed_today: boolean; streak: number; next_reward: number };
}

export interface LeaderboardRow {
  wallet_address: string;
  total: number;
  lifetime: number;
  display_name: string | null;
}

export interface QuestDTO {
  id: string;
  slug: string;
  title: string;
  description: string;
  goal_kind: string;
  goal_count: number;
  points_reward: number;
  progress: number;
  completed: boolean;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
function yesterdayISO(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
function streakReward(streak: number): number {
  // 10 base + 5 per day, capped at 50
  return Math.min(50, 10 + (streak - 1) * 5);
}

async function awardInternal(args: {
  wallet: string;
  kind: PointKind;
  points: number;
  ref_key?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
}): Promise<{ awarded: boolean }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const row = {
    wallet_address: args.wallet,
    kind: args.kind,
    points: args.points,
    ref_key: args.ref_key ?? null,
    metadata: args.metadata ?? {},
  };
  const { error } = await supabaseAdmin.from("point_events").insert(row);
  if (error) {
    // unique violation = already awarded (idempotent)
    if (error.code === "23505") return { awarded: false };
    throw new Error(error.message);
  }
  // Bump matching quest progress
  const questKind = QUEST_KIND_MAP[args.kind];
  if (questKind) {
    await bumpQuestProgress(args.wallet, questKind, 1);
  }
  return { awarded: true };
}

async function bumpQuestProgress(wallet: string, goalKind: string, by: number) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: quests } = await supabaseAdmin
    .from("quests")
    .select("id,goal_count,points_reward,slug")
    .eq("goal_kind", goalKind)
    .eq("active", true);
  for (const q of (quests ?? []) as Array<{
    id: string;
    goal_count: number;
    points_reward: number;
    slug: string;
  }>) {
    const { data: existing } = await supabaseAdmin
      .from("quest_progress")
      .select("progress,completed_at")
      .eq("wallet_address", wallet)
      .eq("quest_id", q.id)
      .maybeSingle();
    const prev = (existing as { progress: number; completed_at: string | null } | null) ?? null;
    if (prev?.completed_at) continue;
    const next = (prev?.progress ?? 0) + by;
    const completed = next >= q.goal_count;
    await supabaseAdmin.from("quest_progress").upsert(
      {
        wallet_address: wallet,
        quest_id: q.id,
        progress: next,
        completed_at: completed ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "wallet_address,quest_id" },
    );
    if (completed) {
      await supabaseAdmin.from("point_events").insert({
        wallet_address: wallet,
        kind: "quest_complete" as unknown as PointKind,
        points: q.points_reward,
        ref_key: `quest:${q.slug}`,
        metadata: { quest_slug: q.slug },
      });
    }
  }
}

// Public award endpoint. Trusts caller-supplied wallet to match existing
// app pattern (see profiles.functions.ts). Idempotent via ref_key.
export const recordPointEvent = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        address: addrSchema,
        kind: z.enum(["create_coin", "buy_coin", "referral_signup", "referral_mint", "share_cast"]),
        ref_key: z.string().min(1).max(120),
        metadata: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const wallet = data.address.toLowerCase();
    const points = POINT_RULES[data.kind];
    return awardInternal({
      wallet,
      kind: data.kind,
      points,
      ref_key: data.ref_key,
      metadata: data.metadata,
    });
  });

export const claimDailyCheckin = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ address: addrSchema }).parse(input))
  .handler(async ({ data }): Promise<{ claimed: boolean; streak: number; points: number }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const wallet = data.address.toLowerCase();
    const today = todayISO();

    const { data: existing } = await supabaseAdmin
      .from("daily_checkins")
      .select("checkin_date,streak")
      .eq("wallet_address", wallet)
      .eq("checkin_date", today)
      .maybeSingle();
    if (existing) {
      return { claimed: false, streak: (existing as { streak: number }).streak, points: 0 };
    }

    const { data: prev } = await supabaseAdmin
      .from("daily_checkins")
      .select("checkin_date,streak")
      .eq("wallet_address", wallet)
      .eq("checkin_date", yesterdayISO())
      .maybeSingle();
    const streak = ((prev as { streak: number } | null)?.streak ?? 0) + 1;
    const points = streakReward(streak);

    const { error } = await supabaseAdmin.from("daily_checkins").insert({
      wallet_address: wallet,
      checkin_date: today,
      streak,
      points_awarded: points,
    });
    if (error && error.code !== "23505") throw new Error(error.message);

    await awardInternal({
      wallet,
      kind: "daily_checkin",
      points,
      ref_key: `checkin:${today}`,
      metadata: { streak },
    });

    // Bump checkin_streak quests by 1 each successful claim
    await bumpQuestProgress(wallet, "checkin_streak", 1);

    return { claimed: true, streak, points };
  });

export const getPointsSummary = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ address: addrSchema }).parse(input))
  .handler(async ({ data }): Promise<PointsSummary> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const wallet = data.address.toLowerCase();
    const today = todayISO();

    const [balRes, recentRes, todayRes, lastRes] = await Promise.all([
      supabaseAdmin
        .from("point_balances")
        .select("total,lifetime")
        .eq("wallet_address", wallet)
        .maybeSingle(),
      supabaseAdmin
        .from("point_events")
        .select("id,kind,points,metadata,created_at")
        .eq("wallet_address", wallet)
        .order("created_at", { ascending: false })
        .limit(25),
      supabaseAdmin
        .from("daily_checkins")
        .select("streak")
        .eq("wallet_address", wallet)
        .eq("checkin_date", today)
        .maybeSingle(),
      supabaseAdmin
        .from("daily_checkins")
        .select("streak,checkin_date")
        .eq("wallet_address", wallet)
        .order("checkin_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    const bal = (balRes.data as { total: number; lifetime: number } | null) ?? {
      total: 0,
      lifetime: 0,
    };
    const todayRow = todayRes.data as { streak: number } | null;
    const last = lastRes.data as { streak: number; checkin_date: string } | null;
    const claimed_today = !!todayRow;
    const currentStreak = claimed_today
      ? todayRow!.streak
      : last && last.checkin_date === yesterdayISO()
        ? last.streak
        : 0;
    const next_reward = streakReward(currentStreak + 1);

    return {
      wallet_address: wallet,
      balance: bal.total,
      lifetime: bal.lifetime,
      recent: (recentRes.data ?? []) as PointEventDTO[],
      daily: { claimed_today, streak: currentStreak, next_reward },
    };
  });

export const getLeaderboard = createServerFn({ method: "GET" }).handler(
  async (): Promise<LeaderboardRow[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("point_balances")
      .select("wallet_address,total,lifetime")
      .order("total", { ascending: false })
      .limit(50);
    const rows = (data ?? []) as Array<{ wallet_address: string; total: number; lifetime: number }>;
    if (rows.length === 0) return [];
    const wallets = rows.map((r) => r.wallet_address);
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("wallet_address,display_name")
      .in("wallet_address", wallets);
    const nameMap = new Map<string, string | null>(
      ((profiles ?? []) as Array<{ wallet_address: string; display_name: string | null }>).map(
        (p) => [p.wallet_address, p.display_name],
      ),
    );
    return rows.map((r) => ({
      wallet_address: r.wallet_address,
      total: r.total,
      lifetime: r.lifetime,
      display_name: nameMap.get(r.wallet_address) ?? null,
    }));
  },
);

export const getQuestsForWallet = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ address: addrSchema.optional() }).parse(input))
  .handler(async ({ data }): Promise<QuestDTO[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: quests } = await supabaseAdmin
      .from("quests")
      .select("id,slug,title,description,goal_kind,goal_count,points_reward")
      .eq("active", true)
      .order("points_reward", { ascending: true });
    const list = (quests ?? []) as Array<Omit<QuestDTO, "progress" | "completed">>;
    if (!data.address) return list.map((q) => ({ ...q, progress: 0, completed: false }));
    const wallet = data.address.toLowerCase();
    const { data: progress } = await supabaseAdmin
      .from("quest_progress")
      .select("quest_id,progress,completed_at")
      .eq("wallet_address", wallet);
    const map = new Map<string, { progress: number; completed: boolean }>(
      (
        (progress ?? []) as Array<{
          quest_id: string;
          progress: number;
          completed_at: string | null;
        }>
      ).map((p) => [p.quest_id, { progress: p.progress, completed: !!p.completed_at }]),
    );
    return list.map((q) => ({
      ...q,
      progress: map.get(q.id)?.progress ?? 0,
      completed: map.get(q.id)?.completed ?? false,
    }));
  });

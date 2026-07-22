import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type EntitlementsDTO = {
  launch_credits: number;
  booster_expires_at: string | null;
  booster_active: boolean;
};

const EMPTY: EntitlementsDTO = {
  launch_credits: 0,
  booster_expires_at: null,
  booster_active: false,
};

function shape(row: { launch_credits?: number; booster_expires_at?: string | null } | null): EntitlementsDTO {
  if (!row) return EMPTY;
  const exp = row.booster_expires_at ? new Date(row.booster_expires_at).getTime() : null;
  return {
    launch_credits: row.launch_credits ?? 0,
    booster_expires_at: row.booster_expires_at ?? null,
    booster_active: exp !== null && exp > Date.now(),
  };
}

export const getMyEntitlements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<EntitlementsDTO> => {
    const { data } = await (context.supabase as any)
      .from("user_entitlements")
      .select("launch_credits, booster_expires_at")
      .eq("user_id", context.userId)
      .maybeSingle();
    return shape(data);
  });

/**
 * Atomically decrement one launch credit for the caller. Returns whether a
 * credit was actually consumed. Intended to be called from a server-side
 * verified launch success path — never from the client directly.
 */
export const consumeLaunchCredit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ consumed: boolean }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("consume_launch_credit", {
      _user_id: context.userId,
    });
    if (error) throw new Error(error.message);
    return { consumed: !!data };
  });

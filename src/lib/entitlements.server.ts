/**
 * Server-only entitlement fulfillment shared by the Stripe checkout webhook
 * and the Coinbase Commerce webhook. Idempotent by (source, source_ref).
 *
 * Callers pass a Supabase service-role client; this module never constructs
 * one so webhook routes can share their existing client instance.
 */

export type EntitlementSource = "stripe" | "commerce";
export type EntitlementKind = "launch_credit" | "points_booster";

const BOOSTER_MS = 7 * 24 * 60 * 60 * 1000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;

export async function grantEntitlement(
  supabaseAdmin: Client,
  params: {
    userId: string;
    kind: EntitlementKind;
    source: EntitlementSource;
    sourceRef: string;
  },
): Promise<{ applied: boolean }> {
  // Ledger insert is the idempotency guard. Unique (source, source_ref).
  const { error: ledgerErr } = await supabaseAdmin.from("entitlement_grants").insert({
    user_id: params.userId,
    kind: params.kind,
    source: params.source,
    source_ref: params.sourceRef,
  });
  if (ledgerErr) {
    // 23505 = already fulfilled — do nothing.
    if ((ledgerErr as { code?: string }).code === "23505") return { applied: false };
    throw new Error(ledgerErr.message);
  }

  // Load-then-upsert. Not race-free at extreme concurrency, but webhooks
  // per-user are effectively serial.
  const { data: existing } = await supabaseAdmin
    .from("user_entitlements")
    .select("launch_credits, booster_expires_at")
    .eq("user_id", params.userId)
    .maybeSingle();

  const now = new Date();
  const current = (existing as { launch_credits?: number; booster_expires_at?: string | null } | null) ?? null;
  const currentCredits = current?.launch_credits ?? 0;
  const currentExp = current?.booster_expires_at ? new Date(current.booster_expires_at) : null;

  const nextCredits =
    params.kind === "launch_credit" ? currentCredits + 1 : currentCredits;

  let nextExp = currentExp;
  if (params.kind === "points_booster") {
    const base = currentExp && currentExp.getTime() > now.getTime() ? currentExp : now;
    nextExp = new Date(base.getTime() + BOOSTER_MS);
  }

  const { error: upsertErr } = await supabaseAdmin.from("user_entitlements").upsert(
    {
      user_id: params.userId,
      launch_credits: nextCredits,
      booster_expires_at: nextExp ? nextExp.toISOString() : null,
      updated_at: now.toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (upsertErr) throw new Error(upsertErr.message);
  return { applied: true };
}

/**
 * Map a Stripe / Commerce priceId to an entitlement kind, or null if the
 * SKU is not an entitlement (subscriptions, spin packs).
 */
export function entitlementKindForPrice(priceId: string | undefined | null): EntitlementKind | null {
  if (priceId === "launch_credit_once") return "launch_credit";
  if (priceId === "points_booster_7d_once") return "points_booster";
  return null;
}

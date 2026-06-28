import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// Public first-party analytics + referral capture endpoint.
// No PII: visitor_hash is a one-way SHA-256 of (ip + ua + day-salt).

const bodySchema = z.object({
  session_id: z.string().min(1).max(64),
  path: z.string().max(500),
  referrer: z.string().max(500).optional().nullable(),
  ref_code: z.string().max(64).optional().nullable(),
  wallet_address: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .optional()
    .nullable(),
  event: z.enum(["pageview", "connect", "mint", "trade"]).default("pageview"),
  coin_address: z.string().max(80).optional().nullable(),
});

async function hash(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

export const Route = createFileRoute("/api/public/track")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "content-type",
          },
        }),
      POST: async ({ request }) => {
        const cors = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify({ ok: false }), { status: 400, headers: cors });
        }
        const parsed = bodySchema.safeParse(body);
        if (!parsed.success) {
          return new Response(JSON.stringify({ ok: false }), { status: 400, headers: cors });
        }
        const data = parsed.data;

        const ip =
          request.headers.get("cf-connecting-ip") ??
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          "0.0.0.0";
        const ua = request.headers.get("user-agent") ?? "";
        const day = new Date().toISOString().slice(0, 10);
        const visitor_hash = await hash(`${ip}|${ua}|${day}`);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        try {
          // Always log pageview to first-party analytics
          if (data.event === "pageview") {
            await supabaseAdmin.from("page_events").insert({
              session_id: data.session_id,
              path: data.path,
              referrer: data.referrer ?? null,
              ref_code: data.ref_code ?? null,
              wallet_address: data.wallet_address?.toLowerCase() ?? null,
              visitor_hash,
            });
          }

          // Referral event mapping
          if (data.ref_code) {
            // Make sure the referral code exists (auto-create for any wallet-derived code)
            // Wallet-derived codes are first 8 hex chars after 0x — if the code looks like one,
            // bind it to that wallet on first sight.
            const guessedWallet = /^[a-f0-9]{8}$/i.test(data.ref_code)
              ? `0x${data.ref_code.toLowerCase()}${"0".repeat(32)}`.slice(0, 42)
              : null;
            // No owner guess — only insert if missing AND we can attribute it
            if (guessedWallet) {
              await supabaseAdmin
                .from("referral_codes")
                .upsert(
                  { code: data.ref_code.toLowerCase(), owner_wallet: guessedWallet },
                  { onConflict: "code", ignoreDuplicates: true },
                );
            }

            const refEvent =
              data.event === "pageview"
                ? "visit"
                : data.event === "connect"
                  ? "connect"
                  : data.event === "mint"
                    ? "mint"
                    : "trade";

            // Check the code exists before inserting an event (FK)
            const { data: codeRow } = await supabaseAdmin
              .from("referral_codes")
              .select("code")
              .eq("code", data.ref_code.toLowerCase())
              .maybeSingle();
            if (codeRow) {
              await supabaseAdmin.from("referral_events").insert({
                code: data.ref_code.toLowerCase(),
                event_type: refEvent,
                coin_address: data.coin_address ?? null,
                visitor_wallet: data.wallet_address?.toLowerCase() ?? null,
                visitor_hash,
              });
            }
          }
        } catch (err) {
          console.error("track insert failed", err);
        }

        return new Response(JSON.stringify({ ok: true }), { headers: cors });
      },
    },
  },
});

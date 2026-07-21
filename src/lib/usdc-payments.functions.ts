import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  PRO_DURATION_DAYS,
  PRO_TREASURY_ADDRESS,
  PRO_USDC_UNITS,
  USDC_BASE_ADDRESS,
} from "@/lib/usdc";

type VerifyResult = { ok: true; unlocksUntil: string } | { error: string };

const BASE_CHAIN_ID = 8453;
// ERC-20 Transfer(address indexed from, address indexed to, uint256 value)
const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

function pad(addr: string): string {
  return `0x000000000000000000000000${addr.toLowerCase().replace(/^0x/, "")}`;
}

function decodeAddress(topic: string): string {
  return `0x${topic.slice(-40).toLowerCase()}`;
}

async function rpc<T>(url: string, method: string, params: unknown[]): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = (await res.json()) as { result?: T; error?: { message: string } };
  if (json.error) throw new Error(json.error.message);
  return json.result as T;
}

export const verifyUsdcPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { txHash: string; fromAddress: string }) => {
      if (!/^0x[a-fA-F0-9]{64}$/.test(input.txHash)) throw new Error("Invalid tx hash");
      if (!/^0x[a-fA-F0-9]{40}$/.test(input.fromAddress)) throw new Error("Invalid sender");
      return input;
    },
  )
  .handler(async ({ data, context }): Promise<VerifyResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { userId } = context;

    // Idempotency — if we've already verified this tx, return the unlock.
    const { data: existing } = await supabaseAdmin
      .from("usdc_payments")
      .select("id, user_id")
      .eq("tx_hash", data.txHash.toLowerCase())
      .maybeSingle();
    if (existing) {
      if (existing.user_id !== userId) {
        return { error: "This transaction was already used by another account." };
      }
      const { data: sub } = await supabaseAdmin
        .from("subscriptions")
        .select("current_period_end")
        .eq("user_id", userId)
        .eq("environment", "usdc")
        .order("current_period_end", { ascending: false })
        .limit(1)
        .maybeSingle();
      return {
        ok: true,
        unlocksUntil: (sub?.current_period_end as string | null) ?? new Date().toISOString(),
      };
    }

    const rpcUrl =
      process.env.BASE_RPC_URL || process.env.VITE_BASE_RPC_URL || "https://mainnet.base.org";

    const receipt = await rpc<{
      status: string;
      blockNumber: string;
      from: string;
      logs: Array<{ address: string; topics: string[]; data: string }>;
    } | null>(rpcUrl, "eth_getTransactionReceipt", [data.txHash]);

    if (!receipt) return { error: "Transaction not found yet — wait for confirmation." };
    if (receipt.status !== "0x1") return { error: "Transaction failed on-chain." };

    const expectedFrom = pad(data.fromAddress);
    const expectedTo = pad(PRO_TREASURY_ADDRESS);

    // Look for a USDC Transfer log matching sender→treasury with amount >= PRO_USDC_UNITS.
    let matched = false;
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== USDC_BASE_ADDRESS.toLowerCase()) continue;
      if (log.topics[0] !== TRANSFER_TOPIC) continue;
      if (log.topics[1]?.toLowerCase() !== expectedFrom) continue;
      if (log.topics[2]?.toLowerCase() !== expectedTo) continue;
      const value = BigInt(log.data);
      if (value < PRO_USDC_UNITS) continue;
      matched = true;
      break;
    }

    if (!matched) {
      return {
        error: `Could not find a USDC transfer of at least ${PRO_USDC_UNITS / 10n ** 6n} USDC to the treasury in this transaction.`,
      };
    }

    const blockNumber = parseInt(receipt.blockNumber, 16);
    const unlocksUntil = new Date(
      Date.now() + PRO_DURATION_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

    // Record the on-chain payment.
    const { error: payErr } = await supabaseAdmin.from("usdc_payments").insert({
      user_id: userId,
      tx_hash: data.txHash.toLowerCase(),
      chain_id: BASE_CHAIN_ID,
      from_address: data.fromAddress.toLowerCase(),
      to_address: PRO_TREASURY_ADDRESS.toLowerCase(),
      amount_usdc: Number(PRO_USDC_UNITS) / 1_000_000,
      plan: "resident_pro_monthly",
      block_number: blockNumber,
    });
    if (payErr) {
      // Race: another concurrent verify inserted first. Treat as success.
      if (!String(payErr.message).includes("duplicate")) {
        return { error: "Could not record payment. Try again in a moment." };
      }
    }

    // Grant / extend a Pro subscription in the `usdc` environment.
    // If a row already exists for this user in `usdc`, extend from the later of now / current end.
    const { data: current } = await supabaseAdmin
      .from("subscriptions")
      .select("id, current_period_end")
      .eq("user_id", userId)
      .eq("environment", "usdc")
      .maybeSingle();

    const nowMs = Date.now();
    const existingEnd = current?.current_period_end
      ? new Date(current.current_period_end as string).getTime()
      : 0;
    const baseMs = Math.max(nowMs, existingEnd);
    const newEnd = new Date(baseMs + PRO_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const startIso = new Date(nowMs).toISOString();

    if (current?.id) {
      await supabaseAdmin
        .from("subscriptions")
        .update({
          status: "active",
          price_id: "resident_pro_monthly",
          current_period_start: startIso,
          current_period_end: newEnd,
          cancel_at_period_end: false,
          updated_at: startIso,
        })
        .eq("id", current.id);
    } else {
      await supabaseAdmin.from("subscriptions").insert({
        user_id: userId,
        stripe_subscription_id: `usdc:${data.txHash.toLowerCase()}`,
        stripe_customer_id: data.fromAddress.toLowerCase(),
        product_id: "resident_pro",
        price_id: "resident_pro_monthly",
        status: "active",
        current_period_start: startIso,
        current_period_end: newEnd,
        cancel_at_period_end: false,
        environment: "usdc",
      });
    }

    return { ok: true, unlocksUntil: newEnd };
  });

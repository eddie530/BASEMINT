import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const lookupSchema = z.object({
  ownerWallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

const createSchema = z.object({
  ownerWallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  message: z.string().min(1),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/),
});

function normalize(addr: string) {
  return addr.toLowerCase();
}

function accountNameFor(addr: string) {
  // CDP account names: alphanumeric + hyphens, 2-36 chars.
  // "basemint-" is 9 chars, leaving 27 for the address slug.
  return `basemint-${addr.toLowerCase().replace(/^0x/, "").slice(0, 27)}`;
}

export const getServerWallet = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => lookupSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("cdp_wallets")
      .select("cdp_address, created_at")
      .eq("owner_wallet", normalize(data.ownerWallet))
      .maybeSingle();
    return row ?? null;
  });

export const provisionServerWallet = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => createSchema.parse(data))
  .handler(async ({ data }) => {
    const { verifyMessage } = await import("viem");
    const owner = normalize(data.ownerWallet);

    const ok = await verifyMessage({
      address: data.ownerWallet as `0x${string}`,
      message: data.message,
      signature: data.signature as `0x${string}`,
    });
    if (!ok) throw new Error("Invalid signature");
    if (!data.message.toLowerCase().includes(owner)) {
      throw new Error("Message must include your wallet address");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const existing = await supabaseAdmin
      .from("cdp_wallets")
      .select("cdp_address, created_at")
      .eq("owner_wallet", owner)
      .maybeSingle();
    if (existing.data) return existing.data;

    const { CdpClient } = await import("@coinbase/cdp-sdk");
    const cdp = new CdpClient({
      apiKeyId: process.env.CDP_API_KEY_ID!,
      apiKeySecret: process.env.CDP_API_KEY_SECRET!,
      walletSecret: process.env.CDP_WALLET_SECRET!,
    });

    const name = accountNameFor(owner);
    const account = await cdp.evm.getOrCreateAccount({ name });

    const { data: inserted, error } = await supabaseAdmin
      .from("cdp_wallets")
      .insert({
        owner_wallet: owner,
        cdp_account_name: name,
        cdp_address: account.address,
      })
      .select("cdp_address, created_at")
      .single();
    if (error) throw new Error(error.message);
    return inserted;
  });

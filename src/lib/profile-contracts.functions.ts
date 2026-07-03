import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Server functions for tracked smart contracts on a user's profile.
// Verification requires: a wallet signature over a bound message, AND the
// contract's on-chain owner() must equal the signer. Base mainnet only.

const AddSchema = z.object({
  ownerWallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  contractAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  chainId: z.literal(8453),
  message: z.string().min(10),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/),
});

export const listProfileContracts = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ address: z.string().regex(/^0x[a-fA-F0-9]{40}$/) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data: rows, error } = await sb
      .from("profile_contracts")
      .select("contract_address, chain_id, verified_at")
      .eq("wallet_address", data.address.toLowerCase())
      .order("verified_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const addProfileContract = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AddSchema.parse(input))
  .handler(async ({ data }) => {
    const owner = data.ownerWallet.toLowerCase() as `0x${string}`;
    const contract = data.contractAddress.toLowerCase() as `0x${string}`;

    // The message must bind the owner + contract + chain to prevent replay.
    const expected = `Basemint: link contract ${contract} on chain ${data.chainId} to ${owner}`;
    if (!data.message.startsWith(expected)) {
      throw new Error("Message does not bind this contract to your wallet.");
    }

    const { createPublicClient, http, isAddressEqual, getAddress } = await import("viem");
    const { base } = await import("viem/chains");

    const client = createPublicClient({
      chain: base,
      transport: http(process.env.BASE_RPC_URL || "https://mainnet.base.org"),
    });

    // 1. Signature valid for the wallet (supports EOA + EIP-1271 smart wallets).
    const sigOk = await client.verifyMessage({
      address: getAddress(owner),
      message: data.message,
      signature: data.signature as `0x${string}`,
    });
    if (!sigOk) throw new Error("Signature verification failed.");

    // 2. Contract exists at the address.
    const code = await client.getBytecode({ address: getAddress(contract) });
    if (!code || code === "0x") throw new Error("No contract found at that address on Base.");

    // 3. Ownership check — try in order:
    //    a) Ownable / ERC-173 `owner()` view
    //    b) OpenZeppelin AccessControl `hasRole(DEFAULT_ADMIN_ROLE, signer)`
    //       where DEFAULT_ADMIN_ROLE = bytes32(0)
    //    c) Transparent-proxy style `admin()` view
    const signer = getAddress(owner);
    const target = getAddress(contract);

    const tryOwner = async (): Promise<`0x${string}` | null> => {
      try {
        return (await client.readContract({
          address: target,
          abi: [
            {
              type: "function",
              name: "owner",
              stateMutability: "view",
              inputs: [],
              outputs: [{ type: "address" }],
            },
          ],
          functionName: "owner",
        })) as `0x${string}`;
      } catch {
        return null;
      }
    };

    const tryAdmin = async (): Promise<`0x${string}` | null> => {
      try {
        return (await client.readContract({
          address: target,
          abi: [
            {
              type: "function",
              name: "admin",
              stateMutability: "view",
              inputs: [],
              outputs: [{ type: "address" }],
            },
          ],
          functionName: "admin",
        })) as `0x${string}`;
      } catch {
        return null;
      }
    };

    const tryDefaultAdminRole = async (): Promise<boolean> => {
      try {
        return (await client.readContract({
          address: target,
          abi: [
            {
              type: "function",
              name: "hasRole",
              stateMutability: "view",
              inputs: [
                { name: "role", type: "bytes32" },
                { name: "account", type: "address" },
              ],
              outputs: [{ type: "bool" }],
            },
          ],
          functionName: "hasRole",
          args: [
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            signer,
          ],
        })) as boolean;
      } catch {
        return false;
      }
    };

    const [ownerAddr, adminAddr, hasAdminRole] = await Promise.all([
      tryOwner(),
      tryAdmin(),
      tryDefaultAdminRole(),
    ]);

    const matchedVia =
      ownerAddr && isAddressEqual(ownerAddr, signer)
        ? "owner()"
        : adminAddr && isAddressEqual(adminAddr, signer)
          ? "admin()"
          : hasAdminRole
            ? "AccessControl DEFAULT_ADMIN_ROLE"
            : null;

    if (!matchedVia) {
      const details: string[] = [];
      if (ownerAddr) details.push(`owner()=${ownerAddr}`);
      if (adminAddr) details.push(`admin()=${adminAddr}`);
      if (!ownerAddr && !adminAddr && !hasAdminRole) {
        throw new Error(
          "Could not verify ownership: contract does not expose owner(), admin(), or AccessControl.hasRole().",
        );
      }
      throw new Error(
        `You are not the owner of this contract${details.length ? ` (${details.join(", ")})` : ""}.`,
      );
    }



    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("profile_contracts").upsert(
      {
        wallet_address: owner,
        contract_address: contract,
        chain_id: data.chainId,
        verified_at: new Date().toISOString(),
      },
      { onConflict: "wallet_address,chain_id,contract_address" },
    );
    if (error) throw new Error(error.message);

    return { ok: true, contract_address: contract, chain_id: data.chainId };
  });

export const removeProfileContract = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        ownerWallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
        contractAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
        chainId: z.number().int(),
        message: z.string().min(10),
        signature: z.string().regex(/^0x[a-fA-F0-9]+$/),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const owner = data.ownerWallet.toLowerCase() as `0x${string}`;
    const contract = data.contractAddress.toLowerCase();

    const expected = `Basemint: remove contract ${contract} on chain ${data.chainId} from ${owner}`;
    if (!data.message.startsWith(expected)) {
      throw new Error("Message does not bind this removal to your wallet.");
    }

    const { createPublicClient, http, getAddress } = await import("viem");
    const { base } = await import("viem/chains");
    const client = createPublicClient({
      chain: base,
      transport: http(process.env.BASE_RPC_URL || "https://mainnet.base.org"),
    });
    const sigOk = await client.verifyMessage({
      address: getAddress(owner),
      message: data.message,
      signature: data.signature as `0x${string}`,
    });
    if (!sigOk) throw new Error("Signature verification failed.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profile_contracts")
      .delete()
      .eq("wallet_address", owner)
      .eq("chain_id", data.chainId)
      .eq("contract_address", contract);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

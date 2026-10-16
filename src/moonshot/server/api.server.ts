/**
 * MOONSHOT server API — adapted from the source game's api.server.ts.
 * All state lives in the namespaced moonshot_* tables, which are reachable only
 * through the service role. Scoring, timing, crash seeds and settlement happen
 * inside Postgres functions so every ranked action is atomic and retry-safe.
 */
import { recoverMessageAddress, isAddress, type Hex } from "viem";
import { createSiweMessage } from "viem/siwe";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { PACK, LOOKS, utcDay, weekStart, type Challenge, type Pilot } from "../shared";
import { chainClient, paymentProof } from "./payments";
import { GameError } from "./errors";

const db = () => supabaseAdmin as any; // moonshot tables are service-role only

const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...headers },
  });

const hex = (b: ArrayBuffer | Uint8Array) =>
  Array.from(b instanceof Uint8Array ? b : new Uint8Array(b))
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
export async function sha256(s: string) {
  return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
}
const token = () => hex(crypto.getRandomValues(new Uint8Array(32)));

/** Unwrap a Postgres result, mapping "MS:" exceptions to user-facing errors. */
function must<T>(res: { data: T; error: any }): T {
  if (res.error) {
    const msg: string = res.error.message ?? "";
    if (msg.startsWith("MS:")) throw new GameError(msg.slice(3), Number(res.error.details) || 400);
    throw new Error(msg || "database error");
  }
  return res.data;
}
const rpc = async <T = any>(fn: string, args: Record<string, unknown>) =>
  must<T>(await db().rpc(fn, args));

export function originOf(req: Request) {
  const configured = process.env.MOONSHOT_APP_ORIGIN;
  if (configured) return new URL(configured).origin;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? new URL(req.url).host;
  const proto =
    req.headers.get("x-forwarded-proto") ??
    (/^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? "http" : "https");
  return `${proto}://${host}`;
}
function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  const site = req.headers.get("sec-fetch-site");
  if (site && !["same-origin", "none"].includes(site))
    throw new GameError("Cross-site request blocked.", 403);
  if (!origin) throw new GameError("Please use the app to make this request.", 403);
  const expected = new URL(originOf(req)).host;
  if (new URL(origin).host !== expected)
    throw new GameError("Please use the app to make this request.", 403);
}
function cookie(req: Request, name: string) {
  return (
    req.headers
      .get("cookie")
      ?.split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith(`${name}=`))
      ?.slice(name.length + 1) ?? ""
  );
}
function setCookie(req: Request, name: string, value: string, maxAge = 60 * 60 * 24 * 30) {
  return `${name}=${value}; Path=/api/public/moonshot; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${originOf(req).startsWith("https:") ? "; Secure" : ""}`;
}

async function currentPilot(req: Request) {
  const raw = cookie(req, "ms_session");
  if (!/^[a-f0-9]{64}$/.test(raw)) return null;
  const { data: s } = await db()
    .from("moonshot_sessions")
    .select("pilot_id")
    .eq("token_hash", await sha256(raw))
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (!s) return null;
  const { data: p } = await db().from("moonshot_pilots").select("*").eq("id", s.pilot_id).maybeSingle();
  return p ?? null;
}
async function issueSession(req: Request, pilot: string) {
  const raw = token();
  const old = cookie(req, "ms_session");
  if (old) await db().from("moonshot_sessions").delete().eq("token_hash", await sha256(old));
  await db().from("moonshot_sessions").delete().lt("expires_at", new Date().toISOString());
  must(
    await db()
      .from("moonshot_sessions")
      .insert({
        token_hash: await sha256(raw),
        pilot_id: pilot,
        expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
      }),
  );
  return setCookie(req, "ms_session", raw);
}

async function pilotView(p: any): Promise<Pilot | null> {
  if (!p) return null;
  const [{ data: owned }, { data: rounds }] = await Promise.all([
    db().from("moonshot_entitlements").select("pack").eq("pilot_id", p.id).eq("pack", PACK.id),
    db().from("moonshot_rounds").select("status,multiplier").eq("pilot_id", p.id).neq("status", "flying"),
  ]);
  const isOwner = !!owned?.length;
  return {
    id: p.id,
    name: p.name,
    avatar: p.avatar,
    fid: p.fid ? Number(p.fid) : null,
    wallet: p.wallet,
    equipped: isOwner ? p.equipped : "base",
    owned: isOwner,
    completed: rounds?.length ?? 0,
    best: Math.max(0, ...(rounds ?? []).filter((r: any) => r.status === "cash").map((r: any) => Number(r.multiplier))),
  };
}

async function limit(key: string, max: number) {
  const ok = await rpc<boolean>("moonshot_hit_limit", { p_key: key, p_max: max });
  if (!ok) throw new GameError("Too many requests. Please try again in a few minutes.", 429);
}

export async function publicChallenge(id: string, origin: string): Promise<Challenge> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)) throw new GameError("Challenge not found.", 404);
  const { data: r } = await db()
    .from("moonshot_rounds")
    .select("id,day,multiplier,pilot_id,status")
    .eq("id", id)
    .eq("status", "cash")
    .gt("multiplier", 1)
    .maybeSingle();
  if (!r) throw new GameError("This challenge is not available.", 404);
  const { data: p } = await db().from("moonshot_pilots").select("name,avatar").eq("id", r.pilot_id).single();
  return {
    id: r.id,
    name: p.name,
    avatar: p.avatar,
    day: r.day,
    multiplier: Number(r.multiplier),
    url: `${origin}/moonshot/c/${r.id}`,
  };
}

const board = (pilot: string | null, from: string, to: string, friends = false) =>
  rpc("moonshot_leaderboard", { p_pilot: pilot ?? "", p_from: from, p_to: to, p_friends: friends });

async function walletLogin(req: Request, body: any) {
  if (typeof body.id !== "string") throw new GameError("Sign-in expired. Please reconnect.", 401);
  if (typeof body.signature !== "string" || !/^0x[0-9a-f]+$/i.test(body.signature) || body.signature.length > 20000)
    throw new GameError("Sign-in expired. Please reconnect.", 401);
  // Single-use: the delete only returns the row once, so a replayed signature fails.
  const { data: used } = await db()
    .from("moonshot_nonces")
    .delete()
    .eq("id", body.id)
    .eq("browser_hash", await sha256(cookie(req, "ms_nonce")))
    .gt("expires_at", new Date().toISOString())
    .select("*");
  const n = used?.[0];
  if (!n) throw new GameError("Sign-in expired or already used. Please reconnect.", 401);
  let valid = false;
  try {
    valid = (await recoverMessageAddress({ message: n.message, signature: body.signature as Hex })).toLowerCase() === n.address;
  } catch {
    /* smart wallets verify below */
  }
  if (!valid) {
    try {
      valid = await chainClient.verifyMessage({ address: n.address, signature: body.signature as Hex, message: n.message });
    } catch {
      valid = false;
    }
  }
  if (!valid) throw new GameError("The wallet signature could not be verified.", 401);
  const current = await currentPilot(req);
  const pilot = await rpc<string>("moonshot_wallet_pilot", { p_address: n.address, p_current: current?.id ?? null });
  return issueSession(req, pilot);
}

async function farcasterLogin(req: Request, body: any) {
  if (typeof body.token !== "string" || body.token.length > 10000)
    throw new GameError("Invalid Farcaster sign-in.", 401);
  let fid: number;
  try {
    const { createClient } = await import("@farcaster/quick-auth");
    const verified = await createClient().verifyJwt({ token: body.token, domain: new URL(originOf(req)).host });
    fid = Number(verified.sub);
  } catch {
    throw new GameError("Farcaster sign-in expired. Please try again.", 401);
  }
  if (!Number.isSafeInteger(fid) || fid < 1) throw new GameError("Invalid Farcaster identity.", 401);
  let name = `Farcaster #${fid}`,
    avatar: string | null = null;
  try {
    const response = await fetch(`https://api.farcaster.xyz/v2/user?fid=${fid}`, { signal: AbortSignal.timeout(3000) });
    if (response.ok) {
      const user = ((await response.json()) as any).result?.user;
      if (user?.fid === fid) {
        if (typeof user.username === "string") name = `@${user.username.slice(0, 32)}`;
        if (typeof user.pfp?.url === "string" && user.pfp.url.startsWith("https://")) avatar = user.pfp.url;
      }
    }
  } catch {
    /* FID is the verified fallback; never trust client profile claims. */
  }
  const id = await rpc<string>("moonshot_farcaster_pilot", { p_fid: fid, p_name: name, p_avatar: avatar });
  return issueSession(req, id);
}

const checkoutEnabled = () => process.env.MOONSHOT_CHECKOUT_ENABLED === "1";

export async function handle(req: Request, action: string): Promise<Response> {
  try {
    const url = new URL(req.url);
    if (req.method === "POST") sameOrigin(req);
    const p = await currentPilot(req);
    if (req.method === "GET") {
      if (action === "state") {
        const [pilot, daily, rows, orders] = await Promise.all([
          pilotView(p),
          p
            ? rpc("moonshot_daily_state", { p_pilot: p.id })
            : Promise.resolve({ day: utcDay(), used: 0, completed: 0, balance: 1000, active: null }),
          board(p?.id ?? null, utcDay(), utcDay()),
          p
            ? db().from("moonshot_orders").select("id,tx_hash").eq("pilot_id", p.id).eq("status", "pending").order("created_ms", { ascending: false }).limit(1)
            : Promise.resolve({ data: [] }),
        ]);
        const o = (orders as any).data?.[0];
        return json({
          pilot,
          daily,
          board: rows,
          resetAt: Date.parse(`${(daily as any).day}T00:00:00Z`) + 86400000,
          checkoutEnabled: checkoutEnabled(),
          local: false,
          pendingOrder: o ? { id: o.id, hash: o.tx_hash } : null,
        });
      }
      if (action === "board")
        return json(
          await board(
            p?.id ?? null,
            url.searchParams.get("period") === "week" ? weekStart() : utcDay(),
            utcDay(),
            url.searchParams.get("scope") === "friends" && !!p,
          ),
        );
      if (action === "challenge")
        return json(await publicChallenge(url.searchParams.get("id") ?? "", originOf(req)));
      if (action === "card") {
        const c = await publicChallenge(url.searchParams.get("id") ?? "", originOf(req));
        const { shareCardPng } = await import("./png");
        const png = await shareCardPng(c, url.searchParams.get("format") === "embed" ? "embed" : "og");
        return new Response(png, {
          headers: { "content-type": "image/png", "content-length": String(png.length), "cache-control": "public,max-age=86400" },
        });
      }
      if (!p) throw new GameError("Sign in to save ranked flights.", 401);
      if (action === "round")
        return json(await rpc("moonshot_read_round", { p_pilot: p.id, p_id: url.searchParams.get("id") ?? "", p_cash: false }));
      if (action === "friends") {
        const { data: f } = await db().from("moonshot_friends").select("friend_id").eq("pilot_id", p.id);
        const ids = (f ?? []).map((x: any) => x.friend_id);
        if (!ids.length) return json([]);
        const { data: rows } = await db().from("moonshot_pilots").select("id,name,avatar").in("id", ids).order("name");
        return json(rows ?? []);
      }
      throw new GameError("Not found.", 404);
    }
    if (req.method !== "POST") throw new GameError("Method not allowed.", 405);
    const raw = await req.text();
    if (raw.length > 24000) throw new GameError("Request too large.", 413);
    let body: any;
    try {
      body = JSON.parse(raw || "{}");
    } catch {
      throw new GameError("Invalid request.");
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new GameError("Invalid request.");

    if (["nonce", "wallet-login", "farcaster-login"].includes(action)) {
      const ip = req.headers.get("cf-connecting-ip") ?? "unknown";
      await limit(`auth:${await sha256(ip)}`, 60);
      if (action === "nonce") {
        if (typeof body.address !== "string" || !isAddress(body.address)) throw new GameError("Choose a valid wallet.");
        const id = crypto.randomUUID(),
          browser = token(),
          expiry = new Date(Date.now() + 300000),
          origin = originOf(req);
        const message = createSiweMessage({
          domain: new URL(origin).host,
          address: body.address as Hex,
          statement: "Sign in to MOONSHOT. This does not move funds or authorize transactions.",
          uri: origin,
          version: "1",
          chainId: 8453,
          nonce: token().slice(0, 32),
          issuedAt: new Date(),
          expirationTime: expiry,
        });
        await db().from("moonshot_nonces").delete().lt("expires_at", new Date().toISOString());
        must(
          await db().from("moonshot_nonces").insert({
            id,
            browser_hash: await sha256(browser),
            address: body.address.toLowerCase(),
            message,
            expires_at: expiry.toISOString(),
          }),
        );
        return json({ id, message }, 200, { "set-cookie": setCookie(req, "ms_nonce", browser, 300) });
      }
      const session = action === "wallet-login" ? await walletLogin(req, body) : await farcasterLogin(req, body);
      return json({ ok: true }, 200, { "set-cookie": session });
    }
    if (action === "logout") {
      const c = cookie(req, "ms_session");
      if (c) await db().from("moonshot_sessions").delete().eq("token_hash", await sha256(c));
      return json({ ok: true }, 200, { "set-cookie": setCookie(req, "ms_session", "", 0) });
    }
    if (!p) throw new GameError("Sign in to save ranked flights.", 401);
    await limit(`write:${p.id}`, 500);
    if (action === "start") {
      const auto = body.auto === null || body.auto === undefined ? null : Number(body.auto);
      return json(await rpc("moonshot_start_round", { p_pilot: p.id, p_auto: auto, p_key: String(body.key ?? "") }));
    }
    if (action === "cash")
      return json(await rpc("moonshot_read_round", { p_pilot: p.id, p_id: String(body.id ?? ""), p_cash: true }));
    if (action === "friend") {
      if (typeof body.identifier !== "string" || body.identifier.length > 100)
        throw new GameError("Enter a pilot ID, FID or wallet address.");
      const value = body.identifier.trim().toLowerCase().replace(/^fid:/, "");
      let q = db().from("moonshot_pilots").select("id");
      if (/^\d+$/.test(value)) q = q.eq("fid", Number(value));
      else if (/^0x[0-9a-f]{40}$/.test(value)) q = q.eq("wallet", value);
      else if (/^[a-f0-9-]{36}$/.test(value)) q = q.eq("id", value);
      else throw new GameError("Enter a pilot ID, FID or wallet address.");
      const { data: friend } = await q.maybeSingle();
      if (!friend) throw new GameError("That pilot has not signed in yet. Invite them to play first.");
      if (friend.id === p.id) throw new GameError("That is your own pilot.");
      if (body.remove) await db().from("moonshot_friends").delete().eq("pilot_id", p.id).eq("friend_id", friend.id);
      else
        must(
          await db()
            .from("moonshot_friends")
            .upsert({ pilot_id: p.id, friend_id: friend.id }, { onConflict: "pilot_id,friend_id", ignoreDuplicates: true }),
        );
      return json({ ok: true });
    }
    if (action === "equip") {
      if (!LOOKS.some((l) => l.id === body.look)) throw new GameError("Unknown look.");
      const { data: owned } = await db().from("moonshot_entitlements").select("pack").eq("pilot_id", p.id).eq("pack", PACK.id);
      if (body.look !== "base" && !owned?.length) throw new GameError("Unlock the cosmetic pack to equip this look.", 403);
      must(await db().from("moonshot_pilots").update({ equipped: body.look }).eq("id", p.id));
      return json({ ok: true });
    }
    if (action === "order") {
      if (!checkoutEnabled()) throw new GameError("Checkout opens when the game launches.", 503);
      if (!p.wallet) throw new GameError("Link a wallet to your pilot before checking out.");
      const head = await chainClient.getBlockNumber({ cacheTime: 0 });
      const order = await rpc("moonshot_create_order", { p_pilot: p.id, p_payer: p.wallet, p_start_block: Number(head) });
      return json({ id: order.id, payer: order.payer, expiresAt: Number(order.expiresAt), hash: order.hash, pack: PACK });
    }
    if (action === "payment") {
      if (!checkoutEnabled()) throw new GameError("Checkout opens when the game launches.", 503);
      if (typeof body.hash !== "string" || !/^0x[0-9a-f]{64}$/i.test(body.hash)) throw new GameError("Enter a valid transaction hash.");
      const { data: order } = await db().from("moonshot_orders").select("*").eq("id", String(body.id ?? "")).eq("pilot_id", p.id).maybeSingle();
      if (!order) throw new GameError("Checkout not found.", 404);
      const txHash = body.hash.toLowerCase();
      if (order.status === "paid") {
        if (order.tx_hash !== txHash) throw new GameError("This order has already been paid.");
        return json({ ok: true });
      }
      await paymentProof(txHash as Hex, order);
      await rpc("moonshot_settle_payment", { p_pilot: p.id, p_order: order.id, p_hash: txHash });
      return json({ ok: true });
    }
    throw new GameError("Not found.", 404);
  } catch (e) {
    if (e instanceof GameError) return json({ error: e.message }, e.status);
    console.error("[moonshot]", e instanceof Error ? e.message : "Request failed");
    return json({ error: "The server could not complete that request. Please try again." }, 503);
  }
}

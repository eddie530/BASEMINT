// End-to-end check of MOONSHOT ranked rules against a running server.
// Signs in with throwaway, never-funded keys (a SIWE message signature only —
// no transaction, approval or transfer is ever created).
// Usage: bun scripts/moonshot-ranked.e2e.mjs [baseUrl]
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";

const BASE = process.argv[2] ?? "http://localhost:8080";
const API = `${BASE}/api/public/moonshot`;
let failures = 0;
const check = (name, ok, extra = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? `  (${extra})` : ""}`);
  if (!ok) failures++;
};

function client() {
  const jar = new Map();
  const call = async (path, body, headers = {}) => {
    const r = await fetch(`${API}/${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        origin: BASE,
        "content-type": "application/json",
        cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; "),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    for (const c of r.headers.getSetCookie?.() ?? []) {
      const [kv] = c.split(";");
      const [k, v] = kv.split("=");
      jar.set(k, v);
    }
    return { status: r.status, data: await r.json().catch(() => null) };
  };
  return { call, jar };
}

async function signIn() {
  const acct = privateKeyToAccount(generatePrivateKey());
  const c = client();
  const n = await c.call("nonce", { address: acct.address });
  const signature = await acct.signMessage({ message: n.data.message });
  const login = await c.call("wallet-login", { id: n.data.id, signature });
  const replay = await c.call("wallet-login", { id: n.data.id, signature });
  return { ...c, acct, login, replay, signature, nonceId: n.data.id };
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const a = await signIn();
check("wallet sign-in succeeds", a.login.status === 200, JSON.stringify(a.login.data));
check("nonce cannot be replayed", a.replay.status === 401);

const forged = client();
const fake = await forged.call("start", { auto: null, key: crypto.randomUUID() });
check("anonymous ranked start is rejected", fake.status === 401);

const cross = await a.call("start", { auto: null, key: crypto.randomUUID() }, { origin: "https://evil.example" });
check("cross-origin write is rejected", cross.status === 403);

const st0 = await a.call("state");
check("new pilot starts with 1000 credits / 0 used", st0.data?.daily?.balance === 1000 && st0.data?.daily?.used === 0);
check("checkout disabled by default", st0.data?.checkoutEnabled === false);

// Concurrency: same request key fired 5x in parallel must create one round.
const key = crypto.randomUUID();
const dup = await Promise.all(Array.from({ length: 5 }, () => a.call("start", { auto: 1.5, key })));
const ids = new Set(dup.map((d) => d.data?.id));
check("parallel retries of one launch create one round", ids.size === 1 && dup.every((d) => d.status === 200));
check("crash seed hidden while flying", dup[0].data.seed === null && dup[0].data.crash === null);
// Different keys while one is flying: still a single active round.
const other = await Promise.all(Array.from({ length: 3 }, () => a.call("start", { auto: null, key: crypto.randomUUID() })));
check("cannot open a second flight while one is active", other.every((o) => o.data?.id === dup[0].data.id));

// Ownership: another pilot cannot read or cash this round.
const b = await signIn();
const steal = await b.call("cash", { id: dup[0].data.id });
check("other pilot cannot cash my round", steal.status === 404);

// Fly all ten rounds (auto 1.5 banks or rugs server-side).
let last, paid = 0;
const cashed = [];
for (let i = 0; i < 10; i++) {
  let r = i === 0 ? dup[0].data : (await a.call("start", { auto: 1.5, key: crypto.randomUUID() })).data;
  while (r.status === "flying") {
    await sleep(700);
    r = (await a.call(`round?id=${r.id}`)).data;
  }
  if (i === 0) check("seed revealed after resolution", typeof r.seed === "string" && r.seed.length === 64);
  last = r;
  if (r.status === "cash" && r.multiplier > 1) cashed.push(r);
  paid += r.payout;
}
const st = await a.call("state");
check("ten rounds used", st.data.daily.used === 10 && st.data.daily.completed === 10, JSON.stringify(st.data.daily));
check("balance is 1000 - 10x100 + payouts", st.data.daily.balance === paid, `${st.data.daily.balance} vs ${paid}`);
const eleventh = await a.call("start", { auto: null, key: crypto.randomUUID() });
check("eleventh ranked flight is refused", eleventh.status === 409, eleventh.data?.error);

const board = await a.call("board?period=day&scope=all");
check("completed pilot appears on daily board", board.data.some((e) => e.you && e.score === st.data.daily.balance));
const bBoard = await b.call("board?period=day&scope=friends");
check("friends board excludes non-friends", !bBoard.data.some((e) => e.id === st.data.pilot.id));
const add = await b.call("friend", { identifier: a.acct.address });
const bBoard2 = await b.call("board?period=day&scope=friends");
check("adding a friend shows them on friends board", add.status === 200 && bBoard2.data.some((e) => e.id === st.data.pilot.id));

// Locker / payment guards.
const equip = await a.call("equip", { look: "acid" });
check("premium look needs the pack", equip.status === 403);
const order = await a.call("order", {});
check("checkout endpoint closed by default", order.status === 503);
const pay = await a.call("payment", { id: crypto.randomUUID(), hash: `0x${"ab".repeat(32)}` });
check("payment proof endpoint closed by default", pay.status === 503);

// Daily auto-bank recovery: a flight left open is settled on next read.
const fresh = await signIn();
const open = await fresh.call("start", { auto: 1.5, key: crypto.randomUUID() });
await sleep(4500);
const rec = await fresh.call("state");
check("abandoned flight auto-settles on return", rec.data.daily.active === null && rec.data.daily.completed === 1);

// Record disposable pilots so cleanup only ever touches these exact IDs.
const created = [];
for (const c of [a, b, fresh]) created.push((await c.call("state")).data.pilot.id);
(await import("node:fs")).writeFileSync("/tmp/moonshot-test-pilots.json", JSON.stringify(created));
console.log("disposable pilots:", created.join(","));

// Sharing: successful challenge HTML, PNG, invalid IDs.
const html = async (path) => (await fetch(`${BASE}${path}`)).text();
const meta = (h, attr, key) => h.match(new RegExp(`<meta[^>]*${attr}="${key}"[^>]*content="([^"]*)"`))?.[1]?.replace(/&quot;/g, '"').replace(/&amp;/g, "&");
if (!cashed.length) check("had a successful flight to share", false);
else {
  const win = cashed[0];
  const h = await html(`/moonshot/c/${win.id}`);
  const og = meta(h, "property", "og:image");
  check("challenge og:image is PNG card on current origin", og === `${BASE}/api/public/moonshot/card?id=${win.id}`, og);
  const fc = JSON.parse(meta(h, "name", "fc:miniapp") ?? "null");
  check("fc:miniapp launches /moonshot?challenge=id", fc?.button?.action?.url === `${BASE}/moonshot?challenge=${win.id}` && fc.button.action.type === "launch_miniapp", JSON.stringify(fc?.button?.action));
  check("fc:miniapp image is 3:2 embed card", fc?.imageUrl === `${BASE}/api/public/moonshot/card?id=${win.id}&format=embed`);
  check("challenge title shows banked multiplier", h.includes(`Beat ${win.multiplier.toFixed(2)}×`));
  for (const [q, hgt] of [["", 630], ["&format=embed", 800]]) {
    const r = await fetch(`${API}/card?id=${win.id}${q}`);
    const buf = new Uint8Array(await r.arrayBuffer());
    const dv = new DataView(buf.buffer);
    check(`card${q} is image/png 1200x${hgt}`, r.headers.get("content-type") === "image/png" && buf[1] === 80 && dv.getUint32(16) === 1200 && dv.getUint32(20) === hgt);
  }
  (await import("node:fs")).writeFileSync("/tmp/moonshot-challenge-id", win.id);
}
const rug = (await a.call("state")).data; // any rugged round id must not resolve
const bad = await html(`/moonshot/c/not-a-real-id`);
check("invalid challenge claims no success", bad.includes("challenge not found") && !meta(bad, "property", "og:image") && !bad.includes("verified MOONSHOT round"));
const missing = await html(`/moonshot/c/${crypto.randomUUID()}`);
check("unknown challenge claims no success", !meta(missing, "property", "og:image") && !meta(missing, "name", "fc:miniapp")?.includes("challenge="));
check("invalid card returns 404", (await fetch(`${API}/card?id=nope`)).status === 404);
console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
process.exit(failures ? 1 : 0);

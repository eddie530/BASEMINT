import { createServer } from "node:http";
import { createIndependentMocks } from "../src/lib/independent-mocks";
import { timingSafeEqual } from "node:crypto";
import { mkdirSync, existsSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { resolve } from "node:path";
const password = process.env.RESIDENT_PREVIEW_PASSWORD;
if (!password || password.length < 24) throw new Error("Preview password must be at least 24 characters");
const expected = Buffer.from("Basic " + Buffer.from("preview:" + password).toString("base64"));
const dir = resolve(process.env.RESIDENT_PREVIEW_STATE_DIR || ".resident-preview-local");
const origin = new URL(process.env.RESIDENT_PREVIEW_ORIGIN || "http://127.0.0.1:4179");
if (origin.href !== origin.origin + "/" || origin.username || origin.password || (origin.protocol !== "https:" && origin.origin !== "http://127.0.0.1:4179")) throw new Error("Invalid preview origin");
mkdirSync(dir, { recursive: true, mode: 0o700 });
const file = resolve(dir, "synthetic-account.json");
const mocks = createIndependentMocks();
if (existsSync(file)) {
  const saved = JSON.parse(readFileSync(file, "utf8"));
  if (saved.account !== "synthetic-preview" || saved.mode !== "mock" || saved.order !== "local-preview-order") throw new Error("Invalid synthetic state");
  mocks.checkout("local-preview-order", 4_990_000n);
}
function persist() {
  writeFileSync(file + ".tmp", JSON.stringify({account:"synthetic-preview",mode:"mock",order:"local-preview-order"}), {mode:0o600});
  renameSync(file + ".tmp", file);
}
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Resident Labs | Isolated Preview</title><style>body{background:#080d19;color:#e5efff;font:18px system-ui;max-width:640px;margin:48px auto;padding:20px}section{border:1px solid #344967;padding:24px;border-radius:16px}button{padding:12px;background:#8ecaff;color:#081020;border:0;border-radius:8px}small{color:#aabbd0}</style><h1>Resident Labs 3.0.7</h1><p>LOCAL SIMULATION ONLY — no real funds or accounts</p><section><h2>Resident Pro</h2><p>Mock wallet: 100 USDC fixture</p><p>4.99 USDC / 30 days</p><form method="post" action="/checkout"><button>Simulate checkout</button></form><p>Signing and transfers disabled.</p></section></html>`;
const server = createServer((req,res) => {
  res.setHeader("Cache-Control","no-store");
  res.setHeader("X-Robots-Tag","noindex, nofollow, noarchive");
  // Preserve same-origin form POST Origin; no referrer is sent cross-origin.
  res.setHeader("Referrer-Policy","same-origin");
  if (origin.protocol === "https:") res.setHeader("Strict-Transport-Security","max-age=86400");
  res.setHeader("Content-Security-Policy","default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
  res.setHeader("X-Content-Type-Options","nosniff");
  if (req.headers.host !== origin.host) { res.writeHead(403).end(); return; }
  const provided = Buffer.from(req.headers.authorization ?? "");
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    res.writeHead(401, {"WWW-Authenticate": 'Basic realm="Resident local preview"'}).end("Authentication required"); return;
  }
  if (req.method === "GET" && req.url === "/") { res.writeHead(200,{"Content-Type":"text/html; charset=utf-8"}).end(mocks.orders().length ? html.replace("</section>","<p role='status'>Simulated order recorded. No funds transferred.</p></section>") : html); return; }
  if (req.method === "POST" && req.url === "/checkout" && req.headers.origin === origin.origin) {
    mocks.checkout("local-preview-order",4_990_000n);
    persist();
    res.writeHead(200,{"Content-Type":"text/html; charset=utf-8"}).end(html.replace("</section>","<p role='status'>Simulated order recorded. No funds transferred.</p></section>")); return;
  }
  res.writeHead(403).end("Disabled in isolated preview");
});
server.listen(4179,"127.0.0.1");

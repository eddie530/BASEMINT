import { createServer } from "node:http";
import { createIndependentMocks } from "../src/lib/independent-mocks";
const mocks = createIndependentMocks();
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Resident Labs | Isolated Preview</title><style>body{background:#080d19;color:#e5efff;font:18px system-ui;max-width:640px;margin:48px auto;padding:20px}section{border:1px solid #344967;padding:24px;border-radius:16px}button{padding:12px;background:#8ecaff;color:#081020;border:0;border-radius:8px}small{color:#aabbd0}</style><h1>Resident Labs 3.0.5</h1><p>LOCAL SIMULATION ONLY — no real funds or accounts</p><section><h2>Resident Pro</h2><p>Mock wallet: 100 USDC fixture</p><p>4.99 USDC / 30 days</p><form method="post" action="/checkout"><button>Simulate checkout</button></form><p>Signing and transfers disabled.</p></section></html>`;
const server = createServer((req,res) => {
  res.setHeader("Cache-Control","no-store");
  res.setHeader("Content-Security-Policy","default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
  res.setHeader("X-Content-Type-Options","nosniff");
  if (req.headers.host !== "127.0.0.1:4179") { res.writeHead(403).end(); return; }
  if (req.method === "GET" && req.url === "/") { res.writeHead(200,{"Content-Type":"text/html; charset=utf-8"}).end(html); return; }
  if (req.method === "POST" && req.url === "/checkout" && req.headers.origin === "http://127.0.0.1:4179") {
    const order = mocks.checkout("local-preview-order",4_990_000n);
    res.writeHead(200,{"Content-Type":"text/html; charset=utf-8"}).end(html.replace("</section>","<p role='status'>Simulated order recorded. No funds transferred.</p></section>")); return;
  }
  res.writeHead(403).end("Disabled in isolated preview");
});
server.listen(4179,"127.0.0.1");

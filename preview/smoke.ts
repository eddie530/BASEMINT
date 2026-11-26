import assert from "node:assert/strict";
const base = "http://127.0.0.1:4179";
const password = process.env.RESIDENT_PREVIEW_PASSWORD;
assert.ok(password);
const Authorization = "Basic " + Buffer.from("preview:" + password).toString("base64");
assert.equal((await fetch(base)).status,401);
const home = await fetch(base,{headers:{Authorization}});
assert.equal(home.status,200);
assert.match(await home.text(),/LOCAL SIMULATION ONLY/);
assert.match(home.headers.get("content-security-policy") ?? "",/default-src 'none'/);
const checkout = await fetch(base+"/checkout",{method:"POST",headers:{Authorization,Origin:base}});
assert.equal(checkout.status,200);
assert.match(await checkout.text(),/No funds transferred/);
for (const path of ["/sign","/send","/api/payments","/api/auth","/api/mint"]) {
  assert.equal((await fetch(base+path,{method:"POST",headers:{Authorization,Origin:base}})).status,403);
}
assert.equal((await fetch(base+"/checkout",{method:"POST",headers:{Authorization,Origin:"https://example.com"}})).status,403);
console.log("Isolated HTTP smoke checks passed");

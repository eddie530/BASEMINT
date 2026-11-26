import assert from "node:assert/strict";
const base = "http://127.0.0.1:4179";
const home = await fetch(base);
assert.equal(home.status,200);
assert.match(await home.text(),/LOCAL SIMULATION ONLY/);
assert.match(home.headers.get("content-security-policy") ?? "",/default-src 'none'/);
const checkout = await fetch(base+"/checkout",{method:"POST",headers:{Origin:base}});
assert.equal(checkout.status,200);
assert.match(await checkout.text(),/No funds transferred/);
for (const path of ["/sign","/send","/api/payments","/api/auth","/api/mint"]) {
  assert.equal((await fetch(base+path,{method:"POST",headers:{Origin:base}})).status,403);
}
assert.equal((await fetch(base+"/checkout",{method:"POST",headers:{Origin:"https://example.com"}})).status,403);
console.log("Isolated HTTP smoke checks passed");

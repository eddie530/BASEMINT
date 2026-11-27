const { chromium, webkit } = require("playwright");
const assert = require("node:assert/strict");
const origin = "http://127.0.0.1:4179";
(async () => {
 const password = process.env.RESIDENT_PREVIEW_PASSWORD;
 assert.ok(password && password.length >= 24);
 for (const engine of [chromium, webkit]) {
  const browser = await engine.launch({headless:true});
  try {
   for (const viewport of [{width:1280,height:800},{width:390,height:844}]) {
    const label = engine.name() + " " + viewport.width + "x" + viewport.height;
    console.log("Starting " + label);
    const context = await browser.newContext({viewport,httpCredentials:{username:"preview",password,origin},serviceWorkers:"block"});
    const external = [];
    try {
     await context.route("**/*", route => {
      if (new URL(route.request().url()).origin !== origin) { external.push(new URL(route.request().url()).origin); return route.abort(); }
      return route.continue();
     });
     const page = await context.newPage();
     page.on("response", response => {
      if (new URL(response.url()).origin === origin) console.log(label, response.request().method(), new URL(response.url()).pathname, response.status());
     });
     const home = await page.goto(origin + "/");
     assert.equal(home.status(),200,label + " authenticated home");
     const [checkout] = await Promise.all([
      page.waitForResponse(response => response.url() === origin + "/checkout" && response.request().method() === "POST"),
      page.getByRole("button",{name:"Simulate checkout"}).click()
     ]);
     assert.equal(checkout.status(),200,label + " checkout HTTP response");
     await page.waitForLoadState("domcontentloaded");
     await page.getByRole("status").waitFor({timeout:10000});
     assert.match(await page.getByRole("status").innerText(),/No funds transferred/);
     assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth));
     assert.deepEqual(external,[]);
     console.log("Passed " + label);
    } finally { await context.close(); }
   }
  } finally { await browser.close(); }
 }
})().catch(error=>{console.error(error);process.exitCode=1});

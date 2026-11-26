const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
 const browser = await chromium.launch({headless:true});
 try {
  for (const viewport of [{width:1280,height:800},{width:390,height:844}]) {
   const context = await browser.newContext({viewport,httpCredentials:{username:"preview",password:process.env.RESIDENT_PREVIEW_PASSWORD},serviceWorkers:"block"});
   const external = [];
   await context.route("**/*", route => {
    if (new URL(route.request().url()).origin !== "http://127.0.0.1:4179") { external.push(route.request().url()); return route.abort(); }
    return route.continue();
   });
   const page = await context.newPage();
   await page.goto("http://127.0.0.1:4179/");
   await page.getByRole("button",{name:"Simulate checkout"}).click();
   await page.getByRole("status").waitFor();
   assert.match(await page.getByRole("status").innerText(),/No funds transferred/);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth));
   assert.deepEqual(external,[]);
   await context.close();
  }
 } finally { await browser.close(); }
 console.log("Desktop and mobile Chromium viewport checks passed");
})().catch(error=>{console.error(error);process.exitCode=1});

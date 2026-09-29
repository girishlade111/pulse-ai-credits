const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_BIN });
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  p.on("response", async (r) => {
    if (r.url().includes("/api/apinex")) console.log("PROXY:", r.status(), r.headers()["content-type"]);
  });
  await p.goto("http://localhost:8081/workspace", { waitUntil: "networkidle" });
  await p.evaluate(() => localStorage.clear());
  await p.reload({ waitUntil: "networkidle" });
  const c = p.locator("textarea[aria-label='Message Pulse agent']");
  await c.fill("Give me a runnable JavaScript example of retrying a fetch with exponential backoff, inside a single fenced code block. Then explain it in one short paragraph.");
  await c.press("Enter");
  await p.waitForSelector(".bubble-agent", { timeout: 40000 });
  await p.waitForTimeout(25000);
  console.log("status:", await p.locator(".bubble-agent").first().getAttribute("data-chat-status"));
  console.log("TEXT:", (await p.locator(".bubble-agent").first().innerText()).slice(0, 600));
  await b.close();
})();

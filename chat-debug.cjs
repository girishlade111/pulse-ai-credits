const { chromium } = require("playwright");
const BASE = "http://localhost:8081";

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
  page.on("console", (m) => {
    if (m.type() === "error") console.log("CONSOLE-ERR:", m.text());
  });

  await page.goto(`${BASE}/workspace`, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });

  const c = page.locator("textarea[aria-label='Message Pulse agent']");
  await c.fill("Write a detailed markdown report about vector databases with 5 bullet points.");
  await c.press("Enter");

  // capture every network response from the proxy
  page.on("response", async (res) => {
    if (res.url().includes("/api/apinex")) {
      console.log("PROXY", res.status(), res.headers()["content-type"]);
    }
  });

  await page.waitForSelector(".bubble-agent", { timeout: 60000 });
  for (let i = 0; i < 30; i += 1) {
    const t = await page.locator(".bubble-agent").first().innerText();
    console.log(`[${i}] streaming=${await page.locator(".md-streaming").count()} len=${t.length}`);
    if (!(await page.locator(".md-streaming").count()) && i > 3) {
      console.log("\n=== FINAL REPLY TEXT ===\n" + t + "\n=== END ===\n");
      break;
    }
    await page.waitForTimeout(300);
  }
  await browser.close();
})();

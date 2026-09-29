/**
 * Is the first-prompt fault ours or the provider's?
 *
 * Adds spacing between turns (to clear RPM windows) and tries every provider,
 * logging exactly what was sent and what came back.
 */
const { chromium } = require("playwright");
const BASE = "http://localhost:8080";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

  const errors = [];
  await page.route("**/api/llm/**", async (route) => {
    const req = route.request();
    if (req.method() !== "POST" || !req.url().includes("chat/completions")) {
      return route.continue();
    }
    const body = JSON.parse(req.postData() || "{}");
    const convo = (body.messages || [])
      .filter((m) => m.role !== "system")
      .map((m) => `${m.role === "user" ? "U" : "A"}:${m.content.slice(0, 40).replace(/\n/g, " ")}`)
      .join(" | ");
    console.log(`    sent -> ${convo}`);
    return route.continue();
  });

  await page.goto(`${BASE}/workspace`, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(600);

  const composer = page.locator("textarea[aria-label='Message Pulse agent']");

  const ask = async (label, text) => {
    await composer.fill(text);
    await composer.press("Enter");
    const n = await page.locator(".bubble-agent").count();
    try {
      await page.waitForFunction(
        (i) => {
          const el = document.querySelectorAll(".bubble-agent")[i];
          return el && el.dataset.chatStatus !== "streaming";
        },
        n - 1,
        { timeout: 150000 }
      );
    } catch {
      errors.push(`${label}: timed out`);
      return "";
    }
    const el = page.locator(".bubble-agent").nth(n - 1);
    const status = await el.getAttribute("data-chat-status");
    const text2 = (await el.innerText()).replace(/\s+/g, " ").trim();
    const answer = text2.replace(/\s*(Regenerate|Copy|Export|Goodful|Not helpful).*$/, "").trim();
    console.log(`    ${label} [${status}]: ${answer.slice(0, 120)}`);
    return answer;
  };

  for (const provider of ["atria", "inception", "mistral"]) {
    console.log(`\n${"=".repeat(64)}\nPROVIDER: ${provider}`);
    await page.evaluate((p) => {
      localStorage.setItem("pulseai-llm-provider", p);
    }, provider);
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(700);

    const a1 = await ask("turn 1", "What is the capital of France? One word.");
    await sleep(9000);
    const a2 = await ask("turn 2", "What is the capital of Japan? One word.");
    await sleep(9000);
    const a3 = await ask("turn 3", "Largest ocean on Earth? One word.");

    const verdict = [];
    /Paris/i.test(a1) ? verdict.push("t1 ok") : verdict.push(`t1 BAD (${a1.slice(0, 50)})`);
    /Japan|Tokyo/i.test(a2) ? verdict.push("t2 ok") : verdict.push(`t2 BAD (${a2.slice(0, 50)})`);
    a1 && a1 === a2 ? verdict.push("t2 REPEATED t1") : null;
    /Pacific/i.test(a3) ? verdict.push("t3 ok") : verdict.push(`t3 BAD (${a3.slice(0, 50)})`);
    console.log(`  VERDICT: ${verdict.join("  |  ")}`);
  }

  console.log(`\ntimeouts: ${errors.length ? errors.join("; ") : "none"}`);
  await browser.close();
})().catch((e) => {
  console.error("crashed:", e);
  process.exit(2);
});

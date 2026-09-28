/** Captures the landing and empty-chat views for visual review. */
const { chromium } = require("playwright");
const BASE = "http://localhost:8081";
const OUT = "C:/Users/GIRISH~1/AppData/Local/Temp/opencode/shots";

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto(`${BASE}/workspace`, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/v-01-landing.png` });

  // landing with a tool selected
  await page.locator("button[aria-label='Choose a tool']").click();
  await page.waitForTimeout(300);
  await page.locator("[role='option']", { hasText: "Deep Research" }).first().click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/v-02-landing-mode.png` });

  // A long run so the chat shell has a real transcript to show.
  await page.locator("textarea[aria-label='Message Pulse agent']").fill(
    "Write a detailed engineering report on vector databases with an executive summary, six findings, a numbered deployment plan, a quotation and a JavaScript code example."
  );
  await page.locator("textarea[aria-label='Message Pulse agent']").press("Enter");
  await page.waitForFunction(
    () => {
      const n = document.querySelectorAll(".bubble-agent");
      return n.length && n[n.length - 1].dataset.chatStatus === "complete";
    },
    null,
    { timeout: 120000 }
  );

  // empty chat view (centred welcome)
  await page.getByRole("button", { name: "Start a new chat" }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/v-03-empty-chat.png` });

  // long transcript, scrolled to the top
  await page.screenshot({ path: `${OUT}/v-04-long-top.png` });
  await page.evaluate(() => {
    const pane = document.querySelector(".app-scroll");
    if (pane) pane.scrollTop = 0;
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/v-05-scrolled-up.png` });

  // composer expanded with a long draft
  await page.evaluate(() => {
    const pane = document.querySelector(".app-scroll");
    if (pane) pane.scrollTop = pane.scrollHeight;
  });
  await page.locator("textarea[aria-label='Message Pulse agent']").fill(
    "Here is a long draft that should make the composer grow to several lines so we can see whether it pushes the transcript or scrolls internally without breaking the layout at all."
  );
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/v-06-composer-expanded.png` });

  // low-credit state
  await page.evaluate(() => {
    const raw = localStorage.getItem("pulseai-workspace");
    if (!raw) return;
    const parsed = JSON.parse(raw);
    parsed.credits.current_credits = 1;
    localStorage.setItem("pulseai-workspace", JSON.stringify(parsed));
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  await page.locator("button[aria-label='Choose a tool']").click();
  await page.waitForTimeout(300);
  await page.locator("[role='option']", { hasText: "Deep Research" }).first().click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/v-07-low-credits.png` });

  await browser.close();
  console.log("visual captures done");
})();

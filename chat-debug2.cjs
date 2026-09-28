const { chromium } = require("playwright");
const BASE = "http://localhost:8081";

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));

  await page.goto(`${BASE}/workspace`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  console.log("--- mobile, fresh (no localStorage) ---");
  console.log("buttons:", await page.locator("button[aria-label]").evaluateAll(
    (els) => els.map((e) => e.getAttribute("aria-label"))
  ));
  console.log("has aside:", await page.locator("aside[aria-label='Chat history']").count());

  // now seed a session + chat view flag, then reload
  await page.evaluate(() => {
    const now = new Date().toISOString();
    localStorage.setItem(
      "pulseai-chat-sessions-v1",
      JSON.stringify({
        activeId: "chat_1",
        sessions: [
          {
            id: "chat_1",
            title: "Seeded chat",
            createdAt: now,
            updatedAt: now,
            messages: [
              { id: "m1", role: "user", text: "hello there", createdAt: now, status: "complete" },
              { id: "m2", role: "assistant", text: "hi", createdAt: now, status: "complete" },
            ],
          },
        ],
      })
    );
    localStorage.setItem("pulseai-chat-view-v1", "1");
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  console.log("\n--- mobile, after seeding a chat + view flag ---");
  console.log("has aside:", await page.locator("aside[aria-label='Chat history']").count());
  console.log("turns:", await page.locator(".chat-turn").count());
  console.log("buttons with aria-label:", await page.locator("button[aria-label]").evaluateAll(
    (els) => els.map((e) => e.getAttribute("aria-label"))
  ));
  const hdr = await page.locator(".sticky").evaluateAll((els) =>
    els.map((e) => e.className)
  );
  console.log("sticky elements:", hdr);

  await page.screenshot({ path: "C:/Users/GIRISH~1/AppData/Local/Temp/opencode/shots/dbg-mobile.png" });
  await browser.close();
})();

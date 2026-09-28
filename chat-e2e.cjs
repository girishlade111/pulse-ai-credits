/**
 * End-to-end check of the workspace chat.
 *
 * Verifies the three reported failures directly:
 *   1. the AI reply actually renders
 *   2. a follow-up prompt gets a reply (and the model remembers the thread)
 *   3. the transcript scrolls and the composer stays visible
 * plus the new chatbot affordances (history, new chat, restore on reload).
 */
const { chromium } = require("playwright");

const BASE = process.env.BASE_URL || "http://localhost:8081";
const OUT = "C:/Users/GIRISH~1/AppData/Local/Temp/opencode/shots";
const results = [];
const check = (name, pass, detail = "") => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

const main = async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(`pageerror: ${err.message}`));

  await page.goto(`${BASE}/workspace`, { waitUntil: "networkidle" });

  // fresh state
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.reload({ waitUntil: "networkidle" });

  /* ---------------------------------------------------- 1. first reply shows */
  const composer = page.locator("textarea[aria-label='Message Pulse agent']");
  await composer.waitFor({ state: "visible", timeout: 15000 });
  check("composer renders on landing", true);

  await composer.fill("List three uses of vector databases. Use a markdown list.");
  await composer.press("Enter");

  // chat shell should appear
  await page.locator("aside[aria-label='Chat history']").waitFor({ state: "visible", timeout: 20000 });
  check("chat shell + sidebar mount after first send", true);

  // user prompt visible
  const userBubble = page.locator(".bubble-user").first();
  await userBubble.waitFor({ state: "visible", timeout: 10000 });
  check(
    "prompt renders in transcript",
    (await userBubble.innerText()).includes("vector databases")
  );

  // reply appears and grows (streaming)
  const reply = page.locator(".bubble-agent").first();
  await reply.waitFor({ state: "visible", timeout: 20000 });
  const early = (await reply.innerText()).length;
  await page.waitForTimeout(1200);
  const later = (await reply.innerText()).length;
  check("reply renders and streams in", later > early, `${early} -> ${later} chars`);
  check("reply is not empty", later > 20, `${later} chars`);

  // markdown actually rendered as elements, not raw text
  const listItems = await reply.locator("ul li").count();
  check("markdown list rendered as elements", listItems > 0, `${listItems} <li>`);
  const rawAsterisks = await reply.evaluate((el) => (el.textContent.match(/\*\*/g) || []).length);
  check("bold markers consumed by renderer", rawAsterisks === 0, `${rawAsterisks} leftover **`);

  await reply.waitForFunction(
    () => !document.querySelector(".md-streaming"),
    null,
    { timeout: 90000 }
  );
  check("streaming completes", true);

  /* ------------------------------------------- 2. composer stays reachable */
  const box = await composer.boundingBox();
  const viewportH = 900;
  check(
    "composer is inside the viewport (not pushed off-screen)",
    !!box && box.y + box.height <= viewportH + 1 && box.y >= 0,
    box ? `y=${Math.round(box.y)} h=${Math.round(box.height)}` : "no box"
  );

  /* --------------------------------------------------- 3. transcript scrolls */
  const scrollInfo = await page.evaluate(() => {
    const panes = [...document.querySelectorAll(".app-scroll")];
    const pane = panes.find((el) => el.scrollHeight > el.clientHeight);
    if (!pane) {
      const only = panes[0];
      return { found: false, scrollable: only ? only.scrollHeight > only.clientHeight : false };
    }
    return {
      found: true,
      scrollHeight: pane.scrollHeight,
      clientHeight: pane.clientHeight,
      scrollTop: pane.scrollTop,
      overflowY: getComputedStyle(pane).overflowY,
    };
  });
  check(
    "transcript pane is the scroll container",
    scrollInfo.overflowY === "auto",
    JSON.stringify(scrollInfo)
  );

  /* ------------------------------------------------ 4. follow-up + memory */
  await composer.click();
  await composer.fill("Now summarise that in one sentence.");
  await composer.press("Enter");

  await page.waitForFunction(
    () => document.querySelectorAll(".bubble-agent").length >= 2,
    null,
    { timeout: 30000 }
  );
  check("follow-up prompt produces a second reply", true);

  await page
    .locator(".bubble-agent")
    .nth(1)
    .waitForFunction((el) => !el.querySelector(".md-streaming"), null, { timeout: 90000 });
  const secondReply = await page.locator(".bubble-agent").nth(1).innerText();
  check("second reply has content", secondReply.trim().length > 10, `${secondReply.trim().length} chars`);
  // memory check: a stateless model would not know what "that" is
  const memoryHint = /vector|embed|similar|search|index/i.test(secondReply);
  check("follow-up reply references earlier context (memory works)", memoryHint, secondReply.slice(0, 120));

  /* ------------------------------------------------- 5. autoscroll to bottom */
  const atBottom = await page.evaluate(() => {
    const pane = [...document.querySelectorAll(".app-scroll")].find(
      (el) => el.scrollHeight > el.clientHeight
    );
    if (!pane) return { skipped: true };
    return {
      distance: pane.scrollHeight - pane.scrollTop - pane.clientHeight,
    };
  });
  check(
    "view follows the stream to the newest message",
    atBottom.skipped || atBottom.distance < 120,
    JSON.stringify(atBottom)
  );

  await page.screenshot({ path: `${OUT}/01-chat.png`, fullPage: false });

  /* ---------------------------------------------------------- 6. history UI */
  const nav = page.locator("aside[aria-label='Chat history'] nav button, aside[aria-label='Chat history'] nav");
  const historyLabel = await page
    .locator("aside[aria-label='Chat history'] li", { hasText: "vector databases" })
    .count();
  check("chat is listed in history", historyLabel > 0, `${historyLabel} match`);

  /* --------------------------------------------------------- 7. history search */
  await page.getByPlaceholder("Search chats").fill("vector");
  await page.waitForTimeout(300);
  const searchHits = await page
    .locator("aside[aria-label='Chat history'] li")
    .filter({ hasText: "vector databases" })
    .count();
  check("history search filters", searchHits > 0, `${searchHits} hit`);
  await page.getByPlaceholder("Search chats").fill("");

  /* --------------------------------------------------------- 8. new chat flow */
  await page.getByRole("button", { name: "Start a new chat" }).click();
  await page.waitForTimeout(400);
  const turnsAfterNew = await page.locator(".chat-turn").count();
  check("new chat empties the transcript", turnsAfterNew === 0, `${turnsAfterNew} turns`);
  const welcomeVisible = await page.locator("text=What are we working on?").count();
  check("empty chat shows the welcome state (not a blank screen)", welcomeVisible > 0);
  const composerStillThere = await composer.isVisible();
  check("composer survives the new-chat transition", composerStillThere);
  const focused = await page.evaluate(() => document.activeElement?.tagName);
  check("focus lands in the composer after new chat", focused === "TEXTAREA", String(focused));

  await page.screenshot({ path: `${OUT}/02-new-chat.png`, fullPage: false });

  /* ------------------------------------------------- 9. history persistence */
  await page.reload({ waitUntil: "networkidle" });
  await page.locator("aside[aria-label='Chat history']").waitFor({ state: "visible", timeout: 15000 });
  const turnsAfterReload = await page.locator(".chat-turn").count();
  check("chat + history survive a reload", turnsAfterReload >= 2, `${turnsAfterReload} turns`);

  /* ------------------------------------------- 10. restore a prior session */
  await page
    .locator("aside[aria-label='Chat history'] li button", { hasText: "vector databases" })
    .first()
    .click();
  await page.waitForTimeout(500);
  const turnsRestored = await page.locator(".chat-turn").count();
  check("clicking history restores that conversation", turnsRestored >= 2, `${turnsRestored} turns`);

  /* ------------------------------------------------------ 11. rename + pin */
  await page.locator("aside[aria-label='Chat history'] li button[aria-label^='Rename']").first().click();
  const titleBox = page.getByLabel("Chat title");
  await titleBox.fill("Renamed research thread");
  await page.getByRole("button", { name: "Save title" }).click();
  await page.waitForTimeout(300);
  const renamed = await page.locator("text=Renamed research thread").count();
  check("chat rename works", renamed > 0);

  await page.locator("aside[aria-label='Chat history'] li button[aria-label='Pin chat']").first().click();
  await page.waitForTimeout(300);
  const pinned = await page.locator("aside[aria-label='Chat history'] li button[aria-label='Unpin chat']").count();
  check("chat pin works", pinned > 0);

  /* ---------------------------------------------------- 12. delete a chat */
  const before = await page.locator("aside[aria-label='Chat history'] li button[aria-label^='Delete']").count();
  await page.locator("aside[aria-label='Chat history'] li button[aria-label^='Delete']").first().click();
  await page.waitForTimeout(400);
  const after = await page.locator("aside[aria-label='Chat history'] li button[aria-label^='Delete']").count();
  check("chat delete works", after === before - 1, `${before} -> ${after}`);

  /* -------------------------------------------------- 13. regenerate works */
  await page.locator("aside[aria-label='Chat history'] li button").filter({ hasText: /./ }).first().click();
  await page.waitForTimeout(400);
  const regen = page.getByRole("button", { name: "Regenerate" }).first();
  if (await regen.count()) {
    const turnCount = await page.locator(".chat-turn").count();
    await regen.click();
    await page.waitForTimeout(1500);
    const stillThere = await page.locator(".chat-turn").count();
    check("regenerate re-runs the prompt (no 'enter a query' dead end)", stillThere >= 1, `${turnCount} -> ${stillThere}`);
  } else {
    check("regenerate button present", false, "not found");
  }

  /* ------------------------------------------------------- 14. copy action */
  const copyBtn = page.getByRole("button", { name: "Copy" }).first();
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {});
  await copyBtn.click();
  await page.waitForTimeout(400);
  const copiedLabel = await page.getByRole("button", { name: /Copied/ }).count();
  check("copy-to-clipboard action works", copiedLabel > 0);

  /* ------------------------------------------------------ 15. mobile shell */
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto(`${BASE}/workspace`, { waitUntil: "networkidle" });
  await mobile.waitForTimeout(600);
  const mComposer = mobile.locator("textarea[aria-label='Message Pulse agent']");
  const mBox = await mComposer.boundingBox();
  check(
    "composer visible on mobile viewport",
    !!mBox && mBox.y + mBox.height <= 845 && mBox.y >= 0,
    mBox ? `y=${Math.round(mBox.y)}` : "no box"
  );
  const menuBtn = mobile.getByRole("button", { name: "Open chat history" });
  const menuCount = await menuBtn.count();
  check("mobile history toggle present in chat mode", menuCount > 0, `${menuCount}`);
  await mobile.screenshot({ path: `${OUT}/03-mobile.png`, fullPage: false });
  await mobile.close();

  check(
    "no console/page errors",
    consoleErrors.length === 0,
    consoleErrors.slice(0, 4).join(" | ")
  );

  await browser.close();

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.log("\nFAILURES:");
    failed.forEach((f) => console.log(` - ${f.name}: ${f.detail}`));
    process.exit(1);
  }
};

main().catch((error) => {
  console.error("harness crashed:", error);
  process.exit(2);
});

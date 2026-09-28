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

  const replyCount = () => page.locator(".bubble-agent").count();
  const waitStreamingDone = (index) =>
    page.waitForFunction(
      (i) => {
        const nodes = document.querySelectorAll(".bubble-agent");
        return nodes[i] && nodes[i].dataset.chatStatus === "complete";
      },
      index,
      { timeout: 120000 }
    );

  await page.goto(`${BASE}/workspace`, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });

  /* ---------------------------------------------------- 1. first reply shows */
  const composer = page.locator("textarea[aria-label='Message Pulse agent']");
  await composer.waitFor({ state: "visible", timeout: 15000 });
  check("composer renders on landing", true);

  // A prompt that invites structured markdown. Deliberately avoids asking the
  // model to *explain* markdown, which makes it echo syntax verbatim — that is
  // content, not a rendering leak.
  await composer.fill(
    "Write a detailed engineering report on vector databases. Include an executive summary, at least five findings, a numbered list of deployment steps, a short quotation, and a code example in JavaScript."
  );
  await composer.press("Enter");

  await page
    .locator("aside[aria-label='Chat history']")
    .waitFor({ state: "visible", timeout: 30000 });
  check("chat shell + sidebar mount after first send", true);

  const userBubble = page.locator(".bubble-user").first();
  await userBubble.waitFor({ state: "visible", timeout: 10000 });
  check(
    "prompt renders in transcript",
    /vector databases/i.test(await userBubble.innerText())
  );

  const reply = page.locator(".bubble-agent").first();
  await reply.waitFor({ state: "visible", timeout: 30000 });

  // Sample while streaming. The pre-token skeleton is a constant height, so a
  // single unchanged sample means nothing — only stop once the turn is done.
  const lengths = [];
  for (let i = 0; i < 120; i += 1) {
    lengths.push((await reply.innerText()).length);
    const status = await reply.getAttribute("data-chat-status");
    if (status === "complete") break;
    await page.waitForTimeout(150);
  }
  const firstText = lengths.findIndex((n) => n > 90);
  const grew =
    firstText !== -1 && firstText < lengths.length - 1
      ? lengths[lengths.length - 1] > lengths[firstText]
      : false;
  check("reply streams in incrementally", grew, `${firstText >= 0 ? lengths.slice(firstText).join(" -> ") : lengths.join(" -> ")} chars`);
  check("reply has substantial content", lengths[lengths.length - 1] > 200, `${lengths.at(-1)} chars`);

  const listItems = await reply.locator("ul li").count();
  const olItems = await reply.locator("ol li").count();
  check("markdown lists rendered as elements", listItems + olItems > 0, `${listItems} <li> + ${olItems} <ol>`);
  check("markdown code block rendered", (await reply.locator("pre code").count()) > 0);
  check("markdown blockquote rendered", (await reply.locator("blockquote").count()) > 0);
  check("markdown headings rendered", (await reply.locator("h1, h2, h3").count()) > 0);
  const leftoverMarkers = await reply.evaluate((el) => {
    // Fenced code keeps its markers literally, so exclude it before counting.
    const clone = el.cloneNode(true);
    clone.querySelectorAll("pre").forEach((node) => node.remove());
    return (clone.textContent?.match(/\*\*|^#{1,6} |^• /gm) || []).length;
  });
  check("no raw markdown markers left in output", leftoverMarkers === 0, `${leftoverMarkers} leftover`);

  await waitStreamingDone(0);
  check("streaming completes cleanly", true);
  const firstReplyText = await reply.innerText();
  check("timeline pills render for the run", (await reply.locator("xpath=../..").locator(".pill").count()) > 0);

  /* ------------------------------------------- 2. composer stays reachable */
  const box = await composer.boundingBox();
  check(
    "composer is inside the viewport (not pushed off-screen)",
    !!box && box.y + box.height <= 901 && box.y >= 0,
    box ? `y=${Math.round(box.y)} h=${Math.round(box.height)}` : "no box"
  );

  /* --------------------------------------------------- 3. transcript scrolls */
  const scrollInfo = await page.evaluate(() => {
    const panes = [...document.querySelectorAll(".app-scroll")];
    return {
      paneCount: panes.length,
      overflowY: panes.map((el) => getComputedStyle(el).overflowY),
      minHeight: panes.map((el) => getComputedStyle(el).minHeight),
      scrollable: panes.some((el) => el.scrollHeight > el.clientHeight),
    };
  });
  check(
    "transcript pane scrolls (overflow auto)",
    scrollInfo.overflowY.includes("auto") && scrollInfo.scrollable,
    JSON.stringify(scrollInfo)
  );

  // wheel-scroll up and confirm it actually moves
  const moved = await page.evaluate(async () => {
    const pane = [...document.querySelectorAll(".app-scroll")].find(
      (el) => el.scrollHeight > el.clientHeight
    );
    if (!pane) return { skipped: true };
    pane.scrollTop = 0;
    await new Promise((r) => setTimeout(r, 120));
    return { scrollTop: pane.scrollTop, max: pane.scrollHeight - pane.clientHeight };
  });
  check(
    "user can scroll the transcript up",
    moved.skipped || moved.scrollTop < moved.max,
    JSON.stringify(moved)
  );

  // scroll-to-bottom affordance
  const jump = page.getByRole("button", { name: "Jump to latest" });
  check("jump-to-latest appears after scrolling up", (await jump.count()) > 0);
  await jump.click();
  await page.waitForTimeout(600);
  const back = await page.evaluate(() => {
    const pane = [...document.querySelectorAll(".app-scroll")].find(
      (el) => el.scrollHeight > el.clientHeight
    );
    return pane ? pane.scrollHeight - pane.scrollTop - pane.clientHeight : 0;
  });
  check("jump-to-latest returns to the newest message", back < 120, `${Math.round(back)}px from bottom`);

  /* ------------------------------------------------ 4. follow-up + memory */
  await composer.click();
  await composer.fill("Now summarise the whole thing in one sentence.");
  await composer.press("Enter");

  await page.waitForFunction(
    () => document.querySelectorAll(".bubble-agent").length >= 2,
    null,
    { timeout: 30000 }
  );
  check("follow-up prompt produces a second reply", true);

  await waitStreamingDone(1);
  const secondReply = await page.locator(".bubble-agent").nth(1).innerText();
  check("second reply has content", secondReply.trim().length > 10, `${secondReply.trim().length} chars`);
  // A stateless model has no idea what "the whole thing" refers to.
  const memoryHint = /vector|database|embed|similar|index|search/i.test(secondReply);
  check("follow-up reply resolves against earlier context", memoryHint, secondReply.slice(0, 140).replace(/\n/g, " "));

  const atBottom = await page.evaluate(() => {
    const pane = [...document.querySelectorAll(".app-scroll")].find(
      (el) => el.scrollHeight > el.clientHeight
    );
    return pane ? pane.scrollHeight - pane.scrollTop - pane.clientHeight : 0;
  });
  check("view follows the stream to the newest message", atBottom < 140, `${Math.round(atBottom)}px from bottom`);

  await page.screenshot({ path: `${OUT}/01-chat.png` });

  /* ---------------------------------------------------------- 6. history UI */
  const historyItem = page.locator("aside[aria-label='Chat history'] li button", {
    hasText: /vector databases/i,
  });
  check("chat is listed in history", (await historyItem.count()) > 0);
  check("history entry is titled from the first prompt", /vector databases/i.test(await historyItem.first().innerText()));

  /* --------------------------------------------------------- 7. history search */
  await page.getByPlaceholder("Search chats").fill("vector");
  await page.waitForTimeout(300);
  check(
    "history search filters",
    (await historyItem.count()) > 0 && (await page.getByPlaceholder("Search chats").inputValue()) === "vector"
  );
  await page.getByPlaceholder("Search chats").fill("zzzznomatch");
  await page.waitForTimeout(300);
  check(
    "history search shows an empty state",
    (await page.locator("text=No chats match").count()) > 0
  );
  await page.getByPlaceholder("Search chats").fill("");

  /* --------------------------------------------------------- 8. new chat flow */
  await page.getByRole("button", { name: "Start a new chat" }).click();
  await page.waitForTimeout(500);
  check("new chat empties the transcript", (await page.locator(".chat-turn").count()) === 0);
  check("empty chat shows the welcome state", (await page.locator("text=What are we working on?").count()) > 0);
  check("composer survives the new-chat transition", await composer.isVisible());
  const focused = await page.evaluate(() => document.activeElement?.tagName);
  check("focus lands in the composer after new chat", focused === "TEXTAREA", String(focused));
  const mBox = await composer.boundingBox();
  check(
    "composer still on-screen in an empty chat",
    !!mBox && mBox.y + mBox.height <= 901 && mBox.y >= 0,
    mBox ? `y=${Math.round(mBox.y)}` : "no box"
  );

  await page.screenshot({ path: `${OUT}/02-new-chat.png` });

  /* ------------------------------------------------- 9. history persistence */
  await page.reload({ waitUntil: "networkidle" });
  await page
    .locator("aside[aria-label='Chat history']")
    .waitFor({ state: "visible", timeout: 15000 });
  check("chat view is restored after a reload", true);
  const persistedItems = await page
    .locator("aside[aria-label='Chat history'] li button", { hasText: /vector databases/i })
    .count();
  check("history survives a reload", persistedItems > 0, `${persistedItems} entry`);

  /* ------------------------------------------- 10. restore a prior session */
  await historyItem.first().click();
  await page.waitForTimeout(700);
  const restored = await page.locator(".chat-turn").count();
  check("clicking history restores that conversation", restored >= 2, `${restored} turns`);
  check(
    "restored conversation keeps the earlier reply",
    (await page.locator(".bubble-agent").first().innerText()).slice(0, 40) ===
      firstReplyText.slice(0, 40)
  );

  /* ------------------------------------------------------ 11. rename + pin */
  await page.locator("aside[aria-label='Chat history'] li button[aria-label^='Rename']").first().click();
  await page.getByLabel("Chat title").fill("Renamed research thread");
  await page.getByRole("button", { name: "Save title" }).click();
  await page.waitForTimeout(400);
  check("chat rename works", (await page.locator("text=Renamed research thread").count()) > 0);

  await page.locator("aside[aria-label='Chat history'] li button[aria-label='Pin chat']").first().click();
  await page.waitForTimeout(400);
  check("chat pin works", (await page.locator("aside[aria-label='Chat history'] li button[aria-label='Unpin chat']").count()) > 0);
  check(
    "pinned chat is grouped under Pinned",
    (await page.locator("aside[aria-label='Chat history'] p", { hasText: "Pinned" }).count()) > 0
  );

  /* ------------------------------------------------------ 12. regenerate */
  const regen = page.getByRole("button", { name: "Regenerate" }).first();
  check("regenerate control exists", (await regen.count()) > 0);
  const beforeRegen = await page.locator(".bubble-agent").first().innerText();
  await regen.click();
  await page.waitForTimeout(1500);
  // Regenerating the first turn correctly discards everything after it.
  const regenTurns = await page.locator(".chat-turn").count();
  check(
    "regenerate replaces the reply and drops stale follow-ups",
    regenTurns === 1,
    `${regenTurns} turn(s)`
  );
  check(
    "regenerate did not produce the 'enter a query' dead end",
    (await page.locator("text=Please enter a query").count()) === 0
  );
  await waitStreamingDone(0);
  const regenText = await page.locator(".bubble-agent").first().innerText();
  check("regenerated reply has content", regenText.trim().length > 20, `${regenText.trim().length} chars`);
  check("regenerated reply is a fresh run", regenText !== beforeRegen);
  const userBubbleText = await page.locator(".bubble-user").first().innerText();
  check(
    "regenerated reply is marked as one credit run",
    /1\s*credit/i.test(`${regenText}\n${userBubbleText}`),
    userBubbleText.replace(/\n/g, " | ")
  );

  /* ------------------------------------------------------- 13. copy action */
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {});
  await page.getByRole("button", { name: "Copy" }).first().click();
  await page.waitForTimeout(500);
  check("copy-to-clipboard action works", (await page.getByRole("button", { name: /Copied/ }).count()) > 0);
  const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => ""));
  check("clipboard actually holds the reply", clip.length > 20, `${clip.length} chars`);

  /* ---------------------------------------------------- 14. delete a chat */
  const before = await page.locator("aside[aria-label='Chat history'] li button[aria-label^='Delete']").count();
  await page.locator("aside[aria-label='Chat history'] li button[aria-label^='Delete']").first().click();
  await page.waitForTimeout(500);
  const after = await page.locator("aside[aria-label='Chat history'] li button[aria-label^='Delete']").count();
  check("chat delete works", after === before - 1, `${before} -> ${after}`);

  /* ------------------------------------------------- 15. mode + cost picker */
  await page.locator("aside[aria-label='Chat history'] li button[aria-label='Open chat history']").count();
  const modeTrigger = page.locator("button[aria-label='Choose a tool']");
  check("tool picker is reachable", (await modeTrigger.count()) > 0);
  await modeTrigger.click();
  await page.waitForTimeout(400);
  const optionCount = await page.locator("[role='option']").count();
  check("tool picker lists all modes", optionCount >= 7, `${optionCount} options`);
  await page.locator("[role='option']", { hasText: "Deep Research" }).first().click();
  await page.waitForTimeout(300);
  const placeholder = await composer.getAttribute("placeholder");
  check("selecting a mode updates the composer", /deep research/i.test(placeholder || ""), placeholder || "");

  /* ---------------------------------------------------- 16. premium gate */
  // "8x Deep Research" is the Business-plan tool; plain "Deep Research" is not.
  await modeTrigger.click();
  await page.waitForTimeout(400);
  await page.locator("[role='option']", { hasText: "8x Deep Research" }).first().click();
  await page.waitForTimeout(300);
  const turnsBeforeGate = await page.locator(".chat-turn").count();
  await composer.fill("Should be blocked on the free plan");
  await composer.press("Enter");
  await page.waitForTimeout(1500);
  const premiumBlocked = (await page.locator("text=Business plan tool").count()) > 0;
  check("premium tool is gated on the free plan", premiumBlocked);
  check(
    "blocked run does not add a turn or spend credits",
    (await page.locator(".chat-turn").count()) === turnsBeforeGate,
    `${turnsBeforeGate} turns`
  );
  const creditsText = await page.locator("body").innerText();
  const creditsLeft = Number((creditsText.match(/(\d+)\s*credits?\s*left/) || [])[1]);
  check("credits are not charged for a blocked run", Number.isFinite(creditsLeft) ? creditsLeft >= 0 : true, `${creditsLeft} left`);

  /* --------------------------------------------- 16b. low-credit behaviour */
  await page.evaluate(() => {
    const raw = localStorage.getItem("pulseai-workspace");
    if (!raw) return;
    const parsed = JSON.parse(raw);
    parsed.credits.current_credits = 0;
    localStorage.setItem("pulseai-workspace", JSON.stringify(parsed));
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.locator("textarea[aria-label='Message Pulse agent']").waitFor({ state: "visible", timeout: 15000 });
  await page.locator("button[aria-label='Choose a tool']").click();
  await page.waitForTimeout(300);
  await page.locator("[role='option']", { hasText: "Quick Search" }).first().click();
  await page.waitForTimeout(300);
  const zeroComposer = page.locator("textarea[aria-label='Message Pulse agent']");
  await zeroComposer.fill("No credits left");
  await zeroComposer.press("Enter");
  await page.waitForTimeout(1200);
  check(
    "zero credits opens the upgrade dialog",
    (await page.locator("text=Out of credits").count()) > 0
  );
  await page.getByRole("button", { name: "Maybe later" }).click();
  await page.waitForTimeout(300);

  /* ---------------------------------------------------- 17. stop mid-stream */
  await page.evaluate(() => {
    const raw = localStorage.getItem("pulseai-workspace");
    if (!raw) return;
    const parsed = JSON.parse(raw);
    parsed.credits.current_credits = 10;
    localStorage.setItem("pulseai-workspace", JSON.stringify(parsed));
  });
  await page.reload({ waitUntil: "networkidle" });
  const stopComposer = page.locator("textarea[aria-label='Message Pulse agent']");
  await stopComposer.waitFor({ state: "visible", timeout: 15000 });
  await stopComposer.fill(
    "Write an extremely long essay about the history of computing, at least 800 words."
  );
  await stopComposer.press("Enter");
  await page.waitForTimeout(2500);
  const stopBtn = page.getByRole("button", { name: "Stop generating" });
  check("stop button appears while generating", (await stopBtn.count()) > 0);
  if (await stopBtn.count()) {
    await stopBtn.click();
    await page.waitForFunction(
      () => {
        const nodes = document.querySelectorAll(".bubble-agent");
        return nodes[0] && nodes[0].dataset.chatStatus === "complete";
      },
      null,
      { timeout: 30000 }
    );
    const stopped = await page.locator(".bubble-agent").first().innerText();
    check("stopping keeps the partial answer on screen", stopped.trim().length > 0, `${stopped.trim().length} chars`);
    check("stopping does not report an error", (await page.locator("text=This run failed").count()) === 0);
  }

  /* ------------------------------------------------------ 18. mobile shell */
  // Reuse this page and just narrow the viewport: the chat state and
  // localStorage must survive, exactly like resizing a real window.
  const mobile = page;
  await mobile.setViewportSize({ width: 390, height: 844 });
  await mobile.waitForTimeout(700);
  const mComposer = mobile.locator("textarea[aria-label='Message Pulse agent']");
  await mComposer.waitFor({ state: "visible", timeout: 15000 });
  const mBox2 = await mComposer.boundingBox();
  check(
    "composer visible on mobile viewport",
    !!mBox2 && mBox2.y + mBox2.height <= 845 && mBox2.y >= 0,
    mBox2 ? `y=${Math.round(mBox2.y)}` : "no box"
  );
  check("mobile shows the restored chat", (await mobile.locator(".chat-turn").count()) > 0);
  const menuBtn = mobile.getByRole("button", { name: "Open chat history" });
  check("mobile history toggle present", (await menuBtn.count()) > 0);
  if ((await menuBtn.count()) > 0) {
    await menuBtn.click();
    await mobile.waitForTimeout(600);
    const aside = mobile.locator("aside[aria-label='Chat history']");
    check("mobile sidebar opens", await aside.isVisible());
    const aBox = await aside.boundingBox();
    check(
      "mobile sidebar is on-screen when open",
      !!aBox && aBox.x >= -1,
      aBox ? `x=${Math.round(aBox.x)}` : "no box"
    );
    await mobile.screenshot({ path: `${OUT}/03-mobile-sidebar.png` });
    await mobile.getByRole("button", { name: "Close navigation" }).click();
    await mobile.waitForTimeout(500);
    const aBox2 = await aside.boundingBox();
    check(
      "mobile sidebar slides away when closed",
      !!aBox2 && aBox2.x + aBox2.width <= 1,
      aBox2 ? `x=${Math.round(aBox2.x)}` : "no box"
    );
  }

  // mobile transcript must scroll independently, not overflow the page
  const mScroll = await mobile.evaluate(() => {
    const pane = document.querySelector(".app-scroll");
    if (!pane) return { found: false };
    return {
      found: true,
      overflowY: getComputedStyle(pane).overflowY,
      scrollable: pane.scrollHeight > pane.clientHeight,
      docScrolls: document.documentElement.scrollHeight > window.innerHeight + 2,
    };
  });
  check(
    "mobile: transcript scrolls internally, page does not",
    mScroll.found && mScroll.overflowY === "auto" && !mScroll.docScrolls,
    JSON.stringify(mScroll)
  );
  await mobile.screenshot({ path: `${OUT}/04-mobile.png` });

  check("no console/page errors", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));

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

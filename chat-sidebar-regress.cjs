/** Verifies the sidebar resize + open/close behaviour in a real browser. */
const { chromium } = require("playwright");
const BASE = "http://localhost:8081";
const OUT = "C:/Users/GIRISH~1/AppData/Local/Temp/opencode/shots";
const results = [];
const check = (n, p, d = "") => {
  results.push({ n, p, d });
  console.log(`${p ? "PASS" : "FAIL"}  ${n}${d ? ` — ${d}` : ""}`);
};

const MIN = 220;
const MAX = 520;

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

  await page.goto(`${BASE}/workspace`, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  // enter chat mode
  await page.locator("textarea[aria-label='Message Pulse agent']").fill("Hi there, testing the sidebar.");
  await page.locator("textarea[aria-label='Message Pulse agent']").press("Enter");
  await page.waitForSelector("aside[aria-label='Chat history']", { state: "visible", timeout: 30000 });
  await page.waitForTimeout(500);

  const aside = page.locator("aside[aria-label='Chat history']");
  const handle = page.getByRole("separator", { name: /Resize chat history/ });
  const main = page.locator("main .lg\\:ml-\\[var\\(--chat-sidebar-width\\)\\]");

  const asideW = () => aside.evaluate((el) => el.getBoundingClientRect().width);
  const mainLeft = () =>
    main.evaluate((el) => el.getBoundingClientRect().left).catch(() => null);
  const handleX = () => handle.evaluate((el) => el.getBoundingClientRect().x);

  /* ---------------------------------------------------- default open state */
  const w0 = await asideW();
  check("sidebar opens docked on desktop", Math.abs(w0 - 256) < 2, `${w0}px`);
  check("main column clears the sidebar", (await mainLeft()) >= w0 - 1, `main.left=${await mainLeft()}`);

  /* --------------------------------------------------------------- resize */
  check("drag handle is present", (await handle.count()) === 1);

  // drag right by 120px
  const hx = await handleX();
  await page.mouse.move(hx + 3, 450);
  await page.mouse.down();
  await page.mouse.move(hx + 60, 450, { steps: 8 });
  const midW = await asideW();
  await page.mouse.move(hx + 123, 450, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(250);
  const w1 = await asideW();
  check("drag widens the sidebar", w1 > w0 + 100, `${w0} -> ${w1}px`);
  check("width tracks the cursor live during the drag", Math.abs(midW - (w0 + 57)) < 12, `${midW}px mid-drag`);
  check("main column follows the new width", Math.abs((await mainLeft()) - w1) < 2, `main.left=${await mainLeft()} vs ${w1}`);

  // drag left, past the minimum
  const hx2 = await handleX();
  await page.mouse.move(hx2 + 3, 450);
  await page.mouse.down();
  await page.mouse.move(hx2 - 600, 450, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(250);
  const wMin = await asideW();
  check("width clamps at the minimum", wMin === MIN, `${wMin}px (min ${MIN})`);

  // drag far right, past the maximum
  const hx3 = await handleX();
  await page.mouse.move(hx3 + 3, 450);
  await page.mouse.down();
  await page.mouse.move(hx3 + 900, 450, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(250);
  const wMax = await asideW();
  check("width clamps at the maximum", wMax === MAX, `${wMax}px (max ${MAX})`);

  // transcript still usable at max width
  const overflow = await page.evaluate(() => {
    const pane = document.querySelector(".app-scroll");
    return pane ? pane.getBoundingClientRect().width : 0;
  });
  check("transcript still has room at max width", overflow > 300, `${Math.round(overflow)}px`);

  /* ------------------------------------------------------- double-click reset */
  await handle.dblclick();
  await page.waitForTimeout(250);
  check("double-click resets to the default width", Math.abs((await asideW()) - 256) < 2, `${await asideW()}px`);

  /* -------------------------------------------------------------- keyboard */
  await handle.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(200);
  const wk = await asideW();
  check("arrow keys resize (2 x 16px)", Math.abs(wk - 288) < 2, `${wk}px`);
  await page.keyboard.press("Home");
  await page.waitForTimeout(200);
  check("Home jumps to the minimum", (await asideW()) === MIN, `${await asideW()}px`);
  await page.keyboard.press("End");
  await page.waitForTimeout(200);
  check("End jumps to the maximum", (await asideW()) === MAX, `${await asideW()}px`);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(200);
  check("Enter resets the width", Math.abs((await asideW()) - 256) < 2, `${await asideW()}px`);
  check(
    "handle exposes ARIA separator values",
    (await handle.getAttribute("aria-valuenow")) === "256" &&
      (await handle.getAttribute("aria-valuemin")) === String(MIN) &&
      (await handle.getAttribute("aria-valuemax")) === String(MAX)
  );

  /* -------------------------------------------------------------- persistence */
  await page.mouse.move((await handleX()) + 3, 450);
  await page.mouse.down();
  await page.mouse.move((await handleX()) + 100, 450, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(600);
  const wBefore = await asideW();
  await page.reload({ waitUntil: "networkidle" });
  await page.locator("aside[aria-label='Chat history']").waitFor({ state: "visible", timeout: 20000 });
  check("width survives a reload", Math.abs((await asideW()) - wBefore) < 2, `${wBefore} -> ${await asideW()}px`);

  /* ----------------------------------------------------------------- close */
  await page.getByRole("button", { name: "Collapse sidebar" }).click();
  await page.waitForTimeout(450);
  const boxClosed = await aside.evaluate((el) => el.getBoundingClientRect().right);
  check("sidebar closes off-canvas", boxClosed <= 1, `right=${Math.round(boxClosed)}`);
  const mainLeftClosed = await page
    .locator("main div[class*='lg:ml-0']")
    .first()
    .evaluate((el) => el.getBoundingClientRect().left)
    .catch(() => null);
  check("transcript reclaims the space when closed", mainLeftClosed === 0, `main.left=${mainLeftClosed}`);
  check(
    "resize handle is not reachable while closed",
    !(await handle.isVisible().catch(() => false))
  );

  // reopen
  const reopen = page.getByRole("button", { name: /History/ }).first();
  check("reopen control is offered when closed", (await reopen.count()) > 0);
  await reopen.click();
  await page.waitForTimeout(450);
  check("sidebar reopens at the same width", Math.abs((await asideW()) - wBefore) < 2, `${await asideW()}px`);
  check("reopen control hides again", (await page.getByRole("button", { name: /History/ }).count()) === 0);

  await page.screenshot({ path: `${OUT}/s-01-resized.png` });

  /* ------------------------------------------------- desktop collapse twice */
  await page.getByRole("button", { name: "Collapse sidebar" }).click();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: /History/ }).first().click();
  await page.waitForTimeout(300);
  check("collapse/reopen toggles cleanly", Math.abs((await asideW()) - wBefore) < 2, `${await asideW()}px`);

  /* ------------------------------------------------------------- mobile drawer */
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(600);
  const mW = await asideW();
  check("mobile uses a fixed drawer width, not the dragged one", mW <= 320 && mW > 250, `${Math.round(mW)}px`);
  check("resize handle is hidden on mobile", !(await handle.isVisible().catch(() => false)));
  const closedRight = await aside.evaluate((el) => el.getBoundingClientRect().right);
  check("drawer is closed by default on mobile", closedRight <= 1, `right=${Math.round(closedRight)}`);

  await page.getByRole("button", { name: "Open chat history" }).click();
  await page.waitForTimeout(500);
  const openBox = await aside.boundingBox();
  check("drawer opens on mobile", !!openBox && openBox.x >= -1 && openBox.x < 40, `x=${Math.round(openBox?.x ?? -1)}`);

  // drawer must not cover the composer; it is an overlay, and closing returns control
  await page.getByRole("button", { name: "Close navigation" }).click();
  await page.waitForTimeout(500);
  check("drawer closes on mobile", (await aside.evaluate((el) => el.getBoundingClientRect().right)) <= 1);
  const mComposerBox = await page.locator("textarea[aria-label='Message Pulse agent']").boundingBox();
  check(
    "composer usable after the drawer closes",
    !!mComposerBox && mComposerBox.y + mComposerBox.height <= 845,
    `y=${Math.round(mComposerBox?.y ?? -1)}`
  );

  await page.screenshot({ path: `${OUT}/s-02-mobile-drawer.png` });

  check("no console/page errors", errors.length === 0, errors.slice(0, 3).join(" | "));

  await browser.close();
  const failed = results.filter((r) => !r.p);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.log("\nFAILURES:");
    failed.forEach((f) => console.log(` - ${f.n}: ${f.d}`));
    process.exit(1);
  }
})().catch((e) => {
  console.error("harness crashed:", e);
  process.exit(2);
});

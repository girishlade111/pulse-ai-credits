/**
 * The write-stream must play out for EVERY reply, including one that arrives in
 * a single burst — a buffering gateway is the common case, and snapping on
 * completion is what made answers look like they appeared with no writing.
 */
const { chromium } = require("playwright");
const BASE = "http://localhost:8080";
const results = [];
const check = (n, p, d = "") => {
  results.push({ n, p, d });
  console.log(`${p ? "PASS" : "FAIL"}  ${n}${d ? ` — ${d}` : ""}`);
};

const LONG =
  "Vector databases are specialised stores built for high dimensional vector embeddings. " +
  "They trade exactness for speed using approximate nearest neighbour indexes. " +
  "Choose the index type that matches your recall target and your write rate. ";

const sse = (text, chunk) => {
  const frames = [];
  const size = chunk ?? 40;
  for (let i = 0; i < text.length; i += size) {
    frames.push(`data: ${JSON.stringify({ choices: [{ delta: { content: text.slice(i, i + size) } }] })}\n\n`);
  }
  frames.push("data: [DONE]\n\n");
  return frames.join("");
};

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  const run = async (label, text, chunk) => {
    await page.goto(`${BASE}/workspace`, { waitUntil: "networkidle" });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: "networkidle" });
    await page.route("**/api/llm/**", (route) =>
      route.fulfill({ status: 200, contentType: "text/event-stream", body: sse(text, chunk) })
    );
    await page.waitForTimeout(400);

    const composer = page.locator("textarea[aria-label='Message Pulse agent']");

    /*
     * Measure inside the page. Sampling over a CDP round trip is far too slow
     * to see a ~300ms reveal, so a MutationObserver records every repaint the
     * write-stream actually produces.
     */
    await composer.fill("Explain.");
    await composer.press("Enter");
    const reply = page.locator(".bubble-agent").first();
    await reply.waitFor({ state: "visible", timeout: 30000 });

    await reply.evaluate((el) => {
      window.__frames = [];
      const read = () => (el.querySelector(".md")?.textContent || "").length;
      window.__frames.push({ painted: read(), caret: el.querySelectorAll(".md-streaming").length });
      const observer = new MutationObserver(() => {
        window.__frames.push({ painted: read(), caret: el.querySelectorAll(".md-streaming").length });
      });
      const target = el.querySelector(".md") ?? el;
      observer.observe(target, { childList: true, subtree: true, characterData: true });
      window.__observer = observer;
    });

    await page.waitForFunction(
      (len) => {
        const el = document.querySelector(".bubble-agent .md");
        return el && (el.textContent || "").length >= len;
      },
      text.trim().length,
      { timeout: 20000 }
    ).catch(() => {});
    await page.waitForTimeout(300);

    const trace = await page.evaluate(() => {
      window.__observer?.disconnect();
      return window.__frames;
    });

    const finalPainted = await reply.evaluate((el) => (el.querySelector(".md")?.textContent || "").length);
    const distinct = new Set(trace.map((t) => t.painted));
    const grew = trace.some((t) => t.painted < text.trim().length);

    check(`${label}: reply repaints many times`, distinct.size >= 15, `${distinct.size} distinct lengths over ${trace.length} repaints`);
    check(`${label}: the reveal lags the text at some point`, grew, `${trace.length} repaints`);
    check(`${label}: ends at the full text`, finalPainted === text.trim().length, `${finalPainted} vs ${text.trim().length}`);
    check(
      `${label}: painted length only grows`,
      trace.every((t, i) => i === 0 || t.painted >= trace[i - 1].painted)
    );
    check(
      `${label}: no single repaint dumps everything`,
      Math.max(...trace.slice(1).map((t, i) => t.painted - trace[i].painted)) < 120,
      `largest step ${Math.max(...trace.slice(1).map((t, i) => t.painted - trace[i].painted))} chars`
    );
    check(
      `${label}: caret is shown while writing`,
      trace.some((t) => t.caret > 0),
      `${trace.filter((t) => t.caret > 0).length} repaints with a caret`
    );
    const finalCaret = await reply.locator(".md-streaming").count();
    check(`${label}: caret removed when finished`, finalCaret === 0, `${finalCaret}`);

    const shown = await reply.innerText();
    check(`${label}: full reply is readable at the end`, shown.includes("approximate nearest neighbour"), shown.slice(0, 50).replace(/\n/g, " "));
  };

  // The critical case: the whole answer delivered in one chunk.
  await run("burst", LONG.repeat(4), LONG.length * 4);
  // And the normal case: small chunks, so the stream is already paced.
  await run("dribble", LONG, 12);

  // A short reply still writes itself out rather than appearing instantly.
  await page.goto(`${BASE}/workspace`, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.route("**/api/llm/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/event-stream", body: sse("Paris.", 6) })
  );
  await page.waitForTimeout(300);
  await page.locator("textarea[aria-label='Message Pulse agent']").fill("Capital of France?");
  await page.locator("textarea[aria-label='Message Pulse agent']").press("Enter");
  const short = page.locator(".bubble-agent").first();
  await short.waitFor({ state: "visible", timeout: 30000 });
  const shortDistinct = new Set();
  for (let i = 0; i < 60; i += 1) {
    shortDistinct.add(await short.evaluate((el) => (el.querySelector(".md")?.textContent || "").length));
    if ((await short.getAttribute("data-chat-status")) === "complete") break;
    await page.waitForTimeout(12);
  }
  check("a very short reply is not animated (avoids a flicker)", shortDistinct.size === 1 && shortDistinct.has(6), `${shortDistinct.size} lengths: ${[...shortDistinct].join(",")}`);
  check("a very short reply still shows in full", (await short.innerText()).includes("Paris"));

  // Reduced motion: no animation, straight to the full text.
  const rm = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
  await rm.goto(`${BASE}/workspace`, { waitUntil: "networkidle" });
  await rm.evaluate(() => localStorage.clear());
  await rm.reload({ waitUntil: "networkidle" });
  await rm.route("**/api/llm/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/event-stream", body: sse(LONG, LONG.length) })
  );
  await rm.waitForTimeout(300);
  await rm.locator("textarea[aria-label='Message Pulse agent']").fill("Explain.");
  await rm.locator("textarea[aria-label='Message Pulse agent']").press("Enter");
  await rm.locator(".bubble-agent").first().waitFor({ state: "visible", timeout: 30000 });
  await rm.waitForTimeout(350);
  const rmPainted = await rm
    .locator(".bubble-agent")
    .first()
    .evaluate((el) => (el.querySelector(".md")?.textContent || "").length);
  check("reduced motion paints the full text at once", rmPainted === LONG.trim().length, `${rmPainted} vs ${LONG.trim().length}`);
  await rm.close();

  check("no page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
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

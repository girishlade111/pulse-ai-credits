/**
 * Verifies code-block copy buttons and the write-stream reveal against a
 * *mocked* provider, so the results do not depend on the upstream model or its
 * quota. The mock also lets us control chunk timing, which is the only way to
 * prove the reveal actually smooths a burst.
 */
const { chromium } = require("playwright");
const BASE = "http://localhost:8081";
const OUT = "C:/Users/GIRISH~1/AppData/Local/Temp/opencode/shots";
const results = [];
const check = (n, p, d = "") => {
  results.push({ n, p, d });
  console.log(`${p ? "PASS" : "FAIL"}  ${n}${d ? ` — ${d}` : ""}`);
};

const CODE = `async function fetchWithRetry(url, options = {}, retries = 4) {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.status >= 500) throw new Error('server ' + res.status);
      return res;
    } catch (err) {
      if (attempt >= retries) throw err;
      const delay = 2 ** attempt * 250 + Math.random() * 100;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}`;

const REPLY = [
  "# Exponential backoff",
  "",
  "The helper above retries a failed request with a delay that grows each time.",
  "",
  "## How it works",
  "",
  "- Each attempt doubles the delay, capped by \`retries\`.",
  "- Jitter is added so clients do not stampede together.",
  "- A 5xx is retried; a 4xx is not, because it will never succeed.",
  "",
  "## Example",
  "",
  "```javascript",
  CODE,
  "```",
  "",
  "> Backoff is a load-shedding mechanism, not a speed-up.",
  "",
  "1. Call the endpoint.",
  "2. On failure, wait and retry.",
  "3. Give up after the budget is spent.",
  "",
  "That is the whole pattern. Nothing here is specific to HTTP.",
].join("\n");

/** Build an SSE body exactly the way the OpenAI-compatible gateway does. */
const sse = (text, chunkSize) => {
  const frames = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    frames.push(
      `data: ${JSON.stringify({
        choices: [{ delta: { content: text.slice(i, i + chunkSize) } }],
      })}\n\n`
    );
  }
  frames.push("data: [DONE]\n\n");
  return frames.join("");
};

// The Windows clipboard stores CRLF, so compare on normalised line endings.
const norm = (s) => s.replace(/\r\n/g, String.fromCharCode(10)).trim();

const installMock = async (page, { text, chunkSize }) => {
  await page.route("**/api/apinex/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream; charset=utf-8",
      headers: { "Cache-Control": "no-cache" },
      body: sse(text, chunkSize),
    });
  });
};

const open = async (page, prompt) => {
  const composer = page.locator("textarea[aria-label='Message Pulse agent']");
  await composer.fill(prompt);
  await composer.press("Enter");
};

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN });

  /* ==================== 1. code block copy ==================== */
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

  await page.goto(`${BASE}/workspace`, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {});
  // one big chunk => a realistic worst-case burst
  await installMock(page, { text: REPLY, chunkSize: 100000 });

  const composer = page.locator("textarea[aria-label='Message Pulse agent']");
  await open(page, "Show me a retry helper with a code block.");
  const reply = page.locator(".bubble-agent").first();
  await reply.waitFor({ state: "visible", timeout: 30000 });
  await page.waitForFunction(
    () => document.querySelector(".bubble-agent")?.dataset.chatStatus === "complete",
    null,
    { timeout: 30000 }
  );

  const shells = page.locator(".bubble-agent .md-code-shell");
  const blocks = await shells.count();
  check("code block rendered in its own shell", blocks === 1, `${blocks} block(s)`);
  check("code block has a header bar", (await shells.locator(".md-code-bar").count()) === 1);

  const lang = (await shells.locator(".md-code-lang").innerText()).trim();
  check("language tag shown", /^javascript$/i.test(lang), lang);

  const rendered = await shells.locator("pre code").innerText();
  check("code text is intact", norm(rendered) === norm(CODE), `${rendered.length} vs ${CODE.length}`);
  check("language tag is not injected into the code", !rendered.includes("javascript"));

  const copyBtn = shells.locator(".md-copy");
  check("copy button present", (await copyBtn.count()) === 1);
  check("copy button is labelled for screen readers", /copy code/i.test(await copyBtn.getAttribute("aria-label")));
  check("copy button label says Copy", /Copy/.test(await copyBtn.innerText()), await copyBtn.innerText());

  await copyBtn.click();
  await page.waitForTimeout(300);
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  check("clipboard holds the exact raw code", norm(clip) === norm(CODE), `${clip.length} vs ${CODE.length} (CRLF-normalised)`);
  check("clipboard has no UI chrome", !/Copy code|Copied/.test(clip));
  check("copy button confirms", /Copied/i.test(await copyBtn.innerText()), await copyBtn.innerText());
  check("confirmed state is announced", /copied/i.test(await copyBtn.getAttribute("aria-label")));

  await page.waitForTimeout(2300);
  check("copied state reverts after ~2s", /^\s*Copy/.test(await copyBtn.innerText()), await copyBtn.innerText());

  // whole-reply copy must not pick up the button chrome
  await page.getByRole("button", { name: "Copy", exact: true }).first().click();
  await page.waitForTimeout(400);
  const clip3 = await page.evaluate(() => navigator.clipboard.readText());
  check("whole-reply copy still works", clip3.includes("Exponential backoff"), `${clip3.length} chars`);
  check("whole-reply copy excludes button labels", !/Copy code|Copied|Show the rest/.test(clip3));

  await page.screenshot({ path: `${OUT}/c-01-code-copy.png` });
  await shells.first().hover();
  await page.waitForTimeout(300);
  await shells.first().screenshot({ path: `${OUT}/c-02-code-hover.png` });

  /* ==================== 2. multiple code blocks ==================== */
  const multi = [
    "Here are two blocks.",
    "",
    "```js",
    "const a = 1;",
    "```",
    "",
    "and another",
    "",
    "```python",
    "a = 1",
    "```",
  ].join("\n");
  await page.unroute("**/api/apinex/**");
  await installMock(page, { text: multi, chunkSize: 100000 });
  await open(page, "Two code blocks please.");
  await page.waitForFunction(
    () => document.querySelectorAll(".bubble-agent").length === 2,
    null,
    { timeout: 30000 }
  );
  await page.waitForTimeout(1200);
  const shells2 = page.locator(".bubble-agent").nth(1).locator(".md-code-shell");
  check("both code blocks render", (await shells2.count()) === 2, `${await shells2.count()}`);
  const langs = await shells2.locator(".md-code-lang").allInnerTexts();
  check("each block keeps its own language", langs.join(",").toLowerCase() === "js,python", langs.join(","));
  await shells2.nth(1).locator(".md-copy").click();
  await page.waitForTimeout(300);
  const clip2 = await page.evaluate(() => navigator.clipboard.readText());
  check("copying block 2 yields block 2's code", clip2.trim() === "a = 1", JSON.stringify(clip2));
  await shells2.nth(0).locator(".md-copy").click();
  await page.waitForTimeout(300);
  const clip1 = await page.evaluate(() => navigator.clipboard.readText());
  check("copying block 1 yields block 1's code", clip1.trim() === "const a = 1;", JSON.stringify(clip1));

  /* ==================== 3. write-stream smoothing ==================== */
  const burst = "word ".repeat(1200).trim(); // ~6000 chars delivered at once
  const p3 = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await p3.goto(`${BASE}/workspace`, { waitUntil: "networkidle" });
  await p3.evaluate(() => localStorage.clear());
  await p3.reload({ waitUntil: "networkidle" });
  await installMock(p3, { text: burst, chunkSize: 100000 });

  const c3 = p3.locator("textarea[aria-label='Message Pulse agent']");
  await c3.fill("Stream a burst.");
  await c3.press("Enter");
  const r3 = p3.locator(".bubble-agent").first();
  await r3.waitFor({ state: "visible", timeout: 30000 });

  // sample the *painted* length against the full length
  const trace = [];
  for (let i = 0; i < 300; i += 1) {
    const painted = await r3.evaluate(
      (el) => (el.querySelector(".md")?.textContent || "").length
    );
    const status = await r3.getAttribute("data-chat-status");
    trace.push({ painted, status });
    if (status === "complete" && painted >= burst.length) break;
    await p3.waitForTimeout(25);
  }

  const streamingFrames = trace.filter((t) => t.status === "streaming");
  const distinct = new Set(streamingFrames.map((t) => t.painted));
  check(
    "a 6k burst is smoothed, not dumped in one frame",
    distinct.size >= 10,
    `${distinct.size} distinct painted lengths`
  );
  check(
    "painted length only ever grows",
    trace.every((t, i) => i === 0 || t.painted >= trace[i - 1].painted)
  );
  const lagged = trace.some((t) => t.painted < burst.length);
  check("the reveal visibly lags the stream (proving it is smoothing)", lagged);
  check(
    "reveal finishes at the full length",
    trace[trace.length - 1].painted === burst.length,
    `${trace[trace.length - 1].painted} vs ${burst.length}`
  );

  // skip control
  const skip = p3.getByRole("button", { name: /Show the rest/ });
  const sawSkip = (await skip.count()) > 0;
  if (sawSkip) {
    const before = await r3.evaluate((el) => (el.querySelector(".md")?.textContent || "").length);
    await skip.click();
    await p3.waitForTimeout(200);
    const after = await r3.evaluate((el) => (el.querySelector(".md")?.textContent || "").length);
    check("'Show the rest' jumps to the full reply", after > before, `${before} -> ${after}`);
    check("'Show the rest' hides after use", (await skip.count()) === 0);
  } else {
    check("'Show the rest' appeared during the burst", false, "never seen");
  }
  check("skip control is gone once finished", (await skip.count()) === 0);

  // no caret after completion
  await p3.waitForFunction(
    () => document.querySelector(".bubble-agent")?.dataset.chatStatus === "complete",
    null,
    { timeout: 30000 }
  );
  check("streaming caret removed on completion", (await r3.locator(".md-streaming").count()) === 0);

  /* ============ 4. reduced motion: reveal is skipped ============ */
  const p4 = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  await p4.goto(`${BASE}/workspace`, { waitUntil: "networkidle" });
  await p4.evaluate(() => localStorage.clear());
  await p4.reload({ waitUntil: "networkidle" });
  await installMock(p4, { text: burst, chunkSize: 100000 });
  const c4 = p4.locator("textarea[aria-label='Message Pulse agent']");
  await c4.fill("Stream a burst with reduced motion.");
  await c4.press("Enter");
  await p4.waitForSelector(".bubble-agent", { timeout: 30000 });
  await p4.waitForTimeout(400);
  const paintedImmediately = await p4
    .locator(".bubble-agent")
    .first()
    .evaluate((el) => (el.querySelector(".md")?.textContent || "").length);
  check(
    "prefers-reduced-motion paints the whole reply at once",
    paintedImmediately === burst.length,
    `${paintedImmediately} vs ${burst.length}`
  );
  check("no skip control under reduced motion", (await p4.getByRole("button", { name: /Show the rest/ }).count()) === 0);
  await p4.close();

  check("no console/page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
  await p3.close();
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

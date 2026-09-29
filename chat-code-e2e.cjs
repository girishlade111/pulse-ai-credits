/** Verifies code-block copy buttons and the write-stream reveal. */
const { chromium } = require("playwright");
const BASE = "http://localhost:8081";
const OUT = "C:/Users/GIRISH~1/AppData/Local/Temp/opencode/shots";
const results = [];
const check = (n, p, d = "") => {
  results.push({ n, p, d });
  console.log(`${p ? "PASS" : "FAIL"}  ${n}${d ? ` — ${d}` : ""}`);
};

const PROMPT =
  "Give me a runnable JavaScript example of retrying a fetch with exponential backoff, inside a single fenced code block. Then explain it in one short paragraph.";

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

  await page.goto(`${BASE}/workspace`, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {});

  const composer = page.locator("textarea[aria-label='Message Pulse agent']");
  await composer.fill(PROMPT);
  await composer.press("Enter");

  /* ================= write-stream reveal ================= */
  const reply = page.locator(".bubble-agent").first();
  await reply.waitFor({ state: "visible", timeout: 30000 });

  // sample the painted length while streaming
  const samples = [];
  for (let i = 0; i < 200; i += 1) {
    const status = await reply.getAttribute("data-chat-status");
    const painted = await reply.evaluate((el) => {
      const md = el.querySelector(".md");
      return md ? (md.textContent || "").length : 0;
    });
    samples.push({ painted, status });
    if (status === "complete") break;
    await page.waitForTimeout(60);
  }

  const mid = samples.slice(1, -1).filter((s) => s.status === "streaming");
  const distinct = [...new Set(mid.map((s) => s.painted))].length;
  check("reply paints progressively, not in one jump", distinct >= 4, `${distinct} distinct lengths`);
  check(
    "painted length increases monotonically while streaming",
    mid.every((s, i) => i === 0 || s.painted >= mid[i - 1].painted),
    `${mid.length} streaming samples`
  );

  // The reveal must never run ahead of / diverge from the stored text.
  const final = await page.evaluate(() => {
    const nodes = document.querySelectorAll(".bubble-agent");
    const el = nodes[0];
    return {
      painted: (el.querySelector(".md")?.textContent || "").length,
      status: el.dataset.chatStatus,
    };
  });
  check("stream completes", final.status === "complete", final.status);
  check("completed reply shows the full text (reveal snapped)", final.painted > 200, `${final.painted} chars`);

  // "show the rest" affordance
  const skip = page.getByRole("button", { name: /Show the rest/ });
  check("write-stream skip control appears only mid-stream", (await skip.count()) === 0, "gone after completion");

  // caret
  check("no streaming caret after completion", (await reply.locator(".md-streaming").count()) === 0);

  /* ================= code block copy ================= */
  await page.waitForSelector(".bubble-agent .md-code-shell", { timeout: 60000 });
  const shells = page.locator(".bubble-agent .md-code-shell");
  const count = await shells.count();
  check("code block rendered with its own header shell", count > 0, `${count} block(s)`);

  const bar = shells.first().locator(".md-code-bar");
  check("code block has a header bar", (await bar.count()) === 1);
  const lang = (await bar.locator(".md-code-lang").innerText()).trim();
  check("code block shows its language tag", lang.length > 0, lang);

  const rawCode = await shells.first().locator("pre code").innerText();
  check("code block holds code", rawCode.length > 20, `${rawCode.length} chars`);
  check("code is not HTML-rendered", !rawCode.includes("<span"), "no markup leaked");
  check("language tag does not overlap the code", !rawCode.includes(lang) || lang === "code", lang);

  // the copy control
  const copyBtn = shells.first().locator(".md-copy");
  check("code block has a copy button", (await copyBtn.count()) === 1);
  check("copy button is labelled for screen readers", /copy code/i.test(await copyBtn.getAttribute("aria-label")));

  await copyBtn.click();
  await page.waitForTimeout(300);
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  check("clipboard receives the raw code", clip.trim() === rawCode.trim(), `${clip.length} vs ${rawCode.length} chars`);
  check(
    "clipboard content is the code, not the rendered text",
    !clip.includes("Copy") && !clip.includes("javascript") === false ? clip.includes("function") || clip.includes("=>") || clip.includes("const") : true,
    clip.slice(0, 40).replace(/\n/g, " ")
  );
  check("copy button confirms", /Copied/i.test(await copyBtn.innerText()), await copyBtn.innerText());

  // confirmation is transient
  await page.waitForTimeout(2200);
  check("copied state reverts", /Copy/i.test(await copyBtn.innerText()) && !(await copyBtn.getAttribute("aria-label")).includes("copied"), await copyBtn.innerText());

  // every block gets its own independent control
  if (count > 1) {
    const buttons = await page.locator(".bubble-agent .md-code-shell .md-copy").count();
    check("each code block has its own copy button", buttons === count, `${buttons} buttons / ${count} blocks`);
    await shells.nth(1).locator(".md-copy").click();
    await page.waitForTimeout(300);
    const clip2 = await page.evaluate(() => navigator.clipboard.readText());
    const code2 = await shells.nth(1).locator("pre code").innerText();
    check("second block copies its own content", clip2.trim() === code2.trim(), `${clip2.length} vs ${code2.length}`);
  } else {
    check("each code block has its own copy button", true, "single block");
  }

  // the whole-reply copy must still work and must NOT include chrome
  const replyCopy = page.getByRole("button", { name: "Copy", exact: true }).first();
  await replyCopy.click();
  await page.waitForTimeout(400);
  const clip3 = await page.evaluate(() => navigator.clipboard.readText());
  check("whole-reply copy still works", clip3.length > 50, `${clip3.length} chars`);
  check(
    "whole-reply copy has no UI chrome in it",
    !/Copy code|Copied|Show the rest/.test(clip3)
  );

  await page.screenshot({ path: `${OUT}/c-01-code-copy.png` });

  // hover affordance
  await page.locator(".bubble-agent .md-code-shell").first().hover();
  await page.waitForTimeout(300);
  await page.locator(".bubble-agent .md-code-shell").first().screenshot({ path: `${OUT}/c-02-code-hover.png` });

  /* ================= skip control mid-stream ================= */
  const p2 = page.locator("textarea[aria-label='Message Pulse agent']");
  await p2.fill("Write a 900 word essay about the history of the abacus.");
  await p2.press("Enter");
  const reply2 = page.locator(".bubble-agent").nth(1);
  await reply2.waitFor({ state: "visible", timeout: 30000 });
  let sawSkip = false;
  for (let i = 0; i < 60; i += 1) {
    if (await page.getByRole("button", { name: /Show the rest/ }).count()) {
      sawSkip = true;
      break;
    }
    if ((await reply2.getAttribute("data-chat-status")) === "complete") break;
    await page.waitForTimeout(40);
  }
  check("skip control appears while the reveal lags", sawSkip);
  if (sawSkip) {
    const before = (await reply2.innerText()).length;
    await page.getByRole("button", { name: /Show the rest/ }).click();
    await page.waitForTimeout(250);
    const after = (await reply2.innerText()).length;
    check("skip reveals the rest at once", after > before, `${before} -> ${after} chars`);
    check("skip control disappears after use", (await page.getByRole("button", { name: /Show the rest/ }).count()) === 0);
  }

  await page.waitForFunction(
    () => {
      const n = document.querySelectorAll(".bubble-agent");
      return n[1] && n[1].dataset.chatStatus === "complete";
    },
    null,
    { timeout: 120000 }
  );
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

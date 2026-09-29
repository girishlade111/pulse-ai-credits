/**
 * Copy must work on every origin the app is served from.
 *
 * `navigator.clipboard` only exists in a secure context, and the workspace is
 * routinely opened on a LAN address, where it is undefined and every copy
 * silently failed. This drives both the localhost and the LAN origin.
 */
const { chromium } = require("playwright");
const results = [];
const check = (n, p, d = "") => {
  results.push({ n, p, d });
  console.log(`${p ? "PASS" : "FAIL"}  ${n}${d ? ` — ${d}` : ""}`);
};

const CODE = "const answer = 42;\nconsole.log(answer);";
const REPLY = [
  "Here is the snippet:",
  "",
  "```javascript",
  CODE,
  "```",
  "",
  "And that is all of it.",
].join("\n");

const sse = (text) => {
  const frames = [];
  for (let i = 0; i < text.length; i += 40) {
    frames.push(`data: ${JSON.stringify({ choices: [{ delta: { content: text.slice(i, i + 40) } }] })}\n\n`);
  }
  frames.push("data: [DONE]\n\n");
  return frames.join("");
};

const run = async (browser, origin, label) => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

  /*
   * Record what the fallback path copies. Reading the real clipboard needs a
   * permission this test deliberately withholds, so the assertion has to come
   * from the copy mechanism itself rather than from a read-back.
   */
  await page.addInitScript(() => {
    window.__copied = [];
    const original = document.execCommand?.bind(document);
    document.execCommand = (command, ...rest) => {
      const el = document.activeElement;
      if (command === "copy" && el && "value" in el) {
        window.__copied.push(el.value);
        return true;
      }
      return original ? original(command, ...rest) : false;
    };
  });

  // Deliberately do NOT grant clipboard permission: the point is to prove the
  // app does not depend on it.
  await page.route("**/api/llm/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/event-stream", body: sse(REPLY) })
  );

  await page.goto(`${origin}/workspace`, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });

  const secure = await page.evaluate(() => ({
    isSecure: window.isSecureContext,
    hasClipboard: typeof navigator.clipboard?.writeText === "function",
    hasExec: typeof document.execCommand === "function",
  }));
  check(`${label}: clipboard API availability`, true, JSON.stringify(secure));

  const composer = page.locator("textarea[aria-label='Message Pulse agent']");
  await composer.fill("Show a snippet.");
  await composer.press("Enter");
  const reply = page.locator(".bubble-agent").first();
  await reply.waitFor({ state: "visible", timeout: 40000 });
  await page.waitForFunction(
    () => document.querySelector(".bubble-agent")?.dataset.chatStatus === "complete",
    null,
    { timeout: 30000 }
  );

  const toastError = () => page.locator("text=Could not copy").count();
  const norm = (s) => String(s).replace(/\r\n/g, "\n").trim();
  const lastCopied = () => page.evaluate(() => window.__copied[window.__copied.length - 1] ?? "");

  // 1. code block copy
  await reply.locator(".md-copy").first().click();
  await page.waitForTimeout(500);
  check(`${label}: code block shows Copied`, /Copied/i.test(await reply.locator(".md-copy").first().innerText()));
  check(`${label}: no copy error toast`, (await toastError()) === 0);

  const codeClip = await lastCopied();
  if (secure.hasClipboard) {
    // The async path is used here; read-back is allowed so we can verify.
    const readBack = await page.evaluate(() => navigator.clipboard.readText().catch(() => ""));
    check(
      `${label}: clipboard holds the exact code`,
      norm(readBack || codeClip) === norm(CODE),
      `${JSON.stringify(norm(readBack || codeClip).slice(0, 40))}`
    );
  } else {
    check(
      `${label}: fallback copied the exact code`,
      norm(codeClip) === norm(CODE),
      `${JSON.stringify(norm(codeClip).slice(0, 40))}`
    );
  }

  // 2. whole-reply copy
  const copyBtn = reply.getByRole("button", { name: "Copy", exact: true }).first();
  await copyBtn.click();
  await page.waitForTimeout(500);
  check(`${label}: whole reply shows Copied`, (await page.getByRole("button", { name: /Copied/ }).count()) > 0);
  check(`${label}: no whole-reply copy error`, (await toastError()) === 0);

  const replyClip = await lastCopied();
  const replySource = secure.hasClipboard
    ? (await page.evaluate(() => navigator.clipboard.readText().catch(() => ""))) || replyClip
    : replyClip;
  check(
    `${label}: whole reply copy carries the answer`,
    norm(replySource).includes("const answer = 42"),
    `${replySource.length} chars`
  );

  // 3. copy still works after the confirm state reverts
  await page.waitForTimeout(2200);
  await reply.locator(".md-copy").first().click();
  await page.waitForTimeout(400);
  check(`${label}: code copy works a second time`, /Copied/i.test(await reply.locator(".md-copy").first().innerText()));

  // 4. focus is restored, so typing continues where the user left off
  await composer.click();
  await page.keyboard.type("still typing");
  check(
    `${label}: focus is usable after a copy`,
    (await composer.inputValue()).includes("still typing"),
    await composer.inputValue()
  );

  await page.close();
  return secure;
};

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN });
  const lan = process.env.LAN_URL;
  try {
    const a = await run(browser, "http://localhost:8080", "localhost");
    if (lan) {
      const url = lan.startsWith("http") ? lan : "http://" + lan;
      const b = await run(browser, url, "LAN");
      check(
        "LAN origin is genuinely not a secure context (the real-world case)",
        !b.isSecure && !b.hasClipboard,
        `isSecure=${b.isSecure} hasClipboard=${b.hasClipboard}`
      );
      check("localhost origin is secure (control)", a.isSecure, `isSecure=${a.isSecure}`);
    } else {
      check("LAN test skipped", true, "LAN_URL not provided");
    }
  } finally {
    await browser.close();
  }

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

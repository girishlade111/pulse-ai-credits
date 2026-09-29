/**
 * Verifies code-block handling: every fence becomes a copyable block, aliases
 * are canonicalised, and an untagged fence still gets a useful label.
 *
 * Uses a mocked provider so results do not depend on model quota or on which
 * markdown a real model happens to emit.
 */
const { chromium } = require("playwright");
const BASE = process.env.BASE_URL || "http://localhost:8080";
const OUT = "C:/Users/GIRISH~1/AppData/Local/Temp/opencode/shots";
const results = [];
const check = (n, p, d = "") => {
  results.push({ n, p, d });
  console.log(`${p ? "PASS" : "FAIL"}  ${n}${d ? ` — ${d}` : ""}`);
};

const sse = (text) => {
  const frames = [];
  for (let i = 0; i < text.length; i += 60) {
    frames.push(
      `data: ${JSON.stringify({ choices: [{ delta: { content: text.slice(i, i + 60) } }] })}\n\n`
    );
  }
  frames.push("data: [DONE]\n\n");
  return frames.join("");
};

const install = (page, text) =>
  page.route("**/api/llm/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/event-stream; charset=utf-8",
      body: sse(text),
    })
  );

const SNAP = [
  "# Every language, fenced",
  "",
  "Here is the markup:",
  "",
  "```html",
  "<main class=\"app\"><h1>Hi</h1></main>",
  "```",
  "",
  "and the styles:",
  "",
  "```css",
  ".app { display: grid; }",
  "```",
  "",
  "then the behaviour:",
  "",
  "```js",
  "const app = document.querySelector('.app');",
  "console.log(app);",
  "```",
  "",
  "the stylesheet written out as markdown:",
  "",
  "```markdown",
  "# Title",
  "- one",
  "```",
  "",
  "the script in python:",
  "",
  "```py",
  "import sys",
  "",
  "def main():",
  "    print('hi')",
  "```",
  "",
  "a plain text file:",
  "",
  "```txt",
  "key = value",
  "another = line",
  "```",
  "",
  "a shell command:",
  "",
  "```bash",
  "npm run dev",
  "```",
  "",
  "a payload:",
  "",
  "```json",
  "{ \"ok\": true }",
  "```",
  "",
  "Now one with no tag at all:",
  "",
  "```",
  "SELECT id FROM users WHERE active = 1;",
  "```",
  "",
  "And one with no tag that is JavaScript:",
  "",
  "```",
  "export const go = () => console.log('x');",
  "```",
  "",
  "That is every form.",
].join("\n");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

  await page.goto(`${BASE}/workspace`, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {});
  await install(page, SNAP);

  await page.locator("textarea[aria-label='Message Pulse agent']").fill("Show every language.");
  await page.locator("textarea[aria-label='Message Pulse agent']").press("Enter");
  const reply = page.locator(".bubble-agent").first();
  await reply.waitFor({ state: "visible", timeout: 30000 });
  await page.waitForFunction(
    () => document.querySelector(".bubble-agent")?.dataset.chatStatus === "complete",
    null,
    { timeout: 30000 }
  );

  const shells = reply.locator(".md-code-shell");
  const count = await shells.count();
  check("every fence became a code block", count === 10, `${count} blocks`);

  const labels = (await shells.locator(".md-code-lang").allInnerTexts()).map((t) => t.trim().toLowerCase());
  const expected = [
    "html",
    "css",
    "javascript", // alias: js
    "markdown", // alias: markdown kept
    "python", // alias: py
    "text", // alias: txt
    "bash",
    "json",
    "sql", // untagged -> detected
    "javascript", // untagged -> detected
  ];
  labels.forEach((l, i) => {
    check(`block ${i + 1} labelled correctly`, l === expected[i], `got "${l}", want "${expected[i]}"`);
  });
  check("no label is left blank or generic", !labels.some((l) => !l || l === "code"), labels.join(","));

  // raw markdown must never leak into the prose
  const outsideFences = await reply.evaluate((el) => {
    const clone = el.cloneNode(true);
    clone.querySelectorAll("pre").forEach((n) => n.remove());
    return clone.textContent || "";
  });
  check(
    "no code leaked outside the blocks",
    !/```|<main|SELECT id FROM|console\.log\(|def main/.test(outsideFences),
    outsideFences.slice(0, 120).replace(/\n/g, " ")
  );
  check(
    "no raw fence markers visible anywhere",
    (await reply.locator("text=```").count()) === 0
  );
  check("markup was not rendered as HTML", (await reply.locator(".md main, .md h1.app").count()) === 0);

  // copy fidelity across every block
  const norms = await shells.locator("pre code").allInnerTexts();
  for (let i = 0; i < count; i += 1) {
    await shells.nth(i).locator(".md-copy").click();
    await page.waitForTimeout(120);
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    const a = clip.replace(/\r\n/g, "\n").trim();
    const b = norms[i].replace(/\r\n/g, "\n").trim();
    if (a !== b) {
      check(`block ${i + 1} copies exactly`, false, `${JSON.stringify(a.slice(0, 60))} vs ${JSON.stringify(b.slice(0, 60))}`);
      break;
    }
  }
  check("all blocks copy their exact source", true, `${count} blocks`);

  // one block is independently copyable after the others
  await shells.nth(1).locator(".md-copy").click();
  await page.waitForTimeout(200);
  const cssClip = (await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, "\n").trim();
  check("css block copies only css", cssClip === '.app { display: grid; }', JSON.stringify(cssClip));

  await page.screenshot({ path: `${OUT}/k-01-languages.png`, fullPage: true });

  // An unclosed fence must still render as a code block, not break the parser.
  await page.unroute("**/api/llm/**");
  await install(page, "Before.\n\n```python\nx = 1\ny = 2\n");
  await page.locator("textarea[aria-label='Message Pulse agent']").fill("Unclosed fence.");
  await page.locator("textarea[aria-label='Message Pulse agent']").press("Enter");
  await page.waitForFunction(
    () => document.querySelectorAll(".bubble-agent").length === 2,
    null,
    { timeout: 30000 }
  );
  await page.waitForTimeout(1200);
  const second = page.locator(".bubble-agent").nth(1);
  check("an unclosed fence still renders as a code block", (await second.locator(".md-code-shell").count()) === 1);
  check("unclosed fence is labelled", (await second.locator(".md-code-lang").count()) === 1);
  check("prose before the fence still renders", (await second.locator(".md-p").count()) >= 1);
  check("no crash from the malformed fence", errors.length === 0, errors.slice(0, 2).join(" | "));

  check("no console/page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
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

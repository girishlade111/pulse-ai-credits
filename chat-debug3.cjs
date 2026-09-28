const { chromium } = require("playwright");
const BASE = "http://localhost:8081";

const SAMPLES = [
  "Explain **bold**, *italic*, `code`, and [links](https://x.com). Use ## Heading and ### Sub. Then:\n- **Point one** with detail\n- point two\n\n> a quote\n\n```js\nconst x = 1; // **not bold**\n// # not a heading\n```\n\n1. first\n2. second\n\n~~struck~~ and a horizontal rule:\n\n---\n\nDone.",
];

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${BASE}/workspace`, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });

  const c = page.locator("textarea[aria-label='Message Pulse agent']");
  for (const prompt of SAMPLES) {
    await c.fill(prompt);
    await c.press("Enter");
    await page.waitForFunction(
      () => {
        const n = document.querySelectorAll(".bubble-agent");
        return n.length && n[n.length - 1].dataset.chatStatus === "complete";
      },
      null,
      { timeout: 120000 }
    );
  }

  // inspect every rendered reply for unconsumed markers
  const report = await page.evaluate(() => {
    return [...document.querySelectorAll(".bubble-agent")].map((bubble) => {
      // markers outside <pre> are real leaks; inside <pre> they are literal code
      const clone = bubble.cloneNode(true);
      clone.querySelectorAll("pre").forEach((n) => n.remove());
      const outside = clone.textContent || "";
      const inside = [...bubble.querySelectorAll("pre")].map((n) => n.textContent).join("\n");
      return {
        leaked: (outside.match(/\*\*|^#{1,6} |^• /gm) || []).length,
        leakedText: outside,
        insideCode: inside,
        html: [...bubble.querySelectorAll(".md li, .md p, .md h2, .md h3, .md blockquote, .md ol li")].map(n => n.outerHTML.replace(/ data-[a-z-]+="[^"]*"/g, "")).join("\n").slice(0, 2000),
      };
    });
  });

  report.forEach((r, i) => {
    console.log(`\n=== reply ${i + 1} ===`);
    console.log("leaked markers (outside code):", r.leaked);
    if (r.leaked) console.log("LEAKED TEXT >>>", JSON.stringify(r.leakedText.slice(0, 600)));
    console.log("inside <pre>:", JSON.stringify(r.insideCode.slice(0, 200)));
    console.log("html:", r.html);
  });

  await page.screenshot({ path: "C:/Users/GIRISH~1/AppData/Local/Temp/opencode/shots/dbg-md.png" });
  await browser.close();
})();

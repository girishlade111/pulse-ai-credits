/**
 * Reproduces the reported bug:
 *   - first prompt returns a generic answer
 *   - the second prompt returns the FIRST prompt's answer
 *
 * Captures the exact request body and the rendered reply for each turn, so we
 * can see whether the fault is in what we send or in what we render.
 */
const { chromium } = require("playwright");
const BASE = "http://localhost:8080";

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));

  const sent = [];
  await page.route("**/api/llm/**", async (route) => {
    const req = route.request();
    if (req.method() !== "POST" || !req.url().includes("chat/completions")) {
      return route.continue();
    }
    const body = JSON.parse(req.postData() || "{}");
    sent.push({ url: req.url(), body });
    // Log the conversation the app actually sent, minus the long system prompt.
    const msgs = (body.messages || []).map((m) => ({
      role: m.role,
      content:
        typeof m.content === "string"
          ? m.content.slice(0, 90).replace(/\n/g, "\\n")
          : "[PARTS]",
    }));
    console.log(`\n>>> REQUEST to ${req.url().replace(BASE, "")}`);
    msgs.forEach((m) => console.log(`    ${m.role}: ${m.content}`));
    console.log(`    max_tokens: ${body.max_tokens}  stream: ${body.stream}`);

    // Pass the real request through to the provider.
    return route.continue();
  });

  await page.goto(`${BASE}/workspace`, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  const composer = page.locator("textarea[aria-label='Message Pulse agent']");
  const turn = async (n, text) => {
    console.log(`\n${"=".repeat(60)}\nUSER PROMPT ${n}: ${text}`);
    await composer.fill(text);
    await composer.press("Enter");
    const idx = await page.locator(".bubble-agent").count();
    try {
      await page.waitForFunction(
        (i) => {
          const nodes = document.querySelectorAll(".bubble-agent");
          return nodes[i] && nodes[i].dataset.chatStatus !== "streaming";
        },
        idx - 1,
        { timeout: 120000 }
      );
    } catch {
      console.log(`  (turn ${n} did not finish in time)`);
    }
    const status = await page.locator(".bubble-agent").nth(idx - 1).getAttribute("data-chat-status");
    const reply = (await page.locator(".bubble-agent").nth(idx - 1).innerText())
      .replace(/\s+/g, " ")
      .trim();
    console.log(`  status: ${status}`);
    console.log(`  REPLY ${n}: ${reply.slice(0, 400)}`);
    return reply;
  };

  const r1 = await turn(1, "What is the capital of France? Answer in one word.");
  const r2 = await turn(2, "What is the capital of Japan? Answer in one word.");
  const r3 = await turn(3, "Name the largest ocean on Earth. One word only.");

  console.log(`\n${"=".repeat(60)}\nVERDICT`);
  console.log(`  requests sent: ${sent.length} (expected 3)`);
  if (sent.length < 3) {
    console.log("  !! fewer requests than prompts — an extra turn is not hitting the API");
  }
  r1.includes("Paris") ? console.log("  ok   turn 1 answered the question") : console.log("  BAD  turn 1 did not answer the question");
  r2.includes("Japan") || r2.includes("Tokyo") ? console.log("  ok   turn 2 answered its own question") : console.log("  BAD  turn 2 did not answer its own question");
  if (r1 === r2) console.log("  BAD  turn 2 repeated turn 1 verbatim");
  r3.includes("Pacific") ? console.log("  ok   turn 3 answered its own question") : console.log("  BAD  turn 3 did not answer its own question");

  await browser.close();
})().catch((e) => {
  console.error("harness crashed:", e);
  process.exit(2);
});

/**
 * Verifies the reported bug is fixed.
 *
 * Symptom: the first prompt returned a generic answer, and the second prompt
 * returned the FIRST prompt's answer. Root cause: when a turn fails, the prompt
 * was kept but the reply dropped, so the next request carried two consecutive
 * user messages and the model answered the older one.
 *
 * The provider is mocked so the failure and the follow-up are deterministic.
 */
const { chromium } = require("playwright");
const BASE = "http://localhost:8080";
const results = [];
const check = (n, p, d = "") => {
  results.push({ n, p, d });
  console.log(`${p ? "PASS" : "FAIL"}  ${n}${d ? ` — ${d}` : ""}`);
};

const sse = (text, usage) => {
  const frames = [];
  for (let i = 0; i < text.length; i += 40) {
    frames.push(`data: ${JSON.stringify({ choices: [{ delta: { content: text.slice(i, i + 40) } }] })}\n\n`);
  }
  if (usage) {
    frames.push(`data: ${JSON.stringify({ choices: [], usage })}\n\n`);
  }
  frames.push("data: [DONE]\n\n");
  return frames.join("");
};

/** Scripted provider: each call answers based on the prompts it was given. */
const installScript = (page, script) => {
  let call = 0;
  const sent = [];
  return page.route("**/api/llm/**", async (route) => {
    const body = JSON.parse(route.request().postData() || "{}");
    const convo = (body.messages || []).filter((m) => m.role !== "system");
    sent.push(convo);

    const step = script[call] ?? { text: "(no script)" };
    call += 1;

    if (step.fail) {
      return route.fulfill({
        status: step.status ?? 500,
        contentType: "application/json",
        body: JSON.stringify({ error: { message: step.fail } }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: sse(step.text, step.usage),
    });
  }).then(() => sent);
};

const roles = (convo) => convo.map((m) => m.role).join(",");
const users = (convo) => convo.filter((m) => m.role === "user").map((m) => m.content);

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  const fresh = async () => {
    await page.goto(`${BASE}/workspace`, { waitUntil: "networkidle" });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(500);
  };
  const ask = async (text) => {
    const c = page.locator("textarea[aria-label='Message Pulse agent']");
    await c.fill(text);
    await c.press("Enter");
    const n = await page.locator(".bubble-agent").count();
    await page.waitForFunction(
      (i) => {
        const el = document.querySelectorAll(".bubble-agent")[i];
        return el && el.dataset.chatStatus !== "streaming";
      },
      n - 1,
      { timeout: 60000 }
    );
    const el = page.locator(".bubble-agent").nth(n - 1);
    return {
      status: await el.getAttribute("data-chat-status"),
      text: (await el.innerText()).replace(/\s+/g, " ").trim(),
    };
  };

  /* ============ 1. the reported bug: fail, then ask again ============ */
  await fresh();
  const sent = await installScript(page, [
    { fail: "Rate limit exceeded", status: 429 },
    { text: "Tokyo is the capital of Japan." },
  ]);

  const r1 = await ask("What is the capital of France?");
  check("turn 1 fails as scripted", r1.status === "error", r1.status);
  check("failed turn is reported honestly", /rate limit/i.test(r1.text), r1.text.slice(0, 60));

  const r2 = await ask("What is the capital of Japan?");
  check("turn 2 succeeds", r2.status === "complete", r2.status);
  check("turn 2 answers its OWN question", /Tokyo/.test(r2.text), r2.text.slice(0, 60));
  check("turn 2 does not return turn 1's answer", !/France|Paris/.test(r2.text), r2.text.slice(0, 60));

  check("two requests were sent", sent.length === 2, `${sent.length}`);
  const second = sent[1];
  check("second request has no leading assistant turn", roles(second).startsWith("user"), roles(second));
  check(
    "the orphaned prompt is carried forward, not dropped",
    users(second).some((c) => c.includes("France")),
    users(second).map((c) => c.slice(0, 30)).join(" // ")
  );
  check(
    "the new prompt is present",
    users(second).some((c) => c.includes("Japan")),
    users(second).map((c) => c.slice(0, 30)).join(" // ")
  );
  check(
    "exactly one user message — no consecutive prompts to choose between",
    roles(second) === "user",
    roles(second)
  );
  check(
    "the orphaned prompt is clearly separated from the new one",
    (users(second)[0] || "").includes("---"),
    JSON.stringify((users(second)[0] || "").slice(0, 60))
  );

  /* ============ 2. a clean multi-turn thread still alternates ============ */
  await fresh();
  const sent2 = await installScript(page, [
    { text: "Paris." },
    { text: "Tokyo." },
    { text: "The Pacific." },
  ]);
  await ask("Capital of France?");
  await ask("Capital of Japan?");
  await ask("Largest ocean?");
  check("three requests sent", sent2.length === 3, `${sent2.length}`);
  check("turn 1 payload is user,assistant", roles(sent2[0]) === "user", roles(sent2[0]));
  check("turn 2 payload alternates cleanly", roles(sent2[1]) === "user,assistant,user", roles(sent2[1]));
  check(
    "turn 3 payload alternates cleanly",
    roles(sent2[2]) === "user,assistant,user,assistant,user",
    roles(sent2[2])
  );
  check(
    "no turn ever sends two user messages in a row",
    sent2.every((c) => !/user,user/.test(roles(c))),
    sent2.map(roles).join(" | ")
  );

  /* ============ 3. a stopped turn does not orphan the next one ============ */
  await fresh();
  const sent3 = await installScript(page, [{ text: "x".repeat(3000) }, { text: "Second answer." }]);
  const c3 = page.locator("textarea[aria-label='Message Pulse agent']");
  await c3.fill("Write something long.");
  await c3.press("Enter");
  await page.waitForSelector(".bubble-agent", { timeout: 30000 });
  await page.waitForTimeout(700);
  await page.getByRole("button", { name: "Stop generating" }).click();
  await page.waitForTimeout(800);
  await ask("Follow-up question.");
  check("follow-up after a stop has no double-user payload", !/user,user/.test(roles(sent3[1])), roles(sent3[1]));
  check("follow-up payload is well formed", roles(sent3[1]).endsWith("user"), roles(sent3[1]));

  /* ============ 4. retry on a throttle ============ */
  await fresh();
  let attempt = 0;
  await page.route("**/api/llm/**", async (route) => {
    attempt += 1;
    if (attempt === 1) {
      return route.fulfill({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({ error: { message: "Cluster RPM rate limit exceeded" } }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: sse("Recovered after the retry."),
    });
  });
  const r4 = await ask("Any question.");
  check("a throttled turn is retried, not failed", r4.status === "complete", r4.status);
  check("the retry succeeded", /Recovered/.test(r4.text), r4.text.slice(0, 50));
  check("exactly one retry was needed", attempt === 2, `${attempt} attempts`);

  /* ============ 5. a genuine error is not retried forever ============ */
  await fresh();
  let hard = 0;
  await page.route("**/api/llm/**", async (route) => {
    hard += 1;
    return route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ error: { message: "Bad request: model not found" } }),
    });
  });
  const r5 = await ask("Anything.");
  check("a non-throttle error fails immediately", r5.status === "error", r5.status);
  check("a non-throttle error is not retried", hard === 1, `${hard} attempt(s)`);
  check("the provider's reason is surfaced", /model not found/.test(r5.text), r5.text.slice(0, 60));

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

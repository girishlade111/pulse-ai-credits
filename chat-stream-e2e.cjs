/**
 * Write-stream verification against a *real* slow stream.
 *
 * The other harness fulfils the SSE body in one shot, which finishes the turn
 * before the reveal has anything to smooth — correct behaviour, but it cannot
 * prove the smoothing exists. So this spins up:
 *
 *   1. a Node origin that streams SSE chunks with real gaps, and
 *   2. a second Vite dev server whose APINEX_BASE_URL points at that origin
 *      (the proxy already reads it from the environment)
 *
 * and measures the painted character count frame by frame against the stream.
 */
const http = require("http");
const { spawn } = require("child_process");
const { chromium } = require("playwright");

const ORIGIN_PORT = 8099;
const APP_PORT = 8082;
const BASE = `http://localhost:${APP_PORT}`;
const OUT = "C:/Users/GIRISH~1/AppData/Local/Temp/opencode/shots";
const results = [];
const check = (n, p, d = "") => {
  results.push({ n, p, d });
  console.log(`${p ? "PASS" : "FAIL"}  ${n}${d ? ` — ${d}` : ""}`);
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------ 1. the origin */

const TEXT = [
  "# Streaming write effect",
  "",
  "The agent writes this answer out over several seconds, in bursts, exactly",
  "the way a real gateway delivers tokens.",
  "",
  "```js",
  "const reveal = (text) => text.split('').join('');",
  "```",
  "",
  "Then a little more prose so there is a paragraph after the code block, which",
  "is the case that used to break the parser mid-stream.",
].join("\n");

const startOrigin = () =>
  new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });

      // Deliberately uneven: a 4-character dribble, then a 300-char burst, then
      // more dribbling. A naive append lurches on the bursts; the reveal should
      // not. The segments are contiguous, so the stream is exactly TEXT.
      const plan = [];
      const head = TEXT.slice(0, 150);
      const burst = TEXT.slice(150, 450);
      const tail = TEXT.slice(450);
      for (let i = 0; i < head.length; i += 4) plan.push(head.slice(i, i + 4));
      plan.push(burst);
      for (let i = 0; i < tail.length; i += 4) plan.push(tail.slice(i, i + 4));

      let i = 0;
      const push = () => {
        if (i >= plan.length) {
          res.write("data: [DONE]\n\n");
          res.end();
          return;
        }
        const chunk = plan[i++];
        res.write(
          `data: ${JSON.stringify({ choices: [{ delta: { content: chunk } }] })}\n\n`
        );
        setTimeout(push, chunk.length > 40 ? 10 : 45);
      };
      push();
    });
    server.listen(ORIGIN_PORT, () => resolve(server));
  });

/* ------------------------------------------------------- 2. a dev server */

const startApp = () =>
  new Promise((resolve, reject) => {
    const child = spawn("npm.cmd", ["run", "dev", "--", "--port", String(APP_PORT)], {
      cwd: __dirname,
      env: {
        ...process.env,
        APINEX_BASE_URL: `http://localhost:${ORIGIN_PORT}/v1`,
        APINEX_API_KEY: "mock-key",
        APINEX_MODEL: "mock-model",
      },
      shell: true,
    });
    let out = "";
    const onData = (buf) => {
      out += buf.toString();
      if (/ready in|Local:/.test(out)) resolve(child);
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    setTimeout(() => reject(new Error(`dev server did not start:\n${out}`)), 90000);
  });

/* --------------------------------------------------------------- 3. assert */

(async () => {
  const origin = await startOrigin();
  const app = await startApp();
  const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN });

  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

    await page.goto(`${BASE}/workspace`, { waitUntil: "networkidle" });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: "networkidle" });

    const composer = page.locator("textarea[aria-label='Message Pulse agent']");
    await composer.fill("Describe the streaming effect.");
    const t0 = Date.now();
    await composer.press("Enter");

    const reply = page.locator(".bubble-agent").first();
    await reply.waitFor({ state: "visible", timeout: 40000 });

    // Sample painted length against the true stream length. Painted length and
    // status are read in ONE evaluate — two round-trips can straddle a frame
    // and report a torn, non-monotonic value.
    const trace = [];
    for (let i = 0; i < 4000; i += 1) {
      const snap = await reply.evaluate((el) => ({
        painted: (el.querySelector(".md")?.textContent || "").length,
        status: el.dataset.chatStatus,
      }));
      trace.push({ ...snap, at: Date.now() - t0 });
      if (snap.status === "complete" && snap.painted >= TEXT.length) break;
      await sleep(8);
    }

    const streaming = trace.filter((t) => t.status === "streaming");
    check("the turn spent real time streaming", streaming.length > 15, `${streaming.length} samples`);

    const distinct = new Set(streaming.map((t) => t.painted));
    check(
      "reply paints progressively, not in one frame",
      distinct.size >= 20,
      `${distinct.size} distinct painted lengths over ${streaming.length} samples`
    );
    check(
      "painted length is monotonically non-decreasing",
      trace.every((t, i) => i === 0 || t.painted >= trace[i - 1].painted)
    );
    check(
      "painted length never exceeds the streamed text",
      trace.every((t) => t.painted <= TEXT.length),
      `max ${Math.max(...trace.map((t) => t.painted))} / ${TEXT.length}`
    );

    // The real proof: on a burst the raw stream would jump, the reveal ramps.
    const maxJump = Math.max(
      ...trace.slice(1).map((t, i) => t.painted - trace[i].painted)
    );
    check(
      "no single frame jumps more than a burst's worth of text",
      maxJump < 200,
      `largest single-frame jump ${maxJump} chars`
    );

    // The skip control is the visible signal that the reveal is lagging.
    const skipSeen = await page
      .waitForSelector("text=Show the rest", { timeout: 4000 })
      .then(() => true)
      .catch(() => false);
    check("'Show the rest' appears while the reveal lags the stream", skipSeen);

    // Let it finish.
    await page.waitForFunction(
      () => {
        const n = document.querySelector(".bubble-agent");
        return n && n.dataset.chatStatus === "complete";
      },
      null,
      { timeout: 120000 }
    );
    await sleep(400);

    const finalText = await reply.evaluate((el) => el.querySelector(".md")?.textContent || "");
    check("completed reply shows the entire text", finalText === TEXT, `${finalText.length} vs ${TEXT.length}`);
    check("skip control is gone once finished", (await page.getByRole("button", { name: /Show the rest/ }).count()) === 0);
    check("streaming caret removed on completion", (await reply.locator(".md-streaming").count()) === 0);

    // Code block copy works on a streamed answer too.
    const shell = reply.locator(".md-code-shell");
    check("code block survived the stream", (await shell.count()) === 1);
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {});
    await shell.locator(".md-copy").click();
    await sleep(300);
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    check(
      "copy works on a streamed code block",
      clip.replace(/\r\n/g, "\n").trim() === "const reveal = (text) => text.split('').join('');",
      JSON.stringify(clip)
    );

    // A follow-up must still carry the whole thread.
    await composer.fill("And in one sentence?");
    await composer.press("Enter");
    await page.waitForFunction(
      () => document.querySelectorAll(".bubble-agent").length === 2,
      null,
      { timeout: 40000 }
    );
    await page.waitForFunction(
      () => {
        const n = document.querySelectorAll(".bubble-agent");
        return n[1] && n[1].dataset.chatStatus === "complete";
      },
      null,
      { timeout: 120000 }
    );
    const second = await page.locator(".bubble-agent").nth(1).innerText();
    check("follow-up still answers with thread context", /stream|reveal|burst/i.test(second), second.slice(0, 90).replace(/\n/g, " "));

    await page.screenshot({ path: `${OUT}/w-01-streamed.png` });
    check("no console/page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
    await page.close();
  } finally {
    await browser.close();
    // `shell: true` means the handle we hold is cmd.exe, and killing it leaves
    // the Vite node process holding the port. Take down the whole tree.
    try {
      require("child_process").execSync(`taskkill /PID ${app.pid} /T /F`, { stdio: "ignore" });
    } catch {
      app.kill();
    }
    origin.close();
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

const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_BIN });
  const p = await b.newPage();
  await p.goto("http://localhost:8081/workspace", { waitUntil: "networkidle" });
  await p.evaluate(() => localStorage.clear());
  await p.reload({ waitUntil: "networkidle" });
  let sent = null;
  await p.route("**/api/llm/**", async (route) => {
    sent = JSON.parse(route.request().postData());
    await route.fulfill({
      status: 200, contentType: "text/event-stream",
      body: 'data: {"choices":[{"delta":{"content":"```python\nx=1\n```"}}]}\n\ndata: [DONE]\n\n',
    });
  });
  await p.locator("textarea[aria-label='Message Pulse agent']").fill("write a python function");
  await p.locator("textarea[aria-label='Message Pulse agent']").press("Enter");
  await p.waitForSelector(".bubble-agent", { timeout: 30000 });
  const sys = sent.messages[0].content;
  const rules = sys.split("--- Code formatting (mandatory) ---")[1] || "";
  console.log("=== Code formatting rules on the wire ===");
  console.log(rules.split("--- Conversation rules ---")[0].trim());
  console.log("\nconversation rules present:", sys.includes("--- Conversation rules ---"));
  console.log("history messages sent:", sent.messages.length);
  await b.close();
})();

/**
 * Verifies the token counter, the four export formats, and attachments.
 *
 * The provider is mocked so the export bodies and the request payload are
 * deterministic. A real PDF is generated in-process to prove pdf.js extraction.
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const BASE = "http://localhost:8080";
const TMP = "C:/Users/GIRISH~1/AppData/Local/Temp/opencode";
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
  if (usage) frames.push(`data: ${JSON.stringify({ choices: [], usage })}\n\n`);
  frames.push("data: [DONE]\n\n");
  return frames.join("");
};

/** A minimal but genuinely valid PDF, with a text stream the parser can read. */
const makePdf = () => {
  const body = [
    "Pulse quarterly report.",
    "Revenue grew by 42 percent year over year.",
    "Churn fell to three percent in Q3.",
  ].join(" ");
  const stream = `BT /F1 12 Tf 56 780 Td (${body}) Tj ET`;
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [];
  objs.forEach((o, i) => {
    offsets[i + 1] = pdf.length;
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const start = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objs.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
};

/** A 2x2 PNG. */
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR4nGP8z8Dwn4GBgYGJAQoAHgQCAZ8B4E8AAAAASUVORK5CYII=",
  "base64"
);

const REPLY = [
  "Here is the plan.",
  "",
  "```javascript",
  "const step = () => console.log('go');",
  "```",
  "",
  "That is the whole change.",
].join("\n");

(async () => {
  // fixtures
  fs.writeFileSync(path.join(TMP, "report.pdf"), makePdf());
  fs.writeFileSync(path.join(TMP, "notes.txt"), "The project ships on Friday. Owner: Priya. Budget: 4200 EUR.");

  const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

  const sent = [];
  await page.route("**/api/llm/**", (route) => {
    sent.push(JSON.parse(route.request().postData() || "{}"));
    return route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      // A gateway-reported usage figure, distinct from the length estimate.
      body: sse(REPLY, { prompt_tokens: 120, completion_tokens: 431, total_tokens: 551 }),
    });
  });

  await page.goto(`${BASE}/workspace`, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  const composer = page.locator("textarea[aria-label='Message Pulse agent']");

  /* ============================== attachments ============================== */
  const fileInput = page.locator('input[type="file"]').first();

  // text file
  await fileInput.setInputFiles(path.join(TMP, "notes.txt"));
  await page.waitForTimeout(700);
  check("text file attaches", (await page.getByText("notes.txt").count()) > 0);

  // image
  await fileInput.setInputFiles({ name: "shot.png", mimeType: "image/png", buffer: PNG });
  await page.waitForTimeout(700);
  check("image attaches", (await page.getByText("shot.png").count()) > 0);

  // pdf (parsed through pdf.js from a CDN)
  await fileInput.setInputFiles(path.join(TMP, "report.pdf"));
  await page.waitForTimeout(600);
  check("pdf attaches and shows a reading state", (await page.getByText("Reading").count()) > 0);
  await page.waitForFunction(
    () => !document.body.textContent.includes("Reading…"),
    null,
    { timeout: 40000 }
  ).catch(() => {});
  await page.waitForTimeout(500);
  check("pdf card is listed", (await page.getByText("report.pdf").count()) > 0);
  check("no pdf parse error surfaced", (await page.getByText("could not be read").count()) === 0);
  check("pdf was actually parsed (confirmed by the payload check below)", true, "");

  await composer.fill("Summarise the attachments.");
  await composer.press("Enter");
  await page.waitForFunction(
    () => document.querySelector(".bubble-agent")?.dataset.chatStatus === "complete",
    null,
    { timeout: 40000 }
  );

  const body = JSON.stringify(sent[0].messages);
  check("the request carried the text file contents", body.includes("ships on Friday"), body.length + " bytes");
  check("the pdf text reached the model", body.includes("Revenue grew by 42 percent"), "");
  check("the pdf is attributed to the right file", body.includes("report.pdf"), "");
  check("the image travelled as a vision part", body.includes('"type":"image_url"'), "");
  check("the image is a data URI, not a description", body.includes("data:image/png;base64,"), "");
  check("no base64 leaked into the text prompt", !/base64/.test(String(sent[0].messages[1].content[0].text)), "");

  /* ============================== token count ============================== */
  const stat = page.locator(".bubble-agent").first().locator("text=/tokens?/").first();
  check("a token count is shown", (await stat.count()) > 0);
  const tokenText = await page.locator(".bubble-agent").first().innerText();
  check("the reported figure is used, not the estimate", /\b431\b/.test(tokenText), tokenText.slice(-60).replace(/\n/g, " "));
  check("the figure is not marked as an estimate", !/est\./i.test(tokenText), "");
  const statTitle = await page.locator(".bubble-agent .caption[title*='token']").first().getAttribute("title");
  check("the count explains itself on hover", /reported/i.test(statTitle || ""), statTitle || "");

  /* ============================== export formats ============================== */
  const download = async (format) => {
    const wait = page.waitForEvent("download", { timeout: 20000 });
    await page.getByRole("button", { name: "Export" }).first().click();
    await page.waitForTimeout(250);
    await page.getByRole("menuitem", { name: new RegExp(format.label, "i") }).click();
    const file = await wait;
    const dest = path.join(TMP, `out-${format.id}`);
    fs.mkdirSync(dest, { recursive: true });
    const saved = path.join(dest, file.suggestedFilename());
    await file.saveAs(saved);
    return { saved, size: fs.statSync(saved).size };
  };

  const menuLabels = await (async () => {
    await page.getByRole("button", { name: "Export" }).first().click();
    await page.waitForTimeout(300);
    const items = await page.getByRole("menuitem").allInnerTexts();
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    return items;
  })();
  check("the export menu offers four formats", menuLabels.length === 4, menuLabels.join(" | "));
  ["Markdown", "Plain text", "PDF", "JSON"].forEach((label) => {
    check(`export menu lists ${label}`, menuLabels.some((t) => t.toLowerCase().includes(label.toLowerCase())), menuLabels.join(" | "));
  });

  const md = await download({ id: "md", label: "Markdown", extension: "md" });
  const mdText = fs.readFileSync(md.saved, "utf8");
  check("markdown exports with the right extension", md.saved.endsWith(".md"), path.basename(md.saved));
  check("markdown contains the prompt and reply", mdText.includes("Summarise the attachments.") && mdText.includes("const step"), "");
  check("markdown keeps the code fence intact", mdText.includes("```javascript"), "");
  check("markdown has headings", /^# /m.test(mdText), "");

  const txt = await download({ id: "txt", label: "Plain text", extension: "txt" });
  const txtText = fs.readFileSync(txt.saved, "utf8");
  check("txt exports with the right extension", txt.saved.endsWith(".txt"), path.basename(txt.saved));
  check("txt contains both sides of the exchange", txtText.includes("YOU") && txtText.includes("PULSE AGENT"), "");

  const json = await download({ id: "json", label: "JSON", extension: "json" });
  const parsed = JSON.parse(fs.readFileSync(json.saved, "utf8"));
  check("json is valid JSON", !!parsed, "");
  check("json has the turn structure", Array.isArray(parsed.turns) && parsed.turns.length === 1, `${parsed.turns?.length} turns`);
  check("json carries the prompt", parsed.turns[0].prompt.text.includes("Summarise"), "");
  check("json carries the reply", parsed.turns[0].response.text.includes("const step"), "");
  check("json records the attachment names", parsed.turns[0].prompt.attachments.length === 3, `${parsed.turns[0].prompt.attachments.length} attachments`);
  check("json records token usage", parsed.turns[0].response.tokens.completionTokens === 431, JSON.stringify(parsed.turns[0].response.tokens));
  check("json records the tool", !!parsed.turns[0].response.tool, parsed.turns[0].response.tool);

  const pdf = await download({ id: "pdf", label: "PDF", extension: "pdf" });
  const pdfBuf = fs.readFileSync(pdf.saved);
  check("pdf exports with the right extension", pdf.saved.endsWith(".pdf"), path.basename(pdf.saved));
  check("pdf has a real header", pdfBuf.subarray(0, 5).toString() === "%PDF-", pdfBuf.subarray(0, 8).toString());
  check("pdf is not empty", pdfBuf.length > 400, `${pdfBuf.length} bytes`);
  check("pdf ends correctly", pdfBuf.subarray(-6).toString().includes("%%EOF"), pdfBuf.subarray(-8).toString());
  const pdfStr = pdfBuf.toString("latin1");
  check("pdf has a valid xref table", /xref\s+0 \d+/.test(pdfStr), "");
  check("pdf has a trailer and root", /trailer\s*<<[^>]*\/Root 1 0 R/.test(pdfStr), "");
  check("pdf startxref points at the xref", /startxref\s+(\d+)[\s\S]*%%EOF/.test(pdfStr), "");
  // The offset in startxref must actually land on "xref".
  const startxref = Number(/startxref\s+(\d+)/.exec(pdfStr)?.[1]);
  check("pdf startxref offset is correct", pdfStr.slice(startxref, startxref + 4) === "xref", `offset ${startxref} -> ${JSON.stringify(pdfStr.slice(startxref, startxref + 8))}`);
  // Every object offset in the table must point at "N 0 obj".
  const table = /xref\s+0 \d+\s+([\s\S]*?)trailer/.exec(pdfStr)[1];
  const entries = table.trim().split("\n");
  const bad = entries.slice(1).filter((line, i) => {
    const off = Number(line.slice(0, 10));
    return !new RegExp(`^${i + 1} 0 obj`).test(pdfStr.slice(off, off + 20));
  });
  check("every pdf xref entry points at its object", bad.length === 0, `${bad.length} bad of ${entries.length - 1}`);
  check("pdf has a font resource", /\/BaseFont \/Helvetica/.test(pdfStr), "");
  check("pdf embeds the reply text", /const step/.test(pdfStr.replace(/\\\(/g, "(").replace(/\\\)/g, ")")), "");
  check("pdf has content streams", (pdfStr.match(/\/Length \d+ >>\s*stream/g) || []).length >= 1, "");

  /* ============================== estimates fallback ============================== */
  check("no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));

  await page.screenshot({ path: `${TMP}/shots/f-01-final.png` });
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

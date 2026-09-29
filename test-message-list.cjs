/**
 * Unit checks for the message-list repair in llm.ts.
 *
 * `toMessageList` is pure, and the cases that matter most — a failed turn, a
 * stopped turn, several orphans in a row — cannot be produced reliably from the
 * browser, because a mocked stream either completes or errors instantly.
 */
const fs = require("fs");
const path = require("path");
const esbuild = require("esbuild");

const SOURCE = path.join(__dirname, "src", "lib", "llm.ts");
const OUT = path.join(__dirname, ".llm-unit.cjs");

esbuild.buildSync({
  entryPoints: [SOURCE],
  outfile: OUT,
  bundle: true,
  format: "cjs",
  platform: "node",
  external: ["react"],
  logLevel: "silent",
});

const mod = require(OUT);
process.on("exit", () => {
  try {
    fs.unlinkSync(OUT);
  } catch {
    /* best effort */
  }
});

const results = [];
const check = (n, p, d = "") => {
  results.push({ n, p, d });
  console.log(`${p ? "PASS" : "FAIL"}  ${n}${d ? ` — ${d}` : ""}`);
};

/*
 * The function is not exported (it is an implementation detail), so it is
 * reached through the public surface: buildRequestBody is not exported either.
 * Instead, drive the real exported `streamCompletion` with a stubbed fetch and
 * read what it would have sent. That keeps the test honest about the public
 * contract rather than poking at internals.
 */
const captured = [];
globalThis.fetch = async (_url, init) => {
  captured.push(JSON.parse(init.body));
  // A minimal valid SSE body; the test only cares about the request.
  return {
    ok: true,
    status: 200,
    headers: { get: () => "text/event-stream" },
    body: {
      getReader() {
        let done = false;
        return {
          read: async () => {
            if (done) return { done: true };
            done = true;
            const payload = 'data: {"choices":[{"delta":{"content":"ok"}}]}\n\ndata: [DONE]\n\n';
            return { done: false, value: new TextEncoder().encode(payload) };
          },
          cancel: async () => {},
        };
      },
    },
  };
};

const user = (text) => ({ user: { role: "user", content: text } });
const answered = (q, a) => ({ user: { role: "user", content: q }, assistant: { role: "assistant", content: a } });

const send = async (turns) => {
  captured.length = 0;
  await mod.streamCompletion({
    provider: "atria",
    turns,
    requestType: "quick_search",
    onDelta: () => {},
  });
  return captured[0].messages.filter((m) => m.role !== "system");
};

const roles = (list) => list.map((m) => m.role).join(",");
const firstUser = (list) => String(list.find((m) => m.role === "user")?.content ?? "");
const lastUser = (list) => {
  const users = list.filter((m) => m.role === "user");
  return String(users[users.length - 1]?.content ?? "");
};

(async () => {
  /* ------------------------------------------------- alternation is kept */
  let list = await send([answered("A?", "a"), answered("B?", "b")]);
  check("answered turns alternate cleanly", roles(list) === "user,assistant,user,assistant", roles(list));
  check("order is preserved", firstUser(list) === "A?", firstUser(list));

  /* --------------------------------------- an unanswered prompt is merged */
  list = await send([user("orphan?"), answered("new?", "yes")]);
  check("an orphan never leaves two user messages in a row", !/user,user/.test(roles(list)), roles(list));
  check("the orphan is carried forward", firstUser(list).includes("orphan?"), firstUser(list).slice(0, 60));
  check("the new prompt survives", firstUser(list).includes("new?"), firstUser(list).slice(0, 60));
  check("the two prompts are separated", firstUser(list).includes("---"), firstUser(list).slice(0, 60));
  check("the orphan comes before the new prompt", firstUser(list).indexOf("orphan?") < firstUser(list).indexOf("new?"));
  check("the reply still follows as an assistant turn", roles(list) === "user,assistant", roles(list));

  /* ------------------------------------------- several orphans collapse */
  list = await send([user("one?"), user("two?"), user("three?"), answered("four?", "ok")]);
  check("three orphans collapse to one user turn", roles(list) === "user,assistant", roles(list));
  ["one?", "two?", "three?", "four?"].forEach((q) => {
    check(`orphan chain keeps "${q}"`, firstUser(list).includes(q), firstUser(list).slice(0, 90));
  });

  /* ----------------------------------- a turn with empty reply is dropped */
  // B produced no answer, so it is an orphan: C is merged onto it rather than
  // being dropped, and no empty assistant turn is emitted.
  list = await send([answered("A?", "a"), answered("B?", ""), answered("C?", "c")]);
  check("an empty reply emits no assistant turn", roles(list) === "user,assistant,user,assistant", roles(list));
  check("the orphan keeps its own prompt", firstUser(list) === "A?", firstUser(list));
  check("the next prompt is merged onto the orphan", lastUser(list).includes("B?") && lastUser(list).includes("C?"), lastUser(list).slice(0, 60));
  check("the real reply is still paired with the merged prompt", list.at(-1).content === "c", String(list.at(-1).content));

  /* ---------------------------------------------- a trailing orphan alone */
  list = await send([answered("A?", "a"), user("unanswered?")]);
  check("a trailing orphan is still sent as a user turn", roles(list) === "user,assistant,user", roles(list));
  check("the trailing orphan is intact", lastUser(list) === "unanswered?", lastUser(list));

  /* -------------------------------------- empty prompts are not sent */
  list = await send([user(""), user("   "), answered("real?", "yes")]);
  check("blank prompts are discarded", firstUser(list) === "real?", firstUser(list));
  check("no leading whitespace-only user turn", !/user,user/.test(roles(list)), roles(list));

  /* --------------------------------------------- images survive the merge */
  list = await send([
    user("what is in this image?"),
    {
      user: {
        role: "user",
        content: [
          { type: "text", text: "compare them" },
          { type: "image_url", image_url: { url: "data:image/png;base64,AAA" } },
        ],
      },
    },
  ]);
  const merged = list.find((m) => m.role === "user");
  check("an image part survives the merge", Array.isArray(merged?.content), typeof merged?.content);
  const parts = Array.isArray(merged?.content) ? merged.content : [];
  check("the merged turn keeps the image part", parts.some((p) => p.type === "image_url"), `${parts.length} parts`);
  check(
    "the merged turn keeps both prompts as text",
    parts.filter((p) => p.type === "text").map((p) => p.text).join(" ").includes("what is in this image?") &&
      parts.filter((p) => p.type === "text").map((p) => p.text).join(" ").includes("compare them"),
    parts.filter((p) => p.type === "text").map((p) => p.text.slice(0, 30)).join(" | ")
  );

  /* ------------------------------------------------- token estimation sane */
  check("empty text estimates to zero tokens", mod.estimateTokens("") === 0, String(mod.estimateTokens("")));
  check("one word is one token", mod.estimateTokens("hello") === 1, String(mod.estimateTokens("hello")));
  check(
    "a long answer estimates upward",
    mod.estimateTokens("a".repeat(4000)) > 900,
    String(mod.estimateTokens("a".repeat(4000)))
  );

  const failed = results.filter((r) => !r.p);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.log("\nFAILURES:");
    failed.forEach((f) => console.log(` - ${f.n}: ${f.d}`));
    process.exit(1);
  }
})().catch((e) => {
  console.error("crashed:", e);
  process.exit(2);
});

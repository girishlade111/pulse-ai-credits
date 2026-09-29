/**
 * Loads the TS hook's pure helper into CommonJS so the pacing math can be
 * asserted without a bundler, a browser or a running model. React stays
 * external — it only needs to resolve, it is never called.
 */
const fs = require("fs");
const path = require("path");
const esbuild = require("esbuild");

const SOURCE = path.join(__dirname, "src", "components", "chat", "use-stream-reveal.ts");
const OUT = path.join(__dirname, ".reveal-step.cjs");

esbuild.buildSync({
  entryPoints: [SOURCE],
  outfile: OUT,
  bundle: true,
  format: "cjs",
  platform: "node",
  external: ["react"],
  logLevel: "silent",
});

module.exports = require(OUT);

process.on("exit", () => {
  try {
    fs.unlinkSync(OUT);
  } catch {
    /* best effort */
  }
});

/**
 * Runnable code artifacts.
 *
 * A fenced block of HTML, SVG, JavaScript or Mermaid in an assistant reply is
 * not just text — it is something the reader wants to *see*. This module turns
 * that block into a self-contained document that can be rendered in a sandboxed
 * iframe, plus the small amount of bookkeeping the viewer needs (a filename, a
 * label, a language check).
 *
 * The document is always built here rather than in the component so the same
 * block produces the same output in the side panel and in the fullscreen
 * modal — two builders would drift, and the preview would quietly disagree with
 * what "Download file" hands you.
 */

export type ArtifactKind = "html" | "svg" | "javascript" | "mermaid";

/**
 * Fence tags that map to a runnable artifact.
 *
 * Deliberately narrow: `typescript` and `jsx` are excluded because neither
 * compiles in a browser, and offering a "Run" button that always throws is
 * worse than not offering one. The viewer still opens them for *reading*, so
 * nothing is lost.
 */
const RUNNABLE: Record<string, ArtifactKind> = {
  html: "html",
  svg: "svg",
  javascript: "javascript",
  mermaid: "mermaid",
};

/** Mermaid is not a dependency, so it is fetched on demand from a CDN. */
const MERMAID_URL = "https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.esm.min.mjs";

/** True when the language has a live preview at all, runnable or not. */
export const isViewableArtifact = (language?: string): boolean => {
  if (!language) return false;
  return language === "typescript" || language === "jsx" || hasKind(language);
};

const hasKind = (language: string): boolean =>
  Object.prototype.hasOwnProperty.call(RUNNABLE, language);

/** The preview flavour, or `undefined` when the block only has code. */
export const artifactKind = (language?: string): ArtifactKind | undefined => {
  if (!language) return undefined;
  return hasKind(language) ? RUNNABLE[language] : undefined;
};

/**
 * Whether the block can actually *run*, as opposed to being viewable.
 *
 * Drives the button copy: "Run live preview" for something executable,
 * "Open in artifact viewer" for TypeScript or JSX, which can only be read.
 */
export const isRunnableArtifact = (language?: string): boolean =>
  artifactKind(language) !== undefined;

/** Short label for the viewer chrome. */
export const artifactLabel = (language?: string): string => {
  switch (artifactKind(language)) {
    case "html":
      return "HTML preview";
    case "svg":
      return "SVG preview";
    case "javascript":
      return "JavaScript console";
    case "mermaid":
      return "Diagram";
    default:
      return language ?? "code";
  }
};

/**
 * A stable, filesystem-safe filename for the download.
 *
 * Derived from the code rather than from the fence tag so two HTML blocks in
 * one reply do not both become `artifact.html`.
 */
export const artifactFileName = (kind: ArtifactKind, code: string): string => {
  const extension = kind === "javascript" ? "js" : kind;
  const slug = (code.match(/<h[12][^>]*>([^<]{3,40})<\/h[12]>/i)?.[1] ?? "")
    .replace(/[^\w -]+/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .slice(0, 32);
  return slug ? `artifact-${slug}.${extension}` : `artifact.${extension}`;
};

/**
 * Escapes text that is about to be embedded in a `<script>` element.
 *
 * `</script` inside a string literal closes the element early, which turns the
 * rest of the user's or model's code into markup. The only safe escape for
 * script *content* is to break the closing sequence with an escape.
 */
const escapeScript = (code: string): string =>
  code.replace(/<\/(script)/gi, "<\\/$1");

/** Escapes text for use inside an HTML attribute value. */
const escapeAttr = (value: string): string =>
  value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/**
 * The wrapper page every artifact is embedded in.
 *
 * Deliberately dependency-free and inline: the preview runs in a sandbox with
 * no network allowance for stylesheets, and Tailwind is not in scope inside the
 * iframe. The page paints its own canvas so a dark-mode reader does not get
 * flashed with white.
 */
const shell = (body: string, background: string): string => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  :root { color-scheme: light dark; }
  *, *::before, *::after { box-sizing: border-box; }
  html, body { height: 100%; }
  body {
    margin: 0;
    padding: 20px;
    background: ${background};
    color: #26251e;
    font-family: Inter, system-ui, -apple-system, "Segoe UI", sans-serif;
    font-size: 15px;
    line-height: 1.6;
  }
  body[data-shell="console"] { display: flex; flex-direction: column; padding: 0; }
  #console-output {
    flex: 1;
    min-height: 0;
    overflow: auto;
    margin: 0;
    padding: 16px;
    background: #0f0f0e;
    color: #e6e5e0;
    font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 13px;
    line-height: 1.55;
    white-space: pre-wrap;
    word-break: break-word;
  }
  #console-output:empty::before {
    content: "No console output. Use console.log() to see values here.";
    color: #807d72;
  }
  #console-output .row { display: flex; gap: 10px; }
  #console-output .tag { flex: none; color: #a09c92; user-select: none; }
  #console-output .tag-warn { color: #dfa88f; }
  #console-output .tag-error { color: #cf2d56; }
  #console-output .row-error .msg { color: #cf2d56; }
  #console-output .row-warn .msg { color: #dfa88f; }
  .stage { flex: 1; display: grid; place-items: center; min-height: 0; padding: 16px; }
  .stage > svg { max-width: 100%; height: auto; }
</style>
</head>
<body>
${body}
</body>
</html>`;

/**
 * A console pane that captures what the snippet logs.
 *
 * Without this a JavaScript artifact has nowhere to show its result: the
 * document is empty, the snippet runs, and the reader sees a blank panel.
 * Overriding the three console methods covers essentially all snippet output
 * without the side effects of monkey-patching more of the console.
 */
const consoleStage = (code: string): string => `
<pre id="console-output" role="log" aria-live="polite"></pre>
<script>
(function () {
  var out = document.getElementById("console-output");
  var render = function (value) {
    if (typeof value === "string") return value;
    if (value instanceof Error) return value.stack || value.message;
    try { return JSON.stringify(value); } catch { return String(value); }
  };
  var write = function (kind, args) {
    var row = document.createElement("div");
    row.className = "row row-" + kind;
    var tag = document.createElement("span");
    tag.className = "tag" + (kind === "log" ? "" : " tag-" + kind);
    tag.textContent = kind === "log" ? "log" : kind === "warn" ? "warn" : "error";
    var msg = document.createElement("span");
    msg.className = "msg";
    msg.textContent = Array.prototype.map.call(args, render).join(" ");
    row.appendChild(tag);
    row.appendChild(msg);
    out.appendChild(row);
    out.scrollTop = out.scrollHeight;
  };
  ["log", "warn", "error"].forEach(function (kind) {
    var original = console[kind];
    console[kind] = function () {
      write(kind, arguments);
      if (original) original.apply(console, arguments);
    };
  });
  window.addEventListener("error", function (event) {
    write("error", [event.message + (event.lineno ? " (line " + event.lineno + ")" : "")]);
  });
})();
<\/script>
<script>
${escapeScript(code)}
<\/script>`;

/** Mermaid needs its module runtime; a failure is reported in the stage. */
const mermaidStage = (code: string): string => `
<div class="stage" id="stage"><p id="mermaid-status">Rendering diagram…</p></div>
<script type="module">
import mermaid from "${MERMAID_URL}";
const status = document.getElementById("mermaid-status");
const stage = document.getElementById("stage");
mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "default" });
try {
  const { svg } = await mermaid.render("pulse-artifact", ${JSON.stringify(code)});
  stage.innerHTML = svg;
} catch (error) {
  status.textContent = "Could not render this diagram: " + (error && error.message ? error.message : error);
}
<\/script>`;

/**
 * Builds the full document for an artifact.
 *
 * A block that already carries a document skeleton is used verbatim, so an
 * assistant's `<!doctype html>` page renders exactly as written instead of
 * being nested in a wrapper.
 */
export const buildArtifactDocument = (kind: ArtifactKind, code: string): string => {
  const source = code.trim();
  if (!source) return shell("<p>Nothing to preview — this code block is empty.</p>", "#fafaf7");

  switch (kind) {
    case "html":
      if (/^\s*<!doctype html/i.test(source) || /<html\b/i.test(source)) return source;
      return shell(source, "#ffffff");
    case "svg":
      if (/^\s*<!doctype html/i.test(source)) return source;
      return shell(`<div class="stage">${source}</div>`, "#ffffff");
    case "javascript":
      return shell(consoleStage(source), "#0f0f0e").replace(
        "<body>",
        '<body data-shell="console">'
      );
    case "mermaid":
      return shell(mermaidStage(source), "#ffffff");
    default:
      return shell(`<pre>${escapeAttr(source)}</pre>`, "#ffffff");
  }
};

/** Triggers a download of the artifact source. Returns false if blocked. */
export const downloadArtifact = (kind: ArtifactKind, code: string): boolean => {
  try {
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = artifactFileName(kind, code);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    // Revoked on the next tick: Safari cancels the download if the URL dies
    // synchronously after `click`.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch {
    return false;
  }
};
/**
 * A small, dependency-free Markdown renderer for assistant replies.
 *
 * Assistant output is untrusted text coming back from an LLM, so this renders
 * to React elements and never touches `innerHTML` — there is no HTML escape
 * hole to get wrong. Link targets are restricted to http/https/mailto so a
 * crafted reply cannot smuggle a `javascript:` URL into the transcript.
 *
 * Supported: ATX headings, fenced code, blockquotes, horizontal rules,
 * ordered/unordered lists (one level of nesting), paragraphs, and inline
 * bold / italic / strikethrough / code / links.
 */

import React from "react";
import { toast } from "sonner";
import { Check, Copy } from "lucide-react";
import { copyText } from "@/lib/clipboard";
import { cn } from "@/lib/utils";

const SAFE_PROTOCOL = /^(https?:|mailto:)/i;

const isSafeHref = (href: string): boolean => {
  const value = href.trim();
  // Relative links are fine; absolute ones must declare a safe protocol.
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return SAFE_PROTOCOL.test(value);
  return !value.toLowerCase().startsWith("javascript:");
};

type Inline = React.ReactNode;

/** Matches the inline constructs we support, longest-first. */
const INLINE_PATTERN =
  /(`[^`]+`)|(\*\*[^*]+\*\*|__[^_]+__)|(~~[^~]+~~)|(\*[^*\n]+\*|_[^_\n]+_)|(\[[^\]]+\]\([^)\s]+\))/g;

const renderInline = (text: string, keyPrefix: string): Inline[] =>
  text.split(INLINE_PATTERN).filter((chunk) => chunk !== undefined && chunk !== "").map((chunk, i) => {
    const key = `${keyPrefix}-${i}`;

    if (chunk.startsWith("`") && chunk.endsWith("`") && chunk.length > 2) {
      return (
        <code key={key} className="md-code">
          {chunk.slice(1, -1)}
        </code>
      );
    }

    if (
      (chunk.startsWith("**") && chunk.endsWith("**")) ||
      (chunk.startsWith("__") && chunk.endsWith("__"))
    ) {
      return (
        <strong key={key} className="font-semibold text-ink">
          {chunk.slice(2, -2)}
        </strong>
      );
    }

    if (chunk.startsWith("~~") && chunk.endsWith("~~")) {
      return (
        <s key={key} className="text-muted">
          {chunk.slice(2, -2)}
        </s>
      );
    }

    if (
      (chunk.startsWith("*") && chunk.endsWith("*")) ||
      (chunk.startsWith("_") && chunk.endsWith("_"))
    ) {
      return <em key={key}>{chunk.slice(1, -1)}</em>;
    }

    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(chunk);
    if (link) {
      const [, label, href] = link;
      if (!isSafeHref(href)) return <span key={key}>{label}</span>;
      return (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noreferrer noopener"
          className="md-link"
        >
          {label}
        </a>
      );
    }

    return <React.Fragment key={key}>{chunk}</React.Fragment>;
  });

const HEADING_CLASS: Record<number, string> = {
  1: "md-h1",
  2: "md-h2",
  3: "md-h3",
  4: "md-h4",
  5: "md-h5",
  6: "md-h6",
};

const FENCE = /^\s*```\s*([\w+#.-]*)\s*$/;

/**
 * Canonical names, so the same language always carries the same label whether
 * the model wrote `js`, `JS`, `JavaScript` or `javascript`.
 */
const LANGUAGE_ALIASES: Record<string, string> = {
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  node: "javascript",
  ts: "typescript",
  tsx: "typescript",
  py: "python",
  python3: "python",
  rb: "ruby",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  console: "bash",
  yml: "yaml",
  md: "markdown",
  txt: "text",
  plain: "text",
  text: "text",
  "c++": "cpp",
  cs: "csharp",
  htm: "html",
  golang: "go",
  postgres: "sql",
  psql: "sql",
  curl: "bash",
};

const normalizeLanguage = (raw?: string): string | undefined => {
  const value = raw?.trim().toLowerCase();
  if (!value) return undefined;
  return LANGUAGE_ALIASES[value] ?? value;
};

/**
 * Last-resort tag for a fence the model opened without one.
 *
 * Only high-confidence, low-false-positive signals count — the cost of a wrong
 * label is a mislabelled block, whereas a missed guess just falls back to
 * `text`, which is honest.
 */
const detectLanguage = (code: string): string => {
  const first = code.split("\n").find((line) => line.trim())?.trim() ?? "";
  const cssOpen = /^[.#@:*a-z-][^{};]*\{\s*$|^@(media|import|font-face|keyframes)\b/i;

  if (/^<!doctype html|^<html\b|^<\/?(div|section|main|header|footer|nav|body|head|span|p|ul|li|form|table|svg)\b/i.test(first)) {
    return "html";
  }
  if (cssOpen.test(first)) return "css";
  if (/^(def|class)\s+[A-Za-z_]\w*|^(from|import)\s+[A-Za-z_][\w.]*\s*(import|$)|^#!.*\bpython/.test(first)) {
    return "python";
  }
  if (/^(SELECT|INSERT|UPDATE|DELETE|WITH|CREATE\s+TABLE|ALTER)\b/i.test(first)) return "sql";
  if (/^\s*[{[]/.test(first) && /^\s*[{[][\s\S]*[}\]]\s*$/.test(code.trim())) return "json";

  if (/^(const|let|var|function|class|async|export|import|require|interface)\b/.test(first)) {
    // JS and TS are near-indistinguishable without a tag. Default to the far
    // more common one, and only claim TypeScript on an explicit annotation.
    const annotated = /:\s*(string|number|boolean|void|unknown|any|Promise<|\w+\[\])/.test(
      code
    );
    return annotated ? "typescript" : "javascript";
  }

  // Deliberately excludes `export`, which is also JS module syntax.
  if (/^(#!\/|\$ |npm |yarn |pnpm |git |docker |curl |cd |mkdir |chmod |apt |pip )/m.test(code)) {
    return "bash";
  }

  return "text";
};

/**
 * A fenced block with its own copy control.
 *
 * Copying from inside a `<pre>` means dragging a text selection across a
 * horizontally scrolling block, which nobody enjoys — so every block carries a
 * button that copies the *raw* source. The raw text is what this component was
 * handed at parse time, so what lands on the clipboard is exactly the code,
 * with no rendering artefacts.
 */
const CodeBlock: React.FC<{ language?: string; code: string }> = ({ language, code }) => {
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = React.useCallback(async () => {
    // Raw source, so nothing from the rendering leaks into the clipboard.
    if (await copyText(code)) setCopied(true);
    else toast.error("Could not copy the code block.");
  }, [code]);

  return (
    <figure className="md-code-shell">
      <figcaption className="md-code-bar">
        <span className="md-code-lang">{language || "code"}</span>
        <button
          type="button"
          onClick={copy}
          className="md-copy"
          aria-label={copied ? "Code copied to clipboard" : "Copy code block"}
          title={copied ? "Copied" : "Copy code"}
        >
          {copied ? (
            <>
              <Check aria-hidden />
              Copied
            </>
          ) : (
            <>
              <Copy aria-hidden />
              Copy
            </>
          )}
        </button>
      </figcaption>
      <pre className="md-pre">
        <code className="md-code md-code-block">{code}</code>
      </pre>
    </figure>
  );
};

const renderBlocks = (source: string): React.ReactNode[] => {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const out: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  const flushParagraph = (buffer: string[]) => {
    if (!buffer.length) return;
    const joined = buffer.join("\n").trim();
    buffer.length = 0;
    if (!joined) return;
    out.push(
      <p key={`p-${key++}`} className="md-p">
        {renderInline(joined, `p-${key}`)}
      </p>
    );
  };

  const paragraph: string[] = [];

  while (i < lines.length) {
    const line = lines[i];

    // fenced code
    const fence = FENCE.exec(line);
    if (fence) {
      flushParagraph(paragraph);
      const body: string[] = [];
      i += 1;
      // A fence the model never closes still renders as code to the end, which
      // beats leaking raw markup into a paragraph.
      while (i < lines.length && !FENCE.test(lines[i])) {
        body.push(lines[i]);
        i += 1;
      }
      i += 1; // closing fence (or EOF)
      const code = body.join("\n");
      out.push(
        <CodeBlock
          key={`code-${key++}`}
          language={normalizeLanguage(fence[1]) ?? detectLanguage(code)}
          code={code}
        />
      );
      continue;
    }

    if (!line.trim()) {
      flushParagraph(paragraph);
      i += 1;
      continue;
    }

    // horizontal rule
    if (/^\s*([-*_])\s*(\1\s*){2,}$/.test(line)) {
      flushParagraph(paragraph);
      out.push(<hr key={`hr-${key++}`} className="md-hr" />);
      i += 1;
      continue;
    }

    // heading
    const heading = /^\s*(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      flushParagraph(paragraph);
      const level = heading[1].length;
      const Tag = `h${level}` as "h1";
      out.push(
        <Tag key={`h-${key++}`} className={cn("md-heading", HEADING_CLASS[level])}>
          {renderInline(heading[2], `h-${key}`)}
        </Tag>
      );
      i += 1;
      continue;
    }

    // blockquote
    if (/^\s*>\s?/.test(line)) {
      flushParagraph(paragraph);
      const body: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        body.push(lines[i].replace(/^\s*>\s?/, ""));
        i += 1;
      }
      out.push(
        <blockquote key={`q-${key++}`} className="md-quote">
          {renderBlocks(body.join("\n"))}
        </blockquote>
      );
      continue;
    }

    // unordered list
    if (/^\s*[-*+•]\s+/.test(line)) {
      flushParagraph(paragraph);
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+•]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+•]\s+/, ""));
        i += 1;
      }
      out.push(
        <ul key={`ul-${key++}`} className="md-ul">
          {items.map((item, index) => (
            <li key={index} className="md-li">
              {renderInline(item, `ul-${key}-${index}`)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // ordered list
    if (/^\s*\d+[.)]\s+/.test(line)) {
      flushParagraph(paragraph);
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+[.)]\s+/, ""));
        i += 1;
      }
      out.push(
        <ol key={`ol-${key++}`} className="md-ol">
          {items.map((item, index) => (
            <li key={index} className="md-li">
              {renderInline(item, `ol-${key}-${index}`)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    paragraph.push(line);
    i += 1;
  }

  flushParagraph(paragraph);
  return out;
};

interface MarkdownProps {
  content: string;
  className?: string;
}

export const Markdown: React.FC<MarkdownProps> = ({ content, className }) => (
  <div className={cn("md", className)}>{renderBlocks(content)}</div>
);

export default Markdown;

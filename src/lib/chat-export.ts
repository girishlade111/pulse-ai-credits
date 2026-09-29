/**
 * Transcript export in four formats.
 *
 * markdown, txt and json are plain text, so they are a Blob each. PDF is the
 * awkward one: rather than pull in a ~300KB writer for one button, this emits
 * the PDF file format directly. A text-only PDF using the standard Helvetica
 * faces needs no embedded font — they are guaranteed present in every reader —
 * so the output is a few kilobytes and opens anywhere.
 *
 * Reference: PDF 32000-1:2008 §7.3 (content streams), §7.5.2 (fonts),
 * §7.5.4 (standard 14), §7.5.8 (page tree), §14.4 (cross-reference table).
 */

import type { ChatMessage } from "./chat-types";
import { getMode } from "./chat-modes";

export type ExportFormat = "md" | "txt" | "pdf" | "json";

export const EXPORT_FORMATS: {
  id: ExportFormat;
  label: string;
  extension: string;
  mime: string;
}[] = [
  { id: "md", label: "Markdown", extension: "md", mime: "text/markdown;charset=utf-8" },
  { id: "txt", label: "Plain text", extension: "txt", mime: "text/plain;charset=utf-8" },
  { id: "pdf", label: "PDF", extension: "pdf", mime: "application/pdf" },
  { id: "json", label: "JSON", extension: "json", mime: "application/json" },
];

export interface ExportTurn {
  prompt: ChatMessage;
  reply?: ChatMessage;
}

const stamp = () => new Date().toISOString();

/* ------------------------------------------------------------------ markdown */

const exportMarkdown = (turns: ExportTurn[]): string => {
  const out: string[] = [`# ${turns[0]?.prompt.text.slice(0, 60) || "Chat"}`, ""];

  for (const { prompt, reply } of turns) {
    out.push("## Prompt", "", prompt.text, "");
    if (reply?.text) out.push("## Response", "", reply.text, "");
  }

  out.push("---", "", `Exported from Pulse AI · ${stamp()}`);
  return out.join("\n");
};

/* ---------------------------------------------------------------- plain text */

const exportPlainText = (turns: ExportTurn[]): string => {
  const out: string[] = ["PULSE AI — CONVERSATION", "=".repeat(50), ""];

  turns.forEach(({ prompt, reply }, index) => {
    out.push(`[${index + 1}] YOU`, "-".repeat(50), prompt.text, "");
    if (reply?.text) out.push(`[${index + 1}] PULSE AGENT`, "-".repeat(50), reply.text, "");
  });

  out.push("=".repeat(50), `Exported ${stamp()}`, "Exported from Pulse AI");
  return out.join("\n");
};

/* ---------------------------------------------------------------------- json */

const exportJson = (turns: ExportTurn[]): string =>
  JSON.stringify(
    {
      exportedAt: stamp(),
      source: "Pulse AI",
      title: turns[0]?.prompt.text.slice(0, 60) || "Chat",
      turnCount: turns.length,
      turns: turns.map(({ prompt, reply }) => ({
        prompt: {
          text: prompt.text,
          createdAt: prompt.createdAt,
          tool: prompt.requestType,
          attachments: prompt.attachments?.map((a) => ({
            name: a.name,
            type: a.type,
            size: a.size,
          })),
        },
        response: reply
          ? {
              text: reply.text,
              status: reply.status,
              createdAt: reply.createdAt,
              tool: reply.requestType,
              creditsUsed: reply.creditsUsed,
              tokens: reply.tokens,
            }
          : null,
      })),
    },
    null,
    2
  );

/* ----------------------------------------------------------------------- pdf */

const A4 = { width: 595.28, height: 841.89 };
const MARGIN = 56;
const FONT_SIZE = 10.5;
const LINE_HEIGHT = 15;
const MAX_CHARS = 92; // Helvetica averages ~0.5em, so ~92 chars fit the measure

/** Escapes a string for a PDF literal string. */
const pdfEscape = (text: string): string =>
  text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

/**
 * Maps a character to WinAnsiEncoding, which is what the standard 14 fonts use.
 * Anything outside it becomes '?', so a PDF can never be malformed by a glyph
 * the font cannot draw.
 */
const winAnsi = (text: string): string => {
  let out = "";
  for (const char of text) {
    const code = char.codePointAt(0) ?? 63;
    out += code >= 32 && code <= 255 ? char : "?";
  }
  return out;
};

/** Greedy word wrap; long unbreakable tokens are hard-split. */
const wrap = (text: string, width = MAX_CHARS): string[] => {
  const lines: string[] = [];

  for (const paragraph of text.split("\n")) {
    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      if (!word) continue;
      if (line.length + word.length + 1 > width) {
        if (line) lines.push(line);
        // A single token longer than the measure (a URL, a base64 blob) has to
        // be broken or it would run off the page.
        if (word.length > width) {
          for (let i = 0; i < word.length; i += width) {
            lines.push(word.slice(i, i + width));
          }
          line = "";
          continue;
        }
        line = word;
      } else {
        line = line ? `${line} ${word}` : word;
      }
    }
    if (line) lines.push(line);
  }

  return lines;
};

interface Block {
  text: string;
  size: number;
  bold: boolean;
  gapBefore: number;
}

/** Renders a transcript into positioned lines plus a page count. */
const layoutPdf = (turns: ExportTurn[]) => {
  const blocks: Block[] = [];
  const push = (text: string, size = FONT_SIZE, bold = false, gapBefore = 0) => {
    blocks.push({ text, size, bold, gapBefore });
  };

  push("Pulse AI — conversation", 16, true, 0);
  push(turns[0]?.prompt.text.slice(0, 70) || "Chat", 10, false, 6);
  push(`Exported ${new Date().toLocaleString()}`, 8, false, 4);

  turns.forEach(({ prompt, reply }, index) => {
    push(`TURN ${index + 1} — YOU`, 10, true, 18);
    wrap(prompt.text).forEach((line) => push(line));

    if (reply?.text) {
      const tool = reply.requestType ? ` · ${getMode(reply.requestType).name}` : "";
      push(`TURN ${index + 1} — PULSE AGENT${tool}`, 10, true, 12);
      wrap(reply.text).forEach((line) => push(line));
    }
  });

  // Paginate.
  const usable = A4.height - MARGIN * 2;
  const pages: Block[][] = [];
  let page: Block[] = [];
  let used = 0;

  for (const block of blocks) {
    const height = (block.size / FONT_SIZE) * LINE_HEIGHT + block.gapBefore;
    if (used + height > usable && page.length) {
      pages.push(page);
      page = [];
      used = 0;
    }
    page.push(block);
    used += height;
  }
  if (page.length) pages.push(page);

  return pages;
};

const buildPdf = (turns: ExportTurn[]): string => {
  const pages = layoutPdf(turns);
  const pageCount = pages.length;

  // Object 1 catalog, 2 page tree, 3 font, 4 bold font, then page/content pairs.
  const objects: string[] = [];
  const pageObjIds = pages.map((_, i) => 5 + i * 2);
  const firstPage = pageObjIds[0];

  objects[1] = `<< /Type /Catalog /Pages 2 0 R >>`;
  objects[2] = `<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageCount} >>`;
  objects[3] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`;
  objects[4] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`;

  pages.forEach((blocks, index) => {
    const pageId = pageObjIds[index];
    const contentId = pageId + 1;

    objects[pageId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4.width} ${A4.height}] ` +
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`;

    let y = A4.height - MARGIN;
    const ops: string[] = ["BT"];

    for (const block of blocks) {
      y -= block.gapBefore;
      y -= (block.size / FONT_SIZE) * LINE_HEIGHT;
      if (y < MARGIN) break;
      const font = block.bold ? "/F2" : "/F1";
      ops.push(`${font} ${block.size} Tf`);
      ops.push(`1 0 0 1 ${MARGIN} ${y.toFixed(2)} Tm`);
      ops.push(`(${pdfEscape(winAnsi(block.text))}) Tj`);
    }

    ops.push("ET");
    const stream = ops.join("\n");
    objects[contentId] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  });

  // Assemble the file, then the byte-offset table every reader walks.
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];

  objects.forEach((body, id) => {
    if (!body) return;
    offsets[id] = pdf.length;
    pdf += `${id} 0 obj\n${body}\nendobj\n`;
  });

  const xrefStart = pdf.length;
  const maxId = objects.length - 1;
  pdf += `xref\n0 ${maxId + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= maxId; id += 1) {
    pdf += `${String(offsets[id] ?? 0).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${maxId + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  return pdf;
};

/* --------------------------------------------------------------------- save */

const slug = (text: string): string =>
  text
    .slice(0, 40)
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "chat";

/** Builds the file body for a format. */
export const renderExport = (format: ExportFormat, turns: ExportTurn[]): string => {
  switch (format) {
    case "md":
      return exportMarkdown(turns);
    case "txt":
      return exportPlainText(turns);
    case "json":
      return exportJson(turns);
    case "pdf":
      return buildPdf(turns);
  }
};

/**
 * Writes the file.
 *
 * A PDF is a byte format, and its cross-reference table stores byte offsets.
 * `new Blob([string])` encodes as UTF-8, which turns any character above U+007F
 * into two or three bytes and shifts every offset recorded after it — a file
 * that opens in some readers and not others, and only for replies containing
 * an accented letter or an em dash. So the body is first mapped to one byte per
 * code unit (latin1), which is exactly what `winAnsi` already guarantees.
 */
const toBlob = (body: string, mime: string): Blob => {
  if (mime.startsWith("application/pdf")) {
    const bytes = new Uint8Array(body.length);
    for (let i = 0; i < body.length; i += 1) bytes[i] = body.charCodeAt(i) & 0xff;
    return new Blob([bytes], { type: mime });
  }
  return new Blob([body], { type: mime });
};

/** Renders and downloads the transcript. Returns false if the browser refused. */
export const downloadExport = (format: ExportFormat, turns: ExportTurn[]): boolean => {
  const meta = EXPORT_FORMATS.find((entry) => entry.id === format) ?? EXPORT_FORMATS[0];
  const body = renderExport(format, turns);
  const name = `pulse-chat-${slug(turns[0]?.prompt.text ?? "")}.${meta.extension}`;

  try {
    const blob = toBlob(body, meta.mime);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    // Revoking immediately can cancel the download in some browsers.
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return true;
  } catch {
    return false;
  }
};

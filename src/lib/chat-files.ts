/**
 * Attachment handling for the composer: validation, text extraction, previews,
 * and the content that gets folded into the request.
 *
 * Extracted text is trimmed before it reaches the prompt — a pasted 400-line
 * file otherwise swallows the context window and the model starts ignoring the
 * actual question.
 *
 * Two attachment kinds are read for real rather than described:
 *  - text/code files, decoded in the browser
 *  - PDFs, parsed lazily with pdf.js so the model sees the document's words
 * Images are not read as text at all: they travel as vision parts, which is the
 * only way the model can actually look at them.
 */

import type { ChatAttachment } from "./chat-types";
import type { LlmContent, LlmContentPart } from "./llm";

export const MAX_FILES = 5;
export const MAX_FILE_SIZE = 10 * 1024 * 1024;
/** Per-file character budget folded into the prompt. */
const MAX_CONTENT_CHARS = 8_000;
const MAX_TOTAL_CONTEXT_CHARS = 40_000;
/** pdf.js is ~350KB, so it is only fetched when a PDF is actually attached. */
const PDF_JS_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.6.82/build/pdf.min.mjs";
const PDF_WORKER_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.6.82/build/pdf.worker.min.mjs";
const PDF_MAX_PAGES = 25;

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "text/plain",
  "text/csv",
  "text/markdown",
  "text/html",
  "text/css",
  "text/javascript",
  "application/pdf",
  "application/json",
  "application/xml",
  "application/javascript",
  "application/typescript",
  "text/x-python",
  "text/x-java-source",
  "text/x-c++src",
]);

const ALLOWED_EXTENSION = /\.(txt|md|js|ts|tsx|jsx|py|java|cpp|h|html|css|json|xml|csv|yml|yaml|sql|sh)$/i;

const CODE_EXTENSIONS = /\.(js|ts|tsx|jsx|mjs|cjs|py|java|cpp|c|h|go|rs|rb|php|sh|sql)$/i;

/** Office documents a browser can decode as a zip of XML. */
const RICH_DOC = /\.(docx|pptx|xlsx|odt|ods)$/i;

export const isImage = (type: string): boolean => type.startsWith("image/");
export const isPdf = (type: string, name = ""): boolean =>
  type === "application/pdf" || /\.pdf$/i.test(name);

export const validateFile = (file: File): string | null => {
  if (file.size > MAX_FILE_SIZE) return "File size too large. Maximum size is 10MB.";
  if (!ALLOWED_MIME.has(file.type) && !ALLOWED_EXTENSION.test(file.name) && !RICH_DOC.test(file.name)) {
    return "File type not supported. Use images, text, PDF, or code files.";
  }
  return null;
};

const looksLikeText = (file: File): boolean =>
  file.type.startsWith("text/") ||
  file.type.includes("json") ||
  file.type.includes("xml") ||
  file.type.includes("javascript") ||
  ALLOWED_EXTENSION.test(file.name) ||
  CODE_EXTENSIONS.test(file.name);

/* ------------------------------------------------------------------- pdf.js */

/*
 * pdf.js is loaded from a CDN, so it has no compile-time types here. Only four
 * APIs are used, and they are declared rather than pulling in the package's
 * types — which would add a devDependency for a module that is not bundled.
 */
interface PdfJsTextContent {
  items: { str?: string }[];
}
interface PdfJsDoc {
  numPages: number;
  getPage: (page: number) => Promise<{ getTextContent: () => Promise<PdfJsTextContent> }>;
  destroy: () => Promise<void>;
}
interface PdfJs {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (options: { data: Uint8Array }) => { promise: Promise<PdfJsDoc> };
}

let pdfjsLoader: Promise<PdfJs> | null = null;

/**
 * Lazily loads pdf.js from a CDN. The dynamic import keeps the ~350KB parser
 * out of the main bundle, and it is never fetched unless a PDF is attached.
 *
 * If the CDN is unreachable the send still goes ahead — the model is told the
 * PDF could not be read rather than the attachment silently disappearing.
 */
const loadPdfJs = (): Promise<PdfJs> => {
  pdfjsLoader ??= import(/* @vite-ignore */ PDF_JS_URL) as Promise<PdfJs>;
  return pdfjsLoader;
};

/** Pulls the words out of a PDF, page by page. Throws if it cannot be read. */
export const extractPdfText = async (data: ArrayBuffer): Promise<string> => {
  const pdfjs = await loadPdfJs();
  pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;

  const doc = await pdfjs.getDocument({ data: new Uint8Array(data) }).promise;
  const pages: string[] = [];
  const limit = Math.min(doc.numPages, PDF_MAX_PAGES);

  for (let page = 1; page <= limit; page += 1) {
    const content = await (await doc.getPage(page)).getTextContent();
    // pdf.js emits positioned fragments, not lines, so rejoin and re-space them.
    const line = content.items
      .map((item) => item.str ?? "")
      .join(" ")
      .replace(/[ \t]+/g, " ")
      .trim();
    if (line) pages.push(`--- page ${page} ---\n${line}`);
  }

  if (doc.numPages > limit) {
    pages.push(`[${doc.numPages - limit} further pages omitted]`);
  }

  await doc.destroy();
  return pages.join("\n\n");
};

const readAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(file);
  });

export const fileToAttachment = async (
  file: File,
  id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
): Promise<ChatAttachment> => {
  const type = file.type || "application/octet-stream";
  const attachment: ChatAttachment = {
    id,
    name: file.name,
    type,
    size: file.size,
    // Parsing a PDF takes a moment, so the composer can show progress.
    reading: isPdf(type, file.name),
    url: isImage(type) ? URL.createObjectURL(file) : undefined,
  };

  if (isImage(type)) {
    // Images are sent as vision parts, not described in prose. The data URI is
    // held on the attachment for the send and deliberately not persisted.
    try {
      attachment.dataUrl = await readAsDataUrl(file);
    } catch {
      attachment.error = "Could not read the image.";
    }
    attachment.reading = false;
    return attachment;
  }

  if (isPdf(type, file.name)) {
    try {
      attachment.content = await extractPdfText(await file.arrayBuffer());
    } catch {
      attachment.error = "This PDF could not be read in the browser.";
    }
    attachment.reading = false;
    return attachment;
  }

  if (RICH_DOC.test(file.name)) {
    attachment.error = "Office documents cannot be parsed in the browser yet.";
    attachment.reading = false;
    return attachment;
  }

  if (looksLikeText(file)) {
    try {
      attachment.content = await file.text();
    } catch {
      attachment.error = "Could not read the file.";
    }
  }

  attachment.reading = false;
  return attachment;
};

export const revokeAttachments = (attachments: ChatAttachment[]): void => {
  attachments.forEach((attachment) => {
    if (attachment.url) URL.revokeObjectURL(attachment.url);
  });
};

export const formatFileSize = (bytes: number): string => {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / Math.pow(1024, index);
  return `${index === 0 ? value : value.toFixed(1)} ${units[index]}`;
};

export const fileTypeLabel = (file: ChatAttachment): string => {
  const name = file.name;
  if (isImage(file.type)) return "Image";
  if (file.type.includes("pdf")) return "PDF";
  if (/\.tsx?$/i.test(name)) return "TypeScript";
  if (/\.jsx?$/i.test(name)) return "JavaScript";
  if (/\.py$/i.test(name)) return "Python";
  if (/\.java$/i.test(name)) return "Java";
  if (/\.(cpp|c|h)$/i.test(name)) return "C++";
  if (/\.html?$/i.test(name)) return "HTML";
  if (/\.css$/i.test(name)) return "CSS";
  if (/\.json$/i.test(name)) return "JSON";
  if (/\.x?m?l$/i.test(name)) return "XML";
  if (/\.csv$/i.test(name)) return "CSV";
  if (/\.md$/i.test(name)) return "Markdown";
  if (file.type.startsWith("text/")) return "Text";
  return "File";
};

/**
 * Builds the content that goes on the wire for a prompt with attachments.
 *
 * Images become real `image_url` parts so the model can see them; text and
 * extracted PDF text become a fenced block. A file the browser could not read
 * is named explicitly, because silently dropping it would let the model answer
 * from an attachment the user believes it was given.
 */
export const buildAttachmentContent = (
  prompt: string,
  attachments: ChatAttachment[]
): LlmContent => {
  if (!attachments.length) return prompt;

  const parts: LlmContentPart[] = [{ type: "text", text: prompt }];
  const readables: string[] = [];
  const unreadable: string[] = [];
  let budget = MAX_TOTAL_CONTEXT_CHARS;

  for (const attachment of attachments) {
    const label = `${attachment.name} (${fileTypeLabel(attachment)}, ${formatFileSize(attachment.size)})`;

    if (isImage(attachment.type)) {
      if (attachment.dataUrl) {
        parts.push({ type: "image_url", image_url: { url: attachment.dataUrl } });
        readables.push(`- ${label} — attached above as an image; look at it directly.`);
      } else {
        unreadable.push(`- ${label} — the image could not be read.`);
      }
      continue;
    }

    if (attachment.content?.trim()) {
      const snippet = attachment.content.slice(0, Math.min(MAX_CONTENT_CHARS, budget));
      budget -= snippet.length;
      readables.push(`- ${label}`, "", "```text", snippet, "```", "");
    } else {
      unreadable.push(`- ${label} — ${attachment.error ?? "contents unreadable"}.`);
    }
  }

  const notes: string[] = [];
  if (readables.length) {
    notes.push("The user attached these files. Their contents are below.", ...readables);
  }
  if (unreadable.length) {
    notes.push(
      "These attachments could NOT be read. Say so plainly if they matter, and never guess their contents.",
      ...unreadable
    );
  }
  if (notes.length) {
    parts.unshift({ type: "text", text: `${prompt}\n\n## Attachments\n${notes.join("\n")}` });
  }

  return parts.length === 1 ? prompt : parts;
};

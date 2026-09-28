/**
 * Attachment handling for the composer: validation, text extraction, previews,
 * and the context block that gets folded into the prompt.
 *
 * Extracted text is trimmed before it reaches the prompt — a pasted 400-line
 * file otherwise swallows the context window and the model starts ignoring the
 * actual question.
 */

import type { ChatAttachment } from "./chat-types";

export const MAX_FILES = 5;
export const MAX_FILE_SIZE = 10 * 1024 * 1024;
/** Per-file character budget folded into the prompt. */
const MAX_CONTENT_CHARS = 4_000;
const MAX_TOTAL_CONTEXT_CHARS = 20_000;

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

export const isImage = (type: string): boolean => type.startsWith("image/");

export const validateFile = (file: File): string | null => {
  if (file.size > MAX_FILE_SIZE) return "File size too large. Maximum size is 10MB.";
  if (!ALLOWED_MIME.has(file.type) && !ALLOWED_EXTENSION.test(file.name)) {
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

export const fileToAttachment = async (file: File): Promise<ChatAttachment> => {
  const type = file.type || "application/octet-stream";
  let content: string | undefined;
  if (!isImage(type) && file.type !== "application/pdf" && looksLikeText(file)) {
    try {
      content = await file.text();
    } catch {
      content = undefined;
    }
  }

  return {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`,
    name: file.name,
    type,
    size: file.size,
    content,
    url: isImage(type) ? URL.createObjectURL(file) : undefined,
  };
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
 * Turns attachments into a block appended to the prompt. Returns an empty
 * string when there is nothing to say, so the caller can omit the context
 * entirely rather than sending a dangling header.
 */
export const buildAttachmentContext = (attachments: ChatAttachment[]): string => {
  if (!attachments.length) return "";

  let budget = MAX_TOTAL_CONTEXT_CHARS;
  const sections: string[] = [];

  for (const attachment of attachments) {
    const header = `### ${attachment.name} (${fileTypeLabel(attachment)}, ${formatFileSize(attachment.size)})`;
    const lines: string[] = [header];

    if (isImage(attachment.type)) {
      lines.push(
        "The user attached an image. Describe it if it is relevant, otherwise say so plainly."
      );
    } else if (attachment.type.includes("pdf")) {
      lines.push(
        "PDF attachment. Text extraction was not performed locally, so state that you cannot read the file contents instead of guessing."
      );
    } else if (attachment.content) {
      const snippet = attachment.content.slice(0, Math.min(MAX_CONTENT_CHARS, budget));
      budget -= snippet.length;
      lines.push("```", snippet, "```");
    } else {
      lines.push("Attachment contents were not readable in the browser.");
    }

    sections.push(lines.join("\n"));
    if (budget <= 0) break;
  }

  return [
    "",
    "## Attached files",
    "The user attached the following. Use them when they are relevant, and say when they are not.",
    ...sections,
  ].join("\n");
};

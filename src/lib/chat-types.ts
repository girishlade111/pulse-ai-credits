/**
 * Chat domain types.
 *
 * The workspace used to model a chat as a flat `SearchResult[]`. That shape
 * could not represent a conversation: there was no notion of a session, no
 * per-message status, and therefore no way to stream a reply or to keep a
 * history that survives a page reload. These types are the replacement.
 */

import type { LlmRequestType } from "./llm";

export type { LlmRequestType };

/** Which side of the turn produced the text. */
export type ChatRole = "user" | "assistant";

/**
 * `streaming` messages are still receiving tokens. `error` messages carry a
 * `error` string and are rendered inline so a failed turn never silently
 * disappears from the transcript.
 */
export type ChatMessageStatus = "complete" | "streaming" | "error";

export interface ChatAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  /** Extracted text for text files and for a parsed PDF. */
  content?: string;
  /** Object URL for image previews. Revoked when the turn is cleared. */
  url?: string;
  /**
   * Base64 data URI for an image, sent to the model as a vision part.
   * Deliberately not persisted: a few screenshots would blow the storage quota.
   */
  dataUrl?: string;
  /** Set when the browser could not read the file, so the UI can say why. */
  error?: string;
  /** True once a PDF has been parsed, so the composer can show a spinner. */
  reading?: boolean;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  createdAt: string;
  status: ChatMessageStatus;
  /** The tool that produced an assistant turn. Absent on user turns. */
  requestType?: LlmRequestType;
  /** Credits charged for an assistant turn. Absent while streaming. */
  creditsUsed?: number;
  attachments?: ChatAttachment[];
  /** Populated when `status === "error"`. */
  error?: string;
  /** Local-only thumbs up / down. */
  feedback?: "up" | "down";
}

export interface ChatSession {
  id: string;
  /** Derived from the first user message, editable from the sidebar. */
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  pinned?: boolean;
}

/** Sidebar grouping buckets, in render order. */
export const SESSION_GROUPS = [
  "Pinned",
  "Today",
  "Yesterday",
  "Previous 7 days",
  "Previous 30 days",
  "Older",
] as const;

export type SessionGroup = (typeof SESSION_GROUPS)[number];

export const uid = (prefix: string): string =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

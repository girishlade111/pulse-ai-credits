/**
 * The workspace chat.
 *
 * What was broken
 * ---------------
 *  - `handleSearch` read `query` and `attachedFiles` through a `useCallback`
 *    closure, so "Try again" sent the *previous* (already cleared) prompt and
 *    follow-up sends raced the same stale values. Every send now takes its
 *    prompt, tool and attachments as explicit arguments.
 *  - The model received a single user message, so a follow-up prompt was
 *    answered with no memory of the thread.
 *  - Replies were not streamed, and the transcript had nowhere to scroll, so
 *    a completed answer was invisible.
 *  - `chatHistory` was accumulated but never rendered — history was a dead end.
 *
 * All of that is fixed here plus the missing chatbot affordances: a real
 * history sidebar, new chat, search, rename/pin/delete, regenerate, stop,
 * feedback, copy and export.
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ChatComposer } from "@/components/chat/chat-composer";
import { ChatScrollArea } from "@/components/chat/chat-scroll-area";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatTurn } from "@/components/chat/chat-turn";
import { ChatWelcome } from "@/components/chat/chat-welcome";
import { useProvider } from "@/contexts/ProviderContext";
import { LlmError, streamCompletion, type LlmRequestType, type TurnRecord } from "@/lib/llm";
import { DEFAULT_MODE_ID, getMode } from "@/lib/chat-modes";
import {
  MAX_FILES,
  buildAttachmentContent,
  fileToAttachment,
  revokeAttachments,
  validateFile,
} from "@/lib/chat-files";
import { downloadExport, type ExportFormat } from "@/lib/chat-export";
import { copyText } from "@/lib/clipboard";
import {
  clampSidebarWidth,
  readChatView,
  readSidebarWidth,
  SIDEBAR_DEFAULT,
  useChatSessions,
  writeChatView,
  writeSidebarWidth,
} from "@/lib/chat-store";
import { uid, type ChatAttachment, type ChatMessage } from "@/lib/chat-types";
import { cn } from "@/lib/utils";
import { AlertTriangle, Menu, PanelLeftOpen } from "lucide-react";

export interface SearchInterfaceProps {
  /**
   * Reports whether the full-screen chat is mounted so the page shell can hide
   * the marketing navbar. The parent owns no chat state.
   */
  onResultsChange?: (chatMode: boolean) => void;
}

interface SendRequest {
  prompt: string;
  requestType: string;
  attachments: ChatAttachment[];
  /** Regenerate: drop everything after the prompt being retried. */
  truncateAt?: number;
}

/**
 * Pairs the flat stored transcript into turns for the model.
 *
 * A turn whose reply never arrived keeps its prompt and has no assistant half,
 * which is how the client can tell "unanswered" from "answered" and repair the
 * alternation instead of emitting two user messages in a row.
 */
const pairTurns = (messages: ChatMessage[]): TurnRecord[] => {
  const turns: TurnRecord[] = [];
  for (const message of messages) {
    if (message.role === "user") {
      turns.push({ user: { role: "user", content: message.text } });
    } else {
      const last = turns[turns.length - 1];
      if (last && !last.assistant) last.assistant = { role: "assistant", content: message.text };
    }
  }
  return turns;
};

export const SearchInterface: React.FC<SearchInterfaceProps> = ({ onResultsChange }) => {
  const { provider } = useProvider();
  const navigate = useNavigate();
  const store = useChatSessions();

  const [input, setInput] = React.useState("");
  const [modeId, setModeId] = React.useState<string>(DEFAULT_MODE_ID);
  const [attachments, setAttachments] = React.useState<ChatAttachment[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [chatMode, setChatModeState] = React.useState(readChatView);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [sidebarWidth, setSidebarWidth] = React.useState(readSidebarWidth);
  const [dragActive, setDragActive] = React.useState(false);
  const [copied, setCopied] = React.useState<Set<string>>(new Set());
  const [focusToken, setFocusToken] = React.useState(0);

  // One place to enter the chat, so the persisted "user is in a chat" flag and
  // the page shell can never disagree about which view is mounted.
  const setChatMode = React.useCallback((next: boolean) => {
    writeChatView(next);
    setChatModeState(next);
  }, []);

  // Clamp on the way in and persist on the way out, so a drag can never leave
  // the panel in a state the layout cannot recover from. Writes are debounced
  // because a drag emits one change per pointer event.
  React.useEffect(() => {
    const timer = setTimeout(() => writeSidebarWidth(sidebarWidth), 250);
    return () => clearTimeout(timer);
  }, [sidebarWidth]);

  const handleSidebarWidth = React.useCallback((next: number) => {
    setSidebarWidth(clampSidebarWidth(next));
  }, []);

  const resetSidebarWidth = React.useCallback(() => {
    setSidebarWidth(SIDEBAR_DEFAULT);
    writeSidebarWidth(SIDEBAR_DEFAULT);
  }, []);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const abortRef = React.useRef<AbortController | null>(null);
  const storeRef = React.useRef(store);
  storeRef.current = store;

  const session = store.active;
  const messages = React.useMemo(() => store.active?.messages ?? [], [store.active]);
  const mode = getMode(modeId);

  /* ------------------------------------------------------------- shell wiring */

  // Keep the page shell in sync with the chat without prop-drilling state.
  React.useEffect(() => {
    onResultsChange?.(chatMode);
  }, [chatMode, onResultsChange]);

  // Restore the last conversation on reload — that is the whole point of a
  // history.
  //
  // Driven by `store.ready`, not by a "run once on mount" ref. The store fills
  // in asynchronously from IndexedDB, so on first mount `active` is always
  // null; a mount-once effect therefore always reads an empty store and the
  // restored conversation is never picked up. Reacting to `ready` re-checks
  // once the real history lands, and setting the flag twice is a no-op.
  React.useEffect(() => {
    if (!store.ready) return;
    if (store.active && store.active.messages.length > 0) setChatModeState(true);
  }, [store.ready, store.active]);

  // Never leave a request running after the view goes away.
  React.useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    []
  );

  // Object URLs are owned by the transcript now, not the composer, so they are
  // NOT released on unmount: the chat history outlives this component and its
  // previews would point at dead blobs. The browser reclaims them on unload.
  const attachmentsRef = React.useRef(attachments);
  attachmentsRef.current = attachments;

  /* ------------------------------------------------------------------ sending */

  const runRequest = React.useCallback(
    async (request: SendRequest) => {
      const { prompt, requestType, attachments: files, truncateAt } = request;
      const storeApi = storeRef.current;

      /*
       * `storeApi` is the store as of the last render, so it holds the
       * transcript *before* this turn. Read it now, up front: appending below
       * queues a state update that will not be visible until after this async
       * function yields, so reading the store afterwards would miss the prompt
       * entirely and send the model an empty conversation.
       */
      const priorMessages = storeApi.active?.messages ?? [];
      if (typeof truncateAt === "number") {
        // Regenerating turn N: everything from N onward is replaced.
        storeApi.removeMessagesFrom(storeApi.activeId!, truncateAt);
      }

      const sessionId = storeApi.activeId ?? storeApi.createSession();

      const userMessage: ChatMessage = {
        id: uid("msg"),
        role: "user",
        text: prompt,
        createdAt: new Date().toISOString(),
        status: "complete",
        requestType: requestType as ChatMessage["requestType"],
        // The data URI is not persisted: a screenshot would blow storage.
        attachments: files.length
          ? files.map(({ id, name, type, size, url, error }) => ({
              id,
              name,
              type,
              size,
              url,
              error,
            }))
          : undefined,
      };

      const replyId = uid("msg");
      const replyMessage: ChatMessage = {
        id: replyId,
        role: "assistant",
        text: "",
        createdAt: new Date().toISOString(),
        status: "streaming",
        requestType: requestType as ChatMessage["requestType"],
      };

      storeApi.appendMessage(sessionId, userMessage);
      storeApi.appendMessage(sessionId, replyMessage);

      setChatMode(true);
      setBusy(true);

      const controller = new AbortController();
      abortRef.current = controller;

      /*
       * The stored transcript is paired into turns and handed over as-is. The
       * client repairs the alternation: a prompt whose reply failed is merged
       * into the next one, instead of leaving two user messages in a row for
       * the model to answer whichever it likes.
       */
      const kept = typeof truncateAt === "number" ? priorMessages.slice(0, truncateAt) : priorMessages;
      const turns: TurnRecord[] = [
        ...pairTurns(kept),
        {
          // Images ride along as vision parts, so the model actually sees them.
          user: {
            role: "user",
            content: buildAttachmentContent(prompt, files),
          },
        },
      ];

      // Mirror of the reply text so an abort can keep whatever already arrived.
      let streamed = "";

      try {
        await streamCompletion({
          provider,
          turns,
          requestType: requestType as LlmRequestType,
          signal: controller.signal,
          onUsage: (usage) => storeApi.patchMessage(sessionId, replyId, { tokens: usage }),
          onDelta: (text) => {
            streamed = text;
            storeApi.patchMessage(sessionId, replyId, { text, status: "streaming" });
          },
        });

        storeApi.patchMessage(sessionId, replyId, { status: "complete" });
      } catch (error) {
        const aborted = error instanceof Error && error.name === "AbortError";

        if (aborted) {
          // Keep whatever arrived; a stopped turn is not a failure.
          storeApi.patchMessage(sessionId, replyId, {
            status: "complete",
            text: streamed.trim()
              ? `${streamed}\n\n---\n_Stopped._`
              : "_Stopped before the agent produced an answer._",
          });
        } else {
          const message =
            error instanceof LlmError
              ? error.message
              : "Something went wrong while generating the reply.";
          storeApi.patchMessage(sessionId, replyId, {
            status: "error",
            error: message,
            text: "",
          });
          toast.error(message);
        }
      } finally {
        abortRef.current = null;
        setBusy(false);
      }
    },
    [setChatMode, provider]
  );

  const send = React.useCallback(
    async (request: SendRequest) => {
      const prompt = request.prompt.trim();
      if (!prompt) {
        toast.error("Type a message first.");
        return;
      }
      if (busy) {
        toast.info("Wait for the current reply, or stop it first.");
        return;
      }

      // Every tool is available to every user — there is no balance to check
      // and no plan to be on.
      setInput("");
      /*
       * Deliberately NOT revoked here. The prompt keeps these same object URLs
       * for its transcript thumbnail, so releasing them on send left every
       * image preview in the chat pointing at a dead blob.
       */
      setAttachments([]);

      await runRequest(request);
    },
    [busy, runRequest]
  );

  const handleSubmit = React.useCallback(() => {
    void send({ prompt: input, requestType: modeId, attachments });
  }, [attachments, input, modeId, send]);

  const stop = React.useCallback(() => {
    abortRef.current?.abort();
  }, []);

  /* -------------------------------------------------------------- transcript */

  /**
   * The transcript is a flat message list, but the UI is a list of exchanges.
   * Pair each prompt with the reply that follows it so a reply can never be
   * rendered without the prompt that produced it.
   */
  const turns = React.useMemo(() => {
    const pairs: { prompt: ChatMessage; reply?: ChatMessage }[] = [];
    for (const message of messages) {
      if (message.role === "user") {
        pairs.push({ prompt: message });
      } else if (pairs.length > 0) {
        const last = pairs[pairs.length - 1];
        if (!last.reply) last.reply = message;
      }
    }
    return pairs;
  }, [messages]);

  const regenerate = React.useCallback(
    (index: number) => {
      const turn = turns[index];
      if (!turn) return;
      void runRequest({
        prompt: turn.prompt.text,
        requestType: turn.reply?.requestType ?? turn.prompt.requestType ?? modeId,
        attachments: turn.prompt.attachments ?? [],
        truncateAt: index,
      });
    },
    [modeId, runRequest, turns]
  );

  const copyTurn = React.useCallback(async (message: ChatMessage) => {
    if (await copyText(message.text)) {
      setCopied((prev) => new Set(prev).add(message.id));
      setTimeout(
        () =>
          setCopied((prev) => {
            const next = new Set(prev);
            next.delete(message.id);
            return next;
          }),
        2000
      );
    } else {
      toast.error("Could not copy to the clipboard.");
    }
  }, []);

  /** Exports the whole chat, not just the turn whose menu was opened. */
  const exportChat = React.useCallback(
    (format: ExportFormat) => {
      const pairs = turns
        .filter((turn) => turn.prompt.text.trim())
        .map((turn) => ({ prompt: turn.prompt, reply: turn.reply }));
      if (!pairs.length) {
        toast.error("Nothing to export yet.");
        return;
      }
      if (downloadExport(format, pairs)) {
        toast.success(`Exported ${format.toUpperCase()}`);
      } else {
        toast.error("The download was blocked by the browser.");
      }
    },
    [turns]
  );

  /* -------------------------------------------------------------- attachments */

  const addFiles = React.useCallback(async (files: File[]) => {
    if (!files.length) return;
    const room = MAX_FILES - attachmentsRef.current.length;
    if (room <= 0) {
      toast.error(`Up to ${MAX_FILES} files per message.`);
      return;
    }

    let added = 0;
    for (const file of files.slice(0, room)) {
      const problem = validateFile(file);
      if (problem) {
        toast.error(`${file.name}: ${problem}`);
        continue;
      }

      /*
       * Show the file straight away, then fill in what could be read. Parsing a
       * PDF fetches pdf.js and walks the pages, so waiting for it before adding
       * the card left the composer looking like it had ignored the file.
       */
      const id = `att_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      const placeholder: ChatAttachment = {
        id,
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        url: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
        reading: true,
      };
      setAttachments((prev) => [...prev, placeholder]);
      added += 1;

      try {
        const parsed = await fileToAttachment(file, id);
        setAttachments((prev) => prev.map((item) => (item.id === id ? parsed : item)));
      } catch {
        setAttachments((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, reading: false, error: "Could not read the file." } : item
          )
        );
        toast.error(`Could not read ${file.name}.`);
      }
    }

    if (added < files.length) {
      toast.error(`Only ${room} more file${room > 1 ? "s" : ""} can be attached.`);
    }
  }, []);

  const removeAttachment = React.useCallback((id: string) => {
    setAttachments((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.url) URL.revokeObjectURL(target.url);
      return prev.filter((item) => item.id !== id);
    });
  }, []);

  // Paste an image straight into the composer.
  React.useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && !["INPUT", "TEXTAREA"].includes(target.tagName)) return;

      const images = Array.from(event.clipboardData?.items ?? [])
        .filter((item) => item.type.startsWith("image/"))
        .map((item) => item.getAsFile())
        .filter((file): file is File => file !== null);

      if (!images.length) return;
      event.preventDefault();
      void addFiles(images);
    };

    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [addFiles]);

  /* ------------------------------------------------------------------ actions */

  const startNewChat = React.useCallback(() => {
    abortRef.current?.abort();
    storeRef.current.createSession();
    setInput("");
    // Not revoked: the previous session is still in the history sidebar, and its
    // image previews point at these same object URLs.
    setAttachments([]);
    setSidebarOpen(false);
    setChatMode(true);
    setFocusToken((token) => token + 1);
  }, [setChatMode]);

  /* ------------------------------------------------------------------- render */
  /* Runs are free, so the composer has nothing to warn about. */
  const composerFooter = undefined;
  const transcript = (
    <div
      className={cn(
        "mx-auto w-full px-4 py-6 sm:px-6",
        chatMode ? "max-w-3xl" : "max-w-2xl",
        // An empty chat centres in the shell; a real transcript stacks from the
        // top so the newest turn stays next to the composer.
        turns.length === 0
          ? chatMode
            ? "flex min-h-full flex-col justify-center"
            : "space-y-8"
          : "space-y-8"
      )}
    >
      {turns.length === 0 ? (
        <ChatWelcome />
      ) : (
        turns.map((turn, index) => (
          <ChatTurn
            key={turn.prompt.id}
            query={turn.prompt.text}
            queryAt={turn.prompt.createdAt}
            attachments={turn.prompt.attachments}
            reply={
              turn.reply && {
                text: turn.reply.text,
                status: turn.reply.status,
                requestType: turn.reply.requestType,
                createdAt: turn.reply.createdAt,
                error: turn.reply.error,
                feedback: turn.reply.feedback,
                tokens: turn.reply.tokens,
              }
            }
            copied={turn.reply ? copied.has(turn.reply.id) : false}
            busy={busy}
            onCopy={() => turn.reply && void copyTurn(turn.reply)}
            onExport={exportChat}
            onRegenerate={() => regenerate(index)}
            onFeedback={(value) =>
              turn.reply &&
              session &&
              store.patchMessage(session.id, turn.reply.id, { feedback: value })
            }
          />
        ))
      )}
    </div>
  );

  const composer = (
    <ChatComposer
      value={input}
      onChange={setInput}
      onSubmit={handleSubmit}
      onStop={stop}
      busy={busy}
      modeId={modeId}
      onModeChange={setModeId}
      attachments={attachments}
      onAttachClick={() => fileInputRef.current?.click()}
      onRemoveAttachment={removeAttachment}
      dragActive={dragActive}
      onDragStateChange={setDragActive}
      onDropFiles={(files) => void addFiles(files)}
      footer={composerFooter}
      focusToken={focusToken}
      autoFocusOnMount
    />
  );

  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      multiple
      accept=".txt,.md,.csv,.pdf,.docx,.pptx,.xlsx,.js,.ts,.tsx,.jsx,.py,.java,.cpp,.h,.html,.css,.json,.xml,.yml,.yaml,.sql,.sh,image/*"
      onChange={(event) => {
        void addFiles(Array.from(event.target.files ?? []));
        event.target.value = "";
      }}
      className="hidden"
    />
  );

  return (
    <>
      {/*
        The composer lives in the same React position in both branches — only
        the wrapper classes change. That is deliberate: switching between the
        landing view and the chat must not unmount the textarea, or the reply
        lands while the caret is gone.
      */}
      <div
        className={cn(chatMode ? "flex h-full min-h-0 flex-col" : "block w-full")}
        /*
         * One source of truth for the panel width. CSS custom properties
         * inherit down the tree, so the sidebar and the main column both read
         * this single value and cannot drift out of sync mid-drag.
         */
        style={{ "--chat-sidebar-width": `${sidebarWidth}px` } as React.CSSProperties}
      >
        {chatMode && (
          <ChatSidebar
            store={store}
            open={sidebarOpen}
            collapsed={sidebarCollapsed}
            onOpenChange={setSidebarOpen}
            onCollapsedChange={setSidebarCollapsed}
            onNavigate={navigate}
            onNewChat={startNewChat}
            activeSessionId={store.activeId}
            width={sidebarWidth}
            onWidthChange={handleSidebarWidth}
            onWidthReset={resetSidebarWidth}
          />
        )}

        <div
          className={cn(
            "min-w-0",
            chatMode
              ? cn(
                  "flex min-h-0 flex-1 flex-col",
                  // Reserve exactly the width the sidebar occupies, so the
                  // transcript never slides under the drag handle.
                  sidebarCollapsed ? "lg:ml-0" : "lg:ml-[var(--chat-sidebar-width)]"
                )
              : "block w-full"
          )}
        >
          <ChatScrollArea
            followKey={[messages.length, messages[messages.length - 1]?.text, chatMode]}
            header={
              chatMode ? (
                <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-hairline bg-canvas/90 px-3 py-2.5 backdrop-blur lg:hidden">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSidebarOpen(true)}
                    aria-label="Open chat history"
                  >
                    <Menu />
                  </Button>
                  <span className="min-w-0 flex-1 truncate title-sm">
                    {session?.title ?? "New chat"}
                  </span>
                </div>
              ) : null
            }
          >
            {transcript}
          </ChatScrollArea>

          {chatMode ? (
            <div className="composer shrink-0">
              <div className="mx-auto w-full max-w-3xl px-4 py-3 sm:px-6">
                {fileInput}
                {composer}
              </div>
            </div>
          ) : (
            <div className="page pb-16">
              <div className="mx-auto max-w-2xl">
                {fileInput}
                {composer}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* desktop: reopen the collapsed sidebar */}
      {chatMode && sidebarCollapsed && (
        <button
          type="button"
          onClick={() => setSidebarCollapsed(false)}
          className="fixed left-3 top-3 z-30 hidden h-9 items-center gap-2 rounded-md border border-hairline bg-card px-3 text-sm text-muted transition-colors hover:text-ink lg:inline-flex"
        >
          <PanelLeftOpen className="h-4 w-4" />
          History
        </button>
      )}
    </>
  );
};

export default SearchInterface;

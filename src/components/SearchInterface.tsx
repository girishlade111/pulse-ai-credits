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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChatComposer } from "@/components/chat/chat-composer";
import { ChatScrollArea } from "@/components/chat/chat-scroll-area";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatTurn } from "@/components/chat/chat-turn";
import { ChatWelcome } from "@/components/chat/chat-welcome";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { ApinexError, streamCompletion, type ApinexMessage } from "@/lib/apinex";
import { DEFAULT_MODE_ID, getMode, getModeCost } from "@/lib/chat-modes";
import {
  MAX_FILES,
  buildAttachmentContext,
  fileToAttachment,
  revokeAttachments,
  validateFile,
} from "@/lib/chat-files";
import { useChatSessions } from "@/lib/chat-store";
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

const EXPORT_MAX = 200_000;

const transcriptToText = (prompt: string, reply: string, requestType: string): string => {
  const body = reply
    .replace(/^# (.*)$/gm, (_m, title: string) => `${"=".repeat(50)}\n${title}\n${"=".repeat(50)}`)
    .replace(/^## (.*)$/gm, (_m, title: string) => `\n${title.toUpperCase()}\n${"-".repeat(title.length)}`)
    .replace(/^• (.*)$/gm, "  • $1")
    .replace(/\*\*(.*?)\*\*/g, "$1");

  return [
    "PULSE AI — CONVERSATION EXPORT",
    "=".repeat(50),
    "",
    `Tool: ${requestType.replace(/_/g, " ")}`,
    `Generated: ${new Date().toLocaleString()}`,
    "",
    "=".repeat(50),
    "PROMPT",
    "=".repeat(50),
    prompt,
    "",
    "=".repeat(50),
    "REPLY",
    "=".repeat(50),
    body.slice(0, EXPORT_MAX),
    "",
    "=".repeat(50),
    "Exported from Pulse AI",
  ].join("\n");
};

export const SearchInterface: React.FC<SearchInterfaceProps> = ({ onResultsChange }) => {
  const { credits, subscription, spend } = useWorkspace();
  const navigate = useNavigate();
  const store = useChatSessions();

  const [input, setInput] = React.useState("");
  const [modeId, setModeId] = React.useState<string>(DEFAULT_MODE_ID);
  const [attachments, setAttachments] = React.useState<ChatAttachment[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [chatMode, setChatMode] = React.useState(false);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [dragActive, setDragActive] = React.useState(false);
  const [copied, setCopied] = React.useState<Set<string>>(new Set());
  const [showUpgrade, setShowUpgrade] = React.useState(false);
  const [showTopup, setShowTopup] = React.useState(false);

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
  // history. Runs once; a fresh visitor still lands on the marketing view.
  const bootstrapped = React.useRef(false);
  React.useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    const restored = storeRef.current.active;
    if (restored && restored.messages.length > 0) setChatMode(true);
  }, []);

  // Never leave a request running after the view goes away.
  React.useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    []
  );

  // Object URLs are owned by the composer; drop them when the view unmounts.
  const attachmentsRef = React.useRef(attachments);
  attachmentsRef.current = attachments;
  React.useEffect(
    () => () => {
      revokeAttachments(attachmentsRef.current);
    },
    []
  );

  /* ------------------------------------------------------------------ sending */

  const runRequest = React.useCallback(
    async (request: SendRequest) => {
      const { prompt, requestType, attachments: files, truncateAt } = request;
      const cost = getModeCost(requestType);
      const storeApi = storeRef.current;

      if (storeApi.activeId && typeof truncateAt === "number") {
        storeApi.removeMessagesFrom(storeApi.activeId, truncateAt);
      }

      const sessionId = storeApi.activeId ?? storeApi.createSession();
      const createdAt = new Date().toISOString();

      const userMessage: ChatMessage = {
        id: uid("msg"),
        role: "user",
        text: prompt,
        createdAt,
        status: "complete",
        requestType: requestType as ChatMessage["requestType"],
        // Content is not persisted: a pasted file would bloat localStorage.
        attachments: files.length
          ? files.map(({ id, name, type, size, url }) => ({ id, name, type, size, url }))
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

      // Replay the thread so follow-up prompts resolve against earlier turns.
      // The newest user turn is not in the store yet at the moment we read it,
      // so it is appended explicitly.
      const history = storeApi.sessions
        .find((item) => item.id === sessionId)
        ?.messages.filter((message) => message.status !== "error")
        .map(
          (message): ApinexMessage => ({
            role: message.role === "user" ? "user" : "assistant",
            content:
              message.id === userMessage.id
                ? [message.text, buildAttachmentContext(files)].filter(Boolean).join("\n")
                : message.text,
          })
        )
        .filter((message) => message.content.trim().length > 0) ?? [];

      try {
        await streamCompletion({
          messages: history,
          requestType: requestType as Parameters<typeof streamCompletion>[0]["requestType"],
          signal: controller.signal,
          onDelta: (text) => {
            storeApi.patchMessage(sessionId, replyId, { text, status: "streaming" });
          },
        });

        storeApi.patchMessage(sessionId, replyId, {
          status: "complete",
          creditsUsed: cost,
        });

        // Charged only after the provider returns, so a failed run is free.
        spend({
          amount: cost,
          request_type: getMode(requestType).ledgerType,
          description: `${requestType.replace(/_/g, " ")}: ${prompt.slice(0, 50)}`,
        });
      } catch (error) {
        const aborted = error instanceof Error && error.name === "AbortError";

        if (aborted) {
          const partial = storeApi.sessions
            .find((item) => item.id === sessionId)
            ?.messages.find((message) => message.id === replyId)?.text;
          storeApi.patchMessage(sessionId, replyId, {
            status: "complete",
            creditsUsed: partial ? 0 : undefined,
            text: partial?.trim()
              ? partial
              : "_Stopped before the agent produced an answer. No credits were charged._",
          });
        } else {
          const message =
            error instanceof ApinexError
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
    [spend]
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

      const cost = getModeCost(request.requestType);

      if (getMode(request.requestType).premium && subscription.plan_type !== "business") {
        toast.error(
          `${getMode(request.requestType).name} is a Business plan tool. Upgrade to unlock it.`
        );
        return;
      }

      if (credits.current_credits < cost) {
        if (subscription.plan_type === "free") setShowUpgrade(true);
        else setShowTopup(true);
        return;
      }

      setInput("");
      revokeAttachments(request.attachments);
      setAttachments([]);

      await runRequest(request);
    },
    [busy, credits.current_credits, runRequest, subscription.plan_type]
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
    try {
      await navigator.clipboard.writeText(message.text);
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
    } catch {
      toast.error("Could not copy to the clipboard.");
    }
  }, []);

  const exportTurn = React.useCallback((prompt: ChatMessage, reply?: ChatMessage) => {
    if (!reply?.text) return;
    const blob = new Blob([transcriptToText(prompt.text, reply.text, reply.requestType ?? "chat")], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `pulse-chat-${prompt.text.slice(0, 30).replace(/[^a-z0-9]+/gi, "-") || "export"}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, []);

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
      try {
        const attachment = await fileToAttachment(file);
        setAttachments((prev) => [...prev, attachment]);
        added += 1;
      } catch {
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
    revokeAttachments(attachmentsRef.current);
    setAttachments([]);
    setSidebarOpen(false);
    setChatMode(true);
  }, []);

  const pickSuggestion = React.useCallback((prompt: string) => {
    setInput(prompt);
    void send({ prompt, requestType: modeId, attachments: [] });
  }, [modeId, send]);

  /* ------------------------------------------------------------------- render */

  const lowBalance = credits.current_credits < 5;
  const insufficient = credits.current_credits < mode.credits;

  const composerFooter = insufficient ? (
    <div className="mt-2 flex items-center justify-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-4 py-2">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-destructive" />
      <span className="body-sm text-destructive">
        {mode.name} needs {mode.credits} credit{mode.credits > 1 ? "s" : ""} · you have{" "}
        {credits.current_credits}
      </span>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-destructive"
        onClick={() =>
          subscription.plan_type === "free" ? setShowUpgrade(true) : setShowTopup(true)
        }
      >
        {subscription.plan_type === "free" ? "Upgrade" : "Top up"}
      </Button>
    </div>
  ) : lowBalance ? (
    <p className="mt-2.5 text-center caption text-muted-soft">
      Low balance — {credits.current_credits} credit{credits.current_credits === 1 ? "" : "s"} left
    </p>
  ) : undefined;

  const transcript = (
    <div
      className={cn(
        "mx-auto w-full space-y-8 px-4 py-6 sm:px-6",
        chatMode ? "max-w-3xl" : "max-w-2xl"
      )}
    >
      {turns.length === 0 ? (
        <ChatWelcome
          compact={chatMode}
          modeId={modeId}
          onModeChange={setModeId}
          onPickSuggestion={pickSuggestion}
        />
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
                creditsUsed: turn.reply.creditsUsed,
                createdAt: turn.reply.createdAt,
                error: turn.reply.error,
                feedback: turn.reply.feedback,
              }
            }
            copied={turn.reply ? copied.has(turn.reply.id) : false}
            busy={busy}
            onCopy={() => turn.reply && void copyTurn(turn.reply)}
            onExport={() => exportTurn(turn.prompt, turn.reply)}
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
      autoFocusOnMount
    />
  );

  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      multiple
      accept=".txt,.md,.csv,.pdf,.js,.ts,.tsx,.jsx,.py,.java,.cpp,.h,.html,.css,.json,.xml,.yml,.yaml,.sql,.sh,image/*"
      onChange={(event) => {
        void addFiles(Array.from(event.target.files ?? []));
        event.target.value = "";
      }}
      className="hidden"
    />
  );

  const creditDialogs = (
    <>
      <Dialog open={showUpgrade} onOpenChange={setShowUpgrade}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Out of credits</DialogTitle>
            <DialogDescription>
              You have used every credit on this account. Upgrade to a paid plan
              for monthly credits, bonus credits and top-up discounts.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex flex-col gap-3">
            <Button
              onClick={() => {
                setShowUpgrade(false);
                navigate("/plans");
              }}
            >
              Upgrade plan
            </Button>
            <Button variant="outline" onClick={() => setShowUpgrade(false)}>
              Maybe later
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showTopup} onOpenChange={setShowTopup}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Need more credits?</DialogTitle>
            <DialogDescription>
              Top up without changing plan. Your plan discount is applied
              automatically at settlement.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex flex-col gap-3">
            <Button
              onClick={() => {
                setShowTopup(false);
                navigate("/plans");
              }}
            >
              Buy credits
            </Button>
            <Button variant="outline" onClick={() => setShowTopup(false)}>
              Not now
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );

  return (
    <>
      {/*
        The composer lives in the same React position in both branches — only
        the wrapper classes change. That is deliberate: switching between the
        landing view and the chat must not unmount the textarea, or the reply
        lands while the caret is gone.
      */}
      <div className={cn(chatMode ? "flex h-full min-h-0 flex-col" : "block w-full")}>
        {chatMode && (
          <ChatSidebar
            store={store}
            open={sidebarOpen}
            collapsed={sidebarCollapsed}
            onOpenChange={setSidebarOpen}
            onCollapsedChange={setSidebarCollapsed}
            onNavigate={navigate}
            activeSessionId={store.activeId}
          />
        )}

        <div
          className={cn(
            "min-w-0",
            chatMode
              ? cn(
                  "flex min-h-0 flex-1 flex-col",
                  sidebarCollapsed ? "lg:ml-0" : "lg:ml-64"
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

      {creditDialogs}
    </>
  );
};

export default SearchInterface;

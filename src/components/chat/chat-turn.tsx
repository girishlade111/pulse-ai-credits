/**
 * One conversation turn. A user message and the agent reply that follows it are
 * rendered as a single unit so the reply can never be orphaned from the prompt
 * that produced it.
 *
 * The reply body streams: `Markdown` re-renders on every chunk, and the caret
 * is a CSS pseudo-element so it costs nothing to paint.
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { TimelinePill } from "@/components/TimelinePill";
import { Markdown } from "./markdown";
import { useStreamReveal } from "./use-stream-reveal";
import { EXPORT_FORMATS, type ExportFormat } from "@/lib/chat-export";
import { estimateTokens } from "@/lib/llm";
import { getMode } from "@/lib/chat-modes";
import { fileTypeLabel, formatFileSize, isImage, sourceMatches } from "@/lib/chat-files";
import { useSpeechSynthesis } from "@/hooks/use-speech-synthesis";
import type { ChatTokens } from "@/lib/chat-types";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronsDown,
  Copy,
  Download,
  FileText,
  Gauge,
  Loader2,
  Pencil,
  Quote,
  RotateCcw,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Volume2,
  VolumeX,
} from "lucide-react";

interface AttachmentListProps {
  attachments: {
    id: string;
    name: string;
    type: string;
    size: number;
    url?: string;
    error?: string;
  }[];
}

const AttachmentList: React.FC<AttachmentListProps> = ({ attachments }) => {
  /*
   * An image preview is a blob URL, which is alive only for the page that
   * created it. After a reload the transcript is restored from storage but the
   * blobs are gone, so a dead preview falls back to the file icon rather than
   * showing a broken image.
   */
  const [dead, setDead] = React.useState<Set<string>>(() => new Set());

  return (
    <ul className="mt-3 space-y-1.5 border-t border-hairline pt-3">
      {attachments.map((attachment) => {
        const showImage =
          isImage(attachment.type) && attachment.url && !dead.has(attachment.id);
        return (
          <li key={attachment.id} className="flex items-center gap-2">
            {showImage ? (
              <img
                src={attachment.url}
                alt={attachment.name}
                className="h-7 w-7 shrink-0 rounded border border-hairline object-cover"
                onError={() =>
                  setDead((prev) => new Set(prev).add(attachment.id))
                }
              />
            ) : (
              <FileText className="h-3.5 w-3.5 shrink-0 text-muted" />
            )}
            <span
              className="min-w-0 flex-1 truncate caption text-muted"
              title={attachment.name}
            >
              {attachment.name}
            </span>
            {attachment.error && (
              <span className="caption shrink-0 text-destructive">unreadable</span>
            )}
            <span className="caption shrink-0 text-muted-soft">
              {fileTypeLabel(attachment)} · {formatFileSize(attachment.size)}
            </span>
          </li>
        );
      })}
    </ul>
  );
};

const formatTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

interface ChatTurnProps {
  query: string;
  queryAt: string;
  attachments?: { id: string; name: string; type: string; size: number; url?: string }[];
  reply?: {
    text: string;
    status: "complete" | "streaming" | "error";
    requestType?: string;
    createdAt: string;
    error?: string;
    feedback?: "up" | "down";
    tokens?: ChatTokens;
  };
  copied: boolean;
  busy: boolean;
  onCopy: () => void;
  onExport: (format: ExportFormat) => void;
  onRegenerate: () => void;
  onFeedback: (value: "up" | "down" | undefined) => void;
}

export const ChatTurn: React.FC<ChatTurnProps> = ({
  query,
  queryAt,
  attachments,
  reply,
  copied,
  busy,
  onCopy,
  onExport,
  onRegenerate,
  onFeedback,
}) => {
  const mode = getMode(reply?.requestType);
  const ModeIcon = mode.icon;
  const streaming = reply?.status === "streaming";
  const failed = reply?.status === "error";

  /*
   * Read aloud. Hooked here rather than in the toolbar so `speak`/`stop` are
   * stable, and the button can reflect `speaking` without the row re-rendering
   * during the whole stream — it is only rendered on a finished reply anyway.
   */
  const speech = useSpeechSynthesis();

  /*
   * Which of this turn's attachments the reply actually leaned on. A guess, and
   * labelled as one: the model returns prose with no structured citation, so
   * this is "the reply named or quoted this file", not proof. Rendering every
   * attached file regardless would claim the answer came from a file it may
   * never have opened.
   */
  const sources = React.useMemo(() => {
    if (!reply?.text || !attachments?.length) return [];
    return sourceMatches(reply.text, attachments.map((a) => a.name));
  }, [attachments, reply?.text]);

  return (
    <article className="chat-turn">
      {/* ---- prompt ---- */}
      <div className="flex justify-end">
        <div className="bubble-user">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <ModeIcon className="h-3.5 w-3.5 text-ink" />
            <span className="title-sm">{mode.name}</span>
            <span className="caption text-muted-soft">{formatTime(queryAt)}</span>
          </div>
          <p className="body-md whitespace-pre-wrap break-words">{query}</p>
          {attachments && attachments.length > 0 && <AttachmentList attachments={attachments} />}
        </div>
      </div>

      {/* ---- reply ---- */}
      {reply && (
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="agent-avatar">
              <Sparkles className="h-3.5 w-3.5 text-ink" />
            </span>
            <span className="title-sm">Pulse agent</span>
            <span className="caption text-muted-soft">{formatTime(reply.createdAt)}</span>
            {streaming && (
              <span className="pill-thinking timeline-in">
                <Loader2 className="h-3 w-3 animate-spin" />
                streaming
              </span>
            )}
          </div>

          {/* the signature timeline for this run */}
          <ol className="mb-4 flex flex-wrap items-center gap-1.5">
            {mode.stages.map((stage, index) => (
              <li key={stage}>
                <TimelinePill
                  stage={stage}
                  className={cn(streaming && index === 0 && "stage-active")}
                />
              </li>
            ))}
          </ol>

          {failed ? (
            <div
              className="bubble-agent border-destructive/40 bg-destructive/5"
              data-chat-status="error"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <div className="min-w-0 flex-1">
                  <p className="title-sm text-destructive">This run failed</p>
                  <p className="body-sm mt-1 break-words text-muted">{reply.error}</p>
                </div>
              </div>
              <div className="mt-4 flex justify-end border-t border-hairline pt-3">
                <Button variant="outline" size="sm" onClick={onRegenerate} disabled={busy}>
                  <RotateCcw />
                  Try again
                </Button>
              </div>
            </div>
          ) : (
            <div
              className="bubble-agent"
              data-chat-status={reply.status}
              aria-busy={streaming || undefined}
            >
              {reply.text ? (
                <ReplyBody
                  text={reply.text}
                  streaming={streaming}
                  runKey={reply.createdAt}
                />
              ) : (
                <ThinkingSkeleton mode={reply.requestType} />
              )}

              {sources.length > 0 && <SourceBadges names={sources} />}

              {!streaming && (
                <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-hairline pt-3">
                  {/* Left: what this run cost, in tokens. */}
                  <TokenStat liveText={reply.text} tokens={reply.tokens} />

                  <div className="flex flex-wrap items-center justify-end gap-1">
                    {/*
                      Read aloud is only offered when there is prose to read:
                      a reply that is nothing but a code block would otherwise
                      offer a speaker and produce silence.
                    */}
                    {speech.supported && hasSpeakableText(reply.text) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => speech.toggle(reply.text)}
                        aria-label={speech.speaking ? "Stop reading aloud" : "Read this reply aloud"}
                        aria-pressed={speech.speaking}
                        title={speech.speaking ? "Stop" : "Read aloud"}
                      >
                        {speech.speaking ? (
                          <VolumeX className="text-primary" />
                        ) : (
                          <Volume2 />
                        )}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onRegenerate}
                      disabled={busy}
                      title="Run this prompt again"
                    >
                      <RotateCcw />
                      Regenerate
                    </Button>
                    <Button variant="ghost" size="sm" onClick={onCopy}>
                      {copied ? (
                        <>
                          <Check className="text-success" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy />
                          Copy
                        </>
                      )}
                    </Button>
                    <ExportMenu onExport={onExport} />
                    <span className="ml-1 flex items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onFeedback(reply.feedback === "up" ? undefined : "up")}
                        aria-label="Helpful"
                        aria-pressed={reply.feedback === "up"}
                        title="Helpful"
                      >
                        <ThumbsUp
                          className={cn(reply.feedback === "up" && "text-success")}
                        />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onFeedback(reply.feedback === "down" ? undefined : "down")}
                        aria-label="Not helpful"
                        aria-pressed={reply.feedback === "down"}
                        title="Not helpful"
                      >
                        <ThumbsDown
                          className={cn(reply.feedback === "down" && "text-destructive")}
                        />
                      </Button>
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
};

/**
 * The reply body.
 *
 * Isolated from the rest of the turn on purpose: the write-stream repaints on
 * every animation frame, and if that state lived in `ChatTurn` the avatar,
 * timeline pills and action toolbar would all reconcile 60 times a second.
 * Only this subtree re-renders.
 */
const ReplyBody: React.FC<{ text: string; streaming: boolean; runKey: string }> = ({
  text,
  streaming,
  runKey,
}) => {
  const { revealed, done } = useStreamReveal(text, streaming);
  const [dismissed, setDismissed] = React.useState(false);

  /*
   * Keyed on the run, not on `text`. `text` changes on every streamed chunk, so
   * the old dep list reset `dismissed` back to false within ~50ms of a click —
   * "Show the rest" snapped back to the lagging slice and the button reappeared,
   * making it unusable exactly when it was needed, since the reveal is slowest
   * when the answer is longest.
   */
  React.useEffect(() => setDismissed(false), [runKey]);

  const shown = dismissed ? text : revealed;
  const lagging = !done && shown.length < text.length;

  return (
    <>
      <Markdown
        content={shown}
        className={cn((streaming || lagging) && "md-streaming")}
        /*
         * `data-chat-status` on the bubble reports the *stream*, which finishes
         * before the write-stream does. This attribute reports the rendered
         * state, so a consumer never has to know the reveal exists to know
         * whether the answer on screen is complete.
         */
        data-revealing={lagging ? "true" : undefined}
      />
      {lagging && (
        <button type="button" onClick={() => setDismissed(true)} className="md-skip">
          <ChevronsDown aria-hidden />
          Show the rest
        </button>
      )}
    </>
  );
};

/**
 * Token count for a run.
 *
 * Prefers the provider's own usage figure. While the text is still arriving it
 * ticks up from a local estimate so the number is visibly live; once the run is
 * finished it settles on the reported count when the gateway sent one.
 */
const TokenStat: React.FC<{ liveText: string; tokens?: ChatTokens }> = ({
  liveText,
  tokens,
}) => {
  const reported = tokens?.completionTokens;
  const hasReported = reported !== undefined;
  const shown = reported ?? estimateTokens(liveText);
  // `reported` itself is not a valid test: a legitimately empty reply reports
  // 0 tokens, and truthiness labelled that "estimated", which is a lie about a
  // figure the provider did send.
  const source = hasReported ? "reported" : "estimated";

  return (
    <span
      className="caption flex items-center gap-1.5 text-muted-soft"
      title={
        hasReported
          ? `${shown} tokens in this reply, as reported by the provider`
          : `${shown} tokens, estimated from the reply length`
      }
    >
      <Gauge aria-hidden />
      <span aria-live="polite">{shown.toLocaleString()}</span>
      <span>{shown === 1 ? "token" : "tokens"}</span>
      {!hasReported && <span className="caption-upper">est.</span>}
      {source === "reported" && <span className="sr-only">reported by the provider</span>}
    </span>
  );
};

/** Four formats, chosen from a menu rather than four buttons in the row. */
const ExportMenu: React.FC<{ onExport: (format: ExportFormat) => void }> = ({
  onExport,
}) => {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Download this chat"
      >
        <Download />
        Export
        <ChevronDown aria-hidden />
      </Button>

      {open && (
        <div
          role="menu"
          aria-label="Export format"
          className="absolute bottom-full right-0 z-30 mb-1 w-44 overflow-hidden rounded-md border border-hairline bg-popover p-1 shadow-sm"
        >
          {EXPORT_FORMATS.map((format) => (
            <button
              key={format.id}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onExport(format.id);
              }}
              className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-canvas-soft"
            >
              <span className="min-w-0 flex-1 truncate">{format.label}</span>
              <span className="caption-upper text-muted-soft">.{format.extension}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Shown for the gap between "submitted" and the first streamed token. The
 * active stage advances on a timer so the wait is legible instead of a blank
 * panel — this is the state the old implementation sat in indefinitely.
 */
const THINKING_STAGE_MS = 1400;

const ThinkingSkeleton: React.FC<{ mode?: string }> = ({ mode }) => {
  const stages = getMode(mode).stages;
  const [step, setStep] = React.useState(0);

  React.useEffect(() => {
    const timer = setInterval(
      () => setStep((prev) => (prev + 1) % Math.max(1, stages.length - 1)),
      THINKING_STAGE_MS
    );
    return () => clearInterval(timer);
  }, [stages.length]);

  /*
   * Clamped to the last stage we ever light up. The interval cycles against
   * `stages.length - 1`, but the effect only depends on the length, so a `step`
   * carried over from a longer mode (e.g. 3, from a five-stage mode) could sit
   * past the end of a shorter list — and then `index === step` matched nothing
   * while `index > step` was false for every index, leaving no stage lit at all.
   */
  const active = Math.min(step, Math.max(0, stages.length - 2));

  return (
    <div className="space-y-3" aria-live="polite" aria-busy="true">
      <div className="flex flex-wrap items-center gap-1.5">
        {stages.map((stage, index) => (
          <TimelinePill
            key={stage}
            stage={stage}
            className={cn(index === active && "stage-active", index > active && "opacity-40")}
          />
        ))}
      </div>
      <p className="body-sm flex items-center gap-2 text-muted">
        <Pencil className="h-3.5 w-3.5" />
        Working on it — the answer streams in as it is written.
      </p>
      <div className="space-y-2" aria-hidden>
        {[100, 92, 74].map((width) => (
          <div
            key={width}
            className="h-3 animate-pulse rounded bg-muted-surface"
            style={{ width: `${width}%` }}
          />
        ))}
      </div>
    </div>
  );
};

export default ChatTurn;

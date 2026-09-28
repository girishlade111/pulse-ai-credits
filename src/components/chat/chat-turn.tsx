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
import { getMode } from "@/lib/chat-modes";
import { fileTypeLabel, formatFileSize, isImage } from "@/lib/chat-files";
import { cn } from "@/lib/utils";
import {
  Check,
  Copy,
  Download,
  FileText,
  Loader2,
  Pencil,
  RotateCcw,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  AlertTriangle,
} from "lucide-react";

interface AttachmentListProps {
  attachments: { id: string; name: string; type: string; size: number; url?: string }[];
}

const AttachmentList: React.FC<AttachmentListProps> = ({ attachments }) => (
  <ul className="mt-3 space-y-1.5 border-t border-hairline pt-3">
    {attachments.map((attachment) => (
      <li key={attachment.id} className="flex items-center gap-2">
        {isImage(attachment.type) && attachment.url ? (
          <img
            src={attachment.url}
            alt={attachment.name}
            className="h-7 w-7 shrink-0 rounded border border-hairline object-cover"
          />
        ) : (
          <FileText className="h-3.5 w-3.5 shrink-0 text-muted" />
        )}
        <span className="min-w-0 flex-1 truncate caption text-muted" title={attachment.name}>
          {attachment.name}
        </span>
        <span className="caption shrink-0 text-muted-soft">
          {fileTypeLabel(attachment)} · {formatFileSize(attachment.size)}
        </span>
      </li>
    ))}
  </ul>
);

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
    creditsUsed?: number;
    createdAt: string;
    error?: string;
    feedback?: "up" | "down";
  };
  copied: boolean;
  busy: boolean;
  onCopy: () => void;
  onExport: () => void;
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

  return (
    <article className="chat-turn">
      {/* ---- prompt ---- */}
      <div className="flex justify-end">
        <div className="bubble-user">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <ModeIcon className="h-3.5 w-3.5 text-ink" />
            <span className="title-sm">{mode.name}</span>
            {typeof reply?.creditsUsed === "number" && (
              <span className="pill-badge">
                {reply.creditsUsed} credit{reply.creditsUsed > 1 ? "s" : ""}
              </span>
            )}
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
                  <p className="caption mt-2 text-muted-soft">
                    No credits were charged for a failed run.
                  </p>
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
                <Markdown content={reply.text} className={cn(streaming && "md-streaming")} />
              ) : (
                <ThinkingSkeleton mode={reply.requestType} />
              )}

              {!streaming && (
                <div className="mt-5 flex flex-wrap items-center justify-end gap-1 border-t border-hairline pt-3">
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
                  <Button variant="ghost" size="sm" onClick={onExport} title="Download as .txt">
                    <Download />
                    Export
                  </Button>
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
              )}
            </div>
          )}
        </div>
      )}
    </article>
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

  return (
    <div className="space-y-3" aria-live="polite" aria-busy="true">
      <div className="flex flex-wrap items-center gap-1.5">
        {stages.map((stage, index) => (
          <TimelinePill
            key={stage}
            stage={stage}
            className={cn(index === step && "stage-active", index > step && "opacity-40")}
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

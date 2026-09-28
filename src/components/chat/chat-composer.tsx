/**
 * The composer.
 *
 * A single `<textarea>` that grows with its content, because a one-line `<input>`
 * cannot hold the multi-line prompts this product invites. Enter sends,
 * Shift+Enter inserts a newline, and the send button becomes a stop button while
 * a run is in flight so a long generation can be cancelled.
 */

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CHAT_MODES, getMode, type ChatMode } from "@/lib/chat-modes";
import { fileTypeLabel, formatFileSize, isImage } from "@/lib/chat-files";
import { cn } from "@/lib/utils";
import { Paperclip, Send, Square, Trash2, X } from "lucide-react";
import type { ChatAttachment } from "@/lib/chat-types";

const MAX_TEXTAREA_HEIGHT = 220;

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  busy: boolean;
  modeId: string;
  onModeChange: (id: string) => void;
  attachments: ChatAttachment[];
  onAttachClick: () => void;
  onRemoveAttachment: (id: string) => void;
  dragActive?: boolean;
  onDragStateChange?: (active: boolean) => void;
  onDropFiles?: (files: File[]) => void;
  /** Rendered under the box — the mode hint, or a credit warning. */
  footer?: React.ReactNode;
  autoFocusOnMount?: boolean;
  /**
   * Bump to move the caret into the composer. Needed for "New chat": the
   * composer stays mounted across that transition, so `autoFocusOnMount`
   * never fires and the caret would otherwise be left on the button.
   */
  focusToken?: number;
  variant?: "embedded" | "docked";
}

export const ChatComposer: React.FC<ChatComposerProps> = ({
  value,
  onChange,
  onSubmit,
  onStop,
  busy,
  modeId,
  onModeChange,
  attachments,
  onAttachClick,
  onRemoveAttachment,
  dragActive,
  onDragStateChange,
  onDropFiles,
  footer,
  autoFocusOnMount,
  focusToken,
  variant = "docked",
}) => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const mode = getMode(modeId);
  const ModeIcon = mode.icon;
  const canSend = value.trim().length > 0 && !busy;

  // Grow with the content, then scroll internally instead of pushing the page.
  React.useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    const next = Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > MAX_TEXTAREA_HEIGHT ? "auto" : "hidden";
  }, [value]);

  React.useEffect(() => {
    if (autoFocusOnMount) textareaRef.current?.focus();
  }, [autoFocusOnMount]);

  React.useEffect(() => {
    if (focusToken === undefined) return;
    textareaRef.current?.focus();
  }, [focusToken]);

  const submit = () => {
    if (!canSend) return;
    onSubmit();
  };

  return (
    <div className="w-full">
      <div
        onDragOver={(event) => {
          if (!onDropFiles) return;
          event.preventDefault();
          onDragStateChange?.(true);
        }}
        onDragLeave={(event) => {
          if (!onDropFiles) return;
          event.preventDefault();
          onDragStateChange?.(false);
        }}
        onDrop={(event) => {
          if (!onDropFiles) return;
          event.preventDefault();
          onDragStateChange?.(false);
          onDropFiles(Array.from(event.dataTransfer?.files ?? []));
        }}
        className={cn(
          "composer-box",
          variant === "docked" && "px-3 py-2.5 sm:px-4",
          dragActive && "border-primary bg-canvas"
        )}
      >
        <ModeIcon className="ml-1 hidden h-4 w-4 shrink-0 self-start text-muted sm:block" />

        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          placeholder={mode.placeholder}
          aria-label="Message Pulse agent"
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              submit();
            }
          }}
          className="composer-textarea"
        />

        <div className="flex shrink-0 items-start gap-1.5 pt-0.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={onAttachClick}
            disabled={busy}
            title="Attach files"
            aria-label="Attach files"
          >
            <Paperclip />
          </Button>

          <Select value={mode.id} onValueChange={onModeChange} disabled={busy}>
            <SelectTrigger
              className="h-9 w-9 shrink-0 border border-hairline bg-canvas-soft p-0"
              title={`${mode.name} · ${mode.credits} credit${
                mode.credits > 1 ? "s" : ""
              } per run`}
              aria-label="Choose a tool"
            >
              <ModeIcon className="h-4 w-4 text-ink" />
            </SelectTrigger>
            <SelectContent className="w-72">
              {CHAT_MODES.map((option) => (
                <ModeRow key={option.id} option={option} />
              ))}
            </SelectContent>
          </Select>

          {busy ? (
            <Button
              variant="outline"
              size="icon"
              onClick={onStop}
              className="h-9 w-9 shrink-0"
              aria-label="Stop generating"
              title="Stop generating"
            >
              <Square className="fill-current" />
            </Button>
          ) : (
            <Button
              size="icon"
              onClick={submit}
              disabled={!canSend}
              aria-label="Send message"
              className="h-9 w-9 shrink-0"
            >
              <Send />
            </Button>
          )}        </div>
      </div>

      {attachments.length > 0 && (
        <div className="mt-3">
          <p className="section-label mb-2">
            {attachments.length} file{attachments.length > 1 ? "s" : ""} attached
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="group flex items-center gap-3 rounded-md border border-hairline bg-card p-2"
              >
                <div className="shrink-0">
                  {isImage(attachment.type) && attachment.url ? (
                    <img
                      src={attachment.url}
                      alt={attachment.name}
                      className="h-8 w-8 rounded border border-hairline object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded border border-hairline bg-canvas-soft">
                      <Trash2 className="h-3.5 w-3.5 text-muted" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="body-sm truncate" title={attachment.name}>
                    {attachment.name}
                  </p>
                  <p className="caption truncate text-muted">
                    {fileTypeLabel(attachment)} · {formatFileSize(attachment.size)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemoveAttachment(attachment.id)}
                  aria-label={`Remove ${attachment.name}`}
                  className="h-7 w-7 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {footer ?? (
        <p className="mt-2.5 text-center caption text-muted-soft">
          <Kbd>Enter</Kbd> to send · <Kbd>Shift</Kbd>+<Kbd>Enter</Kbd> for a new line ·
          paste or drop files to attach
        </p>
      )}
    </div>
  );
};

const ModeRow: React.FC<{ option: ChatMode }> = ({ option }) => {
  const Icon = option.icon;
  return (
    <SelectItem value={option.id}>
      <div className="flex w-full items-center gap-3">
        <Icon className="h-4 w-4 shrink-0 text-ink" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm">{option.name}</span>
            <span className="caption-upper shrink-0 text-muted-soft">
              {option.credits}c
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-muted">{option.description}</p>
        </div>
      </div>
    </SelectItem>
  );
};

const Kbd: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <kbd className="kbd">{children}</kbd>
);

export default ChatComposer;

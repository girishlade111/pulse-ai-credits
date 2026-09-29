/**
 * The empty state. Shown when a session has no messages — either a brand-new
 * chat or a history entry the user cleared.
 *
 * It doubles as the tool picker: each card sets the mode, so the composer
 * always knows what the next prompt will cost before it is sent.
 */

import React from "react";
import { CHAT_MODES, getMode, type ChatMode } from "@/lib/chat-modes";
import { cn } from "@/lib/utils";

interface ChatWelcomeProps {
  modeId: string;
  onModeChange: (id: string) => void;
  onPickSuggestion: (prompt: string) => void;
}

/**
 * No hero here. The landing view already carries the "Ask, research, or
 * generate." headline in the workspace header, and repeating it here was
 * printing the same title twice on one screen.
 */
export const ChatWelcome: React.FC<ChatWelcomeProps> = ({
  modeId,
  onModeChange,
  onPickSuggestion,
}) => {
  const mode = getMode(modeId);

  return (
    <div className="py-2">
      <div className="mb-8 text-center">
        <h2 className="display-sm">What are we working on?</h2>
        <p className="body-sm mt-2 text-muted">
          Pick a tool, then ask. Follow-ups keep the whole thread in context.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap justify-center gap-1.5">
        {CHAT_MODES.map((option) => {
          const Icon = option.icon;
          const active = option.id === mode.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onModeChange(option.id)}
              title={option.description}
              className={cn(
                "pill gap-1.5 transition-colors",
                active
                  ? "bg-ink text-canvas"
                  : "bg-surface-strong text-ink hover:bg-hairline-strong"
              )}
            >
              <Icon className="h-3 w-3" />
              {option.name}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {mode.suggestions.map((prompt) => (
          <SuggestionCard key={prompt} prompt={prompt} mode={mode} onPick={onPickSuggestion} />
        ))}
      </div>
    </div>
  );
};

const SuggestionCard: React.FC<{
  prompt: string;
  mode: ChatMode;
  onPick: (prompt: string) => void;
}> = ({ prompt, mode, onPick }) => {
  const Icon = mode.icon;
  return (
    <button
      type="button"
      onClick={() => onPick(prompt)}
      className="group flex items-start gap-3 rounded-lg border border-hairline bg-card p-3 text-left transition-colors hover:border-hairline-strong"
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
      <span className="body-sm min-w-0 flex-1 text-body group-hover:text-ink">{prompt}</span>
    </button>
  );
};

export default ChatWelcome;

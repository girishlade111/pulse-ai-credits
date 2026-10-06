import React, { useCallback, useState } from "react";
import { SearchInterface } from "@/components/SearchInterface";
import { cn } from "@/lib/utils";

interface WorkspaceProps {
  onChatModeChange?: (chatMode: boolean) => void;
}

/**
 * The chatbot, and the app's front door.
 *
 * This used to sit under a marketing header with a credit balance and a
 * "Manage plan" button. Credits are gone and the chat is the product, so the
 * page is now just the chat itself: no hero, no badges, no chrome competing
 * with the composer. The welcome screen and tool picker that `SearchInterface`
 * renders in its empty state are the entire landing.
 */
const Workspace: React.FC<WorkspaceProps> = ({ onChatModeChange }) => {
  // Stable identity: SearchInterface reports chat mode from an effect, and a
  // fresh function every render would re-fire that effect on every keystroke.
  const handleResultsChange = useCallback(
    (hasResults: boolean) => {
      /*
       * Both setters are called directly rather than from inside a `setState`
       * updater. Updaters must be pure: React double-invokes them in StrictMode,
       * so `onChatModeChange` fired twice per transition, and when React
       * replayed the updater during render it updated `App` while rendering
       * `Workspace` — a cross-component render-phase update, which React
       * rejects and which could land the navbar toggle out of order.
       * `setChatOpen` already bails out when the value is unchanged.
       */
      setChatOpen(hasResults);
      onChatModeChange?.(hasResults);
    },
    [onChatModeChange]
  );

  const [chatOpen, setChatOpen] = useState(false);

  return (
    <main
      className={cn(
        "bg-canvas",
        // Only the chat shell is a fixed-height, non-scrolling viewport. In
        // landing mode the page scrolls normally, so the welcome screen and
        // tool picker remain reachable on short windows.
        chatOpen ? "h-dvh overflow-hidden" : "min-h-dvh"
      )}
    >
      <SearchInterface onResultsChange={handleResultsChange} />
    </main>
  );
};

export default Workspace;

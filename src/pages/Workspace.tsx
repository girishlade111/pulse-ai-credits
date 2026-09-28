import React, { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SearchInterface } from "@/components/SearchInterface";
import { MinimalisticIcons } from "@/components/ui/minimalistic-icons";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { cn } from "@/lib/utils";

interface WorkspaceProps {
  onChatModeChange?: (chatMode: boolean) => void;
}

const Workspace: React.FC<WorkspaceProps> = ({ onChatModeChange }) => {
  const { credits, subscription } = useWorkspace();
  const navigate = useNavigate();
  const [chatOpen, setChatOpen] = useState(false);

  // Stable identity: SearchInterface reports chat mode from an effect, and a
  // fresh function every render would re-fire that effect on every keystroke.
  const handleResultsChange = useCallback((hasResults: boolean) => {
    setChatOpen((previous) => {
      if (previous === hasResults) return previous;
      onChatModeChange?.(hasResults);
      return hasResults;
    });
  }, [onChatModeChange]);

  return (
    <main
      className={cn(
        "bg-canvas",
        // Only the chat shell is a fixed-height, non-scrolling viewport. In
        // landing mode the page scrolls normally, so the welcome screen and
        // tool picker remain reachable on short windows.
        chatOpen ? "h-dvh overflow-hidden" : "min-h-[calc(100dvh-4rem)]"
      )}
    >
      <div className={cn("page pb-6 pt-10", chatOpen && "hidden")}>
        <div className="mb-8 flex flex-col gap-6 border-b border-hairline pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="section-label mb-3">Workspace</p>
            <h1 className="display-md">Ask, research, or generate.</h1>
            <p className="body-md mt-2 max-w-xl text-muted">
              Every run opens a timeline. You can watch the credits go as it
              happens.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="pill-badge">
              <MinimalisticIcons.Credits className="h-3 w-3" />
              {credits.current_credits} credits
            </span>
            <span className="pill-badge">{subscription.name}</span>
            <Button variant="outline" onClick={() => navigate("/plans")}>
              Manage plan
            </Button>
          </div>
        </div>
      </div>

      <SearchInterface onResultsChange={handleResultsChange} />
    </main>
  );
};

export default Workspace;

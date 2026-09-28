/**
 * The chat layout: a scrolling transcript plus an optional docked composer.
 *
 * The scroll bug this replaces
 * ----------------------------
 * The old markup chained `flex-1 overflow-y-auto` down a column flex container
 * with no `min-h-0`. A flex item's default `min-height: auto` refuses to shrink
 * below its content, so the "scroll" pane grew to the full transcript height,
 * the composer was pushed off-screen, and the page itself could not scroll
 * because the outer wrapper was `overflow-hidden`. The reply was generated
 * correctly and simply could not be reached.
 *
 * `fill` switches between the two modes:
 *  - `true`  — the shell is a fixed-height column; this owns the scroll.
 *  - `false` — the shell is a normal document flow and the page scrolls.
 * Both keep the same React subtree, so nothing remounts on the switch.
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowDown } from "lucide-react";

/** How close to the bottom still counts as "following the conversation". */
const BOTTOM_THRESHOLD_PX = 80;

interface ChatScrollAreaProps {
  children: React.ReactNode;
  /** Bump this whenever new content arrives so the view follows the stream. */
  followKey: React.DependencyList;
  /** `true` inside the fixed-height chat shell, `false` in page flow. */
  fill?: boolean;
  className?: string;
  header?: React.ReactNode;
}

export const ChatScrollArea: React.FC<ChatScrollAreaProps> = ({
  children,
  followKey,
  fill = true,
  className,
  header,
}) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const pinnedRef = React.useRef(true);
  const [showJump, setShowJump] = React.useState(false);

  const scrollToBottom = React.useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
    pinnedRef.current = true;
    setShowJump(false);
  }, []);

  // Follow the stream — but only while the reader is already at the bottom, so
  // scrolling up to re-read an earlier answer is not yanked back down.
  React.useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || !pinnedRef.current) return;
    el.scrollTop = el.scrollHeight;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, followKey);

  // Entering the shell always lands on the newest turn.
  React.useEffect(() => {
    if (!fill) return;
    pinnedRef.current = true;
    setShowJump(false);
  }, [fill]);

  const handleScroll = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distance < BOTTOM_THRESHOLD_PX;
    pinnedRef.current = atBottom;
    setShowJump(!atBottom);
  }, []);

  return (
    <div
      className={cn(
        "min-w-0",
        fill ? "relative flex min-h-0 flex-1 flex-col" : "block"
      )}
    >
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className={cn(
          "scroll-quiet",
          fill ? "app-scroll" : "overflow-visible",
          className
        )}
      >
        {header}
        {children}
        {/* breathing room so the last answer clears the docked composer */}
        {fill && <div className="h-6" aria-hidden />}
      </div>

      {fill && showJump && (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => scrollToBottom("smooth")}
            className="pointer-events-auto h-8 gap-1.5 rounded-full bg-card"
          >
            <ArrowDown className="h-3.5 w-3.5" />
            Jump to latest
          </Button>
        </div>
      )}
    </div>
  );
};

export default ChatScrollArea;

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
  /**
   * Identity of the transcript being shown. Changing it re-arms the follow
   * behaviour — see the pinning effect below for why this cannot be inferred
   * from `followKey` alone.
   */
  transcriptKey?: string;
}

export const ChatScrollArea: React.FC<ChatScrollAreaProps> = ({
  children,
  followKey,
  fill = true,
  className,
  header,
  transcriptKey,
}) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const pinnedRef = React.useRef(true);
  /**
   * Set while one of our own scrolls is in flight. A smooth scroll emits a
   * stream of `scroll` events and the early ones are far from the bottom, so
   * without this the first of them flipped `pinnedRef` straight back to false —
   * undoing the jump, re-showing the button mid-animation, and letting a
   * mid-stream `followKey` change cancel the scroll the user just asked for.
   */
  const programmaticRef = React.useRef(false);
  const [showJump, setShowJump] = React.useState(false);

  const scrollToBottom = React.useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = scrollRef.current;
    if (!el) return;
    programmaticRef.current = true;
    pinnedRef.current = true;
    setShowJump(false);
    el.scrollTo({ top: el.scrollHeight, behavior });
    if (behavior === "auto") programmaticRef.current = false;
  }, []);

  // Follow the stream — but only while the reader is already at the bottom, so
  // scrolling up to re-read an earlier answer is not yanked back down.
  React.useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || !pinnedRef.current) return;
    el.scrollTop = el.scrollHeight;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, followKey);

  /*
   * Re-arm the follow behaviour whenever the transcript itself is swapped, and
   * land on the newest turn.
   *
   * This component stays mounted across a session switch, and `pinnedRef` was
   * only reset on mount and on a `fill` change. Switching chats while scrolled
   * up therefore carried `pinnedRef === false` into the new transcript: the
   * follow effect above bailed, so the new conversation opened wherever the
   * old one's scroll offset happened to be — mid-transcript, or clamped to the
   * bottom in a way that read as accidental — with no jump button, because
   * `handleScroll` never fired to raise it. The stream then never auto-scrolled
   * either, so the reader was stranded.
   */
  React.useLayoutEffect(() => {
    const el = scrollRef.current;
    pinnedRef.current = true;
    programmaticRef.current = false;
    setShowJump(false);
    if (!fill || !el) return;
    el.scrollTop = el.scrollHeight;
  }, [transcriptKey, fill]);

  const handleScroll = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distance < BOTTOM_THRESHOLD_PX;
    if (atBottom) programmaticRef.current = false;
    else if (programmaticRef.current) return;
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
      {/*
       * `tabIndex` + `role="log"` make the transcript reachable and announced.
       * `app-scroll` is a scrollable region, so without them a keyboard-only
       * reader could not scroll the conversation with arrow keys or PageDown,
       * and a screen reader heard nothing as the answer streamed in.
       */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        tabIndex={fill ? 0 : undefined}
        role={fill ? "log" : undefined}
        aria-live={fill ? "polite" : undefined}
        aria-relevant={fill ? "additions text" : undefined}
        aria-label={fill ? "Conversation" : undefined}
        className={cn(
          "scroll-quiet",
          fill ? "app-scroll" : "overflow-visible",
          fill && "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
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

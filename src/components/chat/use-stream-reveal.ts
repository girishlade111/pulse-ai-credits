/**
 * "Content write" streaming.
 *
 * The provider streams tokens, but not at an even rate: a gateway may flush a
 * 400-character burst and then pause for two seconds, and a raw append makes
 * the paragraph visibly lurch. This reveals the settled text at a steady,
 * readable pace so a reply *reads as if it is being written*.
 *
 * Two rules keep it honest:
 *
 *  - It is cosmetic only. The instant `streaming` goes false the reveal snaps
 *    to the full text, so what is on screen is always exactly what was stored
 *    and sent upstream. A reader can never be left looking at a truncated
 *    answer that the transcript already considers finished.
 *  - It never falls far behind. The rate scales with the backlog, so a fast
 *    producer cannot leave the reveal minutes behind, and a user can dismiss
 *    the effect with one click.
 *
 * `prefers-reduced-motion` skips the effect entirely.
 */

import * as React from "react";

/** Characters revealed per millisecond at a comfortable reading pace. */
const BASE_RATE = 0.55;
/** Past this backlog the rate scales up, so the reveal stays "live". */
const MAX_BACKLOG = 300;

const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const useStreamReveal = (text: string, streaming: boolean): string => {
  const [revealed, setRevealed] = React.useState(text);
  /** Index into `text` currently painted. Kept in a ref: it changes per frame. */
  const cursor = React.useRef(0);

  // Finished (or never started): show everything, immediately.
  React.useEffect(() => {
    if (!streaming) {
      cursor.current = text.length;
      setRevealed(text);
    }
  }, [streaming, text]);

  React.useEffect(() => {
    if (!streaming || !text) return;

    if (prefersReducedMotion()) {
      cursor.current = text.length;
      setRevealed(text);
      return;
    }

    // A shorter `text` means the store was rewritten (regenerate, session
    // switch). Rewind rather than slicing past the end.
    if (cursor.current > text.length) {
      cursor.current = 0;
    }

    let frame = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const elapsed = Math.min(120, now - last);
      last = now;

      const current = cursor.current;
      if (current >= text.length) {
        frame = 0; // Caught up. The effect re-runs when more text arrives.
        return;
      }

      const backlog = text.length - current;
      const rate = backlog > MAX_BACKLOG ? backlog / MAX_BACKLOG : BASE_RATE;
      const step = Math.max(1, Math.ceil(rate * elapsed));
      const next = Math.min(text.length, current + step);

      cursor.current = next;
      setRevealed(text.slice(0, next));
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => {
      if (frame) cancelAnimationFrame(frame);
    };
  }, [streaming, text]);

  return streaming ? revealed : text;
};

export default useStreamReveal;

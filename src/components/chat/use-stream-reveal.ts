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
 *  - It is cosmetic only. Once the reveal has drained, what is on screen is
 *    exactly what was stored, so a reader is never left looking at a truncated
 *    answer. When the stream is already finished on arrival, the reveal plays
 *    the whole thing out rather than dumping it in one frame — that is the
 *    common case for a gateway that buffers, and it is why an answer used to
 *    appear with no sense of being written.
 *  - It never falls far behind. The rate scales with the backlog, and a user
 *    can dismiss the effect with one click.
 *
 * `prefers-reduced-motion` skips the effect entirely.
 */

import * as React from "react";

/** Characters revealed per millisecond at a comfortable reading pace. */
const BASE_RATE = 0.55;
/**
 * How fast the reveal is allowed to catch up on a backlog. A burst is smoothed
 * over roughly this long, and the equilibrium lag for a producer running at
 * `p` chars/ms is `CATCHUP_MS * (p - BASE_RATE)` — so a fast gateway stays
 * under a second behind instead of leaving a jump at the end of the reply.
 */
const CATCHUP_MS = 500;
/** A reply this long takes at least MIN_REVEAL_MS to play out. */
const MIN_REVEAL_MS = 400;
/**
 * Shorter than this and the effect is not worth showing: advancing the minimum
 * one character per frame would render "Paris." in a few frames, which reads as
 * a flicker rather than as writing.
 */
const MIN_ANIMATED_CHARS = 90;

const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * How many characters to paint this frame.
 *
 * Pure and exported so the pacing can be unit-tested without a browser or a
 * live model — the visual trace only proves it end-to-end, not that a given
 * backlog is smoothed within a predictable window.
 *
 * `backlog` is how far the reveal trails the stream; `elapsedMs` is the time
 * since the previous frame.
 */
export const revealStep = (backlog: number, elapsedMs: number): number => {
  if (backlog <= 0) return 0;
  const rate = BASE_RATE + backlog / CATCHUP_MS;
  return Math.max(1, Math.ceil(rate * elapsedMs));
};

export const useStreamReveal = (
  text: string,
  streaming: boolean
): { revealed: string; done: boolean } => {
  const [revealed, setRevealed] = React.useState(text);
  /** Index into `text` currently painted. Kept in a ref: it changes per frame. */
  const cursor = React.useRef(0);
  const [done, setDone] = React.useState(true);

  // A shorter `text` means the store was rewritten (regenerate, session
  // switch). Rewind rather than slicing past the end.
  React.useEffect(() => {
    if (cursor.current > text.length) cursor.current = 0;
  }, [text]);

  React.useEffect(() => {
    if (!text) {
      setDone(true);
      return;
    }

    if (prefersReducedMotion() || text.length < MIN_ANIMATED_CHARS) {
      cursor.current = text.length;
      setRevealed(text);
      setDone(true);
      return;
    }

    /*
     * Keep animating after the stream ends if there is still a backlog. A
     * gateway that buffers delivers the whole answer in one go, and snapping on
     * completion is exactly the "it appeared all at once" behaviour the write
     * effect exists to remove. `data-done` then stays false until the reveal
     * has actually drained, so the caret and the status agree.
     */
    if (!streaming && cursor.current >= text.length) {
      setRevealed(text);
      setDone(true);
      return;
    }

    setDone(cursor.current >= text.length);
    if (cursor.current >= text.length) return;

    let frame = 0;
    let last = performance.now();

    // Guarantee the reveal takes at least MIN_REVEAL_MS, even for a short
    // answer, so every response visibly writes itself out.
    const startedAt = last;
    const total = text.length;

    const tick = (now: number) => {
      const elapsed = Math.min(120, now - last);
      last = now;

      const current = cursor.current;
      if (current >= total) {
        setRevealed(text);
        setDone(true);
        frame = 0;
        return;
      }

      // Hold the reply to at least MIN_REVEAL_MS, so even a short one is visibly
      // written rather than dropped in. The floor uses the *total* length, not
      // the progress so far — otherwise the first frame already outruns it.
      const elapsedTotal = now - startedAt;
      const floorRate = Math.max(
        BASE_RATE,
        total / Math.max(1, MIN_REVEAL_MS - elapsedTotal)
      );
      const backlog = total - current;
      const rate = Math.max(floorRate, BASE_RATE + backlog / CATCHUP_MS);

      const next = Math.min(total, current + Math.max(1, Math.ceil(rate * elapsed)));
      cursor.current = next;
      setRevealed(text.slice(0, next));
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => {
      if (frame) cancelAnimationFrame(frame);
    };
  }, [streaming, text]);

  return { revealed, done };
};

export default useStreamReveal;

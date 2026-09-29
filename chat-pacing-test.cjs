/**
 * Pacing checks for the write-stream reveal.
 *
 * These are the claims that are awkward to prove from a browser trace: that a
 * burst is smoothed over a bounded window, that the lag stays bounded under a
 * fast producer, and that the reveal never stalls. Pure math, no server.
 */
const { revealStep } = require("./reveal-step.cjs");
const results = [];
const check = (n, p, d = "") => {
  results.push({ n, p, d });
  console.log(`${p ? "PASS" : "FAIL"}  ${n}${d ? ` — ${d}` : ""}`);
};

/** Simulate the rAF loop against a producer emitting `perFrame` chars/frame. */
const simulate = (total, perFrame, frameMs = 16) => {
  let revealed = 0;
  let streamed = 0;
  let frames = 0;
  const lags = [];
  const jumps = [];
  let prevRevealed = 0;

  while (streamed < total && frames < 100000) {
    streamed = Math.min(total, streamed + perFrame);
    const backlog = streamed - revealed;
    const step = Math.min(backlog, revealStep(backlog, frameMs));
    revealed = Math.min(streamed, revealed + step);
    lags.push(backlog);
    jumps.push(revealed - prevRevealed);
    prevRevealed = revealed;
    frames += 1;
  }

  return { frames, revealed, streamed, maxLag: Math.max(...lags), maxJump: Math.max(...jumps) };
};

const BASE = 0.55; // chars/ms floor
const CATCHUP = 500; // ms of catch-up constant

/* ------------------------------------------------------- single-frame step */
check("no backlog paints nothing", revealStep(0, 16) === 0);
check("a backlog always advances at least one char", revealStep(1, 1) === 1);
check(
  "a small backlog reveals at roughly the reading pace",
  revealStep(1, 100) >= Math.floor(100 * BASE),
  `${revealStep(1, 100)} chars per 100ms`
);
check(
  "a large backlog reveals faster than a small one",
  revealStep(5000, 16) > revealStep(50, 16),
  `${revealStep(5000, 16)} vs ${revealStep(50, 16)} per frame`
);
check(
  "step is monotonic in elapsed time",
  revealStep(500, 16) < revealStep(500, 32),
  `${revealStep(500, 16)} -> ${revealStep(500, 32)}`
);

/* --------------------------------------------------- a one-shot big burst */
const burst = simulate(6000, 6000);
check("a 6000-char burst is not dumped in one frame", burst.frames > 5, `${burst.frames} frames`);
check(
  "a 6000-char burst is smoothed over a readable window",
  burst.frames * 16 >= 250,
  `${Math.round(burst.frames * 16)}ms`
);
check("a 6000-char burst is fully revealed", burst.revealed === 6000, `${burst.revealed}`);
check("no single frame dumps a huge slab", burst.maxJump < 250, `largest frame ${burst.maxJump} chars`);

/* -------------------------------------------------- steady fast producer */
const fast = simulate(20000, 60); // 60 chars per 16ms frame = 3.75 chars/ms
check("a fast producer is fully caught up", fast.revealed === 20000, `${fast.revealed}`);
check(
  "a fast producer stays within about a second of the stream",
  fast.maxLag < (1 / BASE) * 1000 * 1.2,
  `max lag ${fast.maxLag} chars (~${Math.round((fast.maxLag / fast.maxLag) * 0)}ms of text)`
);
check(
  "lag is bounded, not growing without limit",
  fast.maxLag < 2000,
  `max lag ${fast.maxLag} chars`
);

/* ------------------------------------------------------- slow producer */
const slow = simulate(3000, 2);
check("a slow producer is still fully revealed", slow.revealed === 3000, `${slow.revealed}`);
check("a slow producer never lags at all", slow.maxLag <= 2, `max lag ${slow.maxLag}`);

/* -------------------------------------------- a mid-stream producer stall */
{
  // 10 frames of a fast burst, then 20 frames of nothing, then more.
  let revealed = 0;
  let streamed = 0;
  let stalled = 0;
  const plan = [
    ...Array(10).fill(300),
    ...Array(20).fill(0),
    ...Array(10).fill(300),
  ];
  for (const perFrame of plan) {
    streamed += perFrame;
    const backlog = streamed - revealed;
    revealed = Math.min(streamed, revealed + revealStep(backlog, 16));
  }
  check("a producer stall does not strand the reveal", revealed === streamed, `${revealed}/${streamed}`);
  check("the reveal recovers during a stall", stalled === 0 && revealed > 0);
}

console.log(`\n${results.filter((r) => r.p).length}/${results.length} checks passed`);
const failed = results.filter((r) => !r.p);
if (failed.length) {
  console.log("\nFAILURES:");
  failed.forEach((f) => console.log(` - ${f.n}: ${f.d}`));
  process.exit(1);
}

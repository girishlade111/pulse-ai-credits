/**
 * Text-to-speech for assistant replies, on `window.speechSynthesis`.
 *
 * Three problems this hook exists to solve
 * ---------------------------------------
 *  1. **Only one turn may speak at a time.** The synthesiser is a global
 *     singleton — starting a second utterance interrupts the first, so two rows
 *     both "playing" would leave the user listening to whichever started last.
 *     A module-level owner token makes the newest request win and marks the
 *     others as not-speaking.
 *  2. **Chrome pauses synthesis after ~15 seconds** on a long answer and never
 *     resumes it on its own, so a full reply silently stops halfway. A
 *     resume ticker is the standard workaround.
 *  3. **Markdown has to be stripped before reading.** Without it the voice
 *     pronounces "asterisk asterisk bold" and reads raw link URLs aloud.
 */

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Identifies the caller that currently owns the synthesiser. Comparing tokens
 * rather than booleans is what lets a stale `onend` from the utterance we just
 * replaced not clear the state of the one that replaced it.
 */
let activeOwner: symbol | null = null;

const synth = (): SpeechSynthesis | null =>
  typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;

export const speechSynthesisSupported = (): boolean => synth() !== null;

/** Chrome gives up after ~15s of synthesis; this nudges it to keep going. */
const RESUME_POLL_MS = 10_000;

/**
 * Turns a rendered reply into something worth hearing.
 *
 * Exported because the same rule is needed to decide whether a reply has any
 * speakable content at all (a reply that is nothing but a code block should not
 * show a working speaker button).
 */
export const stripMarkdownForSpeech = (markdown: string): string =>
  markdown
    // fenced code, and the language tag on the fence
    .replace(/```[\w+#.-]*[^\n]*\n?([\s\S]*?)```/g, " code block. ")
    .replace(/~~~[\w+#.-]*[^\n]*\n?([\s\S]*?)~~~/g, " code block. ")
    // images before links, or `![]()` leaves the bracket syntax behind
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    // links: keep the label, drop the URL
    .replace(/\[([^\]]+)\]\(([^)]*)\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(?=\S)(.*?)(?<=\S)\1/g, "$2")
    .replace(/~~(.*?)~~/g, "$1")
    // horizontal rules and table pipes read as noise
    .replace(/^\s{0,3}([-*_]\s*){3,}$/gm, "\n")
    .replace(/^\s*\|.*\|\s*$/gm, " ")
    .replace(/^\s*[-:| ]+\s*$/gm, " ")
    // list markers, but not a hyphen inside a word
    .replace(/^\s*[-*+•]\s+/gm, "")
    .replace(/^\s*\d+[.)]\s+/gm, "")
    .replace(/`([^`]*)`/g, "$1")
    // several kinds of whitespace, including the non-breaking space a PDF brings
    .replace(/[\s\u00a0]+/g, " ")
    .trim();

export interface SpeechSynthesisState {
  supported: boolean;
  speaking: boolean;
  /** Present when speech could not start, so the caller can explain. */
  error?: string;
  /** True once `speaking` has been true, so a button can avoid a layout jump. */
  speak: (text: string) => void;
  stop: () => void;
  toggle: (text: string) => void;
}

export const useSpeechSynthesis = (): SpeechSynthesisState => {
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const ownerRef = useRef<symbol | null>(null);
  const resumeRef = useRef<number | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stop = useCallback(() => {
    const engine = synth();
    // Only clear our own claim: stopping must not silence another turn that has
    // already taken the synthesiser.
    if (engine && ownerRef.current === activeOwner) {
      engine.cancel();
      activeOwner = null;
    }
    ownerRef.current = null;
    utteranceRef.current = null;
    if (resumeRef.current !== null) {
      window.clearInterval(resumeRef.current);
      resumeRef.current = null;
    }
    setSpeaking(false);
  }, []);

  // Never leave the voice running after the row that owns it unmounts.
  useEffect(
    () => () => {
      const engine = synth();
      if (engine && ownerRef.current === activeOwner) engine.cancel();
      ownerRef.current = null;
      if (resumeRef.current !== null) window.clearInterval(resumeRef.current);
    },
    []
  );

  const speak = useCallback((text: string) => {
    const engine = synth();
    if (!engine) {
      setError("Read aloud is not supported in this browser.");
      return;
    }

    const clean = stripMarkdownForSpeech(text);
    if (!clean) {
      setError("There is nothing to read aloud here.");
      return;
    }

    // Whatever was speaking yields to this one.
    engine.cancel();

    const owner = Symbol("pulse-speech");
    ownerRef.current = owner;
    activeOwner = owner;
    setError(undefined);

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.02;
    utterance.pitch = 1;
    utteranceRef.current = utterance;

    const finish = () => {
      // A late `end` from the utterance we just replaced must not clear the
      // state of the one that replaced it.
      if (ownerRef.current !== owner) return;
      ownerRef.current = null;
      utteranceRef.current = null;
      if (activeOwner === owner) activeOwner = null;
      if (resumeRef.current !== null) {
        window.clearInterval(resumeRef.current);
        resumeRef.current = null;
      }
      setSpeaking(false);
    };

    utterance.onend = finish;
    utterance.onerror = (event) => {
      // `interrupted` / `canceled` are what `cancel()` produces; they are the
      // expected consequence of switching turns, not a failure to report.
      if (event.error !== "interrupted" && event.error !== "canceled") {
        setError("Read aloud failed in this browser.");
      }
      finish();
    };

    try {
      engine.speak(utterance);
      setSpeaking(true);
    } catch {
      finish();
      setError("Could not start read aloud.");
      return;
    }

    if (resumeRef.current !== null) window.clearInterval(resumeRef.current);
    resumeRef.current = window.setInterval(() => {
      const current = synth();
      // `paused` is the Chrome long-answer stall; resume only if we still own it.
      if (current && ownerRef.current === owner && current.paused) current.resume();
    }, RESUME_POLL_MS);
  }, []);

  const toggle = useCallback(
    (text: string) => {
      if (speaking) stop();
      else speak(text);
    },
    [speak, speaking, stop]
  );

  return { supported: speechSynthesisSupported(), speaking, error, speak, stop, toggle };
};

export default useSpeechSynthesis;
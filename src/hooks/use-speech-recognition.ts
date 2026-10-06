/**
 * Speech-to-text for the composer, on the browser's own recognition API.
 *
 * Why the vendor-prefixed type
 * ----------------------------
 * `SpeechRecognition` is still not in lib.dom for every TS version, and Chrome /
 * Edge ship `webkitSpeechRecognition` while Firefox has shipped nothing. The
 * minimal structural interface below is declared locally rather than pulling in
 * `@types/dom-speech-recognition`, which adds a dependency for four methods.
 *
 * Design notes
 * ------------
 *  - Results are read from `isFinal` events only. The `interim` transcript is
 *    ignored: appending it to the composer and then appending the final result
 *    duplicates every phrase, because Chrome emits the interim text as a prefix
 *    of the final one.
 *  - The session restarts on `onend`. Recognition silently stops on its own
 *    after a pause (and on some mobile browsers after ~60s), which otherwise
 *    leaves the mic lit and deaf — the worst possible state for a control whose
 *    whole job is "am I being heard?".
 *  - Stopping is explicit and awaited. Calling `stop()` and immediately reading
 *    `listening` is a race; the hook only reports "listening" again once the
 *    recogniser has actually started.
 */

import { useCallback, useEffect, useRef, useState } from "react";

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

const getCtor = (): SpeechRecognitionCtor | null => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

/** Whether dictation is possible at all in this browser. */
export const speechRecognitionSupported = (): boolean => getCtor() !== null;

/** Errors that mean "you stopped it", not "it broke". */
const BENIGN_ERRORS = new Set(["aborted", "no-speech", "canceled"]);

export interface SpeechRecognitionState {
  /** Live from the recogniser, not from the click that asked for it. */
  listening: boolean;
  /** True while the browser is resolving whether it can start. */
  starting: boolean;
  /** Human-readable reason to show, or `undefined` when all is well. */
  error?: string;
  supported: boolean;
  start: () => void;
  stop: () => void;
  toggle: () => void;
  /**
   * Appended to the caller's value. The hook does not own the text, because the
   * composer owns it — receiving the transcript and letting the caller append
   * is what keeps a dictation from fighting the user's own typing.
   */
  transcript: string;
  /** Clears the transcript and any error. Call when the send clears the field. */
  reset: () => void;
}

export interface UseSpeechRecognitionOptions {
  onTranscript?: (text: string) => void;
  lang?: string;
}

export const useSpeechRecognition = (
  options: UseSpeechRecognitionOptions = {}
): SpeechRecognitionState => {
  const { onTranscript, lang = "en-US" } = options;

  const [listening, setListening] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [transcript, setTranscript] = useState("");
  const [supported, setSupported] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  /** Set while the user wants dictation on, independent of engine state. */
  const wantedRef = useRef(false);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;
  /** Guards the restart in `onend` against a stop the user asked for. */
  const stoppingRef = useRef(false);

  useEffect(() => {
    setSupported(speechRecognitionSupported());
  }, []);

  // Abandoned mid-dictation when the component goes away: otherwise the
  // recogniser keeps the microphone open with no UI left to stop it.
  useEffect(
    () => () => {
      wantedRef.current = false;
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    },
    []
  );

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) {
      setError("Voice input is not supported in this browser.");
      return;
    }
    if (wantedRef.current) return;

    wantedRef.current = true;
    stoppingRef.current = false;
    setError(undefined);
    setStarting(true);

    // A previous session may still hold the mic; dropping the reference lets the
    // browser reclaim it rather than throwing on `start`.
    recognitionRef.current?.abort();

    const recognition = new Ctor();
    recognition.lang = lang;
    // Continuous, because a dictation is not one phrase. Interim results off, so
    // the callback only ever sees settled text.
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setStarting(false);
      setListening(true);
    };

    recognition.onresult = (event) => {
      let latest = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) latest += result[0]?.transcript ?? "";
      }
      if (!latest.trim()) return;
      setTranscript(latest);
      onTranscriptRef.current?.(latest);
    };

    recognition.onerror = (event) => {
      if (BENIGN_ERRORS.has(event.error)) return;
      setError(
        event.error === "not-allowed" || event.error === "service-not-allowed"
          ? "Microphone permission was denied."
          : event.error === "network"
            ? "Voice input needs a network connection in this browser."
            : "Voice input stopped unexpectedly."
      );
    };

    recognition.onend = () => {
      setListening(false);
      setStarting(false);
      recognitionRef.current = null;
      /*
       * The engine ends the session on its own after a pause, and on some
       * browsers after a hard timeout. Restarting while the user still wants
       * dictation is what keeps the ring honest. Skipped when the stop was
       * deliberate, so pressing the button actually stops.
       */
      if (!wantedRef.current || stoppingRef.current) {
        wantedRef.current = false;
        return;
      }
      try {
        const restart = recognitionRef.current ?? recognition;
        restart.start();
        recognitionRef.current = restart;
      } catch {
        // Engine refuses (usually a rate limit). Give up rather than spin.
        wantedRef.current = false;
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      // `start()` throws if the previous session has not released the mic yet.
      wantedRef.current = false;
      setStarting(false);
      setError("Could not start voice input. Try again in a moment.");
    }
  }, [lang]);

  const stop = useCallback(() => {
    if (!wantedRef.current && !listening) return;
    wantedRef.current = false;
    stoppingRef.current = true;
    setStarting(false);
    // `stop` asks the engine to finish and deliver its final result, which is
    // what we want — `abort` would discard a phrase already spoken.
    recognitionRef.current?.stop();
    setListening(false);
  }, [listening]);

  const toggle = useCallback(() => {
    if (wantedRef.current || listening) stop();
    else start();
  }, [listening, start, stop]);

  const reset = useCallback(() => {
    setTranscript("");
    setError(undefined);
  }, []);

  return { listening, starting, error, supported, start, stop, toggle, transcript, reset };
};

export default useSpeechRecognition;
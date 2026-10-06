import React, { createContext, useContext, useEffect, useLayoutEffect, useMemo, useState } from "react";

/**
 * Workspace preferences.
 *
 * This used to hold credit balances, which the app no longer charges: a run is
 * free, so there is no balance to read, no ledger to write and no gate on the
 * composer. What is left is what genuinely belongs to the reader — the text
 * size applied to the transcript, and a reset for it.
 *
 * The archived credit API lives in `lib/credits.ts`, used only by the
 * Dashboard and Plans screens that are no longer routed.
 */

export type ReadingSize = "small" | "medium" | "large" | "extra-large";

const STORAGE_KEY = "pulseai-preferences";

export const READING_SIZES: { value: ReadingSize; label: string; sample: string }[] = [
  { value: "small", label: "Small", sample: "Compact reading size" },
  { value: "medium", label: "Medium", sample: "The default reading size" },
  { value: "large", label: "Large", sample: "Comfortable on long sessions" },
  { value: "extra-large", label: "Extra large", sample: "Maximum legibility" },
];

interface Preferences {
  readingSize: ReadingSize;
  setReadingSize: (size: ReadingSize) => void;
  reset: () => void;
}

const DEFAULTS = { readingSize: "medium" as ReadingSize };

const read = (): { readingSize: ReadingSize } => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<{ readingSize: ReadingSize }>;
    const value = parsed.readingSize;
    return READING_SIZES.some((size) => size.value === value) && value
      ? { readingSize: value }
      : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
};

const PreferencesContext = createContext<Preferences | undefined>(undefined);

const READING_CLASSES = ["font-small", "font-medium", "font-large", "font-extra-large"];

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [readingSize, setReadingSizeState] = useState<ReadingSize>(() => read().readingSize);

  /*
   * Toggles the single reading-size class instead of assigning `body.className`.
   * The assignment form replaced the whole attribute, so anything else on
   * `<body>` — a scroll lock, a theme class, a class any dependency adds — was
   * silently deleted the next time the reading size changed.
   *
   * `useLayoutEffect` so the stored size is applied before the first paint;
   * as a passive effect a reload at `extra-large` rendered one frame at the
   * default size and then reflowed.
   */
  useLayoutEffect(() => {
    const { classList } = document.body;
    const next = `font-${readingSize}`;
    if (!classList.contains(next)) {
      READING_CLASSES.forEach((name) => classList.remove(name));
      classList.add(next);
    }
  }, [readingSize]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ readingSize }));
    } catch {
      // A blocked storage just means the size is not remembered.
    }
  }, [readingSize]);

  const value = useMemo<Preferences>(
    () => ({
      readingSize,
      setReadingSize: setReadingSizeState,
      reset: () => setReadingSizeState(DEFAULTS.readingSize),
    }),
    [readingSize]
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
};

export const usePreferences = (): Preferences => {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error("usePreferences must be used within a PreferencesProvider");
  }
  return context;
};

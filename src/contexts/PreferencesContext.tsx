import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

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

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [readingSize, setReadingSizeState] = useState<ReadingSize>(() => read().readingSize);

  useEffect(() => {
    document.body.className = `font-${readingSize}`;
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

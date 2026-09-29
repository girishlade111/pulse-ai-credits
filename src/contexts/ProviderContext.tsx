import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { DEFAULT_PROVIDER, isProviderId, PROVIDERS, type ProviderId } from "@/lib/providers";

interface ProviderContextType {
  provider: ProviderId;
  setProvider: (provider: ProviderId) => void;
}

const STORAGE_KEY = "pulseai-llm-provider";

const ProviderContext = createContext<ProviderContextType | undefined>(undefined);

const readStored = (): ProviderId => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return isProviderId(saved) ? saved : DEFAULT_PROVIDER;
  } catch {
    return DEFAULT_PROVIDER;
  }
};

/** Holds the user's chosen provider so the picker and the client agree on one id. */
export const ProviderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [provider, setProviderState] = useState<ProviderId>(readStored);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, provider);
    } catch {
      // A blocked storage should never stop the workspace from working.
    }
  }, [provider]);

  // A provider removed from the registry must not linger in storage.
  useEffect(() => {
    if (!isProviderId(provider)) setProviderState(DEFAULT_PROVIDER);
  }, [provider]);

  const setProvider = useCallback((next: ProviderId) => {
    if (isProviderId(next)) setProviderState(next);
  }, []);

  return (
    <ProviderContext.Provider value={{ provider, setProvider }}>
      {children}
    </ProviderContext.Provider>
  );
};

export const useProvider = () => {
  const context = useContext(ProviderContext);
  if (context === undefined) {
    throw new Error("useProvider must be used within a ProviderProvider");
  }
  return { ...context, meta: PROVIDERS[context.provider] };
};

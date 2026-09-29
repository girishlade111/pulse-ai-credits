import { PROVIDER_IDS, type ProviderId } from "./providers";

/**
 * Availability probing for the configured providers.
 *
 * apinex free models need a daily check-in and Mistral's free tier is rate
 * limited, so a provider can be selectable and still fail on every request.
 * Probing turns that into something visible in the picker instead of a failed
 * run. Each provider costs one tiny completion, so results are cached and only
 * re-probed after the TTL.
 */

export type ProviderStatus = "unknown" | "checking" | "ok" | "blocked";

export interface ProviderHealth {
  status: Exclude<ProviderStatus, "unknown" | "checking">;
  /** Short reason, taken from the provider's own error where possible. */
  detail?: string;
  checkedAt: number;
}

const ENDPOINT = (provider: ProviderId) => `/api/llm/${provider}/health`;
const CACHE_KEY = "pulseai-llm-health";
const TTL_MS = 15 * 60 * 1000;

const EMPTY: Record<string, ProviderHealth> = {};

const readCache = (): Record<string, ProviderHealth> => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Record<string, ProviderHealth>;
    const now = Date.now();
    // Drop anything stale so a provider that recovered is not shown as broken.
    return Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => now - value.checkedAt < TTL_MS)
    );
  } catch {
    return EMPTY;
  }
};

const writeCache = (health: Record<string, ProviderHealth>) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(health));
  } catch {
    // A blocked storage just means we re-probe next time.
  }
};

/** Asks the proxy whether one provider can actually serve a request. */
const probe = async (provider: ProviderId): Promise<ProviderHealth> => {
  try {
    const response = await fetch(ENDPOINT(provider), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      detail?: string;
    };

    return {
      status: payload.ok ? "ok" : "blocked",
      detail: payload.detail,
      checkedAt: Date.now(),
    };
  } catch (error) {
    return {
      status: "blocked",
      detail: error instanceof Error ? error.message : "probe failed",
      checkedAt: Date.now(),
    };
  }
};

/**
 * Probes every provider that is not already cached. Resolves with the freshest
 * health map. Safe to call on every open of the picker.
 */
export const probeProviders = async (): Promise<Record<string, ProviderHealth>> => {
  const cached = readCache();
  const stale = PROVIDER_IDS.filter((id) => !cached[id]);

  if (stale.length === 0) return cached;

  const results = await Promise.all(stale.map((id) => probe(id)));
  const next = { ...cached };

  stale.forEach((id, index) => {
    next[id] = results[index];
  });

  writeCache(next);
  return next;
};

export const readCachedHealth = (): Record<string, ProviderHealth> => readCache();

export const clearHealthCache = () => {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // Nothing to do.
  }
};

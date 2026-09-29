/**
 * Public metadata for the LLM providers the workspace can talk to.
 *
 * This module is bundled into the client, so it must never contain keys — only
 * ids, labels, model names and the completion ceiling each provider needs. The
 * matching credentials live in .env and are attached by the dev-server proxy
 * (see `vite.config.ts`), which keeps this list and that one in the same order.
 */

export const PROVIDER_IDS = ["apinex", "atria", "mistral", "inception"] as const;

export type ProviderId = (typeof PROVIDER_IDS)[number];

export interface ProviderMeta {
  id: ProviderId;
  label: string;
  /** Sent as a hint; the proxy overrides it with the model from .env. */
  model: string;
  /** Where the provider publishes its own documentation. */
  docs?: string;
  /**
   * Completion ceiling. Diffusion models such as Inception's Mercury emit a
   * reasoning pass against this budget before any visible answer, so a small
   * limit comes back as `content: null` with finish_reason "length" — an empty
   * result that looks like a broken integration.
   */
  maxTokens: number;
  /** Short caveat shown under the picker. */
  note?: string;
}

export const PROVIDERS: Record<ProviderId, ProviderMeta> = {
  apinex: {
    id: "apinex",
    label: "apinex",
    model: "free/gpt-6-luna",
    maxTokens: 4096,
  },
  atria: {
    id: "atria",
    label: "Atria",
    model: "Atria-Dawn-Preview",
    docs: "https://api.atria-asi.ai/docs",
    maxTokens: 4096,
  },
  mistral: {
    id: "mistral",
    label: "Mistral",
    model: "mistral-small-latest",
    docs: "https://docs.mistral.ai/api",
    maxTokens: 4096,
  },
  inception: {
    id: "inception",
    label: "Inception Mercury",
    model: "mercury-2.5",
    docs: "https://docs.inceptionlabs.ai/get-started",
    maxTokens: 4096,
    note: "Diffusion model: reasons first, so answers take longer.",
  },
};

export const PROVIDER_LIST: ProviderMeta[] = PROVIDER_IDS.map((id) => PROVIDERS[id]);

export const DEFAULT_PROVIDER: ProviderId = "apinex";

export const isProviderId = (value: unknown): value is ProviderId =>
  typeof value === "string" && (PROVIDER_IDS as readonly string[]).includes(value);

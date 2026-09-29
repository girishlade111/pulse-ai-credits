/**
 * Client for the configured LLM providers.
 *
 * All of them speak the OpenAI chat-completions dialect, so one client serves
 * the lot. Requests go to a same-origin path that the dev server proxies
 * upstream (see `vite.config.ts`), keyed by provider id, so the API key and
 * model stay server-side. If this app is deployed with a real backend, point
 * LLM_PROXY_PREFIX at that and nothing else in the app has to change.
 */

import { PROVIDERS, type ProviderId } from "./providers";

const LLM_PROXY_PREFIX = "/api/llm";

const endpointFor = (provider: ProviderId) =>
  `${LLM_PROXY_PREFIX}/${provider}/chat/completions`;

/** Matches the request_type vocabulary used across the workspace. */
export type LlmRequestType =
  | "quick_search"
  | "deep_research"
  | "image_generation"
  | "pro_search"
  | "task"
  | "deep_research_8x"
  | "find_all";

export class LlmError extends Error {
  constructor(
    message: string,
    readonly provider?: ProviderId,
    readonly status?: number
  ) {
    super(message);
    this.name = "LlmError";
  }
}

interface CompletionOptions {
  provider: ProviderId;
  query: string;
  requestType: LlmRequestType;
  /** Pre-formatted context, e.g. the attached-file analysis block. */
  context?: string;
  signal?: AbortSignal;
}

/**
 * Per-tool instructions. Every provider is served as a plain chat model, so the
 * tool identity and the expected document shape are expressed in the prompt.
 */
const SYSTEM_PROMPT: Record<LlmRequestType, string> = {
  quick_search: `You are a fast search assistant. Answer the question directly and concisely, in under 200 words.
Lead with the answer. Use short markdown sections and bullet points. State clearly when you are uncertain or when the answer depends on information you cannot verify. Never invent citations, URLs, statistics, or dates. If asked for sources, describe what kind of source would be authoritative instead of fabricating one.`,
  deep_research: `You are a research analyst. Produce a structured brief in markdown: Executive Summary, Key Findings, Analysis, and Conclusion.
Synthesize across perspectives, weigh conflicting evidence, and state how confident you are. Use bullet points and bold lead-ins for scannability. Never invent citations, URLs, statistics, or dates — mark any specific figure you are unsure of as unverified.`,
  image_generation: `You are an image prompt engineer. You cannot generate images, so do not claim to have.
Instead produce a production-ready image prompt in markdown: a refined prompt paragraph, the key visual elements, style and lighting notes, and a one-line negative prompt. Be concrete and specific about composition, palette, and framing.`,
  pro_search: `You are a technical research assistant. Produce a structured markdown report with a summary, the key technical findings, comparisons where relevant, and recommended next steps.
Be precise about technical detail. Never invent citations, URLs, statistics, or dates — flag anything you cannot verify as unverified.`,
  task: `You are a planning assistant. Break the request into a concrete, ordered execution plan in markdown: objective, prerequisites, numbered steps, and acceptance criteria.
Make each step actionable and independently verifiable. Do not pad the plan with generic advice.`,
  deep_research_8x: `You are a lead research analyst running an exhaustive investigation. Produce an extended markdown report: Methodology, Findings across multiple angles, Counter-arguments, Synthesis, and Open Questions.
Be thorough and explicit about the limits of the evidence. Never invent citations, URLs, statistics, or dates — mark unverified specifics as such.`,
  find_all: `You are a data sourcing assistant. Produce a structured markdown brief describing the dataset that answers the request: what to collect, the fields and their types, quality and deduplication expectations, and export formats.
You cannot retrieve live records, so do not present results as if you had them — describe the collection plan instead.`,
};

const buildUserPrompt = ({ query, context }: Pick<CompletionOptions, "query" | "context">) =>
  context ? `${query}\n\n${context}` : query;

/** Pulls the assistant text out of an OpenAI-compatible response. */
const readChoice = (payload: unknown): string => {
  const choice = (payload as { choices?: { message?: { content?: unknown } }[] })?.choices?.[0];
  const content = choice?.message?.content;

  if (typeof content === "string" && content.trim()) return content;

  // Some gateways return content as an array of parts.
  if (Array.isArray(content)) {
    const text = content
      .map((part) => (typeof part === "string" ? part : (part as { text?: string })?.text ?? ""))
      .join("")
      .trim();
    if (text) return text;
  }

  throw new LlmError(
    "The provider returned an empty response. This usually means it hit its token limit while reasoning — try a shorter query."
  );
};

const readError = (payload: unknown, provider: ProviderId, status: number): string => {
  const label = PROVIDERS[provider].label;
  const message = (payload as { error?: { message?: string } })?.error?.message;

  if (typeof message === "string" && message.trim()) {
    // Several providers wrap the payload as { object: "error", message }.
    return message;
  }
  if (status === 401 || status === 403) return `${label} rejected the API key.`;
  if (status === 429) return `${label} is rate limiting requests. Try again shortly.`;
  if (status === 400) return `${label} rejected the request (400).`;
  return `${label} returned ${status}.`;
};

/**
 * Runs a single completion against the chosen provider. Non-2xx responses and
 * unreachable providers throw `LlmError` so the caller can surface a real
 * reason instead of a generic toast.
 */
export const complete = async ({
  provider,
  query,
  requestType,
  context,
  signal,
}: CompletionOptions): Promise<string> => {
  const meta = PROVIDERS[provider];

  let response: Response;

  try {
    response = await fetch(endpointFor(provider), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // Sent as a hint; the proxy overrides it with its configured model.
        model: meta.model,
        max_tokens: meta.maxTokens,
        messages: [
          { role: "system", content: SYSTEM_PROMPT[requestType] },
          { role: "user", content: buildUserPrompt({ query, context }) },
        ],
      }),
      signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw new LlmError(
      `Could not reach the ${meta.label} proxy. If you are running a production build, it has no proxy — use \`npm run dev\`.`,
      provider
    );
  }

  const raw = await response.text();
  let payload: unknown;
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    throw new LlmError(
      `${meta.label} returned a non-JSON response (${response.status}).`,
      provider,
      response.status
    );
  }

  if (!response.ok) {
    throw new LlmError(readError(payload, provider, response.status), provider, response.status);
  }

  return readChoice(payload);
};

/**
 * Client for the configured LLM providers.
 *
 * They all speak the OpenAI chat-completions dialect, so one client serves the
 * lot. Requests go to a same-origin path that the dev server proxies upstream
 * (see `vite.config.ts`), keyed by provider id, so the API key and model stay
 * server-side. If this app is deployed with a real backend, point
 * LLM_PROXY_PREFIX at that and nothing else in the app has to change.
 *
 * Three things this client has to get right:
 *
 *  1. History. The first version sent a single user message, so every follow-up
 *     prompt was answered with zero context. `streamCompletion` now takes the
 *     whole conversation and sends it as a real message list, bounded to
 *     `MAX_HISTORY_TURNS` so long chats cannot blow the context window.
 *  2. Streaming. A non-streaming call leaves the composer on a spinner with
 *     nothing on screen, which is why responses looked like they were "not
 *     showing". If the upstream ignores `stream`, the body is plain JSON and
 *     the reader falls back to parsing it in one go.
 *  3. Token budget. Each provider gets its own `max_tokens` from the registry.
 *     Inception's Mercury is a diffusion model that runs a reasoning pass
 *     against that budget before emitting any visible text, so too low a
 *     ceiling returns an empty message rather than an error.
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

/**
 * A text or image part. Images have to travel as a real `image_url` part —
 * describing an attachment in prose ("the user attached an image") reaches the
 * model no pixels at all, so it could never actually look at the picture.
 */
export type LlmContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export type LlmContent = string | LlmContentPart[];

export interface LlmMessage {
  role: "user" | "assistant";
  content: LlmContent;
}

/** True when a message carries something other than plain text. */
const hasParts = (content: LlmContent): content is LlmContentPart[] => Array.isArray(content);

/** The prose half of a message, ignoring any image parts. */
const textOf = (content: LlmContent): string =>
  hasParts(content)
    ? content
        .filter((part): part is Extract<LlmContentPart, { type: "text" }> => part.type === "text")
        .map((part) => part.text)
        .join("\n")
    : content;

/**
 * Flattens to plain text for storage and for the transcript: images are
 * already handled on the wire, and keeping base64 blobs in `localStorage` would
 * blow the storage quota on the first screenshot.
 */
export const toStorableText = (content: LlmContent): string => textOf(content);

/** Concatenates two user turns, preserving any images from both. */
const joinUserContent = (a: LlmContent, b: LlmContent): LlmContent => {
  if (!hasParts(a) && !hasParts(b)) {
    return `${a}\n\n---\n\n${b}`;
  }
  const toParts = (content: LlmContent): LlmContentPart[] =>
    hasParts(content) ? content : [{ type: "text", text: content }];
  return [...toParts(a), { type: "text", text: "---" }, ...toParts(b)];
};

/**
 * One turn of the stored transcript, in the shape the client actually holds.
 *
 * The transcript pairs a prompt with the reply it produced, which is what lets
 * `toMessageList` repair a broken alternation instead of guessing from a flat
 * list. `assistant` is absent when the turn produced no usable answer.
 */
export interface TurnRecord {
  user: LlmMessage;
  assistant?: LlmMessage;
}

export interface StreamOptions {
  provider: ProviderId;
  /** Whole conversation, oldest first. The last turn is the new prompt. */
  turns: TurnRecord[];
  requestType: LlmRequestType;
  /** Called for every token chunk as it arrives. */
  onDelta: (text: string) => void;
  /**
   * Called when the provider reports its own token usage at the end of the
   * stream. Absent when the gateway does not report it.
   */
  onUsage?: (usage: TokenUsage) => void;
  signal?: AbortSignal;
}

export interface TokenUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

/** Retries for a throttled gateway. Free tiers are RPM-limited, not broken. */
const MAX_ATTEMPTS = 3;
const RETRY_BASE_MS = 900;

/**
 * How many prior turns are replayed to the model. Deep enough that "summarise
 * the above" works, bounded so a 50-message chat cannot exceed the window.
 */
const MAX_HISTORY_TURNS = 20;

/**
 * Per-tool instructions. Every provider is served as a plain chat model, so the
 * tool identity and the expected document shape are expressed in the prompt.
 */
const SYSTEM_PROMPT: Record<LlmRequestType, string> = {
  quick_search: `You are a fast search assistant. Answer the question directly and concisely, in under 200 words.
Lead with the answer. Use short markdown sections and bullet points. State clearly when you are uncertain or when the answer depends on information you cannot verify. Never invent citations, URLs, statistics, or dates. If asked for sources, describe what kind of source would be authoritative instead of fabricating one.`,
  deep_research: `You are a research analyst. Produce a structured brief in markdown: Executive Summary, Key Findings, Analysis, and Conclusion.
Synthesize across perspectives, weigh conflicting evidence, and state how confident you are. Use bullet points and bold lead-ins for scannability. Never invent citations, URLs, statistics, or dates: mark any specific figure you are unsure of as unverified.`,
  image_generation: `You are an image prompt engineer. You cannot generate images, so do not claim to have.
Instead produce a production-ready image prompt in markdown: a refined prompt paragraph, the key visual elements, style and lighting notes, and a one-line negative prompt. Be concrete and specific about composition, palette, and framing.`,
  pro_search: `You are a technical research assistant. Produce a structured markdown report with a summary, the key technical findings, comparisons where relevant, and recommended next steps.
Be precise about technical detail. Never invent citations, URLs, statistics, or dates: flag anything you cannot verify as unverified.`,
  task: `You are a planning assistant. Break the request into a concrete, ordered execution plan in markdown: objective, prerequisites, numbered steps, and acceptance criteria.
Make each step actionable and independently verifiable. Do not pad the plan with generic advice.`,
  deep_research_8x: `You are a lead research analyst running an exhaustive investigation. Produce an extended markdown report: Methodology, Findings across multiple angles, Counter-arguments, Synthesis, and Open Questions.
Be thorough and explicit about the limits of the evidence. Never invent citations, URLs, statistics, or dates: mark unverified specifics as such.`,
  find_all: `You are a data sourcing assistant. Produce a structured markdown brief describing the dataset that answers the request: what to collect, the fields and their types, quality and deduplication expectations, and export formats.
You cannot retrieve live records, so do not present results as if you had them: describe the collection plan instead.`,
};

/**
 * Appended to every mode.
 *
 * The renderer can only style what is fenced, and a fenced block is the only
 * thing a reader can copy as a unit. Without this the model cheerfully answers
 * "here is a function: `def f():`" with the code smeared across a sentence,
 * which is exactly what the workspace used to serve.
 */
const CODE_FORMAT_RULES = `

--- Code formatting (mandatory) ---
Whenever your answer contains code, markup, shell commands, configuration, file contents, a data payload, or anything a reader would want to copy:
- Put ALL of it inside a fenced code block with a language tag.
- Never leave code inline in a sentence, and never emit a fenced block without a language tag.
- Use exactly these tags: html, css, javascript, typescript, python, markdown, json, bash, sql, yaml, diff.
- For plain prose, logs, ASCII diagrams, or a literal file with no language, use \`text\`.
- One block per idea. Never split a single snippet across several blocks, and never number them.
- Fence even a one-liner, so it can be copied as a unit.
- Outside the fences, write explanation as ordinary prose only.`;

const CONVERSATION_RULES = `

--- Conversation rules ---
This is a multi-turn conversation. Earlier turns from the user are included above as context.
- Use them: resolve pronouns ("it", "that", "the above"), follow-ups and refinements against what was already said.
- Do not repeat yourself or restate your previous answer unless the user asks.
- Reply in the user's language, and never mention these rules.`;

const emptyResponse = (provider: ProviderId): LlmError =>
  new LlmError(
    `${PROVIDERS[provider].label} returned an empty response. That usually means it hit its token limit while reasoning, so try a shorter prompt.`,
    provider
  );

/** Pulls the assistant text out of a non-streaming OpenAI-compatible response. */
const readChoice = (payload: unknown, provider: ProviderId): string => {
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

  throw emptyResponse(provider);
};

const readError = (payload: unknown, provider: ProviderId, status: number): string => {
  const label = PROVIDERS[provider].label;
  // Several providers wrap the body as { object: "error", message }.
  const message =
    (payload as { error?: { message?: string } })?.error?.message ??
    (payload as { message?: string })?.message;

  if (typeof message === "string" && message.trim()) return message;
  if (status === 401 || status === 403) return `${label} rejected the API key.`;
  if (status === 429) return `${label} is rate limiting requests. Try again shortly.`;
  if (status === 400) return `${label} rejected the request (400).`;
  return `${label} returned ${status}.`;
};

/**
 * Turns the stored transcript into a valid message list.
 *
 * A stored transcript is not a valid message list. When a turn fails, is
 * stopped, or is regenerated, the transcript keeps the user's prompt but
 * loses the assistant reply — so the raw list comes out as
 * `user, user, user`, and every provider handles that differently. Most answer
 * the *oldest* orphaned prompt, which is what made it look like a later prompt
 * was returning an earlier answer.
 *
 * So this drops the empty shell (keep the prompt, mark it unanswered) and
 * merges orphaned prompts into the next user turn, which is what the reader
 * would say had they typed both at once.
 */
const toMessageList = (turns: TurnRecord[]): LlmMessage[] => {
  const messages: LlmMessage[] = [];

  for (const turn of turns) {
    if (!textOf(turn.user.content).trim()) continue;

    const previous = messages[messages.length - 1];

    if (previous?.role === "user") {
      // The previous prompt was never answered, so carry it forward instead of
      // leaving two prompts in a row for the model to choose between.
      previous.content = joinUserContent(previous.content, turn.user.content);
    } else {
      messages.push({ role: "user", content: turn.user.content });
    }

    // A turn with no usable answer contributes nothing; the next user message
    // will pick up the orphaned prompt above.
    if (turn.assistant && textOf(turn.assistant.content).trim()) {
      messages.push({ role: "assistant", content: turn.assistant.content });
    }
  }

  return messages;
};

/** Drops empty turns, keeps the last `MAX_HISTORY_TURNS`, and starts on a user. */
const boundTurns = (turns: TurnRecord[]): TurnRecord[] => {
  const usable = turns
    .filter((turn) => textOf(turn.user.content).trim().length > 0)
    .slice(-MAX_HISTORY_TURNS);
  const firstUser = usable.findIndex((turn) => textOf(turn.user.content).trim().length > 0);
  return firstUser <= 0 ? usable : usable.slice(firstUser);
};

const buildRequestBody = (
  options: Pick<StreamOptions, "turns" | "requestType" | "provider">
) => ({
  messages: [
    {
      role: "system",
      content: `${SYSTEM_PROMPT[options.requestType]}${CODE_FORMAT_RULES}${CONVERSATION_RULES}`,
    },
    ...toMessageList(boundTurns(options.turns)),
  ],
  stream: true,
  // Ask for a usage report so the token count on the reply is the provider's
  // own figure rather than a guess.
  stream_options: { include_usage: true },
  // Diffusion models need room for a reasoning pass before any visible text.
  max_tokens: PROVIDERS[options.provider].maxTokens,
});

/** Reads one `data:` payload out of an SSE buffer and returns the delta. */
const readSseDelta = (payload: unknown): string => {
  const choice = (
    payload as { choices?: { delta?: { content?: unknown }; text?: unknown }[] }
  )?.choices?.[0];
  const content = choice?.delta?.content ?? choice?.text;

  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === "string" ? part : (part as { text?: string })?.text ?? ""))
      .join("");
  }
  return "";
};

/**
 * Runs one streaming completion against the chosen provider.
 *
 * `onDelta` receives progressively longer text for the assistant turn. The
 * returned promise resolves once the turn is complete, with the full text.
 */
export const streamCompletion = async ({
  provider,
  turns,
  requestType,
  onDelta,
  onUsage,
  signal,
}: StreamOptions): Promise<string> => {
  const label = PROVIDERS[provider].label;
  let lastError: unknown;

  /*
   * Free and preview tiers are rate limited per minute, not broken. A turn that
   * dies on 429 becomes a dead entry in the transcript, and the next prompt then
   * carries an orphaned question — which is how a transient throttle turned into
   * an answer for the wrong question. So a throttle is retried before the turn
   * is allowed to fail.
   */
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await runOnce({ provider, turns, requestType, onDelta, onUsage, signal, label });
    } catch (error) {
      lastError = error;
      const throttled = error instanceof LlmError && isThrottle(error);
      if (!throttled || attempt === MAX_ATTEMPTS || signal?.aborted) throw error;
      // Exponential backoff, giving a rate-limited window time to reopen.
      await new Promise((resolve) =>
        setTimeout(resolve, RETRY_BASE_MS * 2 ** (attempt - 1))
      );
    }
  }

  throw lastError;
};

/** Rate limits arrive as 429, or as a 4xx whose body says so. */
const isThrottle = (error: LlmError): boolean =>
  error.status === 429 ||
  /rate limit|too many requests|cluster rpm|quota|overloaded/i.test(error.message);

const runOnce = async ({
  provider,
  turns,
  requestType,
  onDelta,
  onUsage,
  signal,
  label,
}: StreamOptions & { label: string }): Promise<string> => {
  let response: Response;

  try {
    response = await fetch(endpointFor(provider), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify(buildRequestBody({ provider, turns, requestType })),
      signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw new LlmError(
      `Could not reach the ${label} proxy. If you are running a production build, it has no proxy: use \`npm run dev\`.`,
      provider
    );
  }

  if (!response.ok) {
    // Error bodies are always JSON, so a plain text read is enough here.
    const raw = await response.text().catch(() => "");
    let payload: unknown = {};
    try {
      payload = raw ? JSON.parse(raw) : {};
    } catch {
      payload = {};
    }
    throw new LlmError(readError(payload, provider, response.status), provider, response.status);
  }

  // Some deployments do not honour `stream`. Fall back to a single-shot read so
  // the chat still works, just without incremental rendering.
  const contentType = response.headers.get("Content-Type") ?? "";
  if (!contentType.includes("text/event-stream") || !response.body) {
    const raw = await response.text();
    let payload: unknown;
    try {
      payload = raw ? JSON.parse(raw) : {};
    } catch {
      throw new LlmError(
        `${label} returned a non-JSON response (${response.status}).`,
        provider,
        response.status
      );
    }
    const text = readChoice(payload, provider);
    onDelta(text);
    return text;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // SSE frames are separated by a blank line.
    let boundary = buffer.indexOf("\n\n");
    while (boundary !== -1) {
      const frame = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      boundary = buffer.indexOf("\n\n");

      const data = frame
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim())
        .join("");

      if (!data) continue;
      if (data === "[DONE]") {
        reader.cancel().catch(() => undefined);
        if (!full.trim()) throw emptyResponse(provider);
        return full;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(data);
      } catch {
        continue;
      }

      // The usage frame arrives last, with no delta alongside it.
      const usage = readUsage(parsed);
      if (usage) onUsage?.(usage);

      const delta = readSseDelta(parsed);
      if (!delta) continue;
      full += delta;
      onDelta(full);
    }
  }

  // A stream that ends without [DONE] is still a valid partial answer.
  if (!full.trim()) throw emptyResponse(provider);
  return full;
};

/**
 * Reads the optional trailing usage report.
 *
 * The wire format is snake_case (`prompt_tokens`, `completion_tokens`) because
 * that is the OpenAI-compatible shape every gateway speaks; the app works in
 * camelCase. Both spellings are accepted, since a proxy may rename the fields,
 * and an unrecognised payload is ignored rather than trusted.
 */
const readUsage = (payload: unknown): TokenUsage | undefined => {
  const raw = (payload as { usage?: Record<string, unknown> })?.usage;
  if (!raw || typeof raw !== "object") return undefined;

  const num = (...keys: string[]): number | undefined => {
    for (const key of keys) {
      const value = raw[key];
      if (typeof value === "number" && Number.isFinite(value)) return value;
    }
    return undefined;
  };

  const usage: TokenUsage = {
    promptTokens: num("prompt_tokens", "promptTokens"),
    completionTokens: num("completion_tokens", "completionTokens"),
    totalTokens: num("total_tokens", "totalTokens"),
  };

  const hasAny = usage.promptTokens !== undefined || usage.completionTokens !== undefined || usage.totalTokens !== undefined;
  if (!hasAny) return undefined;

  // Fill in a missing total from the two halves rather than showing nothing.
  if (usage.totalTokens === undefined && (usage.promptTokens !== undefined || usage.completionTokens !== undefined)) {
    usage.totalTokens = (usage.promptTokens ?? 0) + (usage.completionTokens ?? 0);
  }

  return usage;
};

/**
 * Rough token estimate for a gateway that reports no usage.
 *
 * Deliberately coarse — the point is an honest order of magnitude in the UI,
 * not an exact count. The real figure is used whenever the provider sends one.
 */
export const estimateTokens = (text: string): number =>
  text.length === 0 ? 0 : Math.max(1, Math.round(text.length / 4));

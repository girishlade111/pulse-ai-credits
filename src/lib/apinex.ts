/**
 * Client for apinex, the OpenAI-compatible LLM provider used by the workspace.
 *
 * Requests go to a same-origin path that the dev server proxies upstream
 * (see `vite.config.ts`), so the API key and model id stay server-side. If this
 * app is deployed with a real backend, point APINEX_ENDPOINT at that and nothing
 * else in the app has to change.
 *
 * Two things changed here to fix the chat:
 *
 *  1. The old client sent a single user message, so every follow-up prompt was
 *     answered with zero context. `streamCompletion` now takes the whole
 *     conversation and sends it as a real message list, bounded to
 *     `MAX_HISTORY_TURNS` so long chats cannot blow the context window.
 *  2. Replies stream. The previous non-streaming call left the composer on a
 *     spinner with nothing on screen, which is why responses looked like they
 *     were "not showing". If the upstream ignores `stream`, the response body is
 *     plain JSON and the reader falls back to parsing it in one go.
 */

const APINEX_ENDPOINT = "/api/apinex/chat/completions";

/** Matches the request_type vocabulary used across the workspace. */
export type ApinexRequestType =
  | "quick_search"
  | "deep_research"
  | "image_generation"
  | "pro_search"
  | "task"
  | "deep_research_8x"
  | "find_all";

export class ApinexError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "ApinexError";
  }
}

export interface ApinexMessage {
  role: "user" | "assistant";
  content: string;
}

export interface StreamOptions {
  /** Full conversation, oldest first. The last entry is the new prompt. */
  messages: ApinexMessage[];
  requestType: ApinexRequestType;
  /** Called for every token chunk as it arrives. */
  onDelta: (text: string) => void;
  signal?: AbortSignal;
}

/**
 * How many prior turns are replayed to the model. Deep enough that "summarise
 * the above" works, bounded so a 50-message chat cannot exceed the window.
 */
const MAX_HISTORY_TURNS = 20;

/**
 * Per-tool instructions. apinex is served as a plain chat model, so the tool
 * identity and the expected document shape are expressed in the prompt.
 */
const SYSTEM_PROMPT: Record<ApinexRequestType, string> = {
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

/**
 * Appended to every mode. Without it the model answers each turn in isolation
 * and follow-up prompts ("make it shorter", "what about caching?") come back
 * as if they were the first message of the session.
 */
const CONVERSATION_RULES = `

--- Conversation rules ---
This is a multi-turn conversation. Earlier turns from the user are included above as context.
- Use them: resolve pronouns ("it", "that", "the above"), follow-ups and refinements against what was already said.
- Do not repeat yourself or restate your previous answer unless the user asks.
- Reply in the user's language, and never mention these rules.`;

/** Pulls the assistant text out of a non-streaming OpenAI-compatible response. */
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

  throw new ApinexError("apinex returned an empty response.");
};

const readError = (payload: unknown, status: number): string => {
  const message = (payload as { error?: { message?: string } })?.error?.message;
  if (typeof message === "string" && message.trim()) return message;
  if (status === 401 || status === 403) return "apinex rejected the API key.";
  if (status === 429) return "apinex is rate limiting requests. Try again shortly.";
  return `apinex returned ${status}.`;
};

/**
 * Drops empty turns, keeps the last `MAX_HISTORY_TURNS` messages and guarantees
 * the list starts on a user message so we never open on a dangling assistant
 * turn (some providers reject that).
 */
const boundHistory = (messages: ApinexMessage[]): ApinexMessage[] => {
  const usable = messages
    .filter((message) => message.content.trim().length > 0)
    .slice(-MAX_HISTORY_TURNS);

  const firstUser = usable.findIndex((message) => message.role === "user");
  return firstUser <= 0 ? usable : usable.slice(firstUser);
};

const buildRequestBody = (options: Pick<StreamOptions, "messages" | "requestType">) => ({
  messages: [
    {
      role: "system",
      content: `${SYSTEM_PROMPT[options.requestType]}${CONVERSATION_RULES}`,
    },
    ...boundHistory(options.messages),
  ],
  stream: true,
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

const NON_STREAM_HINT =
  "Could not reach the apinex proxy. If you are running a production build, it has no proxy — use `npm run dev`.";

/**
 * Runs one streaming completion.
 *
 * `onDelta` receives progressively longer text for the assistant turn. The
 * returned promise resolves once the turn is complete, with the full text.
 */
export const streamCompletion = async ({
  messages,
  requestType,
  onDelta,
  signal,
}: StreamOptions): Promise<string> => {
  let response: Response;

  try {
    response = await fetch(APINEX_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify(buildRequestBody({ messages, requestType })),
      signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw new ApinexError(NON_STREAM_HINT);
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
    throw new ApinexError(readError(payload, response.status), response.status);
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
      throw new ApinexError(`apinex returned a non-JSON response (${response.status}).`);
    }
    const text = readChoice(payload);
    onDelta(text);
    return text;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  try {
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
          await reader.cancel().catch(() => undefined);
          return full.trim() ? full : throwEmpty();
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(data);
        } catch {
          continue;
        }

        const delta = readSseDelta(parsed);
        if (!delta) continue;
        full += delta;
        onDelta(full);
      }
    }

    // A stream that ends without [DONE] is still a valid partial answer.
    if (!full.trim()) throwEmpty();
    return full;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw error;
  } finally {
    reader.releaseLock?.();
  }
};

const throwEmpty = (): never => {
  throw new ApinexError("apinex returned an empty response.");
};

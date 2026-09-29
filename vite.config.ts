import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import type { IncomingMessage, ServerResponse } from "node:http";

/**
 * Dev-server proxy for the configured LLM providers.
 *
 * They all speak the OpenAI chat-completions dialect, so one upstream route
 * serves them all. The API key and model id for the provider named in the path
 * are read here, in the Node process, and attached to the upstream request.
 * None are prefixed with VITE_, so none can reach the client bundle: the browser
 * only ever learns a provider id.
 *
 * Adding a provider means appending to PROVIDER_IDS below and adding a matching
 * entry in src/lib/providers.ts.
 *
 * When this app is deployed somewhere with a real server, replace this plugin
 * with an equivalent serverless function; src/lib/llm.ts is the only client
 * file that needs to change.
 */
const LLM_PROXY_PREFIX = "/api/llm";

/** Non-streaming requests are given a longer ceiling than the client default. */
const UPSTREAM_TIMEOUT_MS = 180_000;

const PROVIDER_IDS = ["apinex", "atria", "mistral", "inception"] as const;

type ProviderId = (typeof PROVIDER_IDS)[number];

const ENV_PREFIX: Record<ProviderId, string> = {
  apinex: "APINEX",
  atria: "ATRIA",
  mistral: "MISTRAL",
  inception: "INCEPTION",
};

interface ProviderEntry {
  baseUrl: string;
  apiKey: string;
  model: string;
}

const isProviderId = (value: string): value is ProviderId =>
  (PROVIDER_IDS as readonly string[]).includes(value);

/**
 * Connect has no `:param` syntax — it only strips a string prefix and leaves the
 * rest on req.url — so the provider id is parsed out of the remainder here.
 */
const matchProvider = (url: string | undefined): string | null => {
  const match = /^\/([^/]+)\/chat\/completions/.exec(url ?? "");
  return match ? match[1] : null;
};

const readBody = (req: IncomingMessage): Promise<string> =>
  new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => resolve(raw));
    req.on("error", reject);
  });

const sendJson = (res: ServerResponse, status: number, body: unknown) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
};

const llmProxy = (providers: Record<ProviderId, ProviderEntry>): Plugin => ({
  name: "pulse-llm-proxy",
  configureServer(server) {
    server.middlewares.use(`${LLM_PROXY_PREFIX}/:provider/chat/completions`, async (req, res) => {
      const { provider } = (
        req as IncomingMessage & { params?: Record<string, string> }
      ).params ?? {};

      // Only the providers above are reachable. This must not become an open proxy.
      if (!provider || !isProviderId(provider)) {
        return sendJson(res, 404, {
          error: { message: `Unknown LLM provider: ${provider ?? "none"}` },
        });
      }

      if (req.method !== "POST") {
        return sendJson(res, 405, { error: { message: "Method not allowed" } });
      }

      const entry = providers[provider];
      const label = provider;

      if (!entry?.baseUrl) {
        return sendJson(res, 500, {
          error: {
            message: `${ENV_PREFIX[provider]}_BASE_URL is not set. Add it to .env and restart the dev server.`,
          },
        });
      }

      if (!entry.apiKey) {
        return sendJson(res, 500, {
          error: {
            message: `${ENV_PREFIX[provider]}_API_KEY is not set. Add it to .env and restart the dev server.`,
          },
        });
      }

      let payload: Record<string, unknown>;
      try {
        payload = JSON.parse((await readBody(req)) || "{}");
      } catch {
        return sendJson(res, 400, { error: { message: "Invalid JSON body" } });
      }

      // The client may pin a model, but the default comes from the server.
      payload.model = payload.model || entry.model;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

      try {
        const upstream = await fetch(`${entry.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${entry.apiKey}`,
            "Content-Type": "application/json",
            // Ask for SSE back so the browser can render tokens as they land.
            Accept: "text/event-stream",
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        const contentType = upstream.headers.get("Content-Type") ?? "";

        if (!upstream.ok) {
          const text = await upstream.text().catch(() => "");
          res.statusCode = upstream.status;
          res.setHeader("Content-Type", "application/json");
          res.end(
            text ||
              JSON.stringify({ error: { message: `${label} returned ${upstream.status}.` } })
          );
          return;
        }

        res.statusCode = upstream.status;
        res.setHeader("Content-Type", contentType || "application/json");
        // Streaming must not be buffered by compression middleware.
        res.setHeader("Cache-Control", "no-cache, no-transform");
        res.setHeader("X-Accel-Buffering", "no");

        if (!upstream.body) {
          res.end(await upstream.text().catch(() => ""));
          return;
        }

        // Pipe the SSE body through untouched so the client sees real deltas.
        const reader = upstream.body.getReader();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!res.write(Buffer.from(value))) {
            // Respect backpressure from the browser.
            await new Promise((resolve) => res.once("drain", resolve));
          }
        }
        res.end();
      } catch (error) {
        if (res.headersSent) {
          res.end();
          return;
        }
        const aborted = error instanceof Error && error.name === "AbortError";
        sendJson(res, aborted ? 504 : 502, {
          error: {
            message: aborted
              ? `${label} timed out after ${UPSTREAM_TIMEOUT_MS / 1000}s`
              : `Could not reach ${label}: ${
                  error instanceof Error ? error.message : "unknown error"
                }`,
          },
        });
      } finally {
        clearTimeout(timeout);
      }
    });
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const providers = Object.fromEntries(
    PROVIDER_IDS.map((id) => {
      const prefix = ENV_PREFIX[id];
      return [
        id,
        {
          baseUrl: (env[`${prefix}_BASE_URL`] || "").replace(/\/+$/, ""),
          apiKey: env[`${prefix}_API_KEY`] || "",
          model: env[`${prefix}_MODEL`] || "",
        },
      ];
    })
  ) as Record<ProviderId, ProviderEntry>;

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      llmProxy(providers),
    ].filter(Boolean) as Plugin[],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});

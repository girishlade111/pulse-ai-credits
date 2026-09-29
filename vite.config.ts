import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import type { IncomingMessage, ServerResponse } from "node:http";

/**
 * Dev-server proxy for the configured LLM providers.
 *
 * Every provider is OpenAI-compatible, so one upstream route serves them all.
 * The API keys and model ids are read here, in the Node process, and matched to
 * the provider named in the request path. None are prefixed with VITE_, so none
 * can reach the client bundle — the browser only ever learns a provider id.
 *
 * Adding a provider means appending to PROVIDER_ENV_KEYS below and adding a
 * matching entry in src/lib/providers.ts.
 *
 * When this app is deployed somewhere with a real server, replace this plugin
 * with an equivalent serverless function; src/lib/llm.ts is the only client
 * file that needs to change.
 */
const LLM_PROXY_PREFIX = "/api/llm";
const UPSTREAM_TIMEOUT_MS = 120_000;

/**
 * The proxy serves only these providers. Ids are the public contract shared with
 * src/lib/providers.ts — the leading underscore is stripped from each key so
 * both the config and the registry can be derived from this list.
 */
const PROVIDER_ENV_KEYS = ["apinex", "atria", "mistral", "inception"] as const;

type ProviderId = (typeof PROVIDER_ENV_KEYS)[number];

const UPPERCASE: Record<ProviderId, string> = {
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
  (PROVIDER_ENV_KEYS as readonly string[]).includes(value);

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
      const { provider } = (req as IncomingMessage & { params?: { provider?: string } }).params ?? {};

      // Only the providers above are reachable; this must not become an open proxy.
      if (!provider || !isProviderId(provider)) {
        return sendJson(res, 404, { error: { message: `Unknown LLM provider: ${provider ?? "none"}` } });
      }

      if (req.method !== "POST") {
        return sendJson(res, 405, { error: { message: "Method not allowed" } });
      }

      const entry = providers[provider];

      if (!entry?.apiKey) {
        return sendJson(res, 500, {
          error: {
            message: `${UPPERCASE[provider]}_API_KEY is not set. Add it to .env and restart the dev server.`,
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
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        const text = await upstream.text();
        res.statusCode = upstream.status;
        res.setHeader(
          "Content-Type",
          upstream.headers.get("Content-Type") ?? "application/json"
        );
        res.end(text);
      } catch (error) {
        const aborted = error instanceof Error && error.name === "AbortError";
        sendJson(res, aborted ? 504 : 502, {
          error: {
            message: aborted
              ? `${provider} timed out after ${UPSTREAM_TIMEOUT_MS / 1000}s`
              : `Could not reach ${provider}: ${
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
    PROVIDER_ENV_KEYS.map((id) => {
      const prefix = UPPERCASE[id];
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

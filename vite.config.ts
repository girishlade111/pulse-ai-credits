import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import type { IncomingMessage, ServerResponse } from "node:http";

/**
 * Dev-server proxy for apinex, the OpenAI-compatible LLM provider.
 *
 * The API key and the model id are read here, in the Node process, and attached
 * to the upstream request. Neither is prefixed with VITE_, so neither can reach
 * the client bundle — the browser only ever learns the same-origin path below.
 *
 * When this app is deployed somewhere with a real server, replace this plugin
 * with an equivalent serverless function and point the client at that instead;
 * `src/lib/apinex.ts` is the only file that needs to change.
 */
const APINEX_PROXY_PREFIX = "/api/apinex";
const UPSTREAM_TIMEOUT_MS = 120_000;

interface ApinexOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
}

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

const apinexProxy = (options: ApinexOptions): Plugin => ({
  name: "pulse-apinex-proxy",
  configureServer(server) {
    server.middlewares.use(APINEX_PROXY_PREFIX, async (req, res) => {
      // Only the completions route is exposed; this must not become an open proxy.
      if (!req.url?.startsWith("/chat/completions")) {
        return sendJson(res, 404, { error: { message: "Unknown apinex route" } });
      }

      if (req.method !== "POST") {
        return sendJson(res, 405, { error: { message: "Method not allowed" } });
      }

      if (!options.apiKey) {
        return sendJson(res, 500, {
          error: { message: "APINEX_API_KEY is not set. Add it to .env and restart the dev server." },
        });
      }

      let payload: Record<string, unknown>;
      try {
        payload = JSON.parse((await readBody(req)) || "{}");
      } catch {
        return sendJson(res, 400, { error: { message: "Invalid JSON body" } });
      }

      // The client may pin a model, but the default comes from the server.
      payload.model = payload.model || options.model;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

      try {
        const upstream = await fetch(`${options.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${options.apiKey}`,
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
              ? `apinex request timed out after ${UPSTREAM_TIMEOUT_MS / 1000}s`
              : `Could not reach apinex: ${
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

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      apinexProxy({
        baseUrl: (env.APINEX_BASE_URL || "https://api.apinex.bond/v1").replace(/\/+$/, ""),
        apiKey: env.APINEX_API_KEY || "",
        model: env.APINEX_MODEL || "",
      }),
    ].filter(Boolean) as Plugin[],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});

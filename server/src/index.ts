import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express, { type Express, type RequestHandler } from "express";
import { pathToFileURL } from "node:url";
import { mountOAuth, oauthConfigFromEnv, requireBearer, requireBearerOrPin, type OAuthConfig } from "./auth/oauth.js";
import { createNarrator, type Narrator } from "./domain/narrator.js";
import { buildServer } from "./server.js";
import { createStore, type StateStore } from "./state/index.js";
import { CAPTURE_HTML } from "./web/capture.js";
import { HOME_HTML } from "./web/home.js";
import { swingUploadHandler } from "./web/swings.js";

export interface AppDeps {
  store: StateStore;
  narrator: Narrator;
  today?: () => string;
  /** When set, /mcp requires an OAuth access token. Unset = local dev, identity from `x-user-id`. */
  oauth?: OAuthConfig;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

/**
 * Streamable HTTP MCP endpoint (spec 2025-11-25) plus the swing capture page.
 * Each MCP request gets a fresh server + transport; durable state lives in the StateStore.
 *
 * User identity: with `deps.oauth` it is the `sub` of the validated access token; without it (local
 * development) it comes from the `x-user-id` header.
 */
export function createApp(deps: AppDeps): Express {
  const today = deps.today ?? todayISO;
  const app = express();
  app.use(express.json({ limit: "2mb" }));

  const devUser: RequestHandler = (req, res, next) => {
    res.locals.userId = req.header("x-user-id") ?? "demo-user";
    next();
  };
  if (deps.oauth) mountOAuth(app, deps.oauth);
  const mcpAuth = deps.oauth ? requireBearer(deps.oauth) : devUser;
  const swingAuth = deps.oauth ? requireBearerOrPin(deps.oauth) : devUser;

  app.get("/", (_req, res) => {
    res.type("html").send(HOME_HTML);
  });

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/capture", (_req, res) => {
    res.type("html").send(CAPTURE_HTML);
  });

  app.post("/api/swings", swingAuth, swingUploadHandler(deps.store, today));

  app.post("/mcp", mcpAuth, async (req, res) => {
    const userId = res.locals.userId as string;
    const server = buildServer({ store: deps.store, narrator: deps.narrator, userId, today });
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => {
      void transport.close();
      void server.close();
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      console.error("MCP request failed", err);
      if (!res.headersSent) {
        res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null });
      }
    }
  });

  const methodNotAllowed = (_req: express.Request, res: express.Response) => {
    res.status(405).json({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed. Use POST /mcp." }, id: null });
  };
  app.get("/mcp", methodNotAllowed);
  app.delete("/mcp", methodNotAllowed);

  return app;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT ?? 3000);
  createApp({ store: createStore(), narrator: createNarrator(), oauth: oauthConfigFromEnv() }).listen(port, () => {
    console.log(`Caddie Coach MCP server: http://localhost:${port}/mcp`);
    console.log(`Swing capture page:     http://localhost:${port}/capture`);
  });
}

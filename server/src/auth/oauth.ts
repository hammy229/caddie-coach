import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import express, { type Express, type Request, type RequestHandler, type Response } from "express";

/**
 * Self-contained OAuth 2.1 authorization server + resource-server checks for the Alexa+ add-on:
 * authorization_code with PKCE (S256), refresh tokens, RFC 9728 protected-resource metadata and
 * RFC 8414 server metadata. Codes and tokens are HMAC-signed and stateless, so it needs no storage
 * and works unchanged on Lambda.
 *
 * Accounts: a golfer links with a name and a PIN. The user id is an HMAC of both, so the same pair
 * always reaches the same data and the PIN is never stored.
 */
export interface OAuthConfig {
  secret: string;
  clientId: string;
  clientSecret: string;
  redirectUris: string[];
  /** Public https origin of this server. Derived from the request when unset. */
  baseUrl?: string;
}

const ACCESS_TTL_S = 3600;
const REFRESH_TTL_S = 30 * 24 * 3600;
const CODE_TTL_S = 300;
const MIN_PIN_LENGTH = 6;

type TokenType = "access" | "refresh" | "code";
interface TokenPayload {
  typ: TokenType;
  sub: string;
  exp: number;
  cid: string;
  cc?: string;
  ru?: string;
}

export function oauthConfigFromEnv(env: NodeJS.ProcessEnv = process.env): OAuthConfig | undefined {
  const secret = env.OAUTH_SIGNING_SECRET;
  if (!secret) return undefined;
  const clientSecret = env.OAUTH_CLIENT_SECRET;
  if (!clientSecret) throw new Error("OAUTH_CLIENT_SECRET is required when OAUTH_SIGNING_SECRET is set");
  return {
    secret,
    clientId: env.OAUTH_CLIENT_ID ?? "alexa-plus",
    clientSecret,
    redirectUris: (env.OAUTH_REDIRECT_URIS ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    baseUrl: env.PUBLIC_BASE_URL?.replace(/\/$/, ""),
  };
}

const b64 = (b: Buffer | string) => Buffer.from(b).toString("base64url");
const hmac = (secret: string, data: string) => createHmac("sha256", secret).update(data).digest();

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

function sign(cfg: OAuthConfig, payload: Omit<TokenPayload, "exp">, ttlS: number): string {
  const body = b64(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + ttlS }));
  return `${body}.${b64(hmac(cfg.secret, body))}`;
}

function verify(cfg: OAuthConfig, token: string, typ: TokenType): TokenPayload | undefined {
  const [body, sig] = token.split(".");
  if (!body || !sig || !safeEqual(sig, b64(hmac(cfg.secret, body)))) return undefined;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as TokenPayload;
    return p.typ === typ && p.exp > Math.floor(Date.now() / 1000) ? p : undefined;
  } catch {
    return undefined;
  }
}

/** Stable user id for a name + PIN pair. */
export function golferId(cfg: OAuthConfig, name: string, pin: string): string {
  return `g_${hmac(cfg.secret, `${name.trim().toLowerCase()}\n${pin}`).toString("hex").slice(0, 32)}`;
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function baseUrl(cfg: OAuthConfig, req: Request): string {
  if (cfg.baseUrl) return cfg.baseUrl;
  const proto = req.header("x-forwarded-proto")?.split(",")[0] ?? req.protocol;
  return `${proto}://${req.header("x-forwarded-host") ?? req.get("host")}`;
}

function bearer(req: Request): string | undefined {
  const m = /^Bearer (.+)$/i.exec(req.header("authorization") ?? "");
  return m?.[1];
}

/** Requires a valid access token and exposes its `sub` as res.locals.userId. */
export function requireBearer(cfg: OAuthConfig): RequestHandler {
  return (req, res, next) => {
    const token = bearer(req);
    const p = token ? verify(cfg, token, "access") : undefined;
    if (!p) {
      // Alexa+ expects a bare 401 (no WWW-Authenticate) for unauthenticated requests.
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    res.locals.userId = p.sub;
    next();
  };
}

/** Phone capture page: accepts a Bearer token, or the golfer's name + PIN headers. */
export function requireBearerOrPin(cfg: OAuthConfig): RequestHandler {
  const strict = requireBearer(cfg);
  return (req, res, next) => {
    const name = req.header("x-golfer-name");
    const pin = req.header("x-golfer-pin");
    if (!bearer(req) && name && pin && pin.length >= MIN_PIN_LENGTH) {
      res.locals.userId = golferId(cfg, name, pin);
      next();
      return;
    }
    strict(req, res, next);
  };
}

interface AuthorizeParams {
  client_id: string;
  redirect_uri: string;
  response_type: string;
  code_challenge: string;
  code_challenge_method: string;
  state: string;
}

const PARAM_KEYS = ["client_id", "redirect_uri", "response_type", "code_challenge", "code_challenge_method", "state"] as const;

function readParams(src: Record<string, unknown>): AuthorizeParams {
  const out = {} as Record<string, string>;
  for (const k of PARAM_KEYS) out[k] = typeof src[k] === "string" ? (src[k] as string) : "";
  return out as unknown as AuthorizeParams;
}

function page(title: string, inner: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0e1a14;color:#e8f1ec;font:16px/1.5 system-ui,sans-serif}
main{width:min(92vw,380px);padding:28px;border:1px solid #28402f;border-radius:16px;background:#13241b}h1{margin:0 0 6px;font-size:22px}
p{color:#9db8a8;margin:0 0 18px}label{display:block;font-size:13px;margin:12px 0 4px;color:#9db8a8}
input{width:100%;box-sizing:border-box;padding:11px 12px;border-radius:10px;border:1px solid #28402f;background:#0e1a14;color:inherit;font:inherit}
button{width:100%;margin-top:20px;padding:12px;border:0;border-radius:10px;background:#7fd3a0;color:#0e1a14;font-weight:600;font:inherit;cursor:pointer}
.err{color:#ff9d8f;font-size:14px;margin-top:12px}</style></head><body><main>${inner}</main></body></html>`;
}

function consentPage(p: AuthorizeParams, error?: string): string {
  const hidden = PARAM_KEYS.map((k) => `<input type="hidden" name="${k}" value="${esc(p[k])}">`).join("");
  return page(
    "Link Caddie Coach",
    `<h1>Link Caddie Coach</h1><p>Choose a name and PIN. The same pair always reaches your shots, swings and rounds.</p>
<form method="post" action="/authorize">${hidden}
<label for="name">Your name</label><input id="name" name="name" autocomplete="username" required maxlength="60">
<label for="pin">PIN (at least ${MIN_PIN_LENGTH} characters)</label><input id="pin" name="pin" type="password" autocomplete="current-password" required minlength="${MIN_PIN_LENGTH}" maxlength="64">
<button type="submit">Link account</button>${error ? `<div class="err">${esc(error)}</div>` : ""}</form>`,
  );
}

/** Validates the client and redirect URI. These errors must never redirect. */
function checkClient(cfg: OAuthConfig, p: AuthorizeParams): string | undefined {
  if (!safeEqual(p.client_id, cfg.clientId)) return "Unknown client.";
  if (!cfg.redirectUris.includes(p.redirect_uri)) return "Redirect URI is not allowed.";
  return undefined;
}

function redirectWith(res: Response, uri: string, params: Record<string, string>) {
  const u = new URL(uri);
  for (const [k, v] of Object.entries(params)) if (v) u.searchParams.set(k, v);
  res.redirect(302, u.toString());
}

function tokenError(res: Response, status: number, error: string, description?: string) {
  res.status(status).set("Cache-Control", "no-store").json({ error, error_description: description });
}

function clientCredentials(req: Request): { id: string; secret: string } {
  const basic = /^Basic (.+)$/i.exec(req.header("authorization") ?? "");
  if (basic) {
    const [id = "", ...rest] = Buffer.from(basic[1]!, "base64").toString("utf8").split(":");
    return { id: decodeURIComponent(id), secret: decodeURIComponent(rest.join(":")) };
  }
  return { id: String(req.body?.client_id ?? ""), secret: String(req.body?.client_secret ?? "") };
}

function issueTokens(cfg: OAuthConfig, sub: string) {
  return {
    access_token: sign(cfg, { typ: "access", sub, cid: cfg.clientId }, ACCESS_TTL_S),
    token_type: "Bearer",
    expires_in: ACCESS_TTL_S,
    refresh_token: sign(cfg, { typ: "refresh", sub, cid: cfg.clientId }, REFRESH_TTL_S),
  };
}

export function mountOAuth(app: Express, cfg: OAuthConfig): void {
  app.use(express.urlencoded({ extended: false }));

  const protectedResource: RequestHandler = (req, res) => {
    const base = baseUrl(cfg, req);
    res.json({ resource: `${base}/mcp`, authorization_servers: [base], bearer_methods_supported: ["header"] });
  };
  app.get("/.well-known/oauth-protected-resource", protectedResource);
  app.get("/.well-known/oauth-protected-resource/mcp", protectedResource);

  app.get("/.well-known/oauth-authorization-server", (req, res) => {
    const base = baseUrl(cfg, req);
    res.json({
      issuer: base,
      authorization_endpoint: `${base}/authorize`,
      token_endpoint: `${base}/token`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["client_secret_post", "client_secret_basic"],
    });
  });

  app.get("/authorize", (req, res) => {
    const p = readParams(req.query);
    const bad = checkClient(cfg, p);
    if (bad) {
      res.status(400).type("html").send(page("Cannot link", `<h1>Cannot link</h1><p>${esc(bad)}</p>`));
      return;
    }
    if (p.response_type !== "code" || p.code_challenge_method !== "S256" || !p.code_challenge) {
      redirectWith(res, p.redirect_uri, { error: "invalid_request", error_description: "code response with S256 PKCE required", state: p.state });
      return;
    }
    res.type("html").send(consentPage(p));
  });

  app.post("/authorize", (req, res) => {
    const p = readParams(req.body ?? {});
    const bad = checkClient(cfg, p);
    if (bad) {
      res.status(400).type("html").send(page("Cannot link", `<h1>Cannot link</h1><p>${esc(bad)}</p>`));
      return;
    }
    if (p.response_type !== "code" || p.code_challenge_method !== "S256" || !p.code_challenge) {
      redirectWith(res, p.redirect_uri, { error: "invalid_request", state: p.state });
      return;
    }
    const name = String(req.body?.name ?? "").trim();
    const pin = String(req.body?.pin ?? "");
    if (!name || pin.length < MIN_PIN_LENGTH) {
      res.status(400).type("html").send(consentPage(p, `Enter a name and a PIN of at least ${MIN_PIN_LENGTH} characters.`));
      return;
    }
    const code = sign(cfg, { typ: "code", sub: golferId(cfg, name, pin), cid: p.client_id, cc: p.code_challenge, ru: p.redirect_uri }, CODE_TTL_S);
    redirectWith(res, p.redirect_uri, { code, state: p.state });
  });

  app.post("/token", (req, res) => {
    const creds = clientCredentials(req);
    if (!safeEqual(creds.id, cfg.clientId) || !safeEqual(creds.secret, cfg.clientSecret)) {
      tokenError(res, 401, "invalid_client");
      return;
    }
    const grant = String(req.body?.grant_type ?? "");
    if (grant === "authorization_code") {
      const code = verify(cfg, String(req.body?.code ?? ""), "code");
      if (!code || code.cid !== cfg.clientId || code.ru !== String(req.body?.redirect_uri ?? "")) {
        tokenError(res, 400, "invalid_grant");
        return;
      }
      const verifier = String(req.body?.code_verifier ?? "");
      const challenge = createHash("sha256").update(verifier).digest("base64url");
      if (!verifier || !code.cc || !safeEqual(challenge, code.cc)) {
        tokenError(res, 400, "invalid_grant", "PKCE verification failed");
        return;
      }
      res.set("Cache-Control", "no-store").json(issueTokens(cfg, code.sub));
      return;
    }
    if (grant === "refresh_token") {
      const refresh = verify(cfg, String(req.body?.refresh_token ?? ""), "refresh");
      if (!refresh || refresh.cid !== cfg.clientId) {
        tokenError(res, 400, "invalid_grant");
        return;
      }
      res.set("Cache-Control", "no-store").json(issueTokens(cfg, refresh.sub));
      return;
    }
    tokenError(res, 400, "unsupported_grant_type");
  });
}

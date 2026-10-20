import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createHash } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type OAuthConfig, oauthConfigFromEnv } from "../src/auth/oauth.js";
import { TemplateNarrator } from "../src/domain/narrator.js";
import { assertSafeAuth, createApp } from "../src/index.js";
import { MemoryStore } from "../src/state/store.js";
import { syntheticSwing } from "./fixtures.js";

const REDIRECT = "https://pitangui.amazon.com/api/skill/link/TEST";
const cfg: OAuthConfig = {
  secret: "test-signing-secret",
  clientId: "alexa-plus",
  clientSecret: "test-client-secret",
  redirectUris: [REDIRECT],
};

let httpServer: Server;
let base: string;

beforeAll(async () => {
  const app = createApp({ store: new MemoryStore(), narrator: new TemplateNarrator(), today: () => "2026-10-20", oauth: cfg });
  httpServer = app.listen(0);
  await new Promise((r) => httpServer.once("listening", r));
  base = `http://127.0.0.1:${(httpServer.address() as AddressInfo).port}`;
});

afterAll(() => {
  httpServer.close();
});

const verifier = "v".repeat(64);
const challenge = createHash("sha256").update(verifier).digest("base64url");

const authorizeBody = (over: Record<string, string> = {}) =>
  new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: REDIRECT,
    response_type: "code",
    code_challenge: challenge,
    code_challenge_method: "S256",
    state: "xyz",
    name: "Sam Golfer",
    pin: "123456",
    ...over,
  });

async function getCode(over: Record<string, string> = {}): Promise<string> {
  const res = await fetch(`${base}/authorize`, { method: "POST", body: authorizeBody(over), redirect: "manual" });
  expect(res.status).toBe(302);
  const loc = new URL(res.headers.get("location")!);
  expect(loc.searchParams.get("state")).toBe("xyz");
  return loc.searchParams.get("code")!;
}

const tokenReq = (params: Record<string, string>, secret = cfg.clientSecret) =>
  fetch(`${base}/token`, {
    method: "POST",
    body: new URLSearchParams({ client_id: cfg.clientId, client_secret: secret, ...params }),
  });

async function accessToken(name = "Sam Golfer", pin = "123456"): Promise<string> {
  const code = await getCode({ name, pin });
  const res = await tokenReq({ grant_type: "authorization_code", code, redirect_uri: REDIRECT, code_verifier: verifier });
  return ((await res.json()) as { access_token: string }).access_token;
}

describe("discovery", () => {
  it("rejects unauthenticated MCP calls with a bare 401", async () => {
    const res = await fetch(`${base}/mcp`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toBeNull();
  });

  it("publishes protected-resource metadata at both well-known paths", async () => {
    for (const path of ["/.well-known/oauth-protected-resource", "/.well-known/oauth-protected-resource/mcp"]) {
      const meta = (await (await fetch(`${base}${path}`)).json()) as { resource: string; authorization_servers: string[] };
      expect(meta.resource).toBe(`${base}/mcp`);
      expect(meta.authorization_servers).toEqual([base]);
    }
  });

  it("publishes server metadata that requires S256 PKCE", async () => {
    const meta = (await (await fetch(`${base}/.well-known/oauth-authorization-server`)).json()) as Record<string, unknown>;
    expect(meta.code_challenge_methods_supported).toEqual(["S256"]);
    expect(meta.token_endpoint).toBe(`${base}/token`);
    expect(meta.authorization_endpoint).toBe(`${base}/authorize`);
  });
});

describe("authorization_code + PKCE", () => {
  it("serves the account-link page for a valid request", async () => {
    const q = authorizeBody();
    q.delete("name");
    q.delete("pin");
    const res = await fetch(`${base}/authorize?${q}`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("Link Caddie Coach");
  });

  it("never redirects to an unlisted redirect_uri", async () => {
    const res = await fetch(`${base}/authorize`, {
      method: "POST",
      body: authorizeBody({ redirect_uri: "https://evil.example/cb" }),
      redirect: "manual",
    });
    expect(res.status).toBe(400);
    expect(res.headers.get("location")).toBeNull();
  });

  it("re-renders the form for a short PIN instead of issuing a code", async () => {
    const res = await fetch(`${base}/authorize`, { method: "POST", body: authorizeBody({ pin: "123" }), redirect: "manual" });
    expect(res.status).toBe(400);
    expect(res.headers.get("location")).toBeNull();
  });

  it("exchanges a code for tokens and refreshes them", async () => {
    const code = await getCode();
    const res = await tokenReq({ grant_type: "authorization_code", code, redirect_uri: REDIRECT, code_verifier: verifier });
    expect(res.status).toBe(200);
    const t = (await res.json()) as { access_token: string; refresh_token: string; token_type: string; expires_in: number };
    expect(t.token_type).toBe("Bearer");
    expect(t.expires_in).toBe(3600);

    const again = await tokenReq({ grant_type: "refresh_token", refresh_token: t.refresh_token });
    expect(again.status).toBe(200);
    expect(((await again.json()) as { access_token: string }).access_token).toBeTruthy();
  });

  it("rejects a wrong PKCE verifier", async () => {
    const code = await getCode();
    const res = await tokenReq({ grant_type: "authorization_code", code, redirect_uri: REDIRECT, code_verifier: "w".repeat(64) });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toBe("invalid_grant");
  });

  it("rejects a mismatched redirect_uri at the token endpoint", async () => {
    const code = await getCode();
    const res = await tokenReq({ grant_type: "authorization_code", code, redirect_uri: "https://evil.example/cb", code_verifier: verifier });
    expect(res.status).toBe(400);
  });

  it("rejects a wrong client secret", async () => {
    const code = await getCode();
    const res = await tokenReq({ grant_type: "authorization_code", code, redirect_uri: REDIRECT, code_verifier: verifier }, "nope");
    expect(res.status).toBe(401);
  });

  it("does not accept an access token as a refresh token", async () => {
    const access = await accessToken();
    const res = await tokenReq({ grant_type: "refresh_token", refresh_token: access });
    expect(res.status).toBe(400);
  });
});

describe("authenticated MCP", () => {
  const connect = async (token: string) => {
    const client = new Client({ name: "oauth-test", version: "0.0.0" });
    await client.connect(
      new StreamableHTTPClientTransport(new URL(`${base}/mcp`), { requestInit: { headers: { Authorization: `Bearer ${token}` } } }),
    );
    return client;
  };

  it("lists tools with a valid token", async () => {
    const c = await connect(await accessToken());
    expect((await c.listTools()).tools).toHaveLength(10);
    await c.close();
  });

  it("rejects a tampered token", async () => {
    const token = await accessToken();
    const res = await fetch(`${base}/mcp`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token.slice(0, -2)}xx` },
      body: "{}",
    });
    expect(res.status).toBe(401);
  });

  it("keeps each golfer's data separate and the same pair reaches the same data", async () => {
    const profile = async (name: string, pin: string) => {
      const c = await connect(await accessToken(name, pin));
      const r = (await c.callTool({ name: "get_game_profile", arguments: {} })) as { content: { text: string }[] };
      await c.close();
      return r.content.map((x) => x.text).join(" ");
    };
    const ann = await connect(await accessToken("Ann", "annpin1"));
    await ann.callTool({ name: "start_round", arguments: { course: "Butler Park" } });
    for (const club of ["7i", "7i", "7i"]) {
      await ann.callTool({ name: "log_shot", arguments: { club, target_yards: 150, distance_miss_yards: -10 } });
    }
    await ann.close();
    const annAgain = await profile("Ann", "annpin1");
    expect(annAgain).toBe(await profile("Ann", "annpin1"));
    expect(await profile("Bob", "bobpin1")).not.toBe(annAgain);
  });
});

describe("swing uploads under OAuth", () => {
  const upload = (headers: Record<string, string>) =>
    fetch(`${base}/api/swings`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ frames: syntheticSwing({}), club: "driver" }),
    });

  it("rejects anonymous uploads", async () => {
    expect((await upload({})).status).toBe(401);
  });

  it("rejects the dev x-user-id header", async () => {
    expect((await upload({ "x-user-id": "someone" })).status).toBe(401);
  });

  it("accepts a bearer token", async () => {
    expect((await upload({ Authorization: `Bearer ${await accessToken()}` })).status).toBe(201);
  });

  it("accepts the golfer's name and PIN, and rejects a short PIN", async () => {
    expect((await upload({ "x-golfer-name": "Sam Golfer", "x-golfer-pin": "123456" })).status).toBe(201);
    expect((await upload({ "x-golfer-name": "Sam Golfer", "x-golfer-pin": "123" })).status).toBe(401);
  });
});

describe("simulated host under OAuth", () => {
  it("is not served, since it identifies golfers by header", async () => {
    expect((await fetch(`${base}/alexa`)).status).toBe(404);
    expect((await fetch(`${base}/api/intent`, { method: "POST" })).status).toBe(404);
  });
});

describe("config", () => {
  it("is disabled without a signing secret", () => {
    expect(oauthConfigFromEnv({})).toBeUndefined();
  });

  it("requires a client secret once enabled", () => {
    expect(() => oauthConfigFromEnv({ OAUTH_SIGNING_SECRET: "s" })).toThrow(/OAUTH_CLIENT_SECRET/);
  });

  it("parses redirect URIs and trims the base URL", () => {
    const c = oauthConfigFromEnv({
      OAUTH_SIGNING_SECRET: "s",
      OAUTH_CLIENT_SECRET: "c",
      OAUTH_REDIRECT_URIS: "https://a.example/cb, https://b.example/cb",
      PUBLIC_BASE_URL: "https://x.example/",
    })!;
    expect(c.redirectUris).toEqual(["https://a.example/cb", "https://b.example/cb"]);
    expect(c.baseUrl).toBe("https://x.example");
    expect(c.clientId).toBe("alexa-plus");
  });
});

describe("assertSafeAuth", () => {
  it("allows local development without OAuth", () => {
    expect(() => assertSafeAuth(undefined, {})).not.toThrow();
  });

  it("refuses to run without OAuth on Lambda or in production", () => {
    expect(() => assertSafeAuth(undefined, { AWS_LAMBDA_FUNCTION_NAME: "caddie" })).toThrow(/Refusing to start/);
    expect(() => assertSafeAuth(undefined, { NODE_ENV: "production" })).toThrow(/Refusing to start/);
  });

  it("allows deploys with OAuth, or with the explicit override", () => {
    expect(() => assertSafeAuth(cfg, { AWS_LAMBDA_FUNCTION_NAME: "caddie" })).not.toThrow();
    expect(() => assertSafeAuth(undefined, { NODE_ENV: "production", ALLOW_INSECURE_DEV_AUTH: "1" })).not.toThrow();
  });
});

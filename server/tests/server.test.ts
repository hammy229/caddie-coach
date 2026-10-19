import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { TemplateNarrator } from "../src/domain/narrator.js";
import { createApp } from "../src/index.js";
import { MemoryStore } from "../src/state/store.js";
import { syntheticSwing } from "./fixtures.js";

let httpServer: Server;
let baseUrl: string;

async function connect(userId: string): Promise<Client> {
  const client = new Client({ name: "contract-test", version: "0.0.0" });
  await client.connect(
    new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`), {
      requestInit: { headers: { "x-user-id": userId } },
    }),
  );
  return client;
}

const text = (r: unknown) =>
  (r as { content: { text: string }[] }).content.map((c) => c.text).join(" ");

async function uploadSwing(userId: string, opts: Parameters<typeof syntheticSwing>[0] = {}) {
  return fetch(`${baseUrl}/api/swings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-user-id": userId },
    body: JSON.stringify({ frames: syntheticSwing(opts), club: "driver" }),
  });
}

beforeAll(async () => {
  const app = createApp({ store: new MemoryStore(), narrator: new TemplateNarrator(), today: () => "2026-10-14" });
  httpServer = app.listen(0);
  await new Promise((r) => httpServer.once("listening", r));
  baseUrl = `http://127.0.0.1:${(httpServer.address() as AddressInfo).port}`;
});

afterAll(() => {
  httpServer.close();
});

describe("MCP endpoint over Streamable HTTP", () => {
  it("lists all ten tools with descriptions", async () => {
    const c = await connect("u0");
    const { tools } = await c.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      "analyze_swing",
      "end_round",
      "get_game_profile",
      "log_putt",
      "log_shot",
      "plan_hole",
      "practice_plan",
      "recommend_club",
      "set_risk_tolerance",
      "start_round",
    ]);
    for (const t of tools) expect(t.description!.length).toBeGreaterThan(40);
    await c.close();
  });

  it("links both MCP App cards and serves them", async () => {
    const c = await connect("u0");
    const { tools } = await c.listTools();
    const uri = (name: string) =>
      (tools.find((t) => t.name === name)?._meta as { ui?: { resourceUri?: string } })?.ui?.resourceUri;
    expect(uri("end_round")).toBe("ui://caddie-coach/round-report");
    expect(uri("analyze_swing")).toBe("ui://caddie-coach/swing");
    const res = await c.readResource({ uri: "ui://caddie-coach/round-report" });
    expect(res.contents[0]?.mimeType).toBe("text/html;profile=mcp-app");
    await c.close();
  });

  it("raises a pattern insight unprompted while logging shots", async () => {
    const c = await connect("golfer");
    await c.callTool({ name: "start_round", arguments: { course: "Butler Park", risk_tolerance: "aggressive" } });
    await c.callTool({ name: "log_shot", arguments: { club: "7i", target_yards: 150, distance_miss_yards: -10 } });
    await c.callTool({ name: "log_shot", arguments: { club: "8i", target_yards: 140, distance_miss_yards: -12 } });
    const third = await c.callTool({ name: "log_shot", arguments: { club: "9i", target_yards: 130, distance_miss_yards: -9 } });
    expect(text(third)).toContain("last 3 approach shots came up short");
    expect((third.structuredContent as { insights: unknown[] }).insights).toHaveLength(1);
    await c.close();
  });

  it("gives caddie advice using the player's logged shots and risk", async () => {
    const c = await connect("golfer");
    const rec = await c.callTool({
      name: "recommend_club",
      arguments: { distance_yards: 150, wind: "head", wind_mph: 10 },
    });
    const s = rec.structuredContent as { club: string; playsLikeYards: number; risk: string };
    expect(s.playsLikeYards).toBe(165);
    expect(s.risk).toBe("aggressive");
    expect(text(rec)).toMatch(/^Hit /);
    await c.close();
  });

  it("logs a holed putt and reports putting strokes gained", async () => {
    const c = await connect("putter");
    await c.callTool({ name: "start_round", arguments: { course: "Butler Park" } });
    const res = await c.callTool({ name: "log_putt", arguments: { distance_feet: 20, holed: true } });
    const sg = (res.structuredContent as { strokesGained: number }).strokesGained;
    expect(sg).toBeGreaterThan(0);
    expect(text(res)).toContain("in the hole");
    await c.close();
  });

  it("plans a hole with a tee shot and an approach", async () => {
    const c = await connect("u0");
    const res = await c.callTool({ name: "plan_hole", arguments: { par: 4, hole_yards: 410 } });
    const plan = (res.structuredContent as { plan: { shots: { club: string }[] } }).plan;
    expect(plan.shots).toHaveLength(2);
    expect(plan.shots[0]?.club).toBe("driver");
    expect(text(res)).toContain("Par 4, 410 yards");
    await c.close();
  });

  it("builds a practice plan from the player's recurring swing faults", async () => {
    for (let i = 0; i < 3; i++) expect((await uploadSwing("coachme", { overTheTop: true })).status).toBe(201);
    const c = await connect("coachme");
    const res = await c.callTool({ name: "practice_plan", arguments: { minutes: 30 } });
    const plan = (res.structuredContent as { plan: { totalMinutes: number; drills: { name: string }[] } }).plan;
    expect(plan.totalMinutes).toBeLessThanOrEqual(30);
    expect(plan.drills[0]?.name).toBe("Headcover gate");
    await c.close();
  });

  it("coaches an uploaded swing and references the player's history", async () => {
    for (let i = 0; i < 3; i++) expect((await uploadSwing("golfer", { overTheTop: true })).status).toBe(201);
    const c = await connect("golfer");
    const res = await c.callTool({ name: "analyze_swing", arguments: {} });
    expect(text(res)).toContain("moved out toward the ball");
    expect(text(res)).toContain("3 swings in a row coming over the top");
    await c.close();
  });

  it("rejects malformed swing uploads", async () => {
    const bad = await fetch(`${baseUrl}/api/swings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ frames: [] }),
    });
    expect(bad.status).toBe(400);
  });

  it("ends the round with a report, and a fresh session still knows the player", async () => {
    const c = await connect("golfer");
    const end = await c.callTool({ name: "end_round", arguments: { strokes: 88 } });
    const report = (end.structuredContent as { report: { approaches: number; dominantMiss: string; swingFaults: string[] } }).report;
    expect(report.approaches).toBe(3);
    expect(report.dominantMiss).toBe("short");
    expect(report.swingFaults).toContain("over_the_top");
    await c.close();

    const later = await connect("golfer");
    const profile = await later.callTool({ name: "get_game_profile", arguments: {} });
    expect(text(profile)).toContain("1 round tracked, playing it aggressive");
    expect(text(profile)).toContain("coming over the top, in 3 of 3 swings");
    await later.close();
  });

  it("keeps players isolated", async () => {
    const c = await connect("someone-else");
    const res = await c.callTool({ name: "analyze_swing", arguments: {} });
    expect(res.isError).toBe(true);
    await c.close();
  });

  it("serves the capture page", async () => {
    const res = await fetch(`${baseUrl}/capture`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("PoseLandmarker");
  });
});

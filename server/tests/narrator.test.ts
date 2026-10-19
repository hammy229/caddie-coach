import { describe, expect, it } from "vitest";
import { BedrockNarrator, createNarrator, TemplateNarrator } from "../src/domain/narrator.js";
import { buildRoundReport, templateRecap } from "../src/domain/report.js";
import type { Round, UserState } from "../src/domain/types.js";

const round: Round = { id: "r1", course: "Test", date: "2026-10-17", risk: "normal", ended: true };
const state: UserState = { risk: "normal", activeRoundId: null, rounds: [round], putts: [], swings: [], shots: [] };
const report = buildRoundReport(state, round);

// Minimal Bedrock client stub: resolves whatever `send` returns.
const client = (send: () => Promise<unknown>) => ({ send }) as never;
const reply = (text: string) => ({ output: { message: { content: [{ text }] } } });

describe("createNarrator", () => {
  it("uses the template narrator when no Bedrock model is configured", () => {
    expect(createNarrator({})).toBeInstanceOf(TemplateNarrator);
  });

  it("uses Bedrock when a model id is set", () => {
    expect(createNarrator({ BEDROCK_MODEL_ID: "anthropic.claude" })).toBeInstanceOf(BedrockNarrator);
  });
});

describe("BedrockNarrator fallback", () => {
  it("falls back to the template when the model returns only whitespace", async () => {
    const n = new BedrockNarrator("m", client(async () => reply("   ")));
    expect(await n.recap(report)).toBe(templateRecap(report));
  });

  it("falls back to the template when the response has no text content", async () => {
    const n = new BedrockNarrator("m", client(async () => ({})));
    expect(await n.recap(report)).toBe(templateRecap(report));
  });

  it("trims surrounding whitespace from the model's recap", async () => {
    const n = new BedrockNarrator("m", client(async () => reply("  Solid round.  ")));
    expect(await n.recap(report)).toBe("Solid round.");
  });
});

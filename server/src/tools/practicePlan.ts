import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { buildPracticePlan } from "../domain/drills.js";
import { PRACTICE_UI_URI, result, type ToolContext } from "./context.js";

export function registerPracticePlan(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    "practice_plan",
    {
      title: "Build a practice plan",
      description:
        "Build a focused range or short-game practice session from what the caddie has learned: recurring swing faults, " +
        "the part of the game losing the most strokes, and any one-sided miss. " +
        "Use for 'what should I work on', 'build me a practice plan', 'I've got 30 minutes at the range'. Shows a practice card.",
      inputSchema: {
        minutes: z.number().int().min(10).max(180).default(45).describe("How long the golfer has to practice"),
      },
      _meta: { ui: { resourceUri: PRACTICE_UI_URI } },
    },
    async ({ minutes }) => {
      const state = await ctx.store.load(ctx.userId);
      const plan = buildPracticePlan(state, minutes);
      const lines = plan.drills.map((d) => `${d.name} (${d.minutes} min): ${d.how}`);
      const text = plan.drills.length
        ? `Here's a ${plan.totalMinutes}-minute plan. ${plan.focus} ${lines.join(" ")}`
        : "Log a few rounds and swings first and I'll tailor a practice plan to your game.";
      return result(text, { plan });
    },
  );
}

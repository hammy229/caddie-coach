import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { planHole } from "../domain/strategy.js";
import { result, riskSchema, type ToolContext } from "./context.js";

export function registerPlanHole(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    "plan_hole",
    {
      title: "Plan the hole",
      description:
        "Give a shot-by-shot game plan for a hole using the golfer's own distances and risk tolerance: " +
        "which club off the tee, whether to go for a par 5 or lay up, and the approach. " +
        "Use for 'how should I play this hole', 'it's a 410 par 4', 'par 5, 520, water left of the green'.",
      inputSchema: {
        par: z.union([z.literal(3), z.literal(4), z.literal(5)]).describe("Par for the hole"),
        hole_yards: z.number().int().min(80).max(700).describe("Total length of the hole"),
        carry_hazard_yards: z.number().int().min(0).max(400).optional().describe("Carry needed to clear a hazard off the tee"),
        trouble: z.enum(["none", "short", "long"]).default("none").describe("Where the trouble is around the green"),
        risk_tolerance: riskSchema.optional().describe("Override today's risk tolerance for this hole only"),
      },
    },
    async ({ par, hole_yards, carry_hazard_yards, trouble, risk_tolerance }) => {
      const state = await ctx.store.load(ctx.userId);
      const risk = risk_tolerance ?? state.risk;
      const plan = planHole(
        state.shots,
        { par, holeYards: hole_yards, carryHazardYards: carry_hazard_yards, trouble },
        risk,
      );
      return result(`Par ${par}, ${hole_yards} yards. ${plan.summary}`, { plan, risk });
    },
  );
}

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { result, riskSchema, type ToolContext } from "./context.js";

const LINES = {
  safe: "Playing it safe: I'll steer you away from trouble even if it means leaving it short.",
  normal: "Normal game plan: I'll balance hitting the target against avoiding trouble.",
  aggressive: "Going aggressive: I'll pick the club most likely to get you at the pin, and lean long.",
};

export function registerSetRiskTolerance(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    "set_risk_tolerance",
    {
      title: "Set risk tolerance",
      description:
        "Change how aggressive the caddie's club advice is. Use when the golfer says things like " +
        "'I'm feeling aggressive today', 'play it safe' or 'go for it'. Remembered for future rounds.",
      inputSchema: { risk_tolerance: riskSchema },
    },
    async ({ risk_tolerance }) => {
      const state = await ctx.store.load(ctx.userId);
      state.risk = risk_tolerance;
      const active = state.rounds.find((r) => r.id === state.activeRoundId && !r.ended);
      if (active) active.risk = risk_tolerance;
      await ctx.store.save(ctx.userId, state);
      return result(LINES[risk_tolerance], { risk: risk_tolerance });
    },
  );
}

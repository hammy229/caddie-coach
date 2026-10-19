import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { nextId, result, riskSchema, type ToolContext } from "./context.js";

export function registerStartRound(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    "start_round",
    {
      title: "Start round",
      description:
        "Start tracking a new round of golf so shots, advice and the post-round report are grouped together. " +
        "Use when the golfer says they are teeing off or starting a round. Optionally sets today's risk tolerance.",
      inputSchema: {
        course: z.string().min(1).max(80).describe("Course name"),
        risk_tolerance: riskSchema.optional(),
        par: z.number().int().min(27).max(80).optional().describe("Par for the course"),
        course_rating: z.number().min(50).max(85).optional().describe("USGA course rating"),
        slope: z.number().int().min(55).max(155).optional().describe("USGA slope rating"),
      },
    },
    async ({ course, risk_tolerance, par, course_rating, slope }) => {
      const state = await ctx.store.load(ctx.userId);
      const today = ctx.today();
      const open = state.rounds.find((r) => r.id === state.activeRoundId && !r.ended);
      if (open) open.ended = true;

      if (risk_tolerance) state.risk = risk_tolerance;
      const round = {
        id: nextId("r", state.rounds, today),
        course,
        date: today,
        risk: state.risk,
        ended: false,
        ...(par !== undefined ? { par } : {}),
        ...(course_rating !== undefined ? { rating: course_rating } : {}),
        ...(slope !== undefined ? { slope } : {}),
      };
      state.rounds.push(round);
      state.activeRoundId = round.id;
      await ctx.store.save(ctx.userId, state);

      const prior = state.rounds.filter((r) => r.ended).length;
      return result(
        `Round started at ${course}, playing it ${state.risk}. ` +
          (prior > 0
            ? `I've got ${prior} earlier round${prior === 1 ? "" : "s"} of your shots to work from.`
            : "Log your shots as you go and I'll learn your distances."),
        { round, priorRounds: prior },
      );
    },
  );
}

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { buildRoundReport } from "../domain/report.js";
import { result, ROUND_REPORT_UI_URI, type ToolContext } from "./context.js";

export function registerEndRound(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    "end_round",
    {
      title: "End round",
      description:
        "Finish the current round and give a post-round report: fairways, approach accuracy, typical miss, " +
        "club distances versus usual, swing faults, and the trend versus earlier rounds. " +
        "Use for 'I'm done', 'how did I play', 'round's over'. Shows a report card.",
      inputSchema: {
        strokes: z.number().int().min(18).max(200).optional().describe("Final score, if the golfer says it"),
      },
      _meta: { ui: { resourceUri: ROUND_REPORT_UI_URI } },
    },
    async ({ strokes }) => {
      const state = await ctx.store.load(ctx.userId);
      const round =
        state.rounds.find((r) => r.id === state.activeRoundId && !r.ended) ??
        [...state.rounds].reverse().find((r) => r.ended);
      if (!round) {
        return result("There's no round to report on yet. Say 'start a round' when you tee off.", undefined, true);
      }
      round.ended = true;
      if (strokes !== undefined) round.strokes = strokes;
      state.activeRoundId = null;
      await ctx.store.save(ctx.userId, state);

      const report = buildRoundReport(state, round);
      const recap = await ctx.narrator.recap(report);
      return result(recap, { report, recap });
    },
  );
}

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { puttStrokesGained } from "../domain/strokesGained.js";
import type { Putt } from "../domain/types.js";
import { nextId, result, type ToolContext } from "./context.js";

export function registerLogPutt(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    "log_putt",
    {
      title: "Log putt",
      description:
        "Record a putt the golfer just hit: how long it was, whether it went in, and how far it finished if it missed. " +
        "Use whenever they describe putting, e.g. 'had a 20 footer, left it 3 feet short' or 'drained a 10 footer'. " +
        "Tracks putting strokes gained and three-putts for the round report.",
      inputSchema: {
        distance_feet: z.number().min(0.5).max(120).describe("Length of the putt in feet"),
        holed: z.boolean().describe("Whether the putt went in"),
        remaining_feet: z.number().min(0).max(60).default(0).describe("Distance left after the putt if it missed"),
      },
    },
    async ({ distance_feet, holed, remaining_feet }) => {
      const state = await ctx.store.load(ctx.userId);
      const today = ctx.today();
      const active = state.rounds.find((r) => r.id === state.activeRoundId && !r.ended);
      const putt: Putt = {
        id: nextId("p", state.putts, today),
        roundId: active?.id ?? null,
        distanceFeet: distance_feet,
        holed,
        remainingFeet: holed ? 0 : remaining_feet,
        date: today,
      };
      state.putts.push(putt);
      await ctx.store.save(ctx.userId, state);

      const sg = puttStrokesGained(putt);
      const outcome = holed
        ? `Nice, ${distance_feet}-footer in the hole.`
        : `${distance_feet}-footer, ${remaining_feet} feet left.`;
      const vsBenchmark =
        sg >= 0.1
          ? ` That's ${sg.toFixed(1)} strokes gained putting.`
          : sg <= -0.1
            ? ` That cost about ${Math.abs(sg).toFixed(1)} strokes on the greens.`
            : "";
      return result(`${outcome}${vsBenchmark}`, { putt, strokesGained: sg, roundActive: Boolean(active) });
    },
  );
}

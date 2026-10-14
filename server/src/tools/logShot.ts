import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { detectShotPatterns } from "../domain/patterns.js";
import { clubSchema, nextId, result, type ToolContext } from "./context.js";

export function registerLogShot(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    "log_shot",
    {
      title: "Log shot",
      description:
        "Record a shot the golfer just hit: club, intended distance, how far it carried, and how far left or right it finished. " +
        "Use whenever they describe a shot, e.g. '7 iron from 150, came up 10 short and 5 right'. " +
        "The response may include insights about patterns in their recent shots; always say those out loud.",
      inputSchema: {
        club: clubSchema,
        target_yards: z.number().int().min(1).max(400).describe("Distance the golfer was trying to hit it"),
        carry_yards: z.number().int().min(0).max(400).optional().describe("Actual carry. If omitted, uses target plus or minus distance_miss_yards"),
        distance_miss_yards: z.number().int().min(-150).max(150).optional().describe("Negative = short, positive = long"),
        lateral_miss_yards: z.number().int().min(-100).max(100).default(0).describe("Negative = left, positive = right"),
        shot_type: z.enum(["tee", "approach", "short_game"]).optional().describe("Defaults from the club: driver/woods = tee, wedges under 50 yards = short_game, else approach"),
      },
    },
    async ({ club, target_yards, carry_yards, distance_miss_yards, lateral_miss_yards, shot_type }) => {
      const state = await ctx.store.load(ctx.userId);
      const today = ctx.today();
      const carry = carry_yards ?? target_yards + (distance_miss_yards ?? 0);
      const type =
        shot_type ??
        (club === "driver" || club === "3w" ? "tee" : target_yards < 50 ? "short_game" : "approach");

      const active = state.rounds.find((r) => r.id === state.activeRoundId && !r.ended);
      const shot = {
        id: nextId("s", state.shots, today),
        roundId: active?.id ?? null,
        club,
        type,
        targetYards: target_yards,
        carryYards: carry,
        lateralYards: lateral_miss_yards,
        date: today,
      };
      const history = state.shots.filter((s) => !active || s.roundId !== active.id);
      state.shots.push(shot);
      await ctx.store.save(ctx.userId, state);

      const roundShots = active ? state.shots.filter((s) => s.roundId === active.id) : [shot];
      const insights = detectShotPatterns(roundShots, history);

      const miss = carry - target_yards;
      const depth = miss === 0 ? "pin high" : `${Math.abs(miss)} ${miss < 0 ? "short" : "long"}`;
      const side = lateral_miss_yards === 0 ? "" : `, ${Math.abs(lateral_miss_yards)} ${lateral_miss_yards < 0 ? "left" : "right"}`;
      const text = [`Got it: ${club}, ${depth}${side}.`, ...insights.map((i) => i.message)].join(" ");
      return result(text, { shot, insights, roundActive: Boolean(active) });
    },
  );
}

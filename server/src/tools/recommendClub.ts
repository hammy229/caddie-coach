import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { recommendClub } from "../domain/recommend.js";
import { clubName } from "../domain/types.js";
import { result, riskSchema, type ToolContext } from "./context.js";

export function registerRecommendClub(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    "recommend_club",
    {
      title: "Recommend club",
      description:
        "Act as the golfer's caddie: pick a club and aim point for a shot using their own logged distances and misses, " +
        "the wind, elevation, where the trouble is, and their risk tolerance. " +
        "Use for 'what should I hit', 'I've got 150 into the wind', 'water long, what club'.",
      inputSchema: {
        distance_yards: z.number().int().min(20).max(320).describe("Distance to the target"),
        wind: z.enum(["none", "head", "tail", "left_to_right", "right_to_left"]).default("none"),
        wind_mph: z.number().min(0).max(50).default(0),
        elevation_feet: z.number().min(-150).max(150).default(0).describe("Positive = uphill"),
        trouble: z.enum(["none", "short", "long"]).default("none").describe("Where the hazard is"),
        target_depth_yards: z.number().min(5).max(60).default(20).describe("Front-to-back depth of the green or landing area"),
        risk_tolerance: riskSchema.optional().describe("Override today's risk tolerance for this shot only"),
      },
    },
    async (args) => {
      const state = await ctx.store.load(ctx.userId);
      const risk = args.risk_tolerance ?? state.risk;
      const rec = recommendClub(
        state.shots,
        {
          distanceYards: args.distance_yards,
          wind: args.wind,
          windMph: args.wind_mph,
          elevationFeet: args.elevation_feet,
          trouble: args.trouble,
          targetDepthYards: args.target_depth_yards,
        },
        risk,
      );
      const aim =
        rec.aimYards === 0
          ? "Aim right at it."
          : `Aim ${Math.abs(rec.aimYards)} yards ${rec.aimYards < 0 ? "left" : "right"} of the target.`;
      const text = `Hit ${clubName(rec.club)}. ${aim} ${rec.reasons.join(" ")}`;
      return result(text, { ...rec, risk });
    },
  );
}

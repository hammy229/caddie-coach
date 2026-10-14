import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { bagModel } from "../domain/dispersion.js";
import { FAULT_LABEL } from "../domain/patterns.js";
import type { SwingFault } from "../domain/types.js";
import { result, type ToolContext } from "./context.js";

export function registerGetGameProfile(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    "get_game_profile",
    {
      title: "Get game profile",
      description:
        "Describe what the caddie has learned about the golfer: their real carry distance and miss direction for each club, " +
        "their most common swing faults, rounds played and current risk tolerance. " +
        "Use for 'how far do I hit my 7 iron', 'what's my miss', 'what do you know about my game'.",
      inputSchema: {},
    },
    async () => {
      const state = await ctx.store.load(ctx.userId);
      const clubs = bagModel(state.shots)
        .filter((m) => m.source === "personal")
        .map((m) => ({
          club: m.club,
          carry: Math.round(m.meanCarry),
          spread: Math.round(m.sdCarry),
          lateralBias: Math.round(m.meanLateral),
          shots: m.shots,
        }));

      const faultCounts: Partial<Record<SwingFault, number>> = {};
      for (const s of state.swings) for (const f of s.faults) faultCounts[f] = (faultCounts[f] ?? 0) + 1;
      const topFault = (Object.entries(faultCounts) as [SwingFault, number][]).sort((a, b) => b[1] - a[1])[0];

      const rounds = state.rounds.filter((r) => r.ended).length;
      const parts: string[] = [];
      if (clubs.length === 0) {
        parts.push("I haven't learned your distances yet. Log a few shots with each club.");
      } else {
        parts.push(
          "Your real carries: " +
            clubs.map((c) => `${c.club} ${c.carry}${c.lateralBias ? ` (misses ${Math.abs(c.lateralBias)} ${c.lateralBias > 0 ? "right" : "left"})` : ""}`).join(", ") +
            ".",
        );
      }
      if (topFault) {
        parts.push(`Most common swing fault: ${FAULT_LABEL[topFault[0]]}, in ${topFault[1]} of ${state.swings.length} swings.`);
      }
      parts.push(`${rounds} round${rounds === 1 ? "" : "s"} tracked, playing it ${state.risk}.`);

      return result(parts.join(" "), {
        clubs,
        faultCounts,
        swingsRecorded: state.swings.length,
        roundsPlayed: rounds,
        risk: state.risk,
      });
    },
  );
}

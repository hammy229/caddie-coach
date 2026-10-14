import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { FAULT_LABEL, detectSwingPatterns, faultStreaks } from "../domain/patterns.js";
import type { SwingAnalysis, SwingFault } from "../domain/types.js";
import { result, SWING_UI_URI, type ToolContext } from "./context.js";

const FIX: Record<SwingFault, (s: SwingAnalysis) => string> = {
  over_the_top: () =>
    "From the top, your hands moved out toward the ball before they dropped. Feel the hands fall straight down first, then turn.",
  early_extension: (s) =>
    `You stood up through impact and lost about ${Math.round(s.spineAngleChangeDeg)} degrees of posture. Keep your chest over the ball until after impact.`,
  fast_tempo: (s) =>
    `Your backswing was quick, a ${s.tempoRatio} to 1 tempo. Try a smoother three-to-one: count one-two-three going back, four coming down.`,
  slow_tempo: (s) =>
    `Your transition stalled, a ${s.tempoRatio} to 1 tempo. Keep the club moving at the top instead of pausing.`,
};

export function describeSwing(latest: SwingAnalysis, previous: SwingAnalysis[]): string {
  if (latest.faults.length === 0) {
    return `Solid swing. Tempo was ${latest.tempoRatio} to 1 and your posture held through impact.`;
  }
  const streaks = faultStreaks([...previous, latest]);
  const lines = latest.faults.map((f) => {
    const run = streaks[f] ?? 1;
    const history = run >= 2 ? ` That's ${run} swings in a row ${FAULT_LABEL[f]}.` : "";
    return `${FIX[f](latest)}${history}`;
  });
  return lines.join(" ");
}

export function registerAnalyzeSwing(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    "analyze_swing",
    {
      title: "Analyze swing",
      description:
        "Coach the golfer on the swing they most recently recorded with the Caddie Coach camera page: tempo, " +
        "coming over the top, and losing posture, compared with their previous swings. " +
        "Use for 'how was that swing', 'check my swing', 'what am I doing wrong'. Shows a swing card.",
      inputSchema: {},
      _meta: { ui: { resourceUri: SWING_UI_URI } },
    },
    async () => {
      const state = await ctx.store.load(ctx.userId);
      const latest = state.swings[state.swings.length - 1];
      if (!latest) {
        return result(
          "I don't have a recorded swing yet. Open the Caddie Coach capture page on your phone, set it facing you, and take a swing.",
          { swing: null },
          true,
        );
      }
      const previous = state.swings.slice(0, -1);
      latest.reviewed = true;
      await ctx.store.save(ctx.userId, state);

      const patterns = detectSwingPatterns(state.swings);
      return result(describeSwing(latest, previous), {
        swing: latest,
        swingsRecorded: state.swings.length,
        streaks: faultStreaks(state.swings),
        insights: patterns,
      });
    },
  );
}

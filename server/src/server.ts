import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { APP_MIME, ROUND_REPORT_HTML, SWING_HTML } from "./apps/cards.js";
import { registerAnalyzeSwing } from "./tools/analyzeSwing.js";
import { ROUND_REPORT_UI_URI, SWING_UI_URI, type ToolContext } from "./tools/context.js";
import { registerEndRound } from "./tools/endRound.js";
import { registerGetGameProfile } from "./tools/getGameProfile.js";
import { registerLogPutt } from "./tools/logPutt.js";
import { registerLogShot } from "./tools/logShot.js";
import { registerRecommendClub } from "./tools/recommendClub.js";
import { registerSetRiskTolerance } from "./tools/setRiskTolerance.js";
import { registerStartRound } from "./tools/startRound.js";

export function buildServer(ctx: ToolContext): McpServer {
  const server = new McpServer({ name: "caddie-coach", version: "0.1.0" });

  registerStartRound(server, ctx);
  registerSetRiskTolerance(server, ctx);
  registerLogShot(server, ctx);
  registerLogPutt(server, ctx);
  registerRecommendClub(server, ctx);
  registerAnalyzeSwing(server, ctx);
  registerEndRound(server, ctx);
  registerGetGameProfile(server, ctx);

  for (const [name, uri, title, html] of [
    ["round-report-ui", ROUND_REPORT_UI_URI, "Post-round report card", ROUND_REPORT_HTML],
    ["swing-ui", SWING_UI_URI, "Swing check card", SWING_HTML],
  ] as const) {
    server.registerResource(name, uri, { title, mimeType: APP_MIME }, async (u) => ({
      contents: [{ uri: u.href, mimeType: APP_MIME, text: html }],
    }));
  }

  return server;
}

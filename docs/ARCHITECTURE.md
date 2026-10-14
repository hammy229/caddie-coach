# Architecture

## Components

| Component | Tech | Status |
|---|---|---|
| MCP server | TypeScript, `@modelcontextprotocol/sdk`, Express, Streamable HTTP, spec 2025-11-25 | Done |
| Golf engine | `server/src/domain/`: dispersion model, caddie engine, pattern detector, swing analyzer, round report | Done, unit tested |
| Swing capture | `/capture` page, MediaPipe Pose Landmarker (lite) in the browser, uploads keypoints to `/api/swings` | Built, not yet tested on a real camera |
| Per-user state | Amazon DynamoDB (`userId` partition key), in-memory store for local dev | Code done, table not deployed |
| Round recap | Amazon Bedrock Converse API with template fallback | Code done, not yet run against Bedrock |
| UI cards | MCP App resources `ui://caddie-coach/round-report`, `ui://caddie-coach/swing` | Done; conforms to MCP Apps SEP-1865 (ui:// URIs, `text/html;profile=mcp-app`, `_meta.ui.resourceUri` tool linkage, `ui/initialize` + `ui/notifications/tool-result` postMessage), not yet rendered on a live Alexa+ |
| Hosting | AWS Lambda (container image) behind an HTTPS Function URL, via the Lambda Web Adapter | SAM stack in `infra/`, deploy pending AWS account |
| Auth | OAuth/OIDC (Amazon Cognito), `resource` = canonical server URI | Planned |
| Alexa+ bridge | Alexa AI CLI add-on (`alexa-ai new mcp`, `alexa-ai deploy`) | Planned |

## Request flow

1. The golfer speaks to Alexa+. Alexa+ routes the request through the add-on to `POST /mcp`.
2. The server builds a request-scoped MCP server, runs the tool against the golfer's state, and saves changes.
3. Alexa+ speaks the tool's text and, for `end_round` and `analyze_swing`, renders the linked card.

The server is stateless per request, so it fits Lambda or App Runner. All durable data is in the `StateStore`. The deployment path is a Lambda container image run by the [Lambda Web Adapter](https://github.com/awslabs/aws-lambda-web-adapter), exposed through a Function URL in `RESPONSE_STREAM` mode so the MCP SSE responses stream back. See `infra/` for the SAM stack and `infra/README.md` for deploy steps.

## How "proactive" works

MCP servers cannot start a conversation; Alexa+ calls them. Caddie Coach makes the most of every call instead: each `log_shot` runs the pattern detector over the round so far and returns any new insight in the same response, and the tool description tells Alexa+ to say insights aloud. The golfer hears "your last 3 approaches were short" without asking.

## Swing capture

The capture page uses the phone or laptop camera, not an Echo Show camera. Pose estimation runs in the browser; only six keypoints per frame (shoulders, hips, wrists) are uploaded, never video. The server derives:

- **Tempo**: takeaway to top of backswing (hands highest) vs top to impact (hands back at address height). Around 3:1 is typical of good players; under 2.3 is flagged as rushed, over 4.2 as stalled.
- **Early extension**: forward spine tilt (hip midpoint to shoulder midpoint) at address minus at impact; more than 8 degrees lost is flagged.
- **Over the top**: in the first third of the downswing, how far the hands move away from the body relative to how far they drop; a ratio above 0.5 is flagged.

These are heuristics on 2D keypoints and are calibrated against synthetic swings; they need tuning on real captures.

## Caddie engine

For each club, carry is modeled as a normal distribution from the golfer's own shots. The engine computes the plays-like distance (headwind +1%/mph, tailwind -0.5%/mph, 1 yard per 3 feet of elevation), then scores each club:

`score = P(carry within the target zone) - w(risk) * P(carry into trouble)`

with `w` = 2 (safe), 1 (normal), 0.35 (aggressive). Aggressive play also slightly prefers clubs that reach the target. The aim point offsets the club's average lateral miss and crosswind drift.

## AWS integrations

- **DynamoDB**: `server/src/state/dynamo.ts`. One item per golfer keyed by `userId` holding shots, swings and rounds.
- **Bedrock**: `server/src/domain/narrator.ts` (`BedrockNarrator`) turns the structured round report into a short spoken recap, constrained to facts in the report.
- **Lambda + Function URL**: `infra/template.yaml` deploys the container image to Lambda with a public HTTPS Function URL (`RESPONSE_STREAM`). The function's IAM role grants DynamoDB CRUD on the table and `bedrock:InvokeModel`.

## Deployment

The SAM stack in `infra/` provisions, in one `sam deploy`:

1. **`CaddieTable`** — DynamoDB, on-demand billing, partition key `userId`.
2. **`CaddieFunction`** — Lambda from the `server/Dockerfile` image (arm64), env `DDB_TABLE` and `BEDROCK_MODEL_ID` wired in, least-privilege IAM.
3. **Function URL** — HTTPS endpoint in `RESPONSE_STREAM` mode; the MCP endpoint is the URL + `/mcp`.

Region defaults to `us-east-1` (`infra/samconfig.toml`). Everything stays within the AWS free tier at demo scale.

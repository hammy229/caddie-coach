# Product Feedback

One section per tool, API or SDK used. Fill in as each is used.

Each section covers: what it was used for, what worked well, what needs work, onboarding (zero to hello world), and whether I would build with it again.

## MCP TypeScript SDK (`@modelcontextprotocol/sdk`)
- **Used for:** Streamable HTTP server (spec 2025-11-25), registering 7 tools and 2 MCP App UI resources, and the end-to-end contract tests that drive the real HTTP endpoint with the SDK client.
- **Worked well:** `McpServer` + `registerTool` with a Zod `inputSchema` is terse and type-safe; a tool is a title, description, schema and an async handler. `StreamableHTTPServerTransport` with `sessionIdGenerator: undefined` makes a clean stateless-per-request server that maps straight onto Lambda. `initialize` correctly negotiated protocol `2025-11-25` and advertised `tools` and `resources` capabilities with no extra config.
- **Needs work:** The MCP Apps linkage (`_meta.ui.resourceUri`) and the UI resource MIME `text/html;profile=mcp-app` are not surfaced in the SDK types or examples — I had to confirm them against the SEP-1865 spec rather than the SDK docs. A typed helper for declaring a tool's UI resource would remove a whole class of mistakes.
- **Onboarding (zero → hello world):** Fast. Install the SDK, build an `McpServer`, mount the transport on an Express `POST /mcp`, and the MCP Inspector / a raw `curl` with `Accept: application/json, text/event-stream` both work immediately.
- **Build again?** Yes. The ergonomics are good and the Streamable HTTP transport is exactly what Alexa+ wants.

## MCP Apps extension (SEP-1865)
- **Used for:** Two in-conversation cards — a post-round report (`end_round`) and a swing check (`analyze_swing`) — as `ui://` HTML resources that render the tool's `structuredContent`.
- **Worked well:** The model is clean: declare a `ui://` resource with MIME `text/html;profile=mcp-app`, link it from the tool via `_meta.ui.resourceUri`, and render inside the iframe off the `ui/initialize` handshake and the `ui/notifications/tool-result` postMessage. No bundler or framework needed — a single self-contained HTML document per card.
- **Needs work:** Discoverability. The exact MIME string, the `_meta` key, and the postMessage method names (`ui/initialize`, `ui/notifications/tool-result`, `ui/notifications/tool-input`) live only in the spec; an official minimal server-rendered example would shorten the loop. Also unclear from the spec alone which subset a given host (e.g. Alexa+) renders — needs a live device to confirm.
- **Build again?** Yes, for anything where a spoken answer benefits from a glanceable visual.

## AWS Lambda + Lambda Web Adapter + SAM
- **Used for:** Authoring the deploy stack (`infra/`): a container-image Lambda running the unmodified Express app via the Lambda Web Adapter, exposed through an HTTPS Function URL in `RESPONSE_STREAM` mode so the MCP SSE responses stream.
- **Worked well:** The Web Adapter means zero code changes to go from a local Express server to Lambda — the same `node dist/src/index.js` runs locally, on Lambda, and on App Runner. SAM's `AWS::Serverless::Function` with `PackageType: Image` plus `FunctionUrlConfig` keeps the whole HTTPS + streaming setup to a dozen lines. `DynamoDBCrudPolicy` is a clean least-privilege shortcut.
- **Needs work:** See friction log F-2 — the Node zip handler value and the Function URL streaming setting take cross-referencing. (Stack authored and validated; live deploy pending an AWS account with Bedrock model access.)
- **Build again?** Yes — the adapter pattern is the least-friction way to host an MCP server on AWS.
- **AWS services used (AWS Builder evidence):**
  - **AWS Lambda** — runs the MCP server as a container image (arm64) behind a Function URL.
  - **Lambda Function URL** — the HTTPS endpoint, `RESPONSE_STREAM` invoke mode for SSE.
  - **Amazon DynamoDB** — per-golfer state (shots, swings, rounds), on-demand billing, `userId` partition key (`server/src/state/dynamo.ts`).
  - **Amazon Bedrock** — Converse API writes the spoken post-round recap, constrained to the report's facts, with a template fallback (`server/src/domain/narrator.ts`).
  - **Amazon ECR** — holds the Lambda container image (managed by SAM).
  - **IAM** — least-privilege role: DynamoDB CRUD on the table + `bedrock:InvokeModel`.

## Alexa+ MCP Toolkit / Alexa AI CLI
_not yet used — add-on generation (`alexa-ai new mcp`) is the next step once the server is deployed._

## Amazon DynamoDB (runtime)
_code integrated (`DynamoStore`); not yet exercised against a live table — see the AWS section above for the integration._

## Amazon Bedrock (runtime)
_code integrated (`BedrockNarrator`, Converse API); not yet run against a live model — needs model access granted in the console._

## MediaPipe Pose Landmarker (web)
_capture page built and serving; not yet tested on a real camera / real swings._

## Amazon Cognito
_not yet used — OAuth/OIDC is the planned auth layer._

# Product Feedback

One section per tool, API or SDK used.

Each section covers: what it was used for, what worked well, what needs work, onboarding (zero to hello world), and whether I would build with it again.

## MCP TypeScript SDK (`@modelcontextprotocol/sdk`)
- **Used for:** Streamable HTTP server (spec 2025-11-25), registering 10 tools and 3 MCP App UI resources, and the end-to-end contract tests that drive the real HTTP endpoint with the SDK client.
- **Worked well:** `McpServer` + `registerTool` with a Zod `inputSchema` is terse and type-safe; a tool is a title, description, schema and an async handler. `StreamableHTTPServerTransport` with `sessionIdGenerator: undefined` makes a clean stateless-per-request server that maps straight onto Lambda. `initialize` correctly negotiated protocol `2025-11-25` and advertised `tools` and `resources` capabilities with no extra config.
- **Needs work:** The MCP Apps linkage (`_meta.ui.resourceUri`) and the UI resource MIME `text/html;profile=mcp-app` are not surfaced in the SDK types or examples — I had to confirm them against the SEP-1865 spec rather than the SDK docs. A typed helper for declaring a tool's UI resource would remove a whole class of mistakes.
- **Onboarding (zero → hello world):** Fast. Install the SDK, build an `McpServer`, mount the transport on an Express `POST /mcp`, and the MCP Inspector / a raw `curl` with `Accept: application/json, text/event-stream` both work immediately.
- **Build again?** Yes. The ergonomics are good and the Streamable HTTP transport is exactly what Alexa+ wants.

## MCP Apps extension (SEP-1865)
- **Used for:** Three in-conversation cards — a post-round report (`end_round`), a swing check (`analyze_swing`) and a practice plan (`practice_plan`) — as `ui://` HTML resources that render the tool's `structuredContent`.
- **Worked well:** The model is clean: declare a `ui://` resource with MIME `text/html;profile=mcp-app`, link it from the tool via `_meta.ui.resourceUri`, and render inside the iframe off the `ui/initialize` handshake and the `ui/notifications/tool-result` postMessage. No bundler or framework needed — a single self-contained HTML document per card.
- **Needs work:** Discoverability. The exact MIME string, the `_meta` key, and the postMessage method names (`ui/initialize`, `ui/notifications/tool-result`, `ui/notifications/tool-input`) live only in the spec; an official minimal server-rendered example would shorten the loop. Also unclear from the spec alone which subset a given host (e.g. Alexa+) renders — needs a live device to confirm.
- **Build again?** Yes, for anything where a spoken answer benefits from a glanceable visual.

## AWS Lambda + Lambda Web Adapter + SAM
- **Used for:** Authoring the deploy stack (`infra/`): a container-image Lambda running the unmodified Express app via the Lambda Web Adapter, exposed through an HTTPS Function URL in `RESPONSE_STREAM` mode so the MCP SSE responses stream.
- **Worked well:** The Web Adapter means zero code changes to go from a local Express server to Lambda — the same `node dist/src/index.js` runs locally, on Lambda, and on App Runner. SAM's `AWS::Serverless::Function` with `PackageType: Image` plus `FunctionUrlConfig` keeps the whole HTTPS + streaming setup to a dozen lines. `DynamoDBCrudPolicy` is a clean least-privilege shortcut.
- **Needs work:** See friction log F-2 — the Node zip handler value and the Function URL streaming setting take cross-referencing. On a new free-plan account the deploy was blocked by a service control policy with no hint that the plan was the cause (friction log F-3).
- **Onboarding (zero → hello world):** `sam build` produced a working arm64 container on the first try once Docker was running; `sam validate` caught template mistakes locally. Account setup was the slow part (F-3, F-5).
- **Build again?** Yes — the adapter pattern is the least-friction way to host an MCP server on AWS.
- **AWS services used (AWS Builder evidence):**
  - **AWS Lambda** — runs the MCP server as a container image (arm64) behind a Function URL.
  - **Lambda Function URL** — the HTTPS endpoint, `RESPONSE_STREAM` invoke mode for SSE.
  - **Amazon DynamoDB** — per-golfer state (shots, swings, rounds), on-demand billing, `userId` partition key (`server/src/state/dynamo.ts`).
  - **Amazon Bedrock** — Converse API writes the spoken post-round recap, constrained to the report's facts, with a template fallback (`server/src/domain/narrator.ts`).
  - **Amazon ECR** — holds the Lambda container image (managed by SAM).
  - **IAM** — least-privilege role: DynamoDB CRUD on the table + `bedrock:InvokeModel`.

## Alexa+ MCP Toolkit / Alexa AI CLI
- **Used for:** The target platform: the add-on connects Alexa+ to this server over Streamable HTTP, and its account-linking checklist drove the server's OAuth design.
- **Worked well:** The model is the right one: a remote, self-hosted MCP server means all the golf logic stays in ordinary, testable code. The quickstart's requirements are concrete and checkable (bare 401, RFC 9728 metadata, `S256` PKCE, 500 ms response budget), which made it easy to write a test per requirement.
- **Needs work:** The CLI install step is missing from the quickstart; there is no reference auth server; and the bare-401 rule differs from the MCP authorization spec without saying why (friction log F-6). The quickstart also allows a tunnel such as cloudflared for development, which is easy to miss and removes the need for a cloud deploy to start testing.
- **Onboarding (zero → hello world):** Server side was quick because the MCP SDK does the heavy lifting; account linking was the long pole.
- **Build again?** Yes. Voice plus MCP Apps cards is a strong fit for hands-busy use like a round of golf.

## Amazon DynamoDB (runtime)
- **Used for:** Durable per-golfer state (shots, putts, swings, rounds) in one item per `userId` (`server/src/state/dynamo.ts`, via `@aws-sdk/lib-dynamodb`).
- **Worked well:** The document client maps the TypeScript state straight to an item with no schema work; on-demand billing means no idle cost; `DynamoDBCrudPolicy` in SAM is one line of least privilege.
- **Needs work:** Nothing in the service itself; access was blocked on the new account by the plan's service control policy (F-3), so the live table is pending.
- **Onboarding (zero → hello world):** Short: the same `StateStore` interface has an in-memory implementation for local runs and tests, so swapping in DynamoDB is one environment variable (`DDB_TABLE`).
- **Build again?** Yes — single-item-per-user state is exactly DynamoDB's sweet spot.

## Amazon Bedrock (runtime)
- **Used for:** The spoken post-round recap, through the Converse API (`server/src/domain/narrator.ts`). The prompt constrains the model to the round report's facts, and any failure falls back to a deterministic template so a recap is always spoken.
- **Worked well:** Converse gives one request shape across model families, so the model is a single environment variable (`BEDROCK_MODEL_ID`) and can be swapped without code changes. `list-foundation-models` worked from the CLI immediately.
- **Needs work:** On a new account every invoke failed with "Your account is currently being verified" while the read-only APIs succeeded, so the block was invisible until the first call (F-4).
- **Onboarding (zero → hello world):** The SDK call is a few lines; account readiness, not code, was the wait.
- **Build again?** Yes — the template fallback plus Converse makes generative output safe to put in a voice flow.

## AWS CLI + SAM CLI
- **Used for:** Account auth, `sam validate`, `sam build`, `sam deploy`, and read-only probes of which services the account allows.
- **Worked well:** Homebrew installs both in one command; `sam validate` and `sam build` give fast local feedback; `--no-execute-changeset` lets you review a deploy before it runs.
- **Needs work:** Interactive-only auth commands fail without a TTY, and the `aws login` authorize link expires quickly (F-5).
- **Onboarding (zero → hello world):** Minutes for the tools; most of the time went to account setup.
- **Build again?** Yes.

## MediaPipe Pose Landmarker (web)
- **Used for:** On-device pose estimation in the `/capture` page; only six keypoints per frame are uploaded, never video.
- **Worked well:** Loads from a CDN as an ES module and runs in real time in a mobile browser with no install.
- **Needs work:** Camera access requires `https://` or `localhost`, so testing on a phone against a laptop server needs a tunnel.
- **Onboarding (zero → hello world):** Under an hour from the docs to landmarks drawn over live video.
- **Build again?** Yes — keeping pose on-device is what makes camera coaching private.

## OAuth 2.1 account linking (built in)
- **Used for:** Alexa+ account linking: PKCE `S256` authorization code flow, refresh tokens, RFC 9728 and RFC 8414 metadata, bearer enforcement on `/mcp` and swing uploads (`server/src/auth/oauth.ts`).
- **Why built in instead of Amazon Cognito:** Cognito was the plan, but it was out of reach on the restricted account (F-3). A stateless, HMAC-signed implementation needs no storage, runs unchanged on Lambda, and has a test for each Alexa+ checklist item. Swapping in Cognito later only changes the token check.
- **Build again?** For a hackathon, yes; for production, a managed identity provider.

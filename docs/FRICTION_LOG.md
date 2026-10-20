# Friction Log

Platform and tooling friction hit while building. Newest last.

<!-- Template
### F-<n>: <short title>
- **Task attempted:**
- **Steps taken:**
- **Expected:**
- **Actual:**
- **Severity:** Critical / High / Medium / Low
- **Workaround:**
- **Suggestion:**
-->

### F-1: vitest fails when npm skips rollup's platform binary
- **Task attempted:** Run the test suite (`npm test`) on a fresh `npm install`.
- **Steps taken:** `npm install` then `npm test` (vitest) on macOS arm64.
- **Expected:** 36 tests run.
- **Actual:** `Cannot find module '@rollup/rollup-darwin-arm64'`. npm's optional-dependency resolution intermittently omits the platform-specific rollup binary that vitest pulls in.
- **Severity:** Low (environment, not our code; CI on Linux is unaffected).
- **Workaround:** `npm i -D @rollup/rollup-darwin-arm64` locally, then revert the `package.json` change before committing (the binary is platform-specific and would break Linux CI). A clean `rm -rf node_modules package-lock.json && npm install` is the more durable fix.
- **Suggestion:** This is a known npm bug (npm/cli#4828); pinning or documenting it in the project README saves the next contributor the detour.

### F-2: Lambda Web Adapter docs omit the Node zip handler and Function URL streaming wiring
- **Task attempted:** Deploy the Express MCP server to AWS Lambda behind an HTTPS endpoint that can stream the MCP SSE responses.
- **Steps taken:** Followed the Lambda Web Adapter README for both the zip-layer and container paths.
- **Expected:** A single reference showing the Node handler value, the env vars, and the Function URL config needed for SSE.
- **Actual:** The README gives the layer ARN and env vars but, for Node, points to "set the handler to your startup script" without a concrete value, and leaves the Function URL `InvokeMode: RESPONSE_STREAM` setting to the separate Lambda docs. The adapter env var was also renamed (`READINESS_CHECK_PATH` → `AWS_LWA_READINESS_CHECK_PATH`), with the old name deprecated — easy to copy the wrong one from older guides.
- **Severity:** Medium (cost real time cross-referencing three pages to get a working template).
- **Workaround:** Chose the container-image path, which is self-contained (adapter copied from `public.ecr.aws/awsguru/aws-lambda-adapter:1.1.0`) and pins every version. See `infra/`.
- **Suggestion:** Add one end-to-end Node + SSE + Function URL example (zip and container) to the adapter README, with the exact `InvokeMode` setting shown inline.

### F-3: New free-plan AWS account blocks the whole serverless stack with a bare SCP deny
- **Task attempted:** First `sam deploy` of the stack (Lambda container + Function URL + DynamoDB) on a brand-new AWS account on the free plan with promotional credits.
- **Steps taken:** Created an IAM user with `AdministratorAccess`, confirmed it with `aws sts get-caller-identity`, ran `sam build` (succeeded), then `sam deploy`.
- **Expected:** Either the deploy runs, or an error saying the free plan does not include CloudFormation/Lambda and how to enable them.
- **Actual:** `AccessDenied ... cloudformation:DescribeStacks ... with an explicit deny in a service control policy: arn:aws:organizations::<id>:policy/o-.../service_control_policy/p-...`. Read-only probes showed Lambda, ECR, DynamoDB and CloudFormation all denied the same way; only Bedrock answered. Nothing in the console, the sign-up flow or the error said which plan feature was missing, and an `AdministratorAccess` user being denied looks like a misconfiguration rather than a plan limit.
- **Severity:** High (blocks every deploy; no in-product path from the error to the fix).
- **Workaround:** Built and tested everything locally; deploy waits on upgrading the account plan.
- **Suggestion:** When an SCP deny comes from a plan-managed policy, name the plan and link the upgrade page in the error, and list the denied services on the free-plan page before sign-up.

### F-4: Bedrock calls fail for hours after sign-up while the account is "being verified"
- **Task attempted:** Live-test the Bedrock Converse recap (`BedrockNarrator`) with Amazon Nova Micro.
- **Steps taken:** `aws bedrock-runtime converse --model-id us.amazon.nova-micro-v1:0 ...` (also the non-profile ID).
- **Expected:** A completion, or a model-access error.
- **Actual:** `AccessDeniedException: Your account is currently being verified. Verification normally takes less than 2 hours.` `bedrock list-foundation-models` worked in the same session, which made it look like Bedrock was ready.
- **Severity:** Medium (time-boxed, but invisible until the first invoke).
- **Workaround:** The narrator already falls back to a deterministic template recap, so the product keeps working; retried after verification.
- **Suggestion:** Show account-verification status on the console home and in the Bedrock console, and return the same message from the read-only Bedrock APIs so it surfaces before the first invoke.

### F-5: `aws configure` and `aws login` cannot run from an agent or non-interactive shell
- **Task attempted:** Authenticate the AWS CLI from a terminal session driven by a coding agent (no TTY on stdin).
- **Steps taken:** `aws configure` (prompts for keys); `aws login` (browser flow).
- **Expected:** A non-interactive path suggested by the error, or a device-code flow.
- **Actual:** `aws configure` failed with `EOF when reading a line`. `aws login` first failed with `[Errno 22] Invalid argument` because no region was set and it tried to prompt for one; after setting the region it printed an authorize URL, which expired (`The pending authorization to retrieve an SSO token has expired`) during the few minutes it took to find the browser tab.
- **Severity:** Medium (cost several retries; the fix is easy once known).
- **Workaround:** `aws configure set region us-east-1`, then `aws configure set aws_access_key_id/aws_secret_access_key` from the downloaded key CSV, without echoing the secret.
- **Suggestion:** Detect a non-TTY stdin and print the `aws configure set ...` equivalents; have `aws login` take `--region` and say how long the authorize link stays valid.

### F-6: Alexa+ MCP quickstart lists auth requirements but not how to meet them, or how to install the CLI
- **Task attempted:** Get the server ready for `alexa-ai new mcp` account linking.
- **Steps taken:** Read the MCP Toolkit quickstart and the MCP authentication page.
- **Expected:** One page with the CLI install command and a reference auth server (or a pointer to a managed one) that satisfies the checklist.
- **Actual:** The quickstart starts at `alexa-ai configure` with no install command on the page. The requirements (bare 401 without `WWW-Authenticate`, RFC 9728 protected-resource metadata, `/.well-known/oauth-authorization-server` with `S256`) are stated, but there is no sample server, and the bare-401 rule differs from the MCP authorization spec, where 401 normally carries `WWW-Authenticate` pointing at the metadata.
- **Severity:** Medium (auth is the step most likely to block linking, and it is the least documented).
- **Workaround:** Wrote a small stateless OAuth 2.1 server into the MCP server (`server/src/auth/oauth.ts`, PKCE S256, refresh tokens, both metadata documents) with tests for every checklist item.
- **Suggestion:** Put the CLI install command on the quickstart, publish a minimal reference auth server (or a Cognito recipe) that passes the checklist, and explain why Alexa+ wants the 401 without `WWW-Authenticate`.

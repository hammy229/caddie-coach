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

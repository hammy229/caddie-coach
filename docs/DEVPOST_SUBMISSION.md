# Devpost Submission — Caddie Coach

Paste-ready copy for the Amazon Developer "Build, Ship, Shape" Hackathon 2026.
Fill the links at the bottom before submitting.

---

## Project name

Caddie Coach

## Tagline (one line)

A golf caddie and swing coach for Alexa+ that learns your real distances, your misses, and your swing faults.

## Elevator pitch (≤ 200 chars)

Alexa+ caddie that builds a model of how *you* actually hit each club, picks the shot, spots your patterns mid-round, coaches your swing from your phone camera, and turns your weaknesses into a practice plan.

## Tracks & challenges entered

- **Primary track: Alexa+.** A self-hosted MCP server implementing spec **2025-11-25** over Streamable HTTP, with the MCP SDK imported and called at runtime (`server/src/server.ts`, `server/src/index.ts`). It keeps state across sessions and returns MCP Apps cards, two of the "creative" signals the rules call out. The demo uses the rules' alternate path, a **simulated Alexa+ experience**: a voice host at `/alexa` that speaks to the same real MCP server, renders its real MCP Apps cards, and logs every MCP message. The real add-on CLI is gated behind an Amazon-side allowlist (friction log F-7); the server is ready for it, OAuth account linking included.
- **Mini challenge: AWS Builder.** A multi-service integration, documented in `infra/`, `docs/ARCHITECTURE.md` and the Product Feedback below: AWS Lambda (container image + Lambda Web Adapter) behind a Function URL with response streaming, Amazon DynamoDB for per-golfer state, Amazon Bedrock (Converse) for the spoken recap, Amazon ECR and least-privilege IAM, all in one SAM stack.
- **Mini challenge: Open Source.** [alexa-mcp-oauth](https://github.com/hammy229/alexa-mcp-oauth), a new MIT-licensed project: drop-in OAuth 2.1 for any self-hosted MCP server that links to Alexa+. Details in the Open Source fields below.

---

## Inspiration

Every golf app hands you the same chart: 7-iron, 150 yards. But nobody hits the textbook number, and nobody misses randomly. One golfer leaks every approach 10 yards short; another blocks every drive right. The information that would actually drop your score — *how you personally miss* — is the one thing generic apps never learn.

A caddie is different. A good caddie remembers that your 7-iron carries 148 on a good one and 138 when you get quick, that you bail right under pressure, and that you've come up short on the last three. We wanted that caddie to live in Alexa+, where you can just talk to it mid-round with gloves on and a club in your hand.

## What it does

Caddie Coach is an Alexa+ add-on backed by a Model Context Protocol server. It learns your game and uses it in real time:

- **Learns your distances and misses.** Every shot you log updates a per-club model — the mean and spread of your carry and your lateral miss — from your last 20 full swings. Until a club has three shots, it uses typical amateur numbers, then switches to *yours*.
- **Picks the shot, your way.** Ask for a club and it computes the plays-like distance (wind, elevation), then scores every club by the chance of landing in the target zone minus a risk-weighted chance of finding trouble. It aims for *your* usual miss and the crosswind, not the center of the green.
- **Notices patterns without being asked.** Every logged shot is checked for streaks — approaches short or long, tee shots leaking one way, a club going shorter than usual — and Alexa+ raises them in the same breath: *"That's three approaches in a row short. Want one more club?"*
- **Coaches your swing from your phone.** The capture page runs MediaPipe Pose in the browser and uploads six body keypoints per frame — no video leaves the phone. The server measures tempo, early extension, and over-the-top, and Alexa+ gives you one concrete feel to work on.
- **Tracks strokes gained and your handicap.** Approach and putting strokes gained against PGA Tour benchmark baselines, plus a World Handicap System index and scoring average from your scored rounds.
- **Plans whole holes.** `plan_hole` works a hole backwards from a comfortable approach distance — what to hit off the tee, whether to go for a par 5 or lay up — from your own carries and risk appetite.
- **Turns weaknesses into a practice plan.** `practice_plan` scores drills against your recurring fault and the part of your game losing the most strokes, then fills the time you have, hardest fix first.
- **Hands you a report card.** End the round and get fairways, approach accuracy, dominant miss, strokes gained, putts, club distances vs. your usual, swing faults, and the trend against earlier rounds — spoken aloud and shown as an MCP App card.

Ten tools, three interactive cards, one running model of your game.

## How we built it

- **Alexa+ add-on → MCP server.** The add-on connects to a remote **Model Context Protocol** server (Streamable HTTP, spec 2025-11-25) exposing ten tools. Alexa+ handles the language; the server owns the golf reasoning, so the intelligence is testable and portable.
- **Domain engine, no framework magic.** Each capability is a pure TypeScript module — dispersion model, caddie engine, strokes gained, hole strategy, practice-plan scorer, handicap, pattern detector, swing analyzer — with a thin tool wrapper on top. That kept it unit-testable: **138 tests**, including end-to-end contract tests that drive the real HTTP server with the MCP SDK client and walk the full OAuth flow.
- **Pose in the browser.** The `/capture` page runs MediaPipe Pose client-side and posts only six keypoints per frame to `/api/swings`. No video is stored or transmitted.
- **AWS.** The server ships as a **container image** on **AWS Lambda** with the **Lambda Web Adapter**, behind an HTTPS **Function URL** (response streaming). State lives in **DynamoDB** (on-demand, single `userId` key). The spoken post-round recap is written by **Amazon Bedrock** (Converse), with a deterministic template fallback when it is not configured. The whole stack is one `sam deploy`.
- **MCP Apps.** Three tools return interactive HTML cards (round report, swing check, practice plan) following the MCP Apps spec — `ui://` resources, the `text/html;profile=mcp-app` content type, and the `ui/*` postMessage handshake.

## Challenges we ran into

- **Making advice feel like a caddie, not a calculator.** The first version read out probabilities. Real value came from folding the golfer's own miss and current streak into one plain sentence — and from raising patterns *unprompted*, which meant every `log_shot` had to return insight in the same response.
- **Swing analysis that respects privacy.** Running pose in the browser and sending only keypoints — never video — kept it private but meant reconstructing tempo, early extension, and over-the-top from sparse 2-D landmarks. We validated the detectors on synthetic pose data for good, over-the-top, early-extension, and rushed swings.
- **MCP Apps card linkage was under-documented.** Wiring a tool result to its UI resource through `_meta.ui.resourceUri` took reading the spec closely; we wrote it up in the friction log and product feedback.
- **Lambda streaming for MCP.** Streamable HTTP over a Lambda Function URL needed the Web Adapter in response-stream mode and a container image rather than a zip — a few doc gaps we logged.

## Accomplishments we're proud of

- A caddie that genuinely personalizes — the same question gives two golfers different clubs because it knows their misses.
- Patterns surfaced *mid-round, unprompted*, the way a human caddie would.
- Private-by-design swing coaching: pose stays in the browser, only keypoints leave the phone.
- Strokes gained and a real WHS handicap index, not vanity stats.
- A clean, fully tested codebase (138 tests, green CI) that deploys to AWS with a single command.

## What we learned

- The hard part of an Alexa+ add-on isn't the tools — it's deciding what the assistant should say *without being asked*. Returning insight alongside every action is what makes it feel alive.
- Keeping the golf logic as pure modules behind thin tools made it trivial to test and would let the same engine back a watch or a phone app.
- Strokes gained is the honest way to tell a golfer where to spend practice time, and it maps cleanly onto an automatic practice plan.

## What's next

- Publish the Alexa+ add-on (`alexa-ai new mcp`) once CLI access opens up, and run the stack in a live AWS account.
- Swap the built-in name-and-PIN account linking for a managed identity provider such as Amazon Cognito.
- Tune the swing thresholds on real range sessions and add face-on detection (sway, hang-back).
- Shot-shape intent (draw/fade) and green-reading from slope.

## Built With

`alexa-plus` · `model-context-protocol` · `typescript` · `node.js` · `express` · `aws-lambda` · `lambda-web-adapter` · `amazon-dynamodb` · `amazon-bedrock` · `aws-sam` · `docker` · `mediapipe` · `vitest`

---

## Testing instructions (for judges)

Requires Node 22+. No AWS account or credentials are needed to run it.

```bash
git clone https://github.com/hammy229/caddie-coach && cd caddie-coach/server
npm install && npm test        # 138 tests
npm run dev                    # http://localhost:3000/mcp
npx @modelcontextprotocol/inspector
# Transport: Streamable HTTP, URL http://localhost:3000/mcp, header x-user-id: demo-user
```

Easiest: open http://localhost:3000/alexa in Chrome, click **Load an earlier round**, then click the demo requests in order (or use the mic). Each one is a real MCP call shown in the traffic panel.

Or with the Inspector: try `start_round`, then `log_shot` three times with `distance_miss_yards: -10` to see a pattern raised unprompted, then `recommend_club`, `plan_hole`, `end_round` and `practice_plan`. The swing capture page is at `http://localhost:3000/capture`. Without `OAUTH_SIGNING_SECRET` the server runs in development mode and takes the user from `x-user-id`; with it, `/mcp` requires an OAuth bearer token (see `README.md`).

## Product Feedback

Paste `docs/PRODUCT_FEEDBACK.md`. It covers each tool used (MCP TypeScript SDK, MCP Apps, Alexa+ MCP Toolkit, AWS Lambda + Web Adapter + SAM, DynamoDB, Bedrock, AWS CLI/SAM CLI, MediaPipe, the OAuth layer): what it was used for, what worked, what needs work, onboarding, and whether I would build with it again. The AWS section lists every AWS service and how it is used, which the AWS Builder challenge asks for.

## Friction log and feature requests (optional, scored)

Paste `docs/FRICTION_LOG.md` (F-1 to F-7, each with task, steps, expected vs. actual, severity, workaround and suggestion) and `docs/FEATURE_REQUESTS.md` (FR-1 to FR-4 with priorities). The rules give up to a 10% bonus for friction logs.

## Open Source challenge fields

- **Contribution URL:** https://github.com/hammy229/alexa-mcp-oauth
- **Project repository URL:** https://github.com/hammy229/caddie-coach
- **GitHub username:** hammy229
- **What I did:** Built and open-sourced `alexa-mcp-oauth`, a standalone, MIT-licensed TypeScript package that gives any self-hosted MCP server the OAuth 2.1 account linking Alexa+ requires. It grew out of the auth layer I first wrote inside Caddie Coach, generalized for any server: multiple clients, a pluggable sign-in step, the Tier 1 `client_credentials` grant and RFC 8707 resource binding, plus a runnable example MCP server, CI on Node 20 and 22, and 39 tests.
- **How it works:** One Express router serves RFC 9728 protected-resource metadata, RFC 8414 server metadata (`S256` only), `/authorize` and `/token`; one middleware (`requireBearer`) protects the MCP endpoint and returns the bare 401 Alexa+ expects. Codes, access tokens and refresh tokens are HMAC-signed and typed, so the server stores nothing and runs unchanged on Lambda or behind a tunnel. Sign-in is a `LoginHandler`: a built-in name + PIN option for demos, or your own check against real users. `tests/alexa-checklist.test.ts` has one `describe` per Alexa+ checklist item, including an end-to-end run with the official MCP SDK client; the PKCE code is checked against the RFC 7636 test vector.
- **Why it matters:** The Alexa+ docs state the account-linking requirements but provide no server that meets them, and auth is where add-ons stall (friction log F-6, feature request FR-1). This turns days of spec reading into `app.use(auth.router)` plus one middleware, documents the trade-offs of stateless tokens honestly, and is usable by every MCP-based Alexa+ entrant.

## Links (fill before submitting)

- **GitHub:** https://github.com/hammy229/caddie-coach
- **Demo video (≤ 3:00, public YouTube/Vimeo):** _add URL_
- **Live MCP endpoint:** optional per the rules (judges test via the repo and video); add if deployed
- **Landing page:** served at `GET /` — _add deployed URL or screenshot_

## Submission notes

- Video rules (see `docs/DEMO_SCRIPT.md`): English, no copyrighted music, no third-party trademarks/course logos, best material first.
- License: MIT (`LICENSE`), detected by GitHub and shown in the repo's About section, as the rules require for public repos.
- The repo was created Oct 14, 2026, inside the submission period, so the "significantly updated" rule for existing projects does not apply.
- Deadline: **Fri Oct 23, 2026, 12:00 PM PT** (2:00 PM CDT). Video under 3:00, public on YouTube or Vimeo, showing it working on Alexa+.

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

- **Primary:** Alexa+ track — a conversational add-on that does something a static skill cannot: it reasons over your own shot history every turn.
- **AWS Builder challenge:** the whole thing runs on AWS — Lambda (container image + Web Adapter), an HTTPS Function URL, DynamoDB, and Amazon Bedrock for the spoken recap.
- **Open Source challenge:** public under the MIT license with a clean history, friction log, and product feedback on the MCP and Alexa+ builder tooling.

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
- **Domain engine, no framework magic.** Each capability is a pure TypeScript module — dispersion model, caddie engine, strokes gained, hole strategy, practice-plan scorer, handicap, pattern detector, swing analyzer — with a thin tool wrapper on top. That kept it unit-testable: **93 tests**, including end-to-end contract tests that drive the real HTTP server with the MCP SDK client.
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
- A clean, fully tested codebase (93 tests, green CI) that deploys to AWS with a single command.

## What we learned

- The hard part of an Alexa+ add-on isn't the tools — it's deciding what the assistant should say *without being asked*. Returning insight alongside every action is what makes it feel alive.
- Keeping the golf logic as pure modules behind thin tools made it trivial to test and would let the same engine back a watch or a phone app.
- Strokes gained is the honest way to tell a golfer where to spend practice time, and it maps cleanly onto an automatic practice plan.

## What's next

- Run the stack in a live AWS account and publish the Alexa+ add-on (`alexa-ai new mcp`).
- OAuth/OIDC via Amazon Cognito with the `resource` parameter, replacing the development `x-user-id` header.
- Tune the swing thresholds on real range sessions and add face-on detection (sway, hang-back).
- Shot-shape intent (draw/fade) and green-reading from slope.

## Built With

`alexa-plus` · `model-context-protocol` · `typescript` · `node.js` · `express` · `aws-lambda` · `lambda-web-adapter` · `amazon-dynamodb` · `amazon-bedrock` · `aws-sam` · `docker` · `mediapipe` · `vitest`

---

## Links (fill before submitting)

- **GitHub:** https://github.com/hammy229/caddie-coach
- **Demo video (≤ 3:00, public YouTube/Vimeo):** _add URL_
- **Live MCP endpoint (Function URL + `/mcp`):** _add after `sam deploy`_
- **Landing page:** served at `GET /` — _add deployed URL or screenshot_

## Submission notes

- Video rules (see `docs/DEMO_SCRIPT.md`): English, no copyrighted music, no third-party trademarks/course logos, best material first.
- License: MIT (`LICENSE`). History is clean and authored under the builder's identity.

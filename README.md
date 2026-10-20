# Caddie Coach

A golf caddie and swing coach for Alexa+ that learns your game: your real distances, your misses, and your swing faults.

> Built for the Amazon Developer "Build, Ship, Shape" Hackathon 2026 (Alexa+ track).

Most golf apps give you generic club charts. Caddie Coach builds a running model of how *you* actually hit each club, uses it with wind, elevation, hazards and your risk tolerance to pick a club and aim point, plans whole holes for you, notices patterns as you log shots, coaches your swing from your phone camera, tracks your strokes gained and handicap, and turns your weaknesses into a practice plan.

> "Alexa, start a round at Butler Park. I'm feeling aggressive today."
> "Alexa, 150 to the pin into a 10 mile an hour wind, water long. What should I hit?"
> "Alexa, 7 iron came up 10 short."
> *"Got it. Your last 3 approach shots came up short by about 10 yards. Want to take one more club?"*
> "Alexa, how should I play this hole? It's a 520 par 5, water left of the green."
> *"Off the tee, driver. Next, lay up and leave 110 in. Then, pitching wedge into the green."*
> "Alexa, how was that swing?"
> *"From the top, your hands moved out toward the ball before they dropped... That's 3 swings in a row coming over the top."*
> "Alexa, I've got 30 minutes at the range. What should I work on?"
> *"You've been coming over the top 3 swings in a row. Headcover gate, 10 minutes: set a headcover just outside the ball..."*
> "Alexa, I'm done. I shot 88."

## How it works

```
                     ┌──────────────────────────────┐
 Alexa+ ── add-on ──►│  Caddie Coach MCP server      │──► DynamoDB (shots, swings, rounds)
                     │  Streamable HTTP, 2025-11-25  │──► Amazon Bedrock (post-round recap)
                     │  10 tools + 3 MCP App cards   │
 Phone camera ──────►│  /capture  →  /api/swings     │
 (pose in browser)   └──────────────────────────────┘
```

- **Personal dispersion model**: per-club mean and spread of carry and lateral miss from your last 20 full swings. Typical amateur numbers are used until a club has 3 logged shots.
- **Caddie engine**: computes the plays-like distance (wind, elevation), then scores every club by the probability of landing in the target zone minus a risk-weighted chance of finding the trouble. Aim is offset for your usual miss and crosswind.
- **Pattern detection**: every `log_shot` checks for streaks (approaches short or long, tee shots missing one side, a club going shorter than usual) and returns them in the same response, so Alexa+ raises them without being asked.
- **Swing analysis**: the capture page runs MediaPipe Pose in the browser and uploads 6 body keypoints per frame (no video). The server measures tempo (backswing to downswing ratio), early extension (loss of spine tilt at impact) and over-the-top (hands moving away from the body faster than they drop at the start of the downswing).
- **Strokes gained**: approach and putting strokes gained against PGA Tour benchmark baselines (Broadie), from the proximity of your logged approaches and the length of your putts.
- **Course strategy**: `plan_hole` works a hole backwards from a comfortable approach distance — which club off the tee, whether to go for a par 5 or lay up — using your own carries and risk appetite.
- **Practice plans**: `practice_plan` scores drills against your recurring swing faults and the part of your game losing the most strokes, then fills the time you have, hardest fix first.
- **Handicap**: a World Handicap System index and scoring average from your scored rounds (course rating and slope when you give them, par otherwise).
- **Post-round report**: fairways, approach accuracy, dominant miss, strokes gained, putts, club distances vs your usual, swing faults, and the trend against earlier rounds. Bedrock writes the spoken recap when configured.
- **MCP Apps**: `end_round` shows a round report card, `analyze_swing` a swing check card, and `practice_plan` a practice plan card.

## Tools

| Tool | What it does |
|---|---|
| `start_round` | Starts a round at a course, optionally with risk tolerance, par, rating and slope |
| `set_risk_tolerance` | Safe, normal or aggressive. Changes how club advice weighs trouble |
| `log_shot` | Records club, target, carry and lateral miss; returns pattern insights |
| `log_putt` | Records a putt and reports putting strokes gained |
| `recommend_club` | Picks a club and aim point from your own dispersion and the conditions |
| `plan_hole` | A shot-by-shot game plan for a hole from your distances and risk |
| `practice_plan` | Builds a practice session from your faults and weakest strokes-gained category |
| `analyze_swing` | Coaches your latest captured swing and compares it with earlier swings |
| `end_round` | Ends the round and returns the report and spoken recap |
| `get_game_profile` | Your distances, misses, swing faults, strokes gained and handicap index |

## Run locally

Requires Node 22+.

```bash
cd server
npm install
npm run dev
# MCP endpoint:  http://localhost:3000/mcp
# Capture page:  http://localhost:3000/capture?user=demo-user
```

Test the tools with the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector
# Transport: Streamable HTTP, URL: http://localhost:3000/mcp, header x-user-id: demo-user
```

The capture page needs camera access, which browsers only allow on `https://` or `localhost`. To use a phone against a local server, put it behind an HTTPS tunnel.

## Configuration

Copy `.env.example` to `.env`. Everything is optional for local runs.

| Variable | Purpose |
|---|---|
| `PORT` | Server port (default 3000) |
| `DDB_TABLE` | DynamoDB table (partition key `userId`, String). Unset = in-memory store |
| `BEDROCK_MODEL_ID` | Bedrock model for the spoken round recap. Unset = template recap |
| `AWS_REGION` | Region for DynamoDB and Bedrock |

## Test

```bash
cd server
npm run lint
npm test
```

93 tests: the stats helpers, dispersion model, caddie engine, strokes-gained baselines, practice-plan and hole-strategy engines, handicap index, pattern detector and swing analyzer (on synthetic pose data for good, over-the-top, early-extension and rushed swings), the narrator and spoken recap, the round report, and end-to-end contract tests that drive the real HTTP server with the MCP SDK client.

## Deploy to AWS

The server ships as a container image and runs on AWS Lambda behind an HTTPS Function URL (via the Lambda Web Adapter), with state in DynamoDB and recaps from Bedrock. One command, with the [SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html) and Docker:

```bash
cd infra
sam build && sam deploy
```

`sam deploy` prints the Function URL; the MCP endpoint is that URL + `/mcp`. Full steps, the Bedrock option and teardown are in [infra/README.md](infra/README.md).

## Connect to Alexa+

Alexa+ needs a remote HTTPS Streamable HTTP endpoint (the Function URL above) and OAuth/OIDC with the `resource` parameter set to the server's canonical URI. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Status

Working: all ten tools, personal model, pattern detection, swing analysis, strokes gained, course strategy, practice plans, handicap index, round report, all three cards, capture page, contract tests, and the SAM deploy stack (Lambda + Function URL + DynamoDB + Bedrock).
In progress: running the stack in a live AWS account, OAuth/OIDC, Alexa+ add-on (`alexa-ai new mcp`), testing the capture page on real swings.

See [docs/SUBMISSION_CHECKLIST.md](docs/SUBMISSION_CHECKLIST.md) for what's done and what's left, and [docs/DEVPOST_SUBMISSION.md](docs/DEVPOST_SUBMISSION.md) for the submission writeup.

## License

MIT. See [LICENSE](LICENSE).

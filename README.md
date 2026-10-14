# Caddie Coach

A golf caddie and swing coach for Alexa+ that learns your game: your real distances, your misses, and your swing faults.

> Built for the Amazon Developer "Build, Ship, Shape" Hackathon 2026 (Alexa+ track).

Most golf apps give you generic club charts. Caddie Coach builds a running model of how *you* actually hit each club, uses it with wind, elevation, hazards and your risk tolerance to pick a club and aim point, notices patterns as you log shots, coaches your swing from your phone camera, and gives you a report after every round.

> "Alexa, start a round at Butler Park. I'm feeling aggressive today."
> "Alexa, 150 to the pin into a 10 mile an hour wind, water long. What should I hit?"
> "Alexa, 7 iron came up 10 short."
> *"Got it. Your last 3 approach shots came up short by about 10 yards. Want to take one more club?"*
> "Alexa, how was that swing?"
> *"From the top, your hands moved out toward the ball before they dropped... That's 3 swings in a row coming over the top."*
> "Alexa, I'm done. I shot 88."

## How it works

```
                     ┌──────────────────────────────┐
 Alexa+ ── add-on ──►│  Caddie Coach MCP server      │──► DynamoDB (shots, swings, rounds)
                     │  Streamable HTTP, 2025-11-25  │──► Amazon Bedrock (post-round recap)
                     │  7 tools + 2 MCP App cards    │
 Phone camera ──────►│  /capture  →  /api/swings     │
 (pose in browser)   └──────────────────────────────┘
```

- **Personal dispersion model**: per-club mean and spread of carry and lateral miss from your last 20 full swings. Typical amateur numbers are used until a club has 3 logged shots.
- **Caddie engine**: computes the plays-like distance (wind, elevation), then scores every club by the probability of landing in the target zone minus a risk-weighted chance of finding the trouble. Aim is offset for your usual miss and crosswind.
- **Pattern detection**: every `log_shot` checks for streaks (approaches short or long, tee shots missing one side, a club going shorter than usual) and returns them in the same response, so Alexa+ raises them without being asked.
- **Swing analysis**: the capture page runs MediaPipe Pose in the browser and uploads 6 body keypoints per frame (no video). The server measures tempo (backswing to downswing ratio), early extension (loss of spine tilt at impact) and over-the-top (hands moving away from the body faster than they drop at the start of the downswing).
- **Post-round report**: fairways, approach accuracy, dominant miss, club distances vs your usual, swing faults, and the trend against earlier rounds. Bedrock writes the spoken recap when configured.
- **MCP Apps**: `end_round` shows a round report card, `analyze_swing` shows a swing check card.

## Tools

| Tool | What it does |
|---|---|
| `start_round` | Starts a round at a course, optionally setting risk tolerance |
| `set_risk_tolerance` | Safe, normal or aggressive. Changes how club advice weighs trouble |
| `log_shot` | Records club, target, carry and lateral miss; returns pattern insights |
| `recommend_club` | Picks a club and aim point from your own dispersion and the conditions |
| `analyze_swing` | Coaches your latest captured swing and compares it with earlier swings |
| `end_round` | Ends the round and returns the report and spoken recap |
| `get_game_profile` | Your real club distances, miss tendencies and most common swing fault |

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

36 tests: the dispersion model, caddie engine, pattern detector and swing analyzer (on synthetic pose data for good, over-the-top, early-extension and rushed swings), the round report, and end-to-end contract tests that drive the real HTTP server with the MCP SDK client.

## Deploy and connect to Alexa+

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Alexa+ needs a remote HTTPS Streamable HTTP endpoint and OAuth/OIDC with the `resource` parameter set to the server's canonical URI.

## Status

Working: all seven tools, personal model, pattern detection, swing analysis, round report, both cards, capture page, contract tests.
In progress: AWS deployment, OAuth/OIDC, Alexa+ add-on (`alexa-ai new mcp`), testing the capture page on real swings.

## License

MIT. See [LICENSE](LICENSE).

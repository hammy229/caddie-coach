# Submission Checklist

Amazon Developer "Build, Ship, Shape" Hackathon 2026 — deadline **Fri Oct 23, 2026, 12:00 PM PT (2:00 PM CDT)**. Official rules: amazonappdev2026.devpost.com/rules.

## Done (in the repo)

- [x] Public repo, MIT license detected by GitHub (shown in the About section)
- [x] MCP server: 10 tools, 3 MCP App cards, Streamable HTTP (spec 2025-11-25)
- [x] Personal dispersion model, caddie engine, pattern detection
- [x] Swing analysis (pose in browser, keypoints only)
- [x] Strokes gained, handicap index, hole strategy, practice plans
- [x] Round report + spoken recap (Bedrock, with template fallback)
- [x] OAuth 2.1 account linking built into the server (PKCE S256, RFC 9728 and RFC 8414 metadata, refresh tokens)
- [x] 145 tests, green CI (lint + test + build on Node 22)
- [x] AWS deploy stack: SAM — Lambda container + Function URL + DynamoDB + Bedrock IAM
- [x] Landing page at `GET /`, README, ARCHITECTURE, FRICTION_LOG, PRODUCT_FEEDBACK, DEMO_SCRIPT
- [x] Devpost writeup drafted (`docs/DEVPOST_SUBMISSION.md`), aligned with the official submission fields
- [x] Setup and run instructions in the README (required)
- [x] Simulated Alexa+ host at `/alexa`: voice in and out, real MCP calls, real MCP Apps cards, traffic log
- [x] Product Feedback for every tool (required), friction log F-1 to F-7 (up to a 10% bonus), feature requests FR-1 to FR-4

## Left

The rules do **not** require a live cloud deploy: judges test via the repo and the video. For the Alexa+ track they accept a **simulated Alexa+ experience**, shown clearly in the video, and that is the path this submission takes: the real `alexa-ai` CLI is gated behind an Amazon-side allowlist (friction log F-7).

1. [x] **Alexa+ experience:** the simulated Alexa+ host at `/alexa`, in front of the real MCP server. Voice in and out, real MCP calls, real MCP Apps cards, traffic log. Tested end to end in Chrome.
2. [ ] **Record the demo video** (under 3:00, English, public on YouTube or Vimeo, no third-party trademarks or copyrighted music). Follow `docs/DEMO_SCRIPT.md`; pre-seed one scored round. Record on the simulator and say on camera that it is a simulated Alexa+ host in front of the real MCP server.
3. [x] **Open Source mini challenge** ($5,000): [hammy229/alexa-mcp-oauth](https://github.com/hammy229/alexa-mcp-oauth), public, MIT (detected by GitHub), CI green, 39 tests. Fields filled in `docs/DEVPOST_SUBMISSION.md`.
4. [ ] **Submit on Devpost.** Paste from `docs/DEVPOST_SUBMISSION.md`; add the video, repo and Open Source links; pick Alexa+ as the track and both mini challenges.
5. [ ] *(Optional, bonus)* **Live AWS deploy.** Blocked by the new account's free-plan service control policy (friction log F-3); upgrade the plan, then `cd infra && sam deploy`. Not needed for AWS Builder eligibility, which asks for documented integrations, but a live endpoint is stronger evidence.

## Verify-before-submit (quick)

```bash
cd server && npm ci && npm run lint && npm test && npm run build
```

All green = the artifact judges will clone is healthy.

## After the hackathon

Delete the `caddie-deploy` IAM access key and the downloaded key CSV.

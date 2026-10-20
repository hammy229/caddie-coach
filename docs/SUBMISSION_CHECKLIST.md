# Submission Checklist

Amazon Developer "Build, Ship, Shape" Hackathon 2026 — deadline **Fri Oct 23, 2026, 2:00 PM CDT**.

## Done (in the repo)

- [x] Public repo, MIT license, clean history under the builder's identity
- [x] MCP server: 10 tools, 3 MCP App cards, Streamable HTTP (spec 2025-11-25)
- [x] Personal dispersion model, caddie engine, pattern detection
- [x] Swing analysis (pose in browser, keypoints only)
- [x] Strokes gained, handicap index, hole strategy, practice plans
- [x] Round report + spoken recap (Bedrock, with template fallback)
- [x] 93 tests, green CI (lint + test + build on Node 22)
- [x] AWS deploy stack: SAM — Lambda container + Function URL + DynamoDB + Bedrock IAM
- [x] Landing page at `GET /`, README, ARCHITECTURE, FRICTION_LOG, PRODUCT_FEEDBACK, DEMO_SCRIPT
- [x] Devpost writeup drafted (`docs/DEVPOST_SUBMISSION.md`)

## Left — outward actions only you can do

Each needs your AWS/Amazon account or identity; none are code gaps.

- [ ] **Deploy to AWS.** Install the SAM CLI, start Docker, `aws sso login` (or `aws configure`), then `cd infra && sam build && sam deploy`. Copy the printed Function URL. *(This machine has Docker but no AWS/SAM CLI and no credentials.)*
- [ ] **Alexa+ add-on.** With Alexa+ for Builders access: `alexa-ai new mcp`, point it at the Function URL + `/mcp`.
- [ ] **OAuth/OIDC (Cognito).** Required by Alexa+ for a remote MCP server; set the `resource` parameter to the server's canonical URI. (Currently a dev `x-user-id` header — intentionally not half-built.)
- [ ] **Record the demo video** (≤ 3:00). Follow `docs/DEMO_SCRIPT.md`. Pre-seed one earlier scored round so trend/strokes-gained/handicap have data. Upload public to YouTube/Vimeo.
- [ ] **Submit on Devpost.** Paste from `docs/DEVPOST_SUBMISSION.md`, add the video + repo + live endpoint links, confirm track + mini-challenges.

## Verify-before-submit (quick)

```bash
cd server && npm ci && npm run lint && npm test && npm run build
```

All green = the artifact judges will clone is healthy.

## Fallback if AWS deploy isn't ready by the deadline

The demo and submission work end-to-end against a **local** server (`npm run dev`, in-memory store) — record the video locally if the live deploy slips. Note the live endpoint as "in progress" in the writeup rather than blocking the submission on it.

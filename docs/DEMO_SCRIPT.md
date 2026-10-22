# Demo Script (under 3:00)

| Time | On screen | Say |
|---|---|---|
| 0:00-0:15 | On the course or range, club in hand | "Every golf app tells me a 7 iron goes 150. Mine doesn't. I miss short, and nobody keeps track of that. So I built a caddie that does." |
| 0:15-0:35 | `/alexa` simulator | "This is Caddie Coach, a golf caddie and swing coach for Alexa+. It learns how *you* hit each club, picks your shot, notices your patterns mid-round, and coaches your swing from your phone's camera. This page is a simulated Alexa+ host talking to the real Caddie Coach server. Every call you'll see is real." |
| 0:35-1:15 | **New golfer** -> **Load an earlier round** -> "Start a round at Butler Park..." -> "150 to the pin..." -> the three short shots | Read each request (or use the mic). On the third shot, pause and let it say the last three approaches came up short. "I didn't ask. It noticed, like a real caddie would." |
| 1:15-1:50 | Real swing: phone propped up, whole body in frame, hit a ball | "The phone runs pose detection in the browser. Only six body points per frame go to the server, never the video." Swing, then ask "How was that swing?" and show the swing card: tempo, faults, one feel to work on. |
| 1:50-2:15 | "I'm done. I shot 88." -> report card; "I've got 30 minutes at the range..." -> practice card | "End of the round: fairways, strokes gained, and how I did against my last round. Then it builds a practice plan from whatever is costing me the most strokes." |
| 2:15-2:45 | README / architecture, MCP traffic panel | "Under the hood: a TypeScript MCP server with ten tools and three MCP App cards, the way Alexa+ add-ons work. Amazon Bedrock writes the spoken summary. DynamoDB stores each golfer's history. It's built to run on Lambda, defined in one SAM template. Login is OAuth 2.1, which I also released as an open-source package for other Alexa+ developers. 145 tests." |
| 2:45-2:55 | Back on the range | "A caddie that learns how you actually play. Caddie Coach." |

Keep the request order: "150 to the pin..." sets the target distance that "7 iron came up 10 short" relies on.

## Recording setup

- `cd server && npm run dev`, open http://localhost:3000/alexa in Chrome. Say on camera that it is a simulated Alexa+ host in front of the real MCP server; the rules require the simulation to be clear.
- Real swing: the camera needs HTTPS, so run `cloudflared tunnel --url http://localhost:3000` and open the printed https URL on the phone, at the same path as the "swing capture page" link under the device (`/capture?user=<golfer id>`), so the swing lands on the same golfer.
- Phone about 3 m away, facing you, whole body in frame. Tap record, swing, then ask "How was that swing?" on the laptop. Do a test swing before recording.

Rules: under 3:00, public YouTube or Vimeo, English, no copyrighted music, no third-party trademarks (no course or brand logos in frame), best material first.

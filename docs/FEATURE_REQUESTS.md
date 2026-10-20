# Feature Requests

Template: description, why it matters, priority (Critical / Important / Nice-to-have).

### FR-1: Reference OAuth server (or Cognito recipe) for Alexa+ MCP account linking
- **Description:** A minimal, runnable auth server that passes the Alexa+ MCP account-linking checklist (bare 401, RFC 9728 metadata, RFC 8414 metadata with `S256`), or a step-by-step Cognito configuration that does.
- **Why it matters:** Account linking is the step most likely to block an add-on, and the docs list requirements without a working example. This project had to write and test its own (`server/src/auth/oauth.ts`).
- **Priority:** Critical

### FR-2: Which MCP Apps features Alexa+ renders
- **Description:** A support matrix for MCP Apps on Alexa+ devices: which `ui://` cards render on which Echo Show sizes, and which postMessage notifications (`ui/notifications/tool-result`, `ui/notifications/tool-input`) the host sends.
- **Why it matters:** Caddie Coach returns three cards (round report, swing check, practice plan). Without a matrix the only way to know what a golfer sees is to test on every device.
- **Priority:** Important

### FR-3: Typed MCP Apps helper in the MCP TypeScript SDK
- **Description:** A `registerAppTool` (or similar) that takes the tool and its UI resource together and sets `_meta.ui.resourceUri` and the `text/html;profile=mcp-app` MIME type for you.
- **Why it matters:** Both strings live only in the spec today; a typo silently drops the card.
- **Priority:** Nice-to-have

### FR-4: Clear plan-limit errors on new AWS accounts
- **Description:** When a free-plan service control policy denies a call, name the plan and link the upgrade page in the error; show account-verification status on the console home.
- **Why it matters:** A new `AdministratorAccess` user was denied CloudFormation, Lambda and DynamoDB with a generic SCP error, and Bedrock calls failed during account verification while read-only Bedrock APIs worked (friction log F-3, F-4).
- **Priority:** Important

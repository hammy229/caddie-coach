# Security

Please report security problems privately through GitHub: **Security → Report a vulnerability** on this repository (https://github.com/hammy229/caddie-coach/security/advisories/new). Do not open a public issue. I will reply as soon as I can.

## Deploying safely

- **Turn OAuth on for any public deploy.** Without `OAUTH_SIGNING_SECRET`, `/mcp` trusts the `x-user-id` header, so anyone who can reach the server can act as any golfer. The server refuses to start that way on AWS Lambda or with `NODE_ENV=production` (override: `ALLOW_INSECURE_DEV_AUTH=1`, for throwaway tests only).
- **Never commit secrets.** Pass the OAuth secrets as `sam deploy --parameter-overrides` (they are `NoEcho`) and keep AWS credentials in `~/.aws`, not in this repository. `.env` is git-ignored.
- **The simulated Alexa+ host (`/alexa`) and `/api/intent` exist only in development mode** and are not served when OAuth is on.
- **Name + PIN account linking is demo-grade.** Anyone who knows a golfer's name and PIN reaches their data; use a real identity provider for real users.

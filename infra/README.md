# Deploying Caddie Coach to AWS

The MCP server ships as a container image and runs on **AWS Lambda** behind an **HTTPS
Function URL**, using the [AWS Lambda Web Adapter](https://github.com/awslabs/aws-lambda-web-adapter)
to run the unmodified Express app. Per-user state lives in **DynamoDB**; the spoken
round recap is written by **Amazon Bedrock** (with a templated fallback).

```
Alexa+  ──HTTPS──▶  Lambda Function URL (RESPONSE_STREAM)
                     └─ container: Express + MCP SDK (Streamable HTTP, 2025-11-25)
                          ├─ DynamoDB  (per-user golfer state)
                          └─ Bedrock   (post-round recap, optional)
```

## Prerequisites

- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
- Docker running (SAM builds the image locally, then pushes to ECR)
- AWS credentials configured (`aws configure`) — the hackathon uses the **free tier**;
  Lambda, a Function URL and on-demand DynamoDB cost ~nothing at demo scale.
- (Optional) Bedrock model access enabled in the console for the model you pass.

## Deploy

```bash
cd infra
sam build            # builds server/Dockerfile for arm64
sam deploy           # uses samconfig.toml; confirms the changeset

# With Bedrock recaps (request model access first in the Bedrock console):
sam deploy --parameter-overrides BedrockModelId=us.anthropic.claude-3-5-haiku-20241022-v1:0
```

`sam deploy` prints two outputs:

- **McpEndpoint** — the Function URL. The MCP endpoint is this URL + `/mcp`.
- **TableName** — the DynamoDB table.

## Verify the live endpoint

```bash
URL=<McpEndpoint output>

curl -s "$URL/health"          # {"ok":true}

curl -s -X POST "$URL/mcp" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H 'x-user-id: test-golfer' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

The swing-capture page is served at `$URL/capture`.

## Auth note

The Function URL is deployed with `AuthType: NONE` so it is reachable for testing and for
the Alexa+ add-on, which performs OAuth/OIDC at the add-on layer. For a private deploy,
switch `FunctionUrlConfig.AuthType` to `AWS_IAM` in `template.yaml`, or front the function
with an OAuth-validating gateway. Until then the server derives the user id from the
`x-user-id` header; in production that becomes the `sub` claim of the validated token.

## Teardown

```bash
sam delete
```

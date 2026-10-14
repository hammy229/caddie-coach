# Caddie Coach MCP server as a Lambda container image.
# The AWS Lambda Web Adapter runs the unmodified Express app behind a Function URL,
# so the same image also runs on App Runner, ECS or plain Docker with no code change.

FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:22-slim
# Lambda Web Adapter: bridges Lambda's runtime API to a normal HTTP server.
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:1.1.0 /lambda-adapter /opt/extensions/lambda-adapter
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8080 \
    AWS_LWA_INVOKE_MODE=response_stream \
    AWS_LWA_READINESS_CHECK_PATH=/health
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
EXPOSE 8080
CMD ["node", "dist/src/index.js"]

# Contributing

## Setup

```bash
cd server
npm install
npm run lint && npm test
```

## Conventions

- **Commits**: Conventional Commits, `<type>(<scope>): <summary>` (72 chars max).
  Types: `feat`, `fix`, `test`, `docs`, `refactor`, `chore`, `ci`, `perf`, `build`.
  Scopes: `server`, `tools`, `apps`, `state`, `addon`, `skills`, `infra`, `aws`, `docs`, `ci`.
- One logical change per commit. Lint and tests pass on every commit.
- Branch as `feat/<name>`; merge with a merge commit or rebase, not squash.
- Tools are `snake_case` verbs, one per file in `server/src/tools/`, with a strict zod input schema and a clear description (Alexa+ uses it to decide when to call the tool).
- Every new tool needs input validation, a test, and a row in the README tools table.
- Golf logic lives in `server/src/domain/` with no MCP or HTTP imports, so it is unit-testable.
- Never commit secrets. Use `.env` and keep `.env.example` current.
- MCP spec target is `2025-11-25` over Streamable HTTP. No legacy HTTP+SSE.

## Reporting problems

Use `docs/FRICTION_LOG.md` for platform and tooling friction, and open an issue for bugs.

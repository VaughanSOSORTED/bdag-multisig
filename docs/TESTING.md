# Testing

Automated tests cover the highest-risk treasury paths first. Coverage thresholds are enforced in package `test:coverage` scripts and Cloud Build runs tests before the web image build.

## Commands

```bash
# Web (Vitest) — Safe config validators, activity helpers, API client, UI smoke
cd apps/web
npm ci
npm test
npm run test:coverage

# API (Vitest) — safeSecurity + Fastify inject on propose/sign/executed
cd apps/api
npm ci
npm test
npm run test:coverage

# Contracts (Hardhat) — BdagVote rules and custody separation
cd contracts
npm ci
npm test
```

## Coverage floors

| Package | Scope | Floor |
| --- | --- | --- |
| `apps/web` | `src/lib/**` (excl. wallet Protocol Kit wrappers) | ~40% lines |
| `apps/api` | `src/**` (excl. `server.ts` / `db.ts` bootstrap) | ~40% lines |

Raise floors as more suites land. Prefer unit tests for validation/encoding and mocked inject tests for HTTP; avoid MetaMask E2E in CI for now.

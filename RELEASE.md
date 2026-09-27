# Release notes — test coverage baseline

This document describes the automated testing baseline introduced with the Safe dashboard / fund-execute UX work. Use it when cutting the next release after [CHANGELOG.md](./CHANGELOG.md) **Unreleased** is published.

For day-to-day commands and coverage floors, see [docs/TESTING.md](./docs/TESTING.md).

---

## Why this release includes tests

Before this work, the repository had **no automated tests**. Production safety relied on manual QA and successful `next build` / `tsc` only. Cloud Build built the web Docker image without running a test suite.

Treasury bugs in validation, signature verification, or Safe config encoding are high impact. This release establishes a **minimum automated net** around those paths and wires it into CI.

---

## What was added

### Web (`apps/web`) — Vitest

- **Lib unit tests:** `safeConfig` (owner/threshold validation + calldata encoding), `safeActivity` helpers, `api` client (mocked `fetch`).
- **UI smoke:** `TxCard` keeps Execute visible but disabled when the signature threshold is unmet; `SafeGovernance` explains the feature is not implemented.
- Scripts: `npm test`, `npm run test:coverage`.
- Coverage scoped primarily to `src/lib/**`, with a ~40% line floor (see Vitest config).

### API (`apps/api`) — Vitest + Fastify inject

- **`safeSecurity`:** mock on-chain reads; reject missing Safe, hash mismatch, non-owner; accept valid owner signatures.
- **Routes:** propose missing fields / stale nonce / happy path; signatures upsert and stale marking; executed hash validation and `ExecutionSuccess` matching.
- App factory (`createApp`) and `db` module so routes can be tested without Cloud SQL.
- Scripts: `npm test`, `npm run test:coverage` (~40% floor on `src`, excluding bootstrap-only files).

### Contracts (`contracts`) — Hardhat

- **`BdagVote` suite:** treasury-only create, duration bounds, weighted vote + double-vote, no voting power, voting closed, `passed()`, `markExecuted` / `setQuorum` access, and assertion that pass/mark-executed does **not** move treasury funds.
- Helper `MockERC20` for vote weight.
- Script: `npm test`.

### CI

[cloudbuild.yaml](./cloudbuild.yaml) now runs, in order:

1. `apps/web` — `npm ci && npm run test:coverage`
2. `apps/api` — `npm ci && npm run test:coverage`
3. `contracts` — `npm ci && npm test`
4. Docker build of the web image (unchanged args)

A failing test suite fails the Cloud Build before a new web image is published.

---

## What is intentionally not covered yet

- Full MetaMask / BlockDAG E2E (flaky and slow in CI).
- Protocol Kit wallet flows (`proposeConfigTx`, live Safe deploy).
- Entire Next.js pages (large client components); prefer lib + inject tests first.
- Live governance voting UI (placeholder only until `BdagVote` is deployed and wired).

These remain on [ROADMAP.md](./ROADMAP.md) under **Next → Grow test coverage**.

---

## How to verify before merge / release

```bash
cd apps/web && npm ci && npm run test:coverage
cd ../api && npm ci && npm run test:coverage
cd ../../contracts && npm ci && npm test
```

Confirm Cloud Build includes the three test steps above on the next deploy.

---

## Suggested next version notes

When promoting **Unreleased** to a numbered release (for example `1.1.0`):

1. Move the Unreleased bullets in [CHANGELOG.md](./CHANGELOG.md) under the new version heading with today’s date.
2. Mention this testing baseline in the GitHub release body (link here and to [docs/TESTING.md](./docs/TESTING.md)).
3. Keep raising coverage floors as suites grow — do not drop Cloud Build test steps.

# Roadmap

Product and engineering priorities for **BDAG Multisig** after the v1.0 production launch on BlockDAG Mainnet.

Status key: **Now** (next work) · **Next** (near-term) · **Later** (valuable, not blocking) · **Won't** (explicitly out of scope for now)

---

## Goals

1. Keep the live treasury app reliable and non-custodial.
2. Harden chain/RPC assumptions with detection and redundancy so misconfiguration or a dead RPC cannot silently break the app.
3. Close the gap between shipped Safe ops and optional governance / richer tx types.
4. Make deploys and ops repeatable without tribal knowledge.
5. Keep automated tests protecting propose / sign / execute and Safe config validation.

---

## Recently shipped (this cycle)

Landed on the fund/execute UX branch (see [CHANGELOG.md](./CHANGELOG.md) Unreleased):

- Dashboard tabs (Fund / Propose / History / Gov / Settings) and simpler Fund / Propose flows.
- Owner / threshold config proposals from Settings.
- History from on-chain logs + service records; rate-limit-aware fetching.
- Automated Vitest (web + API) and Hardhat (`BdagVote`) suites; Cloud Build runs tests before image build.
- Docs: [docs/TESTING.md](./docs/TESTING.md), [RELEASE.md](./RELEASE.md).

---

## Now

### RPC detection and redundancy

**Problem:** Web and API each use a single RPC URL. There is no allowlist, no runtime detection that the endpoint is BlockDAG `1404`, and no failover if the primary RPC is down or wrong.

**Target outcome:**

- **Detection**
  - On startup (API) and client init (web), call `eth_chainId` on the configured RPC and require `0x57c` / `1404`.
  - Reject misconfigured or non-BlockDAG endpoints before any Safe read/write.
  - Surface a clear UI/API error when detection fails (wrong chain, unreachable, timeout).
- **Allowlist**
  - Maintain an allowlist of known-good BlockDAG community / production RPCs.
  - Fail fast if configured `NEXT_PUBLIC_RPC_URL` / `RPC_URL` is not on the allowlist.
- **Redundancy**
  - Support an ordered RPC list (primary + secondaries) for read clients.
  - Automatic failover when the primary fails health/detection checks; prefer the first healthy allowlisted endpoint.
  - Optional periodic re-probe so a recovered primary can be preferred again.
- **Docs / ops**
  - Document how to rotate or add RPCs without a silent wrong-chain risk.
  - Keep wallet-side chain checks (`eth_chainId` on MetaMask) in addition to app RPC detection.

### Release hygiene

- Tag `v1.0.0` to match [CHANGELOG.md](./CHANGELOG.md) (if not already tagged on GitHub).
- Cut the next release from Unreleased once this PR lands (see [RELEASE.md](./RELEASE.md)).
- Keep changelog entries current with each meaningful merge to `main`.

---

## Next

### Grow test coverage

- Raise Vitest coverage floors on `apps/web/src/lib` and `apps/api/src` toward ~60%.
- Expand inject tests for history listing and edge-case executed receipts.
- Optional Playwright smoke against a stubbed API (no MetaMask in CI yet).

### Transaction UX beyond native BDAG sends

- Arbitrary calldata / contract-interaction proposals in the UI (API already stores `data`).
- Clearer review screens (decoded intent where possible, explorer links, nonce / threshold progress).
- Better history filters (pending / executed / stale).

### Governance (BdagVote)

- Decide whether Community Treasury governance is in scope for production.
- If yes: deploy `BdagVote` + vote token wiring; write addresses into `blockdag.json`; replace the Gov placeholder with live UI.
- Keep the security model: votes never move funds; Safe owners still must sign and execute.

### Deploy automation clarity

- Document (or add) the API Cloud Build / Cloud Run path the same way web is covered by `cloudbuild.yaml`.
- Optional: trigger Cloud Build from `main` with a documented manual approval step.
- Keep secrets in Secret Manager only; never in git.

### Observability

- Structured API logging around propose / sign / execute failures.
- Basic uptime checks for web, API `/health`, and RPC `eth_chainId`.
- Alerting when the primary RPC fails health checks.

---

## Later

### Product

- Multi-asset balances beyond optional ERC-20 token display.
- Shared Safe bookmarks / recent Safes in the UI (local preference only).
- Mobile wallet UX polish (network switch prompts, clearer denied-owner states).
- Internationalisation if community demand appears.

### Platform

- Staging environment on a non-mainnet or isolated Safe set.
- Rate limiting / abuse controls on public API propose/sign endpoints.
- Formal threat model doc (RPC trust, API trust, Safe contract trust boundaries).

### Alternate hosting

- Keep DigitalOcean / SQLite docs as an optional self-host path only.
- Do not divert production GCP architecture unless there is a clear ops reason.

---

## Won't (for now)

- Custodial key management or server-side signing of Safe transactions.
- Modifying Safe core contract logic.
- Redeploying the existing BDAG Community Treasury Safe.
- Treating governance passage as automatic treasury execution.

---

## Suggested sequencing

| Order | Item | Why first |
| --- | --- | --- |
| 1 | RPC detection + allowlist + redundancy / failover | Correctness and availability of every on-chain read/write path |
| 2 | Raise coverage floors + expand API/web suites | Protect the new dashboard and config paths |
| 3 | API deploy docs / parity with web Cloud Build | Ops can ship API changes safely |
| 4 | Richer tx proposals | Unlocks real treasury ops beyond simple sends |
| 5 | BdagVote production wiring | Only if community governance is an active requirement |
| 6 | Observability + staging | Scale confidence after core paths are solid |

---

## How to use this doc

- Move completed items into [CHANGELOG.md](./CHANGELOG.md) under the next release section.
- Prefer small PRs that land one roadmap row at a time.
- If priorities change, update this file in the same PR as the decision — do not leave roadmap drift in chat only.

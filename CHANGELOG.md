# Changelog

All notable changes to BDAG Multisig are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/) once releases are tagged.

## [Unreleased]

### Added

- Safe dashboard tabs: **Fund**, **Propose**, **History**, **Gov**, **Settings** with `?tab=` deep links.
- Fund flow: deposit-from-wallet main path; sidebar for balances, refresh, copy/share address, and continue to Propose.
- Propose flow: approval queue as default; **New Proposal** opens the create form separately.
- Settings: propose add/remove owner and change threshold (`safeConfig.ts` + `SafeSettings`), with per-section info tips.
- History tab: on-chain activity merge (`safeActivity.ts`) with rate-limit-aware log chunking.
- Governance tab: placeholder explaining token-weighted signalling is not implemented and never moves Safe funds.
- Disconnect wallet control (including `wallet_revokePermissions` when supported) and quieter session restore via `eth_accounts`.
- Local Next.js `/backend` proxy for API calls (strips Origin) to ease CORS during development.
- Automated test suites (Vitest web/API, Hardhat `BdagVote`) and Cloud Build test steps before the web image build.
- [docs/TESTING.md](./docs/TESTING.md) and [RELEASE.md](./RELEASE.md) for coverage floors and release notes on testing.

### Changed

- TxCard always shows Execute; disabled with clear copy when threshold is unmet or Safe is underfunded.
- Safe Details side panels removed from the main body (stats tiles + Fund sidebar cover the same facts).
- Smaller dashboard header logo and title to reduce vertical chrome.
- API app split into `createApp()` + `db` module for testability.

### Fixed

- Wallet session no longer flashes the access gate on MetaMask `accountsChanged` / soft re-checks.
- Config proposals (zero-value calldata) display description instead of “0 BDAG”.

### Planned

- See [ROADMAP.md](./ROADMAP.md).

---

## [1.0.0] - 2026-09-27

First production release of BDAG Multisig on BlockDAG Mainnet (chain ID `1404`).

Live application: https://multisig.bdagsosorted.co.uk

### Added

- Next.js web app for creating and managing Safe-based multisigs on BlockDAG.
- Multisig creation flow: connect wallet, add owners, set threshold, deploy Safe.
- Safe dashboard (`/safe/[address]`): balance, owners, threshold, propose / sign / execute.
- Owner and chain-ID gates before treasury operations (wallet must be on chain `1404`).
- Native BDAG transfer proposals via Safe Protocol Kit.
- Fastify signature API storing proposals and signatures in PostgreSQL (non-custodial).
- On-chain verification of Safe transaction hashes, owner signatures, and nonce freshness.
- Stale-proposal handling when Safe nonce advances.
- Execution confirmation via Safe `ExecutionSuccess` events.
- Landing page with entry to the BDAG Community Treasury (`0x171b…7368`).
- Token-weighted governance contract (`BdagVote.sol`) and `/vote/[address]` UI scaffold.
- Safe infrastructure addresses for BlockDAG Mainnet in `contracts/deployments/blockdag.json`.
- Production hosting on Google Cloud Run (web + API), Cloud SQL, Firebase Hosting.
- Cloud Build config for the web container image (`cloudbuild.yaml`).
- Downloadable BDAG Multisig user guide (PDF).
- Production README, contract-deploy docs, and security / non-custody notes.

### Changed

- Production docs oriented to Google Cloud + Firebase (primary path).
- Contract-deploy guidance updated to community RPCs (not bdagscan) and chain `1404`.

### Notes

- DigitalOcean / SQLite droplet docs remain under `docs/` as an alternate historical path; they are not the live production architecture.
- `BdagVote` / vote-token addresses are not present in the production deployment JSON; the voting UI is inactive until those are deployed and wired.
- Application RPC usage is a single configured endpoint (`NEXT_PUBLIC_RPC_URL` / `RPC_URL`) with no failover allowlist yet.

---

## [0.1.0] - 2026-09-19

### Added

- Initial repository scaffolding and early application upload.
- Collaborator access-check PR flow.
- Draft DigitalOcean droplet deploy and SQLite-vs-Postgres guidance.
- Early contract-deploy notes and community-RPC documentation fixes.

---

[Unreleased]: https://github.com/VaughanSOSORTED/bdag-multisig/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/VaughanSOSORTED/bdag-multisig/releases/tag/v1.0.0
[0.1.0]: https://github.com/VaughanSOSORTED/bdag-multisig/releases/tag/v0.1.0

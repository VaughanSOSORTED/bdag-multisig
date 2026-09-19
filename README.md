# bdag-multisig

Safe-based multisig treasury for BlockDAG with token-gated voting and a
treasury dashboard. Safe's audited contracts are deployed unmodified; all
custom code lives in the app layer and one small voting contract.

## Layout

- `contracts/` — deploy-only. Pinned Safe release + `BdagVote.sol`.
- `apps/web/` — Next.js 14 + wagmi/viem + Safe Protocol Kit.
- `apps/api/` — Fastify + Postgres. Stores proposals/signatures only. No custody.

## Voting model

`BdagVote` records token-weighted sentiment (one vote per address, weight =
ERC20 balance at vote time). Passing a vote does NOT execute anything on its
own: the outcome is queued as a Safe transaction and the multisig owners sign
and execute it. This is the Snapshot + Safe pattern, fully onchain.

## Setup

1. `cd contracts && npm i` (installs pinned `@safe-global/safe-smart-account`)
2. Copy `.env.example` to `.env`, fill in BlockDAG testnet RPC + deployer key
3. `npx hardhat run scripts/deploy-safe.ts --network blockdag` — writes
   `deployments/blockdag.json`
4. `npx hardhat run scripts/deploy-vote.ts --network blockdag` — deploys
   `BdagVote` pointed at your Safe
5. `cd ../apps/api && npm i && npm run dev` (needs a Postgres URL; run
   `src/db/schema.sql` first)
6. `cd ../apps/web && npm i && npm run dev`

## Build order

1. Testnet: deploy Safe contracts, verify on explorer, create a 1-of-1 Safe
2. Send/receive BDAG, then the 2-of-3 propose/sign/execute flow
3. Treasury dashboard (balances, pending, history, ERC-20 support)
4. Deploy the vote token + BdagVote, wire the voting UI to the same Safe
5. Mainnet with small amounts only, after an independent review

## Security

- Never edit Safe's code. Pin one audited release.
- Chain ID is inside every EIP-712 domain (anti-replay) — don't strip it.
- Show owners exactly what they sign. No blind signing.
- No private keys on the server. Only browser wallets sign.

## Docs

- [`docs/digitalocean-deploy.md`](docs/digitalocean-deploy.md) — droplet deploy pattern (GHCR, Compose, nginx/TLS), AI prompts, troubleshooting
- [`docs/sqlite-vs-postgres.md`](docs/sqlite-vs-postgres.md) — why SQLite for v1 and how to migrate the API off Postgres

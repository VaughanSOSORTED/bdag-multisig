# Contract deploy → wire into Docker

How to deploy the Safe stack and `BdagVote` from a **laptop you control**, using a **community RPC**, then feed those addresses into the **web Docker image**.

This is **not** done on the DigitalOcean droplet. The droplet never holds `DEPLOYER_PRIVATE_KEY`.

Related:

- [sqlite-vs-postgres.md](./sqlite-vs-postgres.md) — API storage
- [digitalocean-deploy.md](./digitalocean-deploy.md) — GHCR / droplet / TLS

---

## What gets deployed

| Step | What | Who pays gas | Output |
|------|------|--------------|--------|
| 1 | Safe infrastructure (`SafeL2`, `SafeProxyFactory`, `MultiSend`, `MultiSendCallOnly`, `CompatibilityFallbackHandler`) | Deployer EOA | Addresses in `contracts/deployments/blockdag.json` |
| 2 | Create a Safe **proxy** (1-of-1 or N-of-M) via the UI or Protocol Kit | Creator’s wallet | A Safe address (treasury) |
| 3 | `BdagVote` (+ point at vote ERC-20 + treasury Safe) | Deployer EOA | `BdagVote` + `VoteToken` in the same JSON |

Pinned Safe release only — **do not edit** audited Safe sources. See root README security notes.

---

## Accounts and keys (read this first)

| Key / wallet | Where it lives | Purpose |
|--------------|----------------|---------|
| **Deployer EOA** | Laptop only (password manager / hardware). `DEPLOYER_PRIVATE_KEY` in local `contracts/.env` | Pays gas for factory + `BdagVote` deploys |
| **Safe owners** | Each owner’s browser wallet | Propose / sign / execute treasury txs |
| **Droplet / Docker / CI** | **No** deployer key | Only public RPC URL, chain ID, explorer, **contract addresses** |

Rules:

1. Generate or use a deployer wallet **you** control.
2. Fund it with enough native BDAG on the target chain for several contract creates.
3. Put the key only in **local** env (never commit `.env`, never put it in GitHub Actions secrets unless you fully understand the risk — prefer laptop deploys).
4. After deploy, you only need the **addresses** in Docker/CI.

---

## Community RPC endpoints

Point Hardhat and the web app at a public / community RPC for the chain you intend to use. Confirm `eth_chainId` matches before deploying.

### BlockDAG mainnet (typical production target)

| Setting | Example |
|---------|---------|
| Chain ID | `1404` |
| RPC | `https://rpc.bdagscan.com/` (same family as MetaMask community setups) |
| Explorer | `https://bdagscan.com` |

### Testnet / alternate

Use the current official testnet RPC and chain ID from BlockDAG docs if you are not ready for mainnet. The repo scaffold historically used placeholders (`CHAIN_ID=991` etc.) — **replace those with real values** from docs before you spend real funds.

### RPC gotchas

- Some community RPCs (including mainnet) may return **Cloudflare / HTML** to bare Node scripts or datacenter IPs. If Hardhat says invalid JSON-RPC:
  - Retry without VPN
  - Try from a residential network
  - Or use another documented community RPC that allows your IP
- Always verify:

  ```bash
  # example: cast or curl eth_chainId
  curl -s -X POST "$RPC_URL" -H 'content-type: application/json' \
    --data '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}'
  ```

  Decode the hex result and confirm it matches `CHAIN_ID` in `.env`.

---

## Phase A — Local Hardhat env (laptop)

```bash
cd contracts
cp ../.env.example .env   # or create contracts/.env
npm install
```

Set at least:

```bash
# Laptop only — never copy this file to the droplet
RPC_URL=https://rpc.bdagscan.com/
CHAIN_ID=1404
EXPLORER_URL=https://bdagscan.com
DEPLOYER_PRIVATE_KEY=0xYOUR_DEPLOYER_KEY_WITHOUT_SHARING_IT

# After you have a Safe treasury + vote token (Phase C):
# VOTE_TOKEN=0x...
# TREASURY=0x...          # Safe proxy address
# QUORUM=100              # whole tokens, see deploy-vote.ts
```

Confirm the deployer has balance on that chain before continuing.

---

## Phase B — Deploy Safe infrastructure

```bash
cd contracts
npx hardhat run scripts/deploy-safe.ts --network blockdag
# or: npm run deploy:safe
```

This writes / updates `contracts/deployments/blockdag.json` with:

- `chainId`
- `SafeL2`, `SafeProxyFactory`, `MultiSend`, `MultiSendCallOnly`, `CompatibilityFallbackHandler`

**Commit that JSON** (addresses are public). Do **not** commit `.env`.

Optional: verify each contract on the explorer (Standard JSON Input / whatever the explorer supports).

---

## Phase C — Create a treasury Safe + deploy BdagVote

1. Run the web app (or a small script) against the new factories and create a Safe with the owners/threshold you want.
2. Note the **Safe proxy address** → this is `TREASURY`.
3. Decide the **vote weight ERC-20** (`VOTE_TOKEN`) — existing token or one you deploy separately.
4. Deploy the vote contract:

```bash
cd contracts
VOTE_TOKEN=0x... TREASURY=0x... QUORUM=100 \
  npx hardhat run scripts/deploy-vote.ts --network blockdag
```

`deploy-vote.ts` merges `BdagVote` and `VoteToken` into `deployments/blockdag.json`.

Commit the updated JSON again.

---

## Phase D — How the web app learns addresses today

Two mechanisms exist in the scaffold:

1. **Import JSON** — `apps/web` imports `contracts/deployments/blockdag.json` for Safe singletons and `BdagVote` (see `apps/web/src/lib/safe.ts`, `voting.ts`).
2. **Env** — chain/RPC/explorer (and ideally vote addresses) via `NEXT_PUBLIC_*`.

For Docker, **both** must be consistent inside the **web image**:

| Value | How it should reach Docker |
|-------|----------------------------|
| `NEXT_PUBLIC_RPC_URL` | CI build-arg / Actions variable |
| `NEXT_PUBLIC_CHAIN_ID` | CI build-arg |
| `NEXT_PUBLIC_EXPLORER_URL` | CI build-arg |
| Safe singleton addresses | Committed `deployments/blockdag.json` **copied into the image**, and/or future `NEXT_PUBLIC_SAFE_*` env |
| `BdagVote` / vote token | JSON import and/or `NEXT_PUBLIC_BDAG_VOTE` + `NEXT_PUBLIC_BDAG_VOTE_TOKEN` |

Because Next.js inlines `NEXT_PUBLIC_*` at **build** time, changing addresses or RPC means **rebuild and redeploy the web image** (new GHCR tag → `docker compose pull`).

The API container does **not** need contract addresses for basic propose/sign storage — only the browser talks to chain + Safe.

---

## Phase E — Wire addresses into Docker / GHCR

### E.1 Commit artifacts

```text
contracts/deployments/blockdag.json   # real addresses, committed
apps/web Dockerfile                   # COPY that JSON (or whole contracts/deployments)
```

Ensure the web Docker build context can see the JSON path used by the imports (or change imports to env — see AI prompt below).

### E.2 GitHub Actions variables (examples)

Set in the repo **Settings → Secrets and variables → Actions → Variables**:

| Variable | Example |
|----------|---------|
| `NEXT_PUBLIC_RPC_URL` | `https://rpc.bdagscan.com/` |
| `NEXT_PUBLIC_CHAIN_ID` | `1404` |
| `NEXT_PUBLIC_EXPLORER_URL` | `https://bdagscan.com` |
| `NEXT_PUBLIC_API_URL` | `https://your.domain/api` |
| `NEXT_PUBLIC_BDAG_VOTE` | `0x…` from `blockdag.json` |
| `NEXT_PUBLIC_BDAG_VOTE_TOKEN` | `0x…` |

Pass them as `build-args` in the web image job (see [digitalocean-deploy.md](./digitalocean-deploy.md) Phase 2).

### E.3 Droplet `.env`

Runtime env on the server should **not** include `DEPLOYER_PRIVATE_KEY`.  
It may include API settings (`DATABASE_PATH`, `PORT`).  
Web runtime cannot change baked `NEXT_PUBLIC_*` — rebuild the image instead.

### E.4 Rollout

```bash
# after merge to main + green Actions
ssh droplet
cd /opt/bdag-multisig
git pull
docker compose pull
docker compose up -d
```

Confirm in the browser wallet that chain ID and RPC match, then open the Safe / vote flows against the new addresses.

---

## End-to-end checklist

- [ ] Deployer wallet funded on the target community RPC / chain
- [ ] `eth_chainId` matches `CHAIN_ID`
- [ ] `deploy-safe` → `blockdag.json` committed
- [ ] Treasury Safe created; owners set
- [ ] `deploy-vote` → JSON updated and committed
- [ ] CI variables set for `NEXT_PUBLIC_*`
- [ ] Web image rebuild includes JSON + env
- [ ] Droplet pulled new `:web` image
- [ ] No deployer key on droplet or in git

---

## Prompt you can paste to your AI

```text
Add / improve contract deploy → Docker wiring for this repo:

1. Document (or implement) deploying Safe factories via scripts/deploy-safe.ts
   and BdagVote via scripts/deploy-vote.ts against a community RPC
   (env: RPC_URL, CHAIN_ID, DEPLOYER_PRIVATE_KEY on the laptop only).

2. Ensure contracts/deployments/blockdag.json is the source of truth for
   Safe singleton addresses and is committed after deploy.

3. Wire the web app + Docker build so production images get:
   - NEXT_PUBLIC_RPC_URL, NEXT_PUBLIC_CHAIN_ID, NEXT_PUBLIC_EXPLORER_URL
   - NEXT_PUBLIC_BDAG_VOTE, NEXT_PUBLIC_BDAG_VOTE_TOKEN
   - Safe addresses from blockdag.json (COPY into image) and/or NEXT_PUBLIC_SAFE_* 
   Prefer build-args in GitHub Actions; never use DEPLOYER_PRIVATE_KEY in CI/CD
   or on the DigitalOcean droplet.

4. Update .env.example with laptop-only deployer vars vs public NEXT_PUBLIC_* vars.
5. Align hardhat CHAIN_ID defaults with the real BlockDAG chain we target (e.g. 1404 mainnet).

Open a PR. Do not put private keys in the repo or in Docker images.
```

---

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| Hardhat: invalid JSON-RPC / HTML body | RPC Cloudflare or wrong URL; try another network path or RPC |
| `DEPLOYER_PRIVATE_KEY` missing / bad | Local `.env` not loaded; key must be hex with or without `0x` per Hardhat/ethers expectation |
| Deploy tx underpriced / stuck | Raise gas; check community RPC gas guidance; wait or replace tx from the same nonce |
| Web UI talks to wrong chain | Stale web image; `NEXT_PUBLIC_CHAIN_ID` / RPC not rebuilt |
| “Safe contracts not found” | `blockdag.json` not in the image or still placeholders `0x000…` |
| Vote calls revert | Wrong `VOTE_TOKEN` / treasury, or quorum/token decimals mismatch |
| Accidental key leak | Rotate that deployer immediately; treat funded key as burned if it was in chat logs or git history |

---

## What not to do

- Deploy contracts **from** the droplet
- Commit `.env` or any private key
- Bake `DEPLOYER_PRIVATE_KEY` into Docker build-args or GHCR images
- Edit Safe contract source to “make BlockDAG work”
- Point mainnet UI at testnet addresses (or the reverse)

# BlockDAG Contract Deployment & Production Wiring

This document describes the current contract and network configuration used by **BDAG Multisig** on **BlockDAG Mainnet — Chain ID 1404**.

BDAG Multisig uses Safe-based multisignature contracts for treasury custody. Safe's core multisig logic is not modified by this application.

The production web application is available at:

`https://multisig.bdagsosorted.co.uk`

---

## Current Production Network

| Setting | Value |
| --- | --- |
| Network | BlockDAG Mainnet |
| Chain ID | `1404` |
| Hex Chain ID | `0x57c` |
| Production RPC | `https://rpc.capedag.com/` |

The frontend, wallet and contract interactions must all operate on the same BlockDAG network.

Always verify the connected wallet chain before deploying or interacting with contracts.

---

## What Gets Deployed

The contract architecture consists of:

1. Safe infrastructure contracts used by the application.
2. Safe proxy contracts representing individual multisig treasuries.
3. The optional `BdagVote.sol` governance contract.

Safe infrastructure addresses are stored in:

`contracts/deployments/blockdag.json`

A Safe proxy is the actual treasury address created for a particular group of owners and threshold.

The existing **BDAG Community Treasury** Safe is:

`0x171bfe569bce65d52f65e44dfc3a639725587368`

This existing Community Treasury must **not** be redeployed when updating the application.

Other users can create separate Safe multisigs through the production application.

---

## Key Security Rules

- Never commit a deployer private key to Git.
- Never place a wallet seed phrase or private key in application source code.
- Never place deployer keys in frontend environment variables.
- Safe owners sign transactions using their own browser wallets.
- The API does not hold Safe owner private keys.
- Contract addresses are public and may be committed to the repository.
- Private deployment credentials must remain outside the public repository.
- Always confirm the target chain before deploying a contract.

---

## Safe Infrastructure

The repository contains the Safe deployment configuration required by the BlockDAG integration.

The deployment script is:

`contracts/scripts/deploy-safe.ts`

The resulting public contract addresses are stored in:

`contracts/deployments/blockdag.json`

If Safe infrastructure ever needs to be deployed to a new network, deployment must be performed from a controlled environment using a dedicated deployer wallet.

A deployer private key must never be committed to this repository.

The existing production BlockDAG Safe infrastructure should be reused by the application rather than redeployed for each new multisig.

---

## Creating a Multisig Safe

Normal users do **not** need to deploy the Safe infrastructure contracts.

The production application creates a new Safe proxy using the existing infrastructure.

The user:

1. Connects a browser wallet.
2. Provides the required owner addresses.
3. Selects the signature threshold.
4. Reviews the configuration.
5. Submits the deployment transaction from their wallet.
6. Pays the applicable BlockDAG network gas fee.

The connected wallet is automatically offered as the first owner.

Duplicate owner addresses are rejected before deployment.

After deployment, the resulting Safe address becomes that user's multisig treasury address.

Creating a new user multisig does not alter or replace the existing BDAG Community Treasury.

---

## BdagVote Governance Contract

The repository also contains:

`contracts/contracts/BdagVote.sol`

`BdagVote` provides the governance layer used for token-weighted community voting.

Governance voting and treasury execution remain separate.

A successful governance vote does not independently move funds from a Safe.

Any treasury transaction remains subject to the Safe's configured owners and signature threshold.

Where a new `BdagVote` deployment is required, its treasury Safe and voting-token configuration must be checked carefully before deployment.

Public deployment addresses may be stored in:

`contracts/deployments/blockdag.json`

Private deployment credentials must never be stored in that file.

---

## Production Application Wiring

The current production architecture uses:

- Google Cloud Run for the Next.js frontend.
- Google Cloud Run for the Fastify API.
- Google Cloud SQL for PostgreSQL.
- Firebase Hosting for the public custom domain.
- Google Cloud Secret Manager for sensitive production credentials.

The production application is:

`https://multisig.bdagsosorted.co.uk`

The frontend uses the BlockDAG network configuration supplied during the production build.

Important public configuration includes:

- `NEXT_PUBLIC_CHAIN_ID`
- `NEXT_PUBLIC_RPC_URL`
- `NEXT_PUBLIC_EXPLORER_URL`
- `NEXT_PUBLIC_API_URL`

The production BlockDAG chain ID is `1404`.

The current production RPC is:

`https://rpc.capedag.com/`

Because `NEXT_PUBLIC_*` values are included in the frontend build, changes to these values require the web application to be rebuilt and redeployed.

---

## Production Deployment Checklist

Before deploying contract-related application changes:

- Confirm the target network is BlockDAG Mainnet, Chain ID `1404`.
- Confirm the configured RPC is responding on the expected network.
- Confirm `contracts/deployments/blockdag.json` contains the intended Safe infrastructure addresses.
- Do not redeploy the existing BDAG Community Treasury.
- Confirm no `.env` file or private key is staged for Git.
- Build and test the web application.
- Deploy the frontend and API through the production Google Cloud environment.
- Deploy Firebase Hosting when hosting configuration has changed.
- Connect an authorised wallet and verify the Safe dashboard.
- Confirm owners and threshold are being read correctly from the blockchain.
- Verify proposal, signing and execution flows before considering the deployment complete.

---

## What Not To Do

- Do not commit private keys or seed phrases.
- Do not put deployer private keys in frontend code.
- Do not store owner private keys in the API.
- Do not modify Safe's core multisig logic.
- Do not redeploy the BDAG Community Treasury when updating the application.
- Do not mix testnet and mainnet contract addresses.
- Do not assume a wallet is on the correct network without checking its chain ID.

---

## Related Documentation

See the root `README.md` for the current production overview.

Additional documents in `docs/` may describe historical deployment approaches. Where they conflict with the root README or this document, the current production documentation should take precedence.

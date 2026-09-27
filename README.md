# BDAG Multisig

**Production-ready multisig treasury management for the BlockDAG network.**

BDAG Multisig is a community-built application for creating and managing Safe-based multisignature treasuries on **BlockDAG Mainnet — Chain ID 1404**.

The platform provides an interface for creating a multisig, viewing treasury balances, proposing transactions, collecting owner signatures and executing approved transactions.

It also provides access to the existing **BDAG Community Treasury**.

> **We Build. We Deliver.**

---

## Live Application

**BDAG Multisig:** https://multisig.bdagsosorted.co.uk

**BDAG So Sorted:** https://bdagsosorted.co.uk

**BDAG Community:** https://bdag.community

---

## What It Does

BDAG Multisig allows BlockDAG users and communities to:

- Create a new Safe-based multisig on BlockDAG.
- Define multiple wallet owners.
- Set the required signature threshold.
- View treasury BDAG balances.
- View multisig owners and the live on-chain threshold.
- Propose treasury transactions.
- Collect signatures from authorised owners.
- Execute transactions after the required threshold is reached.
- View pending and historical transactions.
- Access the existing BDAG Community Treasury.
- Connect using browser wallets without surrendering custody of private keys.

The server does not control treasury funds and does not store users' private keys.

---

## BlockDAG Network

The production application operates on BlockDAG Mainnet.

| Setting | Value |
| --- | --- |
| Network | BlockDAG Mainnet |
| Chain ID | `1404` |
| RPC | `https://rpc.capedag.com/` |

Wallets interacting with the application must be connected to the BlockDAG network.

---

## BDAG Community Treasury

The existing BDAG Community Treasury Safe is:

`0x171bfe569bce65d52f65e44dfc3a639725587368`

The BDAG Community Treasury is separate from multisigs created by other users through the application.

Only authorised owners of a Safe can participate in its signing and execution process.

The application reads the Safe's owner configuration and required signature threshold directly from the blockchain rather than relying on a hard-coded UI threshold.

---

## Creating a Multisig

Users can create their own multisig directly through the application.

During creation they can:

1. Connect their wallet.
2. Add the required owner wallet addresses.
3. Select the signature threshold.
4. Deploy the Safe to BlockDAG.
5. Open the newly created treasury dashboard.

The connected wallet is automatically offered as the first owner to make first-time setup easier.

Owner addresses are validated before deployment and duplicate owner addresses are rejected.

The wallet submitting the deployment transaction pays the applicable BlockDAG network gas fee.

---

## Transaction Lifecycle

Treasury transactions follow a multisignature workflow:

**Propose → Review → Sign → Reach Threshold → Execute**

Creating a proposal does not automatically move treasury funds.

A transaction must receive the required number of valid owner signatures before it can be executed.

The application displays transaction information to owners before signing and execution.

---

## Architecture

BDAG Multisig uses a separated frontend, API and blockchain architecture.

### Web Application

Located in `apps/web/`.

Built with:

- Next.js 14
- React
- wagmi
- viem
- Safe Protocol Kit

The browser wallet performs blockchain signing operations. Private keys remain inside the user's wallet.

### API

Located in `apps/api/`.

Built with:

- Fastify
- PostgreSQL

The API stores application data such as transaction proposals and signatures.

It does **not** hold private keys and does **not** have custody of treasury funds.

### Smart Contracts

Located in `contracts/`.

This contains the Safe deployment configuration and the custom `BdagVote.sol` governance contract.

Safe's core multisig contract logic is not modified by this application.

---

## Production Infrastructure

The production application is deployed using Google Cloud and Firebase.

### Frontend

The Next.js web application is containerised and deployed to:

- Google Cloud Run
- Region: `europe-west4`
- Service: `bdag-multisig-web`

Firebase Hosting provides the public entry point and custom-domain routing.

### API

The Fastify API is deployed independently to Google Cloud Run:

- Region: `europe-west4`
- Service: `bdag-multisig-api`

### Database

Production application data is stored in PostgreSQL using Google Cloud SQL.

Database credentials and other sensitive values are supplied through the deployment environment and Google Cloud Secret Manager rather than being stored in the repository.

### Hosting

The production application is available at:

`https://multisig.bdagsosorted.co.uk`

Firebase Hosting routes the public application to the production Cloud Run infrastructure.

---

## Project Structure

The main repository structure is:

- `apps/web/` — Next.js frontend and Safe user interface.
- `apps/api/` — Fastify API and PostgreSQL integration.
- `contracts/` — Safe deployment configuration and BdagVote contract.
- `docs/` — additional technical and historical documentation.
- `Dockerfile` — frontend production container.
- `cloudbuild.yaml` — Google Cloud Build configuration.
- `firebase.json` — Firebase Hosting configuration.

---

## Environment Configuration

The application uses environment variables for network, API and database configuration.

Examples include:

- `NEXT_PUBLIC_CHAIN_ID`
- `NEXT_PUBLIC_RPC_URL`
- `NEXT_PUBLIC_EXPLORER_URL`
- `NEXT_PUBLIC_API_URL`
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `RPC_URL`
- `INSTANCE_CONNECTION_NAME`

Production secrets must be supplied through the deployment environment or an appropriate secrets-management service.

**Never commit private keys, wallet seed phrases, database passwords, API credentials or other sensitive values to this repository.**

---

## Security

BDAG Multisig follows a non-custodial security model.

- Private keys remain inside users' wallets.
- The API has no custody of treasury funds.
- The server does not sign Safe transactions on behalf of owners.
- Multisig permissions are enforced by the Safe contracts.
- Safe owners and the required threshold are read from the blockchain.
- Duplicate owner addresses are rejected during multisig creation.
- Transactions require the configured number of owner signatures.
- Network and chain checks are performed before blockchain operations.
- Owners should always review wallet addresses and transaction details before signing.
- Sensitive production credentials are not stored in the public repository.

Cryptocurrency and smart-contract interactions carry risk. Users should independently verify transaction details, wallet addresses and contract interactions before signing.

---

## Governance

The repository also contains `BdagVote.sol` for token-weighted community governance.

The voting model records token-weighted sentiment on-chain. A successful governance vote does **not** independently transfer treasury funds.

Treasury execution remains subject to the Safe multisig owner and signature requirements.

This keeps governance signalling and treasury custody as separate security layers.

---

## Documentation

- [CHANGELOG.md](./CHANGELOG.md) — release history
- [ROADMAP.md](./ROADMAP.md) — near-term and later priorities
- [RELEASE.md](./RELEASE.md) — test-coverage baseline for this release cycle
- [docs/TESTING.md](./docs/TESTING.md) — how to run tests and coverage floors
- `docs/` — additional technical and historical documentation

Cloud Build runs web, API, and contract tests before publishing the web image.

Some documents under `docs/` describe earlier development and deployment approaches and may not represent the current Google Cloud and Firebase production architecture.

This root `README.md` should be treated as the primary overview of the current production application.

---

## Developers

Community developed by:

**VC — VaughanSOSORTED**
https://github.com/VaughanSOSORTED

**ML — blockdag-community**
https://github.com/blockdag-community

---

## Disclaimer

BDAG Multisig is community-built software.

It does not provide financial, investment, legal or tax advice.

Users remain responsible for reviewing wallet addresses, transaction details, multisig configurations and smart-contract interactions before signing or executing transactions.

Always **Do Your Own Research (DYOR)**.

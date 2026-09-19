# DigitalOcean deploy guide

Step-by-step pattern for running **bdag-multisig** on a DigitalOcean droplet, plus troubleshooting. Written so you (or an AI assistant) can follow it without guessing.

**Target stack**

- GitHub Actions builds Docker images → GitHub Container Registry (GHCR)
- Droplet runs `docker compose pull && docker compose up -d`
- SQLite on a host volume (not Postgres) for the signature API
- nginx + Let’s Encrypt for HTTPS
- **No private keys on the server** — browser wallets sign; the API only stores proposals/signatures

---

## Who does what

| Who | Does |
|-----|------|
| **AI in this repo** | SQLite, Dockerfiles, Compose, GHCR workflow, nginx configs, `.env.example`, docs |
| **You on DigitalOcean** | Droplet, DNS, firewall, `docker login` (if needed), run pull/up commands |
| **Laptop (not the droplet)** | Deploy Safe / vote contracts with a funded key; put addresses into env / CI variables |

The AI does not need your DigitalOcean password. It prepares the repo; you run commands on the box until that loop is boring (then optionally automate).

**Do not start with “deploy to the droplet.”** Start with a **green image build**, then **pull on the server**.

Before Docker work:

- [sqlite-vs-postgres.md](./sqlite-vs-postgres.md) — use **SQLite** on a single droplet, not Postgres
- [contract-deploy.md](./contract-deploy.md) — deploy Safe + `BdagVote` from a laptop via community RPC, then bake addresses into the web image

---

## Phase 0 — Gather facts

Write these down before changing anything:

1. Droplet **public IPv4**
2. **Domain** (or “IP only for now”)
3. Docker installed? `docker version` and `docker compose version`
4. Target chain: **testnet** or **mainnet**

---

## Phase 1 — Make the repo buildable (AI + PR)

Have your AI (or a collaborator) land this in a PR before touching the server:

1. Switch `apps/api` from Postgres to **SQLite** (file under a mounted path, e.g. `/data/multisig.sqlite`)
2. Add production **Dockerfiles** for `apps/web` and `apps/api`
3. Add root **`docker-compose.yml`**: `web`, `api`, `nginx`, `certbot`
   - Only nginx publishes **80/443**
   - Bind-mount `./data` → `/data` on the API
4. Add **HTTP** nginx config (HTTPS comes in Phase 4)
5. Update **`.env.example`** and the root README

### Prompt you can paste to your AI

```text
Make this repo DigitalOcean-ready for a single droplet:

1. Replace Postgres in apps/api with SQLite (persist under /data/multisig.sqlite).
2. Add production Dockerfiles for apps/web and apps/api.
   - Next.js should use output: 'standalone' if needed.
   - Processes must listen on 0.0.0.0.
3. Add docker-compose.yml with services: web, api, nginx, certbot.
   - Mount ./data to /data for the API.
   - Only nginx exposes 80/443.
4. Add deploy/proxy/nginx.conf for HTTP:
   - / → web:3000
   - /api/ → api:4000 (adjust if your API paths differ)
   - /.well-known/acme-challenge/ → certbot webroot
5. Update .env.example (no DEPLOYER_PRIVATE_KEY on the server).
6. Document local: docker compose build && docker compose up

Open a PR. Do not add DigitalOcean API tokens or SSH deploy yet.
```

### Exit criteria

```bash
docker compose build
docker compose up
# UI loads locally; API health check succeeds
```

Merge that PR before Phase 2.

---

## Phase 2 — GitHub builds images (CI → GHCR)

Add a workflow (e.g. `.github/workflows/docker-publish.yml`) that on push to `main`:

- Logs into `ghcr.io` with `GITHUB_TOKEN` (`permissions: packages: write`)
- Builds and pushes:
  - `ghcr.io/<owner>/bdag-multisig:web`
  - `ghcr.io/<owner>/bdag-multisig:api`
- Also tags with git SHA for rollbacks
- Platform: **`linux/amd64`**

`NEXT_PUBLIC_*` values are baked into the **web** image at build time. Put them in GitHub **Actions variables** (or build-args) and rebuild when the public API URL or contract addresses change.

### You do once in GitHub

1. Merge the workflow PR
2. **Actions** → confirm a green run
3. **Packages**: make the image **public**, or create a PAT with `read:packages` for the droplet

### Exit criteria

Both `:web` and `:api` tags exist on GHCR after a push to `main`.

### Prompt you can paste

```text
Add .github/workflows/docker-publish.yml that builds apps/web and apps/api
and pushes ghcr.io/<this-repo>:web and :api (plus :web-<sha> / :api-<sha>)
on push to main. Use linux/amd64. Pass NEXT_PUBLIC_* as build-args from
GitHub Actions variables. Update docker-compose.yml to pull those images
with pull_policy: always.
```

---

## Phase 3 — Droplet bring-up (you run these)

SSH into the droplet.

### 3.1 Install Docker (if needed)

Follow Docker’s official Ubuntu install for Engine + Compose plugin, or use your distro’s docs. Confirm:

```bash
docker version
docker compose version
```

### 3.2 Clone and configure

```bash
sudo mkdir -p /opt/bdag-multisig
sudo chown "$USER":"$USER" /opt/bdag-multisig
cd /opt/bdag-multisig
git clone https://github.com/VaughanSOSORTED/bdag-multisig.git .
cp .env.example .env
# Edit .env: domain, CERTBOT_EMAIL, DATABASE_PATH=/data/multisig.sqlite, chain/RPC, etc.
mkdir -p data certbot/conf certbot/www
```

### 3.3 Firewall

**DigitalOcean Cloud Firewall** (attach to the droplet):

| Allow | Ports |
|-------|-------|
| SSH | 22 (prefer your IP only) |
| HTTP | 80 |
| HTTPS | 443 |

Do **not** open 3000 or 4000.

Optional on the host:

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

### 3.4 Login to GHCR (only if packages are private)

```bash
echo "$GHCR_TOKEN" | docker login ghcr.io -u <github-username> --password-stdin
```

### 3.5 Pull and start

```bash
cd /opt/bdag-multisig
docker compose pull
docker compose up -d
docker compose ps
curl -sS http://127.0.0.1/api/health || curl -sS http://127.0.0.1/health
docker compose logs --tail=100 web api nginx
```

From your laptop:

```bash
curl -I http://DROPLET_IP/
curl -sS http://DROPLET_IP/api/health
```

### Exit criteria

Containers healthy; HTTP works on the droplet **IP**.

---

## Phase 4 — DNS + TLS

### 4.1 DNS

Create an **A record** for your domain → droplet IPv4. Wait until:

```bash
dig +short your.domain
# must print the droplet IP
```

### 4.2 Issue certificate

HTTP (port 80) and the ACME webroot location must already work.

```bash
cd /opt/bdag-multisig
docker compose run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d your.domain \
  --email you@example.com \
  --agree-tos --no-eff-email
```

Switch nginx to the HTTPS config (however the repo documents it — often `NGINX_CONF=./deploy/proxy/nginx.https.conf` in `.env`), then:

```bash
docker compose up -d nginx
```

### 4.3 Rebuild web with the final public API URL

Set CI / build-args so `NEXT_PUBLIC_API_URL=https://your.domain/api` (or your real path), merge to `main`, wait for Actions, then on the droplet:

```bash
docker compose pull
docker compose up -d
```

### Exit criteria

```bash
curl -I https://your.domain/
curl -sS https://your.domain/api/health
```

---

## Phase 5 — Everyday update loop

This is the steady “AI deployed it” pattern:

```text
Code change → PR → merge to main
  → Actions builds new GHCR images
  → on the droplet:
```

```bash
cd /opt/bdag-multisig
git pull
docker compose pull
docker compose up -d
docker compose ps
```

Optional later: a GitHub Action that SSHs in and runs pull/up. Skip until this manual loop is routine.

---

## Suggested PR order

1. SQLite + Dockerfiles + Compose + HTTP nginx + README  
2. GHCR workflow + compose image tags  
3. HTTPS nginx + cert helpers + this doc (if not already merged)  
4. Optional auto-deploy over SSH  

---

## Security checklist

- [ ] No `DEPLOYER_PRIVATE_KEY` (or any hot wallet) in droplet `.env`
- [ ] Only 22/80/443 open publicly
- [ ] SQLite file on a **bind-mounted** volume (`./data`), not only inside the container layer
- [ ] Contract deploys happen on a trusted laptop; addresses are config, not secrets
- [ ] Owners can still sign/execute on-chain if the API is down

---

## Troubleshooting

### GitHub Actions / GHCR

| Symptom | What to check |
|---------|----------------|
| Workflow can’t push images | Job needs `permissions: packages: write`. Re-run after fixing. |
| Package missing after green build | Confirm image name matches `ghcr.io/<owner>/<repo>:<tag>` (owner is lowercased on GHCR). |
| Droplet `pull` returns **401** | Package is private → `docker login ghcr.io` with a `read:packages` PAT. Or make the package public. |
| Web image has wrong RPC/API URL | `NEXT_PUBLIC_*` is build-time. Fix Actions variables and rebuild; don’t expect runtime `.env` alone to fix the browser bundle. |

### Droplet / Docker

| Symptom | What to check |
|---------|----------------|
| `compose up` exits immediately | `docker compose logs web api nginx` — often missing env, bad image arch (need amd64), or port bind conflict. |
| Works in container network, not from internet | Cloud firewall / ufw blocking 80/443, or nginx not publishing `80:80`. |
| API data disappears after redeploy | `./data` not mounted; SQLite lived in the old container filesystem. |
| Permission errors writing SQLite | Container user can’t write `/data` — fix ownership on the host `data/` dir. |
| Out of memory on small droplet | 1 GB droplets struggle with Next builds **on** the box. Prefer prebuilt GHCR images; don’t `compose build` on a tiny droplet. |

### DNS / TLS

| Symptom | What to check |
|---------|----------------|
| Domain doesn’t hit the droplet | `dig +short your.domain` vs droplet IP; TTL still caching old value. |
| Certbot fails | Port 80 must reach nginx; ACME path must be served; DNS must already point here. |
| HTTPS works but API calls fail in browser | Mixed content or wrong `NEXT_PUBLIC_API_URL` (http vs https, wrong path). Rebuild web image. |
| Cert expires | Ensure `certbot` renew loop is running and nginx reloads periodically. |

### App / wallet

| Symptom | What to check |
|---------|----------------|
| Wallet on wrong chain | `NEXT_PUBLIC_CHAIN_ID` / RPC must match the chain you deployed contracts to. |
| Propose works, second signer doesn’t see it | API/SQLite down or different `DATABASE_PATH`; check `docker compose logs api`. |
| “Works without API” confusion | By design the API is convenience only — Safe execution still happens on-chain with owner signatures. |

### Useful commands

```bash
# Status
docker compose ps
docker compose logs -f --tail=200 web api nginx

# Health
curl -sS http://127.0.0.1/api/health
curl -sS https://your.domain/api/health

# Refresh after CI
cd /opt/bdag-multisig && git pull && docker compose pull && docker compose up -d

# Rollback (example)
# Edit compose to pin :web-<oldsha> / :api-<oldsha>, then:
docker compose pull && docker compose up -d
```

---

## What not to do yet

- Install Postgres “because the early README mentioned it”
- Expose app ports 3000/4000 on the public firewall
- Issue TLS before HTTP works on the droplet IP
- Put DigitalOcean API tokens into the AI chat before Phases 3–4 work by hand
- Deploy or fund wallets from the droplet

---

## Related

- [sqlite-vs-postgres.md](./sqlite-vs-postgres.md) — API storage
- [contract-deploy.md](./contract-deploy.md) — community RPC contract deploy + Docker address wiring
- Root [README.md](../README.md) — product overview and security notes
- After Docker/Compose exist in the repo, keep this doc updated if paths or service names change

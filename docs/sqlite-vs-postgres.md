# SQLite vs Postgres (for this API)

The signature API (`apps/api`) only stores **pending Safe proposals and owner signatures**. It is not a custody wallet, not a chain indexer, and not a high-traffic OLTP system.

**Recommendation for a single DigitalOcean droplet: use SQLite.**  
Postgres is fine later if you outgrow one box or need multiple API replicas.

Related: [digitalocean-deploy.md](./digitalocean-deploy.md).

---

## Why SQLite fits this app

| Fact about this API | Why SQLite is enough |
|---------------------|----------------------|
| Few tables (`transactions`, `signatures`) | Tiny schema; no fancy Postgres features required |
| Low write rate (humans proposing/signing) | Not a throughput bottleneck |
| Single droplet / single API process | SQLite likes one writer; perfect match |
| Data is convenient, not canonical | On-chain Safe state is the source of truth if the DB dies |
| Ops simplicity | No Postgres package, user, volume, backups daemon, or extra Compose service |

You avoid:

- Installing and patching Postgres on the droplet
- Another container to monitor
- Connection strings, auth, and “forgot to create the database”
- Backing up a second service (for v1: copy one `.sqlite` file)

---

## When to keep or switch to Postgres

Stay on / move to **Postgres** if any of these become true:

- You run **multiple API replicas** (more than one process writing at once)
- You need heavy concurrent writers from automation
- You already operate managed Postgres and prefer one standard for all apps
- You want built-in replication / point-in-time recovery from day one

Until then, SQLite is the shorter path to a working public demo.

---

## What the code does today (Postgres)

Current dependencies and usage:

- Package: `pg` (`Pool` + `DATABASE_URL`)
- Placeholders: `$1`, `$2`, …
- Upsert: `ON CONFLICT … DO UPDATE SET … = EXCLUDED.…`
- Schema: `TIMESTAMPTZ` + `now()` in `apps/api/src/db/schema.sql`

That will **not** work by only changing an env var. The client library and some SQL must change.

---

## Migration checklist (Postgres → SQLite)

Have your AI do this as its **own PR** (or the first half of the Docker PR). Pasteable prompt at the bottom.

### 1. Dependencies

- Remove: `pg`, `@types/pg`
- Add: `better-sqlite3` (and types if needed), **or** Node’s built-in `node:sqlite` if you standardize on a recent Node

Prefer **`better-sqlite3`** for a simple sync API and wide examples.

### 2. Connection / env

| Before (Postgres) | After (SQLite) |
|-------------------|----------------|
| `DATABASE_URL=postgres://…` | `DATABASE_PATH=/data/multisig.sqlite` (or `./data/multisig.sqlite` locally) |

On the droplet, keep the file on a **bind-mounted** host directory so `docker compose up` does not wipe data.

### 3. Schema adjustments

Postgres:

```sql
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

SQLite-friendly:

```sql
created_at TEXT NOT NULL DEFAULT (datetime('now'))
```

Keep `TEXT` primary keys and `REFERENCES … ON DELETE CASCADE` — SQLite supports them when foreign keys are enabled.

Enable foreign keys on connect:

```sql
PRAGMA foreign_keys = ON;
```

Run schema on startup (or a small migrate step) with `CREATE TABLE IF NOT EXISTS` so a fresh volume just works.

### 4. Query style

| Postgres (`pg`) | SQLite (`better-sqlite3`) |
|-----------------|---------------------------|
| `await db.query(sql, [a, b])` | `db.prepare(sql).run(a, b)` / `.all(a)` / `.get(a)` |
| `$1`, `$2` placeholders | `?` placeholders (or named `:id` if you prefer) |
| `{ rows }` from query result | `.all()` returns rows directly |
| `count(*)::int` | `count(*)` (number is fine) |

`ON CONFLICT (tx_id, signer) DO UPDATE SET signature = excluded.signature` works in SQLite (use `excluded.` lowercase — SQLite accepts this upsert form).

### 5. Files to touch (expected)

- `apps/api/package.json`
- `apps/api/src/server.ts` (open DB, export helper, create schema)
- `apps/api/src/routes/transactions.ts`
- `apps/api/src/routes/signatures.ts`
- `apps/api/src/db/schema.sql` (or inline the DDL in code)
- Root `.env.example` — replace `DATABASE_URL` with `DATABASE_PATH`
- README setup steps — drop “needs a Postgres URL”
- Compose (when added) — mount `./data`, set `DATABASE_PATH=/data/multisig.sqlite`

### 6. Local verify

```bash
cd apps/api
npm install
mkdir -p ../../data
DATABASE_PATH=../../data/multisig.sqlite npm run dev
# hit POST /transactions and GET /transactions?safe=0x…
# restart process; data should still be there
```

### 7. Backup (droplet)

While the API is stopped (or briefly idle):

```bash
cp /opt/bdag-multisig/data/multisig.sqlite ~/multisig-backup-$(date +%F).sqlite
```

For hotter backups later, look up SQLite online backup / `.backup` — for v1, file copy during low traffic is fine.

---

## What not to change

- Safe / voting **contracts** — unrelated to the API DB
- The rule that the API never holds private keys
- Column meanings (`safe_tx_hash`, signature blobs, etc.) — only the engine and SQL dialect

---

## Prompt you can paste to your AI

```text
Migrate apps/api from Postgres (pg + DATABASE_URL) to SQLite for a single-droplet deploy.

Requirements:
- Use better-sqlite3 (or document why another choice).
- Env: DATABASE_PATH pointing at a file (default ./data/multisig.sqlite locally,
  /data/multisig.sqlite in Docker).
- Enable PRAGMA foreign_keys=ON; create tables on startup from an updated schema
  (datetime('now') instead of TIMESTAMPTZ/now()).
- Convert all $1-style queries to the SQLite driver's bind style.
- Keep the same HTTP routes and JSON shapes.
- Remove pg from package.json; update .env.example and README.
- Do not add deployer keys or change contracts.

Open a PR with a short note on how to verify locally.
```

---

## After SQLite lands

Continue with Docker / GHCR / droplet steps in
[digitalocean-deploy.md](./digitalocean-deploy.md) (Phase 1 assumes SQLite).

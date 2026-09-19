import Fastify from "fastify";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { transactionsRoute, signaturesRoute } from "./routes";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = pool;

const app = Fastify({ logger: true });

app.register(transactionsRoute);
app.register(signaturesRoute);

app.get("/health", async () => ({ ok: true, ts: Date.now() }));

app.listen({ port: Number(process.env.PORT ?? 4000), host: "0.0.0.0" })
  .then(() => app.log.info(`signature API up on :${process.env.PORT ?? 4000}`))
  .catch((e) => { app.log.error(e); process.exit(1); });

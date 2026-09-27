import Fastify from "fastify";
import cors from "@fastify/cors";
import { Pool } from "pg";
import { transactionsRoute } from "./routes/transactions";
import { signaturesRoute } from "./routes/signatures";

const connectionName = process.env.INSTANCE_CONNECTION_NAME;

if (!connectionName) {
  throw new Error("INSTANCE_CONNECTION_NAME is not configured");
}

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host: `/cloudsql/${connectionName}`,
});
export const db = pool;

const app = Fastify({ logger: true });

const allowedOrigins = new Set([
  "https://bdag-multisig-web-754643864450.europe-west4.run.app",
  "https://bdag-multisig.web.app",
  "https://bdag-multisig.firebaseapp.com",
  "https://multisig.bdagsosorted.co.uk",
]);

app.register(cors, {
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.has(origin)) {
      cb(null, true);
      return;
    }

    cb(new Error("Origin not allowed"), false);
  },
  methods: ["GET", "POST", "OPTIONS"],
});

app.register(transactionsRoute);
app.register(signaturesRoute);

app.get("/health", async () => ({ ok: true, ts: Date.now() }));

app.listen({ port: Number(process.env.PORT ?? 4000), host: "0.0.0.0" })
  .then(() => app.log.info(`signature API up on :${process.env.PORT ?? 4000}`))
  .catch((e) => { app.log.error(e); process.exit(1); });

import Fastify from "fastify";
import cors from "@fastify/cors";
import { transactionsRoute } from "./routes/transactions";
import { signaturesRoute } from "./routes/signatures";

export async function createApp() {
  const app = Fastify({
    logger: process.env.NODE_ENV !== "test",
  });

  const allowedOrigins = new Set([
    "https://bdag-multisig-web-754643864450.europe-west4.run.app",
    "https://bdag-multisig.web.app",
    "https://bdag-multisig.firebaseapp.com",
    "https://multisig.bdagsosorted.co.uk",
  ]);

  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.has(origin)) {
        cb(null, true);
        return;
      }

      cb(new Error("Origin not allowed"), false);
    },
    methods: ["GET", "POST", "OPTIONS"],
  });

  await app.register(transactionsRoute);
  await app.register(signaturesRoute);

  app.get("/health", async () => ({ ok: true, ts: Date.now() }));

  return app;
}

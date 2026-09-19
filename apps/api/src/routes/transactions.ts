import type { FastifyPluginAsync } from "fastify";
import { randomUUID } from "node:crypto";
import { db } from "../server";

export const transactionsRoute: FastifyPluginAsync = async (app) => {
  app.post<{ Body: {
    safeAddress: string; to: string; value: string; data: string;
    safeTxHash: string; signature: string; description?: string; signer: string;
  } }>("/transactions", async (req, reply) => {
    const { safeAddress, to, value, data, safeTxHash, signature, description, signer } = req.body;
    if (!safeAddress || !to || !safeTxHash) return reply.code(400).send({ error: "missing fields" });

    const id = randomUUID();
    await db.query(
      `INSERT INTO transactions (id, safe_address, to_address, value_wei, calldata, safe_tx_hash, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [id, safeAddress, to, value, data, safeTxHash, description ?? null]
    );
    await db.query(
      `INSERT INTO signatures (tx_id, signer, signature) VALUES ($1,$2,$3)`,
      [id, signer, signature]
    );
    return reply.code(201).send({ id });
  });

  app.get<{ Querystring: { safe: string } }>("/transactions", async (req) => {
    const { rows: txs } = await db.query(
      `SELECT * FROM transactions WHERE safe_address = $1 AND status = 'pending' ORDER BY created_at DESC`,
      [req.query.safe]
    );
    const { rows: sigs } = await db.query(
      `SELECT tx_id, signer, signature FROM signatures`
    );
    return txs.map((t) => ({
      ...t,
      signatures: sigs.filter((s) => s.tx_id === t.id).map(({ signer, signature }) => ({ signer, signature })),
    }));
  });

  app.post<{ Params: { id: string } }>("/transactions/:id/executed", async (req) => {
    await db.query(`UPDATE transactions SET status = 'executed' WHERE id = $1`, [req.params.id]);
    return { ok: true };
  });
};

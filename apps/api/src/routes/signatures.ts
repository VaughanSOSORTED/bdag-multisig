import type { FastifyPluginAsync } from "fastify";
import { db } from "../server";

export const signaturesRoute: FastifyPluginAsync = async (app) => {
  // Add an owner's signature to an existing proposal.
  // No verification happens here beyond shape; the chain's Safe contract
  // is the final judge at execution time. (Production: recover the signer
  // from the signature and check it's an owner.)
  app.post<{ Body: { tx_id: string; signature: string; signer: string } }>("/signatures", async (req, reply) => {
    const { tx_id, signature, signer } = req.body;
    if (!tx_id || !signature || !signer) return reply.code(400).send({ error: "missing fields" });

    const { rowCount } = await db.query(
      `INSERT INTO signatures (tx_id, signer, signature) VALUES ($1,$2,$3)
       ON CONFLICT (tx_id, signer) DO UPDATE SET signature = EXCLUDED.signature`,
      [tx_id, signer, signature]
    );
    const { rows } = await db.query(
      `SELECT count(*)::int AS n FROM signatures WHERE tx_id = $1`, [tx_id]
    );
    return { ok: true, signatures: rows[0].n };
  });
};

import type { FastifyPluginAsync } from "fastify";
import { db } from "../db";
import {
  verifyOwnerSignature,
  getSafeNonce,
} from "../safeSecurity";

export const signaturesRoute: FastifyPluginAsync = async (app) => {
  app.post<{
    Body: {
      tx_id: string;
      signature: string;
      signer: string;
    };
  }>("/signatures", async (req, reply) => {
    const { tx_id, signature, signer } = req.body;

    if (!tx_id || !signature || !signer) {
      return reply.code(400).send({ error: "missing fields" });
    }

    const { rows } = await db.query(
      `SELECT id, safe_address, safe_tx_hash, safe_nonce
       FROM transactions
       WHERE id = $1
         AND status = 'pending'`,
      [tx_id]
    );

    if (rows.length !== 1) {
      return reply
        .code(404)
        .send({ error: "pending transaction not found" });
    }

    const tx = rows[0];

    try {
      const currentNonce = await getSafeNonce(tx.safe_address);
      const proposalNonce = Number(tx.safe_nonce);

      if (proposalNonce !== currentNonce) {
        await db.query(
          `UPDATE transactions
           SET status = 'stale'
           WHERE id = $1
             AND status = 'pending'`,
          [tx_id]
        );

        return reply.code(409).send({
          error: `This proposal is stale. Safe nonce is ${currentNonce}, proposal nonce is ${proposalNonce}.`,
        });
      }

      await verifyOwnerSignature(
        tx.safe_address,
        tx.safe_tx_hash,
        signature,
        signer
      );
    } catch (error) {
      return reply.code(400).send({
        error:
          error instanceof Error
            ? error.message
            : "Signature verification failed",
      });
    }

    await db.query(
      `INSERT INTO signatures (tx_id, signer, signature)
       VALUES ($1,$2,$3)
       ON CONFLICT (tx_id, signer)
       DO UPDATE SET signature = EXCLUDED.signature`,
      [tx_id, signer, signature]
    );

    const count = await db.query(
      `SELECT count(*)::int AS n
       FROM signatures
       WHERE tx_id = $1`,
      [tx_id]
    );

    return {
      ok: true,
      signatures: count.rows[0].n,
    };
  });
};

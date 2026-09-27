import type { FastifyPluginAsync } from "fastify";
import { randomUUID } from "node:crypto";
import { decodeEventLog, getAddress } from "viem";
import { db } from "../server";
import {
  verifySafeTransaction,
  verifyOwnerSignature,
  getSafeNonce,
  chainClient,
} from "../safeSecurity";

const safeExecutionEventAbi = [
  {
    type: "event",
    name: "ExecutionSuccess",
    inputs: [
      { indexed: true, name: "txHash", type: "bytes32" },
      { indexed: false, name: "payment", type: "uint256" },
    ],
    anonymous: false,
  },
] as const;

type CreateTransactionBody = {
  safeAddress: string;
  to: string;
  value: string;
  data: string;
  safeTxHash: string;
  signature: string;
  signer: string;
  description?: string;

  operation: number;
  safeTxGas: string;
  baseGas: string;
  gasPrice: string;
  gasToken: string;
  refundReceiver: string;
  nonce: number;
};

export const transactionsRoute: FastifyPluginAsync = async (app) => {
  app.post<{ Body: CreateTransactionBody }>(
    "/transactions",
    async (req, reply) => {
      const {
        safeAddress,
        to,
        value,
        data,
        safeTxHash,
        signature,
        signer,
        description,
        operation,
        safeTxGas,
        baseGas,
        gasPrice,
        gasToken,
        refundReceiver,
        nonce,
      } = req.body;

      if (
        !safeAddress ||
        !to ||
        value === undefined ||
        data === undefined ||
        !safeTxHash ||
        !signature ||
        !signer ||
        operation === undefined ||
        safeTxGas === undefined ||
        baseGas === undefined ||
        gasPrice === undefined ||
        !gasToken ||
        !refundReceiver ||
        nonce === undefined
      ) {
        return reply.code(400).send({ error: "missing fields" });
      }

      try {
        const currentNonce = await getSafeNonce(safeAddress);

        if (nonce !== currentNonce) {
          return reply.code(409).send({
            error: `This proposal is stale. Safe nonce is ${currentNonce}, proposal nonce is ${nonce}.`,
          });
        }

        await verifySafeTransaction(
          {
            safeAddress,
            to,
            value,
            data,
            operation,
            safeTxGas,
            baseGas,
            gasPrice,
            gasToken,
            refundReceiver,
            nonce,
          },
          safeTxHash
        );

        await verifyOwnerSignature(
          safeAddress,
          safeTxHash,
          signature,
          signer
        );
      } catch (error) {
        return reply.code(400).send({
          error:
            error instanceof Error
              ? error.message
              : "Transaction verification failed",
        });
      }

      const id = randomUUID();

      const client = await db.connect();

      try {
        await client.query("BEGIN");

        await client.query(
          `INSERT INTO transactions (
            id,
            safe_address,
            to_address,
            value_wei,
            calldata,
            safe_tx_hash,
            operation,
            safe_tx_gas,
            base_gas,
            gas_price,
            gas_token,
            refund_receiver,
            safe_nonce,
            description
          )
          VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14
          )`,
          [
            id,
            safeAddress,
            to,
            value,
            data,
            safeTxHash,
            operation,
            safeTxGas,
            baseGas,
            gasPrice,
            gasToken,
            refundReceiver,
            nonce,
            description ?? null,
          ]
        );

        await client.query(
          `INSERT INTO signatures (tx_id, signer, signature)
           VALUES ($1,$2,$3)`,
          [id, signer, signature]
        );

        await client.query("COMMIT");

        return reply.code(201).send({ id });
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }
  );

  app.get<{ Querystring: { safe: string } }>(
    "/transactions/history",
    async (req, reply) => {
      if (!req.query.safe) {
        return reply.code(400).send({ error: "safe is required" });
      }

      const { rows: txs } = await db.query(
        `SELECT *
         FROM transactions
         WHERE lower(safe_address) = lower($1)
         ORDER BY created_at DESC
         LIMIT 100`,
        [req.query.safe]
      );

      const txIds = txs.map((tx) => tx.id);

      let sigs: Array<{
        tx_id: string;
        signer: string;
        signature: string;
      }> = [];

      if (txIds.length > 0) {
        const result = await db.query(
          `SELECT tx_id, signer, signature
           FROM signatures
           WHERE tx_id = ANY($1::text[])`,
          [txIds]
        );

        sigs = result.rows;
      }

      return txs.map((tx) => ({
        id: tx.id,
        safe_address: tx.safe_address,

        to: tx.to_address,
        value: tx.value_wei,
        data: tx.calldata,

        safe_tx_hash: tx.safe_tx_hash,

        operation: tx.operation,
        safeTxGas: tx.safe_tx_gas,
        baseGas: tx.base_gas,
        gasPrice: tx.gas_price,
        gasToken: tx.gas_token,
        refundReceiver: tx.refund_receiver,
        nonce: Number(tx.safe_nonce),

        description: tx.description,
        status: tx.status,
        created_at: tx.created_at,

        signatures: sigs
          .filter((sig) => sig.tx_id === tx.id)
          .map(({ signer, signature }) => ({
            signer,
            signature,
          })),
      }));
    }
  );

  app.get<{ Querystring: { safe: string } }>(
    "/transactions",
    async (req, reply) => {
      if (!req.query.safe) {
        return reply.code(400).send({ error: "safe is required" });
      }

      const { rows: txs } = await db.query(
        `SELECT *
         FROM transactions
         WHERE lower(safe_address) = lower($1)
           AND status = 'pending'
         ORDER BY created_at DESC`,
        [req.query.safe]
      );

      const txIds = txs.map((tx) => tx.id);

      let sigs: Array<{
        tx_id: string;
        signer: string;
        signature: string;
      }> = [];

      if (txIds.length > 0) {
        const result = await db.query(
          `SELECT tx_id, signer, signature
           FROM signatures
           WHERE tx_id = ANY($1::text[])`,
          [txIds]
        );

        sigs = result.rows;
      }

      return txs.map((tx) => ({
        id: tx.id,
        safe_address: tx.safe_address,

        to: tx.to_address,
        value: tx.value_wei,
        data: tx.calldata,

        safe_tx_hash: tx.safe_tx_hash,

        operation: tx.operation,
        safeTxGas: tx.safe_tx_gas,
        baseGas: tx.base_gas,
        gasPrice: tx.gas_price,
        gasToken: tx.gas_token,
        refundReceiver: tx.refund_receiver,
        nonce: Number(tx.safe_nonce),

        description: tx.description,
        status: tx.status,
        created_at: tx.created_at,

        signatures: sigs
          .filter((sig) => sig.tx_id === tx.id)
          .map(({ signer, signature }) => ({
            signer,
            signature,
          })),
      }));
    }
  );

  app.post<{
    Params: { id: string };
    Body: { transactionHash: string };
  }>(
    "/transactions/:id/executed",
    async (req, reply) => {
      const { transactionHash } = req.body;

      if (
        !transactionHash ||
        !/^0x[0-9a-fA-F]{64}$/.test(transactionHash)
      ) {
        return reply
          .code(400)
          .send({ error: "valid transactionHash is required" });
      }

      const existing = await db.query(
        `SELECT id, safe_address, safe_tx_hash, safe_nonce
         FROM transactions
         WHERE id = $1
           AND status IN ('pending', 'stale')`,
        [req.params.id]
      );

      if (existing.rowCount === 0) {
        return reply
          .code(404)
          .send({ error: "transaction not found or already executed" });
      }

      try {
        const pendingTx = existing.rows[0];

        // The Safe nonce has already advanced after a successful
        // execTransaction. Do NOT compare the current Safe nonce here.
        // The receipt + ExecutionSuccess SafeTxHash verification below
        // proves that this specific proposal executed successfully.
        const receipt =
          await chainClient.getTransactionReceipt({
            hash: transactionHash as `0x${string}`,
          });

        if (receipt.status !== "success") {
          return reply
            .code(400)
            .send({ error: "transaction did not execute successfully" });
        }

        const expectedSafe = getAddress(pendingTx.safe_address);
        const expectedSafeTxHash =
          String(pendingTx.safe_tx_hash).toLowerCase();

        let matchedExecution = false;

        for (const log of receipt.logs) {
          if (log.address.toLowerCase() !== expectedSafe.toLowerCase()) {
            continue;
          }

          try {
            const decoded = decodeEventLog({
              abi: safeExecutionEventAbi,
              data: log.data,
              topics: log.topics,
            });

            if (
              decoded.eventName === "ExecutionSuccess" &&
              String(decoded.args.txHash).toLowerCase() === expectedSafeTxHash
            ) {
              matchedExecution = true;
              break;
            }
          } catch {
            // Not an ExecutionSuccess log; ignore it.
          }
        }

        if (!matchedExecution) {
          return reply.code(400).send({
            error:
              "transaction does not prove execution of this Safe proposal",
          });
        }
      } catch {
        return reply
          .code(400)
          .send({ error: "transaction receipt not found on BlockDAG Mainnet" });
      }

      const result = await db.query(
        `UPDATE transactions
         SET status = 'executed'
         WHERE id = $1
           AND status IN ('pending', 'stale')
         RETURNING id`,
        [req.params.id]
      );

      return {
        ok: true,
        id: result.rows[0].id,
        transactionHash,
      };
    }
  );
};

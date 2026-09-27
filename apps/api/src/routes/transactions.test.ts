import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

const query = vi.fn();
const connect = vi.fn();
const release = vi.fn();
const clientQuery = vi.fn();

vi.mock("../db", () => ({
  db: {
    query: (...args: unknown[]) => query(...args),
    connect: (...args: unknown[]) => connect(...args),
  },
}));

const getSafeNonce = vi.fn();
const verifySafeTransaction = vi.fn();
const verifyOwnerSignature = vi.fn();
const getTransactionReceipt = vi.fn();

vi.mock("../safeSecurity", () => ({
  getSafeNonce: (...args: unknown[]) => getSafeNonce(...args),
  verifySafeTransaction: (...args: unknown[]) => verifySafeTransaction(...args),
  verifyOwnerSignature: (...args: unknown[]) => verifyOwnerSignature(...args),
  chainClient: {
    getTransactionReceipt: (...args: unknown[]) =>
      getTransactionReceipt(...args),
  },
}));

import { transactionsRoute } from "./transactions";

const validBody = {
  safeAddress: "0x1111111111111111111111111111111111111111",
  to: "0x2222222222222222222222222222222222222222",
  value: "0",
  data: "0x",
  safeTxHash:
    "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  signature: "0xsig",
  signer: "0x3333333333333333333333333333333333333333",
  operation: 0,
  safeTxGas: "0",
  baseGas: "0",
  gasPrice: "0",
  gasToken: "0x0000000000000000000000000000000000000000",
  refundReceiver: "0x0000000000000000000000000000000000000000",
  nonce: 0,
};

async function buildApp() {
  const app = Fastify({ logger: false });
  await app.register(transactionsRoute);
  return app;
}

describe("transactions routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    connect.mockResolvedValue({
      query: clientQuery,
      release,
    });
    clientQuery.mockResolvedValue({});
  });

  it("returns 400 when propose fields are missing", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/transactions",
      payload: { safeAddress: validBody.safeAddress },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: "missing fields" });
  });

  it("returns 409 when propose nonce is stale", async () => {
    getSafeNonce.mockResolvedValue(5);
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/transactions",
      payload: { ...validBody, nonce: 0 },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toMatch(/stale/);
  });

  it("creates a proposal when verification succeeds", async () => {
    getSafeNonce.mockResolvedValue(0);
    verifySafeTransaction.mockResolvedValue(validBody.safeTxHash);
    verifyOwnerSignature.mockResolvedValue(validBody.signer);

    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/transactions",
      payload: validBody,
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().id).toBeTruthy();
    expect(clientQuery).toHaveBeenCalled();
    expect(release).toHaveBeenCalled();
  });

  it("rejects invalid executed transaction hashes", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/transactions/abc/executed",
      payload: { transactionHash: "0x1234" },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("valid transactionHash is required");
  });

  it("rejects executed when ExecutionSuccess is missing", async () => {
    query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [
        {
          id: "abc",
          safe_address: validBody.safeAddress,
          safe_tx_hash: validBody.safeTxHash,
          safe_nonce: 0,
        },
      ],
    });
    getTransactionReceipt.mockResolvedValue({
      status: "success",
      logs: [],
    });

    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/transactions/abc/executed",
      payload: {
        transactionHash:
          "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/does not prove execution/);
  });

  it("marks executed when receipt proves Success", async () => {
    const { encodeEventTopics, encodeAbiParameters, parseAbiParameters } =
      await import("viem");

    const topics = encodeEventTopics({
      abi: [
        {
          type: "event",
          name: "ExecutionSuccess",
          inputs: [
            { indexed: true, name: "txHash", type: "bytes32" },
            { indexed: false, name: "payment", type: "uint256" },
          ],
        },
      ],
      eventName: "ExecutionSuccess",
      args: { txHash: validBody.safeTxHash as `0x${string}` },
    });

    const data = encodeAbiParameters(parseAbiParameters("uint256"), [0n]);

    query
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: "abc",
            safe_address: validBody.safeAddress,
            safe_tx_hash: validBody.safeTxHash,
            safe_nonce: 0,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [{ id: "abc" }],
      });

    getTransactionReceipt.mockResolvedValue({
      status: "success",
      logs: [
        {
          address: validBody.safeAddress,
          topics,
          data,
        },
      ],
    });

    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/transactions/abc/executed",
      payload: {
        transactionHash:
          "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true, id: "abc" });
  });
});

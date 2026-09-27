import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

const query = vi.fn();

vi.mock("../db", () => ({
  db: {
    query: (...args: unknown[]) => query(...args),
  },
}));

const getSafeNonce = vi.fn();
const verifyOwnerSignature = vi.fn();

vi.mock("../safeSecurity", () => ({
  getSafeNonce: (...args: unknown[]) => getSafeNonce(...args),
  verifyOwnerSignature: (...args: unknown[]) => verifyOwnerSignature(...args),
}));

import { signaturesRoute } from "./signatures";

async function buildApp() {
  const app = Fastify({ logger: false });
  await app.register(signaturesRoute);
  return app;
}

describe("signatures routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when fields are missing", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/signatures",
      payload: { tx_id: "1" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("returns 404 when pending tx is missing", async () => {
    query.mockResolvedValue({ rows: [] });
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/signatures",
      payload: { tx_id: "1", signature: "0xsig", signer: "0xsigner" },
    });
    expect(res.statusCode).toBe(404);
  });

  it("marks stale and returns 409 when nonce advanced", async () => {
    query
      .mockResolvedValueOnce({
        rows: [
          {
            id: "1",
            safe_address: "0x1111111111111111111111111111111111111111",
            safe_tx_hash:
              "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            safe_nonce: 0,
          },
        ],
      })
      .mockResolvedValueOnce({});

    getSafeNonce.mockResolvedValue(2);

    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/signatures",
      payload: {
        tx_id: "1",
        signature: "0xsig",
        signer: "0x3333333333333333333333333333333333333333",
      },
    });

    expect(res.statusCode).toBe(409);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("SET status = 'stale'"),
      ["1"]
    );
  });

  it("upserts a signature and returns the count", async () => {
    query
      .mockResolvedValueOnce({
        rows: [
          {
            id: "1",
            safe_address: "0x1111111111111111111111111111111111111111",
            safe_tx_hash:
              "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            safe_nonce: 0,
          },
        ],
      })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ n: 2 }] });

    getSafeNonce.mockResolvedValue(0);
    verifyOwnerSignature.mockResolvedValue(
      "0x3333333333333333333333333333333333333333"
    );

    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/signatures",
      payload: {
        tx_id: "1",
        signature: "0xsig",
        signer: "0x3333333333333333333333333333333333333333",
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true, signatures: 2 });
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("api client", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.test");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("posts proposals to /transactions", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "tx-1" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { api } = await import("./api");
    const body = {
      safeAddress: "0xsafe",
      to: "0xto",
      value: "0",
      data: "0x",
      safeTxHash: "0xhash",
      operation: 0,
      safeTxGas: "0",
      baseGas: "0",
      gasPrice: "0",
      gasToken: "0x0000000000000000000000000000000000000000",
      refundReceiver: "0x0000000000000000000000000000000000000000",
      nonce: 0,
      signature: "0xsig",
      signer: "0xsigner",
    };

    await expect(api.propose(body)).resolves.toEqual({ id: "tx-1" });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/transactions",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(body),
      })
    );
  });

  it("loads pending transactions for a Safe", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
    vi.stubGlobal("fetch", fetchMock);

    const { api } = await import("./api");
    await api.pending("0xAbC");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/transactions?safe=0xAbC"
    );
  });

  it("throws response text when requests fail", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        text: async () => "missing fields",
      })
    );

    const { api } = await import("./api");
    await expect(
      api.sign("id", "0xsig", "0xsigner")
    ).rejects.toThrow("missing fields");
  });

  it("marks executed transactions", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { api } = await import("./api");
    await api.markExecuted("id-1", "0xdeadbeef");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/transactions/id-1/executed",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ transactionHash: "0xdeadbeef" }),
      })
    );
  });
});

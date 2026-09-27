import { beforeEach, describe, expect, it, vi } from "vitest";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

describe("safeSecurity", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("verifySafeTransaction rejects missing Safe code", async () => {
    const mod = await import("./safeSecurity");
    vi.spyOn(mod.chainClient, "getCode").mockResolvedValue(undefined);

    await expect(
      mod.verifySafeTransaction(
        {
          safeAddress: "0x1111111111111111111111111111111111111111",
          to: "0x2222222222222222222222222222222222222222",
          value: "0",
          data: "0x",
          operation: 0,
          safeTxGas: "0",
          baseGas: "0",
          gasPrice: "0",
          gasToken: "0x0000000000000000000000000000000000000000",
          refundReceiver: "0x0000000000000000000000000000000000000000",
          nonce: 0,
        },
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
      )
    ).rejects.toThrow("Safe contract not found on BlockDAG Mainnet");
  });

  it("verifySafeTransaction rejects mismatched hashes", async () => {
    const mod = await import("./safeSecurity");
    vi.spyOn(mod.chainClient, "getCode").mockResolvedValue("0x6000");
    vi.spyOn(mod.chainClient, "readContract").mockResolvedValue(
      "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
    );

    await expect(
      mod.verifySafeTransaction(
        {
          safeAddress: "0x1111111111111111111111111111111111111111",
          to: "0x2222222222222222222222222222222222222222",
          value: "0",
          data: "0x",
          operation: 0,
          safeTxGas: "0",
          baseGas: "0",
          gasPrice: "0",
          gasToken: "0x0000000000000000000000000000000000000000",
          refundReceiver: "0x0000000000000000000000000000000000000000",
          nonce: 0,
        },
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
      )
    ).rejects.toThrow(
      "Safe transaction hash does not match on-chain calculation"
    );
  });

  it("verifySafeTransaction accepts matching hash", async () => {
    const hash =
      "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";
    const mod = await import("./safeSecurity");
    vi.spyOn(mod.chainClient, "getCode").mockResolvedValue("0x6000");
    vi.spyOn(mod.chainClient, "readContract").mockResolvedValue(hash);

    await expect(
      mod.verifySafeTransaction(
        {
          safeAddress: "0x1111111111111111111111111111111111111111",
          to: "0x2222222222222222222222222222222222222222",
          value: "0",
          data: "0x",
          operation: 0,
          safeTxGas: "0",
          baseGas: "0",
          gasPrice: "0",
          gasToken: "0x0000000000000000000000000000000000000000",
          refundReceiver: "0x0000000000000000000000000000000000000000",
          nonce: 1,
        },
        hash
      )
    ).resolves.toBe(hash);
  });

  it("verifyOwnerSignature rejects non-owners", async () => {
    const mod = await import("./safeSecurity");
    vi.spyOn(mod.chainClient, "readContract").mockResolvedValue([
      "0x1111111111111111111111111111111111111111",
    ]);

    await expect(
      mod.verifyOwnerSignature(
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
        "0x00",
        "0x2222222222222222222222222222222222222222"
      )
    ).rejects.toThrow("Signer is not an owner of this Safe");
  });

  it("verifyOwnerSignature accepts a valid owner signature", async () => {
    const account = privateKeyToAccount(generatePrivateKey());
    const safeTxHash =
      "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
    const signature = await account.sign({ hash: safeTxHash as `0x${string}` });

    const mod = await import("./safeSecurity");
    vi.spyOn(mod.chainClient, "readContract").mockResolvedValue([
      account.address,
    ]);

    await expect(
      mod.verifyOwnerSignature(
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        safeTxHash,
        signature,
        account.address
      )
    ).resolves.toBe(account.address);
  });

  it("getSafeThreshold and getSafeNonce cast contract values", async () => {
    const mod = await import("./safeSecurity");
    const spy = vi.spyOn(mod.chainClient, "readContract");
    spy.mockResolvedValueOnce(3n).mockResolvedValueOnce(7n);

    await expect(
      mod.getSafeThreshold("0x1111111111111111111111111111111111111111")
    ).resolves.toBe(3);
    await expect(
      mod.getSafeNonce("0x1111111111111111111111111111111111111111")
    ).resolves.toBe(7);
  });
});

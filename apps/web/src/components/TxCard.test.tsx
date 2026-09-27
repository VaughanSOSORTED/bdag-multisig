import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PendingTx } from "@/lib/api";

const getSafeWithSigner = vi.fn(async () => ({
  getThreshold: async () => 2,
}));

vi.mock("@/lib/safe", () => ({
  getSafeWithSigner: (...args: unknown[]) => getSafeWithSigner(...args),
}));

vi.mock("@/lib/voting", () => ({
  publicClient: () => ({
    getBalance: vi.fn(async () => 10n ** 18n),
  }),
}));

vi.mock("@/lib/api", () => ({
  api: {
    sign: vi.fn(),
    markExecuted: vi.fn(),
  },
}));

import TxCard from "./TxCard";

const baseTx: PendingTx = {
  id: "tx-1",
  safe_address: "0x1111111111111111111111111111111111111111",
  to: "0x2222222222222222222222222222222222222222",
  value: (10n ** 18n).toString(),
  data: "0x",
  safe_tx_hash:
    "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  operation: 0,
  safeTxGas: "0",
  baseGas: "0",
  gasPrice: "0",
  gasToken: "0x0000000000000000000000000000000000000000",
  refundReceiver: "0x0000000000000000000000000000000000000000",
  nonce: 0,
  signatures: [
    {
      signer: "0x3333333333333333333333333333333333333333",
      signature: "0xsig",
    },
  ],
};

describe("TxCard", () => {
  beforeEach(() => {
    getSafeWithSigner.mockClear();
    vi.stubGlobal("ethereum", {
      request: vi.fn(async ({ method }: { method: string }) => {
        if (method === "eth_accounts") {
          return ["0x4444444444444444444444444444444444444444"];
        }
        return null;
      }),
      on: vi.fn(),
      removeListener: vi.fn(),
    });
  });

  it("shows a disabled Execute control when the threshold is not met", async () => {
    render(<TxCard tx={baseTx} safeBalance={10n ** 18n} />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /need 1 more signature/i })
      ).toBeDisabled();
    });

    expect(screen.getByText(/threshold not met/i)).toBeInTheDocument();
    expect(getSafeWithSigner).toHaveBeenCalled();
  });
});

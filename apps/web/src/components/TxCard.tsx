"use client";

import { useEffect, useState } from "react";
import { formatEther } from "viem";
import { api, type PendingTx } from "@/lib/api";
import { getSafeWithSigner } from "@/lib/safe";
import { publicClient } from "@/lib/voting";
import { EthSafeSignature } from "@safe-global/protocol-kit";

export default function TxCard({ tx }: { tx: PendingTx }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [signatures, setSignatures] = useState(tx.signatures);
  const [threshold, setThreshold] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    async function loadThreshold() {
      try {
        const ethereum = (window as any).ethereum;
        if (!ethereum) return;

        const accounts = await ethereum.request({
          method: "eth_accounts",
        });

        const signer = accounts?.[0];
        if (!signer) return;

        const protocolKit = await getSafeWithSigner(
          tx.safe_address,
          signer
        );

        const value = Number(await protocolKit.getThreshold());

        if (active) {
          setThreshold(value);
        }
      } catch {
        // Execution still performs its own on-chain threshold check.
      }
    }

    loadThreshold();

    return () => {
      active = false;
    };
  }, [tx.safe_address]);

  async function getConnectedOwner() {
    const ethereum = (window as any).ethereum;

    if (!ethereum) {
      throw new Error("MetaMask or another browser wallet was not found.");
    }

    const chainId = await ethereum.request({ method: "eth_chainId" });

    if (Number.parseInt(chainId, 16) !== 1404) {
      throw new Error(
        "Wrong wallet network. Connect MetaMask to BlockDAG Mainnet."
      );
    }

    const accounts = await ethereum.request({
      method: "eth_requestAccounts",
    });

    const signer = accounts?.[0];

    if (!signer) {
      throw new Error("No wallet account connected.");
    }

    const protocolKit = await getSafeWithSigner(
      tx.safe_address,
      signer
    );

    const isOwner = await protocolKit.isOwner(signer);

    if (!isOwner) {
      throw new Error(
        "The connected wallet is not an owner of this Safe."
      );
    }

    return { signer, protocolKit };
  }

  async function ensureCurrentNonce(protocolKit: any) {
    const currentNonce = Number(
      await protocolKit.getNonce()
    );

    if (currentNonce !== tx.nonce) {
      throw new Error(
        `This proposal is stale. Safe nonce is ${currentNonce}, proposal nonce is ${tx.nonce}.`
      );
    }
  }

  async function reconstructTransaction(protocolKit: any) {
    const safeTransaction = await protocolKit.createTransaction({
      transactions: [
        {
          to: tx.to,
          value: tx.value,
          data: tx.data,
          operation: tx.operation,
        },
      ],
      options: {
        nonce: tx.nonce,
        safeTxGas: tx.safeTxGas,
        baseGas: tx.baseGas,
        gasPrice: tx.gasPrice,
        gasToken: tx.gasToken,
        refundReceiver: tx.refundReceiver,
      },
    });

    const reconstructedHash =
      await protocolKit.getTransactionHash(safeTransaction);

    if (
      reconstructedHash.toLowerCase() !==
      tx.safe_tx_hash.toLowerCase()
    ) {
      throw new Error(
        "Transaction verification failed: Safe transaction hash does not match."
      );
    }

    return safeTransaction;
  }

  async function sign() {
    try {
      setBusy(true);
      setMessage("");

      const { signer, protocolKit } =
        await getConnectedOwner();

      await ensureCurrentNonce(protocolKit);

      if (
        signatures.some(
          (item) =>
            item.signer.toLowerCase() === signer.toLowerCase()
        )
      ) {
        throw new Error(
          "This Safe owner has already signed this transaction."
        );
      }

      const safeTransaction =
        await reconstructTransaction(protocolKit);

      const signedTransaction =
        await protocolKit.signTransaction(safeTransaction);

      const safeSignature =
        signedTransaction.getSignature(signer);

      if (!safeSignature) {
        throw new Error(
          "Safe signature was not returned by the wallet."
        );
      }

      await api.sign(
        tx.id,
        safeSignature.data,
        signer
      );

      setSignatures((current) => [
        ...current,
        {
          signer,
          signature: safeSignature.data,
        },
      ]);

      setMessage("Signature verified and recorded.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to sign transaction."
      );
    } finally {
      setBusy(false);
    }
  }

  async function execute() {
    try {
      setBusy(true);
      setMessage("");

      const { protocolKit } =
        await getConnectedOwner();

      await ensureCurrentNonce(protocolKit);

      const currentThreshold =
        Number(await protocolKit.getThreshold());

      if (signatures.length < currentThreshold) {
        throw new Error(
          `This Safe requires ${currentThreshold} signatures before execution.`
        );
      }

      const safeTransaction =
        await reconstructTransaction(protocolKit);

      for (const stored of signatures) {
        safeTransaction.addSignature(
          new EthSafeSignature(
            stored.signer,
            stored.signature
          )
        );
      }

      const result =
        await protocolKit.executeTransaction(
          safeTransaction
        );

      setMessage(
        `Transaction submitted: ${result.hash}`
      );

      const receipt = await publicClient().waitForTransactionReceipt({
        hash: result.hash as `0x${string}`,
      });

      if (receipt.status !== "success") {
        throw new Error("Safe transaction reverted on BlockDAG Mainnet.");
      }

      await api.markExecuted(tx.id, result.hash);

      setMessage(
        `Transaction executed successfully: ${result.hash}`
      );

      window.location.reload();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to execute transaction."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <article
      style={{
        border: "1px solid #d9d9d9",
        borderRadius: 12,
        padding: 18,
        background: "#fff",
        marginBottom: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 20,
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, minWidth: 260 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: ".08em",
              textTransform: "uppercase",
              color: "#777",
              marginBottom: 8,
            }}
          >
            Pending Safe Transaction
          </div>

          <div
            style={{
              fontSize: 20,
              fontWeight: 900,
              marginBottom: 8,
            }}
          >
            {formatEther(BigInt(tx.value))} BDAG
          </div>

          <div
            style={{
              fontSize: 13,
              color: "#555",
              wordBreak: "break-all",
            }}
          >
            To: {tx.to}
          </div>

          {tx.description && (
            <div
              style={{
                fontSize: 13,
                marginTop: 8,
                color: "#333",
              }}
            >
              {tx.description}
            </div>
          )}

          <div
            style={{
              marginTop: 12,
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            Signatures: {signatures.length}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={sign}
            disabled={busy}
            style={{
              border: 0,
              borderRadius: 8,
              padding: "11px 16px",
              fontWeight: 800,
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            {busy ? "Working..." : "Sign"}
          </button>

          {threshold !== null && signatures.length >= threshold && (
            <button
              type="button"
              onClick={execute}
              disabled={busy}
              style={{
                border: 0,
                borderRadius: 8,
                padding: "11px 16px",
                fontWeight: 800,
                cursor: busy ? "not-allowed" : "pointer",
              }}
            >
              {busy
                ? "Working..."
                : "Execute Transaction"}
            </button>
          )}
        </div>
      </div>

      {message && (
        <div
          style={{
            marginTop: 14,
            padding: 10,
            borderRadius: 8,
            background: "#f4f4f4",
            fontSize: 13,
            wordBreak: "break-word",
          }}
        >
          {message}
        </div>
      )}
    </article>
  );
}

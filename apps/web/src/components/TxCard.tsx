"use client";

import { useEffect, useState } from "react";
import { formatEther } from "viem";
import { api, type PendingTx } from "@/lib/api";
import { getSafeWithSigner } from "@/lib/safe";
import { publicClient } from "@/lib/voting";
import { EthSafeSignature } from "@safe-global/protocol-kit";

function friendlyExecuteError(error: unknown): string {
  const raw =
    error instanceof Error ? error.message : "Unable to execute transaction.";

  if (/not enough ether funds/i.test(raw)) {
    return "This Safe does not hold enough BDAG to pay this transfer. Send BDAG to the Safe address first, then execute. Gas is paid separately by your wallet.";
  }

  if (/evm head unavailable/i.test(raw)) {
    return "The BlockDAG RPC briefly failed (EVM head unavailable). Wait a moment and try Execute again.";
  }

  return raw;
}

export default function TxCard({
  tx,
  safeBalance,
}: {
  tx: PendingTx;
  safeBalance?: bigint;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [signatures, setSignatures] = useState(tx.signatures);
  const [threshold, setThreshold] = useState<number | null>(null);
  const [balance, setBalance] = useState<bigint | undefined>(safeBalance);
  const [connectedAccount, setConnectedAccount] = useState<string>();

  const value = BigInt(tx.value);
  const isConfigTx = value === 0n && Boolean(tx.data && tx.data !== "0x");
  const funded =
    isConfigTx
      ? true
      : balance === undefined
        ? undefined
        : balance >= value;
  const shortfall =
    !isConfigTx && balance !== undefined && balance < value
      ? value - balance
      : 0n;
  const alreadySigned = Boolean(
    connectedAccount &&
      signatures.some(
        (item) =>
          item.signer.toLowerCase() === connectedAccount.toLowerCase()
      )
  );
  const title = isConfigTx
    ? tx.description || "Safe configuration change"
    : `${formatEther(value)} BDAG`;

  useEffect(() => {
    setBalance(safeBalance);
  }, [safeBalance]);

  useEffect(() => {
    if (safeBalance !== undefined) return;

    let active = true;

    publicClient()
      .getBalance({ address: tx.safe_address as `0x${string}` })
      .then((value) => {
        if (active) setBalance(value);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [tx.safe_address, safeBalance]);

  useEffect(() => {
    let active = true;

    async function loadOwnerContext() {
      try {
        const ethereum = (window as any).ethereum;
        if (!ethereum) return;

        const accounts = await ethereum.request({
          method: "eth_accounts",
        });

        const signer = accounts?.[0] as string | undefined;
        if (!signer) return;

        if (active) {
          setConnectedAccount(signer);
        }

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

    loadOwnerContext();

    const ethereum = (window as any).ethereum;
    const onAccountsChanged = (accounts: string[]) => {
      setConnectedAccount(accounts[0]);
    };
    ethereum?.on?.("accountsChanged", onAccountsChanged);

    return () => {
      active = false;
      ethereum?.removeListener?.("accountsChanged", onAccountsChanged);
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

  async function refreshBalance() {
    const next = await publicClient().getBalance({
      address: tx.safe_address as `0x${string}`,
    });
    setBalance(next);
    return next;
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

      if (!isConfigTx) {
        const currentBalance = await refreshBalance();

        if (currentBalance < value) {
          throw new Error(
            `Safe balance is ${formatEther(currentBalance)} BDAG, but this transfer needs ${formatEther(value)} BDAG. Send BDAG to ${tx.safe_address} first, then execute.`
          );
        }
      }

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
      setMessage(friendlyExecuteError(error));
    } finally {
      setBusy(false);
    }
  }

  const thresholdMet =
    threshold !== null && signatures.length >= threshold;
  const signaturesNeeded =
    threshold !== null ? Math.max(threshold - signatures.length, 0) : null;
  const executeBlocked = funded === false;
  const executeDisabled = busy || !thresholdMet || executeBlocked;

  const executeTitle = !thresholdMet
    ? threshold === null
      ? "Loading Safe signature threshold…"
      : `Threshold not met — ${signatures.length} of ${threshold} signatures`
    : executeBlocked
      ? "Fund the Safe with BDAG before executing"
      : "Submit the fully signed Safe transaction on-chain";

  const executeLabel = busy
    ? "Working..."
    : !thresholdMet
      ? signaturesNeeded !== null
        ? `Need ${signaturesNeeded} more signature${
            signaturesNeeded === 1 ? "" : "s"
          }`
        : "Execute Transaction"
      : executeBlocked
        ? "Fund Safe First"
        : "Execute Transaction";

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
            {isConfigTx
              ? "Pending configuration"
              : "Pending Safe Transaction"}
          </div>

          <div
            style={{
              fontSize: isConfigTx ? 16 : 20,
              fontWeight: 900,
              marginBottom: 8,
              wordBreak: "break-word",
            }}
          >
            {title}
          </div>

          <div
            style={{
              fontSize: 13,
              color: "#555",
              wordBreak: "break-all",
            }}
          >
            {isConfigTx ? `Safe: ${tx.to}` : `To: ${tx.to}`}
          </div>

          {!isConfigTx && tx.description && (
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
            {threshold !== null ? ` / ${threshold}` : ""}
            {alreadySigned ? " · you signed" : ""}
            {threshold !== null && !thresholdMet
              ? " · threshold not met"
              : ""}
          </div>

          {!isConfigTx && balance !== undefined && (
            <div
              style={{
                marginTop: 6,
                fontSize: 12,
                color: funded ? "#2f6b3a" : "#8a3b12",
                fontWeight: 600,
              }}
            >
              Safe balance: {formatEther(balance)} BDAG
              {funded
                ? " — funded for this transfer"
                : " — not enough to execute yet"}
            </div>
          )}

          {isConfigTx && (
            <div
              style={{
                marginTop: 8,
                fontSize: 12,
                color: "#777",
                lineHeight: 1.45,
              }}
            >
              Configuration changes do not send BDAG. Execute after the
              signature threshold is met.
            </div>
          )}

          {!alreadySigned && threshold !== null && threshold > 1 && (
            <div
              style={{
                marginTop: 8,
                fontSize: 12,
                color: "#777",
                lineHeight: 1.45,
              }}
            >
              Sign is for other Safe owners. Creating a proposal already
              recorded your signature.
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            width: "100%",
            maxWidth: 280,
          }}
        >
          {alreadySigned ? (
            <button
              type="button"
              disabled
              title="Your signature is already recorded for this proposal"
              style={{
                flex: "1 1 120px",
                minHeight: 44,
                border: "1px solid #cfe3d6",
                borderRadius: 8,
                padding: "11px 16px",
                fontWeight: 800,
                background: "#f3faf5",
                color: "#238f52",
                cursor: "default",
              }}
            >
              Signed
            </button>
          ) : (
            <button
              type="button"
              onClick={sign}
              disabled={busy}
              title="Add this connected owner’s signature to the proposal"
              style={{
                flex: "1 1 120px",
                minHeight: 44,
                border: 0,
                borderRadius: 8,
                padding: "11px 16px",
                fontWeight: 800,
                cursor: busy ? "not-allowed" : "pointer",
              }}
            >
              {busy ? "Working..." : "Sign"}
            </button>
          )}

          <button
            type="button"
            onClick={execute}
            disabled={executeDisabled}
            title={executeTitle}
            aria-disabled={executeDisabled}
            style={{
              flex: "1 1 120px",
              minHeight: 44,
              border: executeDisabled ? "1px solid #d8d8d4" : 0,
              borderRadius: 8,
              padding: "11px 16px",
              fontWeight: 800,
              background: executeDisabled ? "#f3f3f0" : undefined,
              color: executeDisabled ? "#8a8a86" : undefined,
              cursor: executeDisabled ? "not-allowed" : "pointer",
              opacity: executeDisabled ? 0.9 : 1,
            }}
          >
            {executeLabel}
          </button>
        </div>
      </div>

      {executeBlocked && (
        <div
          style={{
            marginTop: 14,
            padding: 12,
            borderRadius: 8,
            border: "1px solid #efd2b8",
            background: "#fff7ef",
            fontSize: 13,
            lineHeight: 1.5,
            color: "#5c3b1d",
          }}
        >
          <strong>Fund this Safe before executing.</strong>
          <div style={{ marginTop: 6 }}>
            A proposal only records intent — it does not move BDAG into the
            Safe. Send at least{" "}
            <strong>{formatEther(shortfall)} BDAG</strong> to:
          </div>
          <div
            style={{
              marginTop: 8,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: 12,
              wordBreak: "break-all",
            }}
          >
            {tx.safe_address}
          </div>
          <div style={{ marginTop: 6 }}>
            Then return here and execute. Your wallet still pays network gas
            separately.
          </div>
          <button
            type="button"
            onClick={() => {
              refreshBalance().catch(() => {});
            }}
            disabled={busy}
            style={{
              marginTop: 10,
              border: "1px solid #d9b48a",
              borderRadius: 8,
              padding: "8px 12px",
              background: "#fff",
              fontWeight: 700,
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            Refresh Safe balance
          </button>
        </div>
      )}

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

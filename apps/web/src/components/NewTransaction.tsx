"use client";

import { useState } from "react";
import { isAddress, parseEther } from "viem";
import { api } from "@/lib/api";
import { getSafeWithSigner } from "@/lib/safe";

export default function NewTransaction({
  safeAddress,
  onCreated,
}: {
  safeAddress: string;
  onCreated?: () => void;
}) {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function createProposal() {
    try {
      setBusy(true);
      setMessage("");

      if (!isAddress(recipient)) {
        throw new Error("Enter a valid recipient address.");
      }

      if (!amount || Number(amount) <= 0) {
        throw new Error("Enter a valid BDAG amount.");
      }

      const ethereum = (window as any).ethereum;

      if (!ethereum) {
        throw new Error("Browser wallet not found.");
      }

      const chainId = await ethereum.request({
        method: "eth_chainId",
      });

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
        safeAddress,
        signer
      );

      if (!(await protocolKit.isOwner(signer))) {
        throw new Error(
          "The connected wallet is not an owner of this Safe."
        );
      }

      const safeTransaction =
        await protocolKit.createTransaction({
          transactions: [
            {
              to: recipient,
              value: parseEther(amount).toString(),
              data: "0x",
            },
          ],
        });

      const safeTxHash =
        await protocolKit.getTransactionHash(
          safeTransaction
        );

      const signedTransaction =
        await protocolKit.signTransaction(
          safeTransaction
        );

      const signature =
        signedTransaction.getSignature(signer)?.data;

      if (!signature) {
        throw new Error(
          "Safe signature was not returned by the wallet."
        );
      }

      const tx = safeTransaction.data;

      await api.propose({
        safeAddress,
        to: tx.to,
        value: tx.value,
        data: tx.data,
        safeTxHash,

        operation: Number(tx.operation),
        safeTxGas: tx.safeTxGas,
        baseGas: tx.baseGas,
        gasPrice: tx.gasPrice,
        gasToken: tx.gasToken,
        refundReceiver: tx.refundReceiver,
        nonce: tx.nonce,

        signature,
        signer,
        description: description.trim() || undefined,
      });

      setRecipient("");
      setAmount("");
      setDescription("");
      setMessage(
        "Proposal created and your signature recorded."
      );

      onCreated?.();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to create proposal."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="new-transaction">
      <div className="kicker">Treasury Action</div>
      <h2>New Transaction</h2>

      <p className="new-transaction-help">
        Create a BDAG transfer proposal for the other Safe
        owner to review and approve.
      </p>

      <label>
        Recipient Address
        <input
          type="text"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="0x..."
          disabled={busy}
        />
      </label>

      <label>
        Amount (BDAG)
        <input
          type="number"
          min="0"
          step="any"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          disabled={busy}
        />
      </label>

      <label>
        Description
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this payment for?"
          disabled={busy}
        />
      </label>

      <button
        type="button"
        onClick={createProposal}
        disabled={busy}
      >
        {busy ? "Creating..." : "Create & Sign Proposal"}
      </button>

      {message && (
        <div className="new-transaction-message">
          {message}
        </div>
      )}

      <style jsx>{`
        .new-transaction {
          padding: 24px;
          border-bottom: 1px solid #e0e0dc;
          background: rgba(250, 250, 248, 0.65);
        }

        h2 {
          margin: 6px 0 5px;
          color: #555;
          font-size: 20px;
        }

        .new-transaction-help {
          margin: 0 0 20px;
          color: #858585;
          font-size: 12px;
          line-height: 1.6;
        }

        label {
          display: block;
          margin-top: 13px;
          color: #777;
          font-size: 11px;
          font-weight: 700;
        }

        input {
          display: block;
          width: 100%;
          margin-top: 7px;
          padding: 12px 13px;
          border: 1px solid #d8d8d4;
          border-radius: 10px;
          outline: none;
          background: white;
          color: #444;
          font-size: 13px;
        }

        input:focus {
          border-color: #f31332;
          box-shadow: 0 0 0 3px rgba(243, 19, 50, 0.07);
        }

        button {
          width: 100%;
          margin-top: 18px;
          padding: 13px 16px;
          border: 0;
          border-radius: 10px;
          background: #f31332;
          color: white;
          cursor: pointer;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.04em;
        }

        button:disabled {
          cursor: wait;
          opacity: 0.6;
        }

        .new-transaction-message {
          margin-top: 13px;
          padding: 11px 12px;
          border: 1px solid #dededa;
          border-radius: 9px;
          background: white;
          color: #666;
          font-size: 11px;
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
}

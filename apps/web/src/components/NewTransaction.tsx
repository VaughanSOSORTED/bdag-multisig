"use client";

import { useEffect, useRef, useState } from "react";
import { formatEther, isAddress, parseEther } from "viem";
import { api } from "@/lib/api";
import { getSafeWithSigner } from "@/lib/safe";
import { publicClient } from "@/lib/voting";

type Mode = "fund" | "propose";

const PROCESS_TIPS: Record<
  Mode,
  { title: string; body: string }[]
> = {
  fund: [
    {
      title: "Deposit BDAG",
      body: "Anyone can send native BDAG to the Safe address — you, another owner, or an outside contributor.",
    },
    {
      title: "Not a proposal",
      body: "Funding is a normal wallet transfer. It does not need multisig signatures.",
    },
    {
      title: "Then propose",
      body: "Once funded, owners use Propose to create payment requests from the Safe.",
    },
  ],
  propose: [
    {
      title: "Create a request",
      body: "Only Safe owners can propose. Choose a recipient and amount — nothing leaves the Safe yet.",
    },
    {
      title: "Collect signatures",
      body: "Return to the approval queue so other owners can sign until the threshold is met.",
    },
    {
      title: "Execute",
      body: "When ready, an owner executes. The Safe pays the transfer; the executor’s wallet pays gas.",
    },
  ],
};

function ProcessInfo({ mode }: { mode: Mode }) {
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const open = hovered || pinned;
  const tips = PROCESS_TIPS[mode];

  useEffect(() => {
    if (!pinned) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setPinned(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setPinned(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [pinned]);

  return (
    <div
      className="process-info"
      ref={rootRef}
      data-open={open ? "true" : "false"}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        className="process-info-btn"
        aria-label="How sending from this Safe works"
        aria-expanded={open}
        onClick={() => setPinned((value) => !value)}
      >
        i
      </button>

      {open && (
        <div className="process-info-panel" role="dialog" aria-label="Process overview">
          <div className="process-info-kicker">How it works</div>
          <ol className="process-info-list">
            {tips.map((item, index) => (
              <li key={item.title}>
                <span className="process-info-num">{index + 1}</span>
                <span>
                  <strong>{item.title}</strong>
                  <p>{item.body}</p>
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <style jsx>{`
        .process-info {
          position: relative;
          z-index: 20;
          flex: 0 0 auto;
        }

        .process-info-btn {
          width: 22px;
          height: 22px;
          margin: 0;
          padding: 0;
          border: 1px solid #d2d2ce;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.92);
          color: #8a8a8a;
          font-size: 11px;
          font-weight: 700;
          font-family: Arial, Helvetica, sans-serif;
          letter-spacing: 0;
          line-height: 1;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .process-info-btn:hover,
        .process-info-btn:focus-visible,
        .process-info[data-open="true"] .process-info-btn {
          border-color: #f31332;
          color: #f31332;
          outline: none;
        }

        .process-info-panel {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          width: min(320px, calc(100vw - 48px));
          padding: 14px 14px 12px;
          border: 1px solid #d7d7d3;
          border-radius: 12px;
          background: #f6f6f2;
          color: #555;
        }

        .process-info-kicker {
          margin-bottom: 10px;
          color: #999;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .process-info-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 10px;
        }

        .process-info-list li {
          display: grid;
          grid-template-columns: 20px 1fr;
          gap: 10px;
          align-items: flex-start;
        }

        .process-info-num {
          width: 20px;
          height: 20px;
          border-radius: 999px;
          background: rgba(243, 19, 50, 0.1);
          color: #f31332;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 800;
        }

        .process-info-list strong {
          display: block;
          color: #555;
          font-size: 12px;
          font-weight: 800;
        }

        .process-info-list p {
          margin: 3px 0 0;
          color: #858585;
          font-size: 11px;
          line-height: 1.55;
          font-weight: 400;
        }
      `}</style>
    </div>
  );
}

export default function NewTransaction({
  mode,
  safeAddress,
  onCreated,
  onBalanceChange,
  onGoToFund,
}: {
  mode: Mode;
  safeAddress: string;
  onCreated?: () => void;
  onBalanceChange?: (balance: bigint) => void;
  onGoToFund?: () => void;
}) {
  const [fundAmount, setFundAmount] = useState("5");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [safeBalance, setSafeBalance] = useState<bigint>();
  const [walletBalance, setWalletBalance] = useState<bigint>();

  async function refreshBalances(account?: string) {
    const client = publicClient();
    const nextSafe = await client.getBalance({
      address: safeAddress as `0x${string}`,
    });
    setSafeBalance(nextSafe);
    onBalanceChange?.(nextSafe);

    const ethereum = (window as any).ethereum;
    if (!ethereum) return nextSafe;

    const accounts =
      account
        ? [account]
        : ((await ethereum.request({ method: "eth_accounts" })) as string[]);

    if (accounts?.[0]) {
      const nextWallet = await client.getBalance({
        address: accounts[0] as `0x${string}`,
      });
      setWalletBalance(nextWallet);
    }

    return nextSafe;
  }

  useEffect(() => {
    let active = true;

    refreshBalances()
      .then(() => {
        if (!active) return;
      })
      .catch(() => {});

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeAddress, mode]);

  const funded = safeBalance !== undefined && safeBalance > 0n;

  async function ensureWallet() {
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

    const signer = accounts?.[0] as string | undefined;

    if (!signer) {
      throw new Error("No wallet account connected.");
    }

    return { ethereum, signer };
  }

  async function fundSafe() {
    try {
      setBusy(true);
      setMessage("");

      if (!fundAmount || Number(fundAmount) <= 0) {
        throw new Error("Enter a BDAG amount to deposit.");
      }

      const valueWei = parseEther(fundAmount);
      // Anyone can deposit native BDAG to a Safe — ownership is not required.
      const { ethereum, signer } = await ensureWallet();

      const currentWallet = await publicClient().getBalance({
        address: signer as `0x${string}`,
      });
      setWalletBalance(currentWallet);

      if (currentWallet < valueWei) {
        throw new Error(
          `Your wallet only holds ${formatEther(currentWallet)} BDAG.`
        );
      }

      const txHash = (await ethereum.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: signer,
            to: safeAddress,
            value: `0x${valueWei.toString(16)}`,
          },
        ],
      })) as `0x${string}`;

      setMessage(`Deposit submitted: ${txHash}. Waiting for confirmation…`);

      const receipt = await publicClient().waitForTransactionReceipt({
        hash: txHash,
      });

      if (receipt.status !== "success") {
        throw new Error("Deposit transaction failed on BlockDAG Mainnet.");
      }

      const nextBalance = await refreshBalances(signer);
      setMessage(
        `Safe funded. Balance is now ${formatEther(nextBalance)} BDAG.`
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to fund Safe."
      );
    } finally {
      setBusy(false);
    }
  }

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

      const valueWei = parseEther(amount);
      const balance = await refreshBalances();

      if (balance < valueWei) {
        throw new Error(
          `Safe needs ${formatEther(valueWei - balance)} more BDAG for this transfer. Open Fund to deposit first.`
        );
      }

      const { signer } = await ensureWallet();
      const protocolKit = await getSafeWithSigner(safeAddress, signer);

      if (!(await protocolKit.isOwner(signer))) {
        throw new Error(
          "The connected wallet is not an owner of this Safe."
        );
      }

      const safeTransaction = await protocolKit.createTransaction({
        transactions: [
          {
            to: recipient,
            value: valueWei.toString(),
            data: "0x",
          },
        ],
      });

      const safeTxHash =
        await protocolKit.getTransactionHash(safeTransaction);

      const signedTransaction =
        await protocolKit.signTransaction(safeTransaction);

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
        "Proposal created and signed. It is now in the approval queue."
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
      <div className="section-heading">
        <div>
          <div className="kicker">
            {mode === "fund" ? "Deposit" : "Outgoing payment"}
          </div>
          <h2>{mode === "fund" ? "Fund Safe" : "Propose Transaction"}</h2>
        </div>
        <ProcessInfo mode={mode} />
      </div>

      {mode !== "fund" && (
        <div className="balance-row">
          <div>
            Safe balance:{" "}
            <strong>
              {safeBalance === undefined
                ? "…"
                : `${formatEther(safeBalance)} BDAG`}
            </strong>
          </div>
          <div>
            Your wallet:{" "}
            <strong>
              {walletBalance === undefined
                ? "…"
                : `${Number(formatEther(walletBalance)).toFixed(4)} BDAG`}
            </strong>
          </div>
        </div>
      )}

      {mode === "fund" ? (
        <>
          <p className="new-transaction-help">
            Deposit native BDAG from this wallet to the Safe. This is a normal
            transfer — not a multisig proposal. Balances, refresh, and share
            live in the panel on the right.
          </p>

          <label>
            Amount to deposit (BDAG)
            <input
              type="number"
              min="0"
              step="any"
              value={fundAmount}
              onChange={(e) => setFundAmount(e.target.value)}
              placeholder="0.00"
              disabled={busy}
            />
          </label>

          <button type="button" onClick={fundSafe} disabled={busy}>
            {busy ? "Confirm in wallet…" : "Fund Safe from wallet"}
          </button>
        </>
      ) : (
        <>
          <p className="new-transaction-help">
            Propose a BDAG transfer <em>from</em> the Safe. After you create it,
            owners sign from the approval queue, then someone executes and pays
            gas from their wallet.
          </p>

          {!funded && (
            <div className="fund-callout">
              <strong>Safe balance is empty.</strong>
              <span>
                {" "}
                Deposit BDAG before a payment can be executed.
              </span>
              {onGoToFund && (
                <button
                  type="button"
                  className="secondary compact"
                  onClick={onGoToFund}
                  disabled={busy}
                >
                  Open Fund
                </button>
              )}
            </div>
          )}

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

          <button type="button" onClick={createProposal} disabled={busy}>
            {busy ? "Creating…" : "Create & Sign Proposal"}
          </button>
        </>
      )}

      {message && (
        <div className="new-transaction-message">{message}</div>
      )}

      <style jsx>{`
        .new-transaction {
          padding: 24px;
          border-bottom: 1px solid #e0e0dc;
          background: rgba(250, 250, 248, 0.65);
        }

        .section-heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
        }

        h2 {
          margin: 6px 0 0;
          color: #555;
          font-size: 20px;
        }

        .balance-row {
          display: flex;
          flex-wrap: wrap;
          gap: 12px 18px;
          margin-bottom: 14px;
          color: #777;
          font-size: 11px;
        }

        .balance-row strong {
          color: #444;
        }

        .new-transaction-help {
          margin: 0 0 16px;
          color: #858585;
          font-size: 12px;
          line-height: 1.6;
        }

        .fund-callout {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px 10px;
          margin: 0 0 14px;
          padding: 12px;
          border: 1px solid #efd2b8;
          border-radius: 10px;
          background: #fff7ef;
          color: #5c3b1d;
          font-size: 12px;
          line-height: 1.5;
        }

        .fund-callout .compact {
          margin-top: 0;
          width: auto;
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

        button:not(.process-info-btn) {
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

        button.secondary {
          margin-top: 10px;
          background: #fff;
          color: #555;
          border: 1px solid #d8d8d4;
        }

        button.compact {
          margin-top: 0;
          padding: 10px 12px;
          font-size: 11px;
        }

        button:not(.process-info-btn):disabled {
          cursor: not-allowed;
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
          word-break: break-word;
        }
      `}</style>
    </div>
  );
}

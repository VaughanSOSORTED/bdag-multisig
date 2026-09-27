"use client";

import { useEffect, useState } from "react";
import { formatEther } from "viem";
import { publicClient } from "@/lib/voting";

export default function FundSharePanel({
  safeAddress,
  balance,
  onBalanceChange,
  onGoToPropose,
}: {
  safeAddress: string;
  balance?: bigint;
  onBalanceChange?: (balance: bigint) => void;
  onGoToPropose?: () => void;
}) {
  const [copyNote, setCopyNote] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [safeBalance, setSafeBalance] = useState<bigint | undefined>(balance);
  const [walletBalance, setWalletBalance] = useState<bigint>();

  useEffect(() => {
    if (balance !== undefined) setSafeBalance(balance);
  }, [balance]);

  async function refreshBalances() {
    setBusy(true);
    try {
      const client = publicClient();
      const nextSafe = await client.getBalance({
        address: safeAddress as `0x${string}`,
      });
      setSafeBalance(nextSafe);
      onBalanceChange?.(nextSafe);

      const ethereum = (window as any).ethereum;
      if (ethereum) {
        const accounts = (await ethereum.request({
          method: "eth_accounts",
        })) as string[];
        if (accounts?.[0]) {
          const nextWallet = await client.getBalance({
            address: accounts[0] as `0x${string}`,
          });
          setWalletBalance(nextWallet);
        }
      }
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    refreshBalances().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeAddress]);

  const funded = safeBalance !== undefined && safeBalance > 0n;

  const fundingInstructions = [
    "Please send BDAG on BlockDAG Mainnet (Chain ID 1404) to this Safe treasury:",
    safeAddress,
    "",
    "Send a normal wallet transfer of native BDAG to the Safe address above on BlockDAG Mainnet.",
    "After the deposit confirms, Safe owners can propose and execute payments.",
  ].join("\n");

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(safeAddress);
      setCopyNote("Safe address copied.");
      window.setTimeout(() => setCopyNote(undefined), 2500);
    } catch {
      setCopyNote("Unable to copy — select the address manually.");
    }
  }

  function shareThisSafe() {
    const subject = "Please fund this BDAG Multisig Safe";
    const body = [
      "Hi,",
      "",
      fundingInstructions,
      "",
      `Safe dashboard: ${typeof window !== "undefined" ? window.location.href : ""}`,
      "",
      "Thanks",
    ].join("\n");

    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  return (
    <aside className="panel fund-share-panel">
      <div className="kicker">Safe status</div>
      <h3>Balances & share</h3>

      <div className="balance-block">
        <div className="balance-row">
          <span>Safe balance</span>
          <strong>
            {safeBalance === undefined
              ? "…"
              : `${formatEther(safeBalance)} BDAG`}
          </strong>
        </div>
        <div className="balance-row">
          <span>Your wallet</span>
          <strong>
            {walletBalance === undefined
              ? "…"
              : `${Number(formatEther(walletBalance)).toFixed(4)} BDAG`}
          </strong>
        </div>
      </div>

      <button
        type="button"
        className="secondary"
        onClick={() => refreshBalances().catch(() => {})}
        disabled={busy}
      >
        {busy ? "Refreshing…" : "Refresh balance"}
      </button>

      {funded && onGoToPropose && (
        <button type="button" className="primary" onClick={onGoToPropose}>
          Go to Propose →
        </button>
      )}

      <div className="share-section">
        <div className="share-kicker">External deposit</div>
        <p>
          Anyone can fund this Safe by sending native BDAG to the address
          below. Share it when someone else will deposit.
        </p>

        <div className="safe-target">
          Safe deposit address
          <code>{safeAddress}</code>
        </div>

        <div className="copy-actions">
          <button type="button" className="secondary" onClick={copyAddress}>
            Copy address
          </button>
          <button type="button" className="secondary" onClick={shareThisSafe}>
            Share This Safe
          </button>
        </div>

        {copyNote && <div className="copy-note">{copyNote}</div>}
      </div>

      <style jsx>{`
        .fund-share-panel {
          padding: 22px;
        }

        .kicker {
          color: #f31332;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.2em;
          text-transform: uppercase;
        }

        h3 {
          margin: 7px 0 14px;
          color: #555;
          font-size: 17px;
        }

        .balance-block {
          display: grid;
          gap: 8px;
          margin-bottom: 12px;
          padding: 12px;
          border: 1px solid #e4e4e0;
          border-radius: 10px;
          background: #fafaf8;
        }

        .balance-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          font-size: 12px;
        }

        .balance-row span {
          color: #8c8c88;
        }

        .balance-row strong {
          color: #444;
          text-align: right;
          word-break: break-word;
        }

        .share-section {
          margin-top: 18px;
          padding-top: 16px;
          border-top: 1px solid #e8e8e4;
        }

        .share-kicker {
          margin-bottom: 8px;
          color: #999;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        p {
          margin: 0 0 12px;
          color: #888;
          font-size: 12px;
          line-height: 1.6;
        }

        .safe-target {
          padding: 12px;
          border-radius: 10px;
          border: 1px solid #e4e4e0;
          background: #fff;
          color: #777;
          font-size: 11px;
        }

        .safe-target code {
          display: block;
          margin-top: 6px;
          color: #444;
          font-size: 11px;
          word-break: break-all;
        }

        .copy-actions {
          display: grid;
          gap: 8px;
          margin-top: 12px;
        }

        button {
          width: 100%;
          min-height: 44px;
          margin-top: 8px;
          padding: 11px 14px;
          border-radius: 10px;
          cursor: pointer;
          font-size: 11px;
          font-weight: 800;
        }

        button:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        button.secondary {
          border: 1px solid #d8d8d4;
          background: #fff;
          color: #555;
        }

        button.secondary:hover:not(:disabled) {
          border-color: #f31332;
          color: #f31332;
        }

        button.primary {
          border: 0;
          background: #f31332;
          color: #fff;
        }

        .copy-note {
          margin-top: 10px;
          color: #238f52;
          font-size: 11px;
          font-weight: 600;
        }
      `}</style>
    </aside>
  );
}

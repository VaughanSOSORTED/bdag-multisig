"use client";

import { useEffect, useMemo, useState } from "react";
import { formatEther } from "viem";
import { api, type PendingTx } from "@/lib/api";
import { publicClient } from "@/lib/voting";
import {
  fetchSafeOnChainActivity,
  formatActivityAmount,
  type OnChainSafeActivity,
} from "@/lib/safeActivity";
import TxCard from "@/components/TxCard";
import NewTransaction from "@/components/NewTransaction";
import FundSharePanel from "@/components/FundSharePanel";
import SafeSettings from "@/components/SafeSettings";
import SafeHistory, { type HistoryRow } from "@/components/SafeHistory";
import SafeGovernance from "@/components/SafeGovernance";
import SiteFooter from "@/components/SiteFooter";

type DashTab = "fund" | "propose" | "history" | "governance" | "settings";

type AuditRow = HistoryRow & {
  sortKey: number;
};

function parseTab(value: string | null): DashTab {
  if (
    value === "propose" ||
    value === "history" ||
    value === "governance" ||
    value === "settings"
  ) {
    return value;
  }
  // Legacy ?tab=treasury → Propose (queue + payments)
  if (value === "treasury") return "propose";
  return "fund";
}

export default function SafePage({
  params,
}: {
  params: { address: string };
}) {
  const { address } = params;

  const [balance, setBalance] = useState<bigint>();
  const [pending, setPending] = useState<PendingTx[]>([]);
  const [history, setHistory] = useState<PendingTx[]>([]);
  const [onChainActivity, setOnChainActivity] = useState<
    OnChainSafeActivity[]
  >([]);
  const [activityError, setActivityError] = useState<string>();
  const [apiOnline, setApiOnline] = useState(true);
  const [access, setAccess] = useState<
    "disconnected" | "checking" | "authorized" | "denied" | "wrong-network"
  >("disconnected");
  const [connectedAccount, setConnectedAccount] = useState<string>();
  const [tab, setTab] = useState<DashTab>("fund");
  const [proposeMode, setProposeMode] = useState<"queue" | "new">("queue");

  useEffect(() => {
    if (typeof window === "undefined") return;
    setTab(parseTab(new URLSearchParams(window.location.search).get("tab")));
  }, []);

  function selectTab(next: DashTab) {
    setTab(next);
    if (next === "propose") {
      setProposeMode("queue");
    }
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (next === "fund") {
      url.searchParams.delete("tab");
    } else {
      url.searchParams.set("tab", next);
    }
    window.history.replaceState({}, "", `${url.pathname}${url.search}`);
  }

  function refreshPending() {
    api
      .pending(address)
      .then((items) => {
        setPending(items);
        setApiOnline(true);
      })
      .catch(() => setApiOnline(false));
  }

  const safeOwnerAbi = [
    {
      type: "function",
      name: "getOwners",
      stateMutability: "view",
      inputs: [],
      outputs: [{ name: "", type: "address[]" }],
    },
  ] as const;

  async function verifyOwner(
    account: string,
    options?: { quiet?: boolean }
  ) {
    // Keep the dashboard mounted during soft re-checks so MetaMask
    // accountsChanged / chainChanged events don't look like a disconnect.
    if (!options?.quiet) {
      setAccess("checking");
    }

    try {
      const ethereum = (window as any).ethereum;

      if (!ethereum) {
        setAccess("disconnected");
        setConnectedAccount(undefined);
        return;
      }

      const chainId = await ethereum.request({ method: "eth_chainId" });

      if (Number.parseInt(chainId, 16) !== 1404) {
        setConnectedAccount(account);
        setAccess("wrong-network");
        return;
      }

      const owners = await publicClient().readContract({
        address: address as `0x${string}`,
        abi: safeOwnerAbi,
        functionName: "getOwners",
      });

      setConnectedAccount(account);

      const isOwner = owners.some(
        (owner) => owner.toLowerCase() === account.toLowerCase()
      );

      setAccess(isOwner ? "authorized" : "denied");
    } catch (error) {
      console.error("Owner verification failed:", error);
      // Don't kick an already-authorized session to denied on a transient RPC blip.
      if (!options?.quiet) {
        setAccess("denied");
      }
    }
  }

  async function connectWallet() {
    try {
      const ethereum = (window as any).ethereum;

      if (!ethereum) {
        alert("No browser wallet was detected. Please install or enable MetaMask.");
        return;
      }

      setAccess("checking");

      const accounts = (await ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];

      if (!accounts.length) {
        setAccess("disconnected");
        return;
      }

      await verifyOwner(accounts[0]);
    } catch (error) {
      console.error("Wallet connection failed:", error);
      setAccess("disconnected");
    }
  }

  async function disconnectWallet() {
    setConnectedAccount(undefined);
    setAccess("disconnected");
    setBalance(undefined);
    setPending([]);
    setHistory([]);

    try {
      const ethereum = (window as any).ethereum;
      await ethereum?.request?.({
        method: "wallet_revokePermissions",
        params: [{ eth_accounts: {} }],
      });
    } catch {
      // Older wallets may not support revoke; local disconnect still works.
    }
  }

  useEffect(() => {
    const ethereum = (window as any).ethereum;
    if (!ethereum) return;

    let cancelled = false;

    // Restore an existing MetaMask site permission without a connect click.
    (async () => {
      try {
        const accounts = (await ethereum.request({
          method: "eth_accounts",
        })) as string[];
        if (cancelled || !accounts.length) return;
        await verifyOwner(accounts[0], { quiet: true });
      } catch {
        // Stay on connect screen if the wallet is unavailable.
      }
    })();

    const handleAccountsChanged = (accounts: string[]) => {
      if (!accounts.length) {
        setConnectedAccount(undefined);
        setAccess("disconnected");
        setBalance(undefined);
        setPending([]);
        setHistory([]);
        return;
      }

      // Account switch: refresh owner check without blanking the page.
      verifyOwner(accounts[0], { quiet: true });
    };

    const handleChainChanged = () => {
      ethereum
        .request({ method: "eth_accounts" })
        .then((accounts: string[]) => {
          if (!accounts.length) {
            setAccess("disconnected");
            setConnectedAccount(undefined);
            return;
          }
          return verifyOwner(accounts[0], { quiet: true });
        })
        .catch(() => {});
    };

    ethereum.on?.("accountsChanged", handleAccountsChanged);
    ethereum.on?.("chainChanged", handleChainChanged);

    return () => {
      cancelled = true;
      ethereum.removeListener?.("accountsChanged", handleAccountsChanged);
      ethereum.removeListener?.("chainChanged", handleChainChanged);
    };
  }, [address]);

  useEffect(() => {
    if (access !== "authorized") return;
    const client = publicClient();

    client
      .getBalance({ address: address as `0x${string}` })
      .then(setBalance)
      .catch(() => {});

    api
      .pending(address)
      .then((items) => {
        setPending(items);
        setApiOnline(true);
      })
      .catch(() => {
        setApiOnline(false);
      });

    fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/transactions/history?safe=${encodeURIComponent(address)}`
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error("Unable to load transaction history");
        }
        return response.json();
      })
      .then((items) => {
        setHistory(items);
      })
      .catch((error) => {
        console.error("Transaction history failed:", error);
      });

    setActivityError(undefined);
    fetchSafeOnChainActivity(address)
      .then((items) => {
        setOnChainActivity(items);
      })
      .catch((error) => {
        console.error("On-chain Safe activity failed:", error);
        const raw =
          error instanceof Error
            ? error.message
            : "Unable to load on-chain Safe activity";
        setActivityError(
          /rate limit|exceeds defined limit|429/i.test(raw)
            ? "The BlockDAG RPC rate-limited history loading. Wait a moment and refresh the page."
            : raw
        );
      });
  }, [address, access]);

  function shortAddress(value: string) {
    return `${value.slice(0, 8)}…${value.slice(-6)}`;
  }

  const auditRows = useMemo(() => {
    const rows: AuditRow[] = [];
    const matchedSafeTxHashes = new Set<string>();

    for (const item of onChainActivity) {
      if (item.safeTxHash) {
        matchedSafeTxHashes.add(item.safeTxHash.toLowerCase());
      }

      if (item.kind === "received") {
        rows.push({
          id: item.id,
          title: item.title,
          meta: item.transactionHash,
          amount: formatActivityAmount(item.amountWei),
          partyLabel: "From",
          party: item.counterparty
            ? shortAddress(item.counterparty)
            : "—",
          detailLabel: "Type",
          detail: "On-chain deposit",
          status: "received",
          statusClass: "received",
          when: item.timestamp
            ? new Date(item.timestamp * 1000).toLocaleDateString("en-GB")
            : `Block ${item.blockNumber.toString()}`,
          sortKey: item.timestamp
            ? item.timestamp * 1000
            : Number(item.blockNumber),
        });
        continue;
      }

      if (item.kind === "setup") {
        rows.push({
          id: item.id,
          title: item.title,
          meta: item.transactionHash,
          amount: "—",
          partyLabel: "Safe",
          party: shortAddress(address),
          detailLabel: "Type",
          detail: "Deployment",
          status: "setup",
          statusClass: "setup",
          when: item.timestamp
            ? new Date(item.timestamp * 1000).toLocaleDateString("en-GB")
            : `Block ${item.blockNumber.toString()}`,
          sortKey: item.timestamp
            ? item.timestamp * 1000
            : Number(item.blockNumber),
        });
        continue;
      }

      const matchedProposal = history.find(
        (tx) =>
          tx.safe_tx_hash &&
          item.safeTxHash &&
          tx.safe_tx_hash.toLowerCase() === item.safeTxHash.toLowerCase()
      );

      rows.push({
        id: item.id,
        title:
          matchedProposal?.description ||
          item.title,
        meta: item.transactionHash,
        amount: formatActivityAmount(item.amountWei),
        partyLabel: "To",
        party: item.counterparty
          ? shortAddress(item.counterparty)
          : "—",
        detailLabel: "Safe tx",
        detail: item.safeTxHash
          ? shortAddress(item.safeTxHash)
          : "—",
        status: "executed",
        statusClass: "executed",
        when: item.timestamp
          ? new Date(item.timestamp * 1000).toLocaleDateString("en-GB")
          : `Block ${item.blockNumber.toString()}`,
        sortKey: item.timestamp
          ? item.timestamp * 1000
          : Number(item.blockNumber),
      });
    }

    for (const tx of history) {
      const hash = tx.safe_tx_hash?.toLowerCase();
      if (hash && matchedSafeTxHashes.has(hash)) {
        continue;
      }

      // Pending proposals already appear in the Approval Queue.
      if (String(tx.status).toLowerCase() === "pending") {
        continue;
      }

      rows.push({
        id: `api-${tx.id}`,
        title: tx.description || "Treasury proposal",
        meta: tx.safe_tx_hash || tx.id,
        amount: `${Number(formatEther(BigInt(tx.value))).toFixed(6)} BDAG`,
        partyLabel: "To",
        party: shortAddress(tx.to),
        detailLabel: "Nonce",
        detail: `#${tx.nonce}`,
        status: String(tx.status),
        statusClass: String(tx.status).toLowerCase(),
        when: tx.created_at
          ? new Date(tx.created_at).toLocaleDateString("en-GB")
          : "—",
        sortKey: tx.created_at
          ? new Date(tx.created_at).getTime()
          : 0,
      });
    }

    rows.sort((a, b) => b.sortKey - a.sortKey);
    return rows;
  }, [address, history, onChainActivity]);

  return (
    <>
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          background: #f6f6f2;
          color: #333;
          font-family: Arial, Helvetica, sans-serif;
        }

        .treasury-page {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(
              circle at 88% 10%,
              rgba(243, 19, 50, 0.07),
              transparent 25%
            ),
            #f6f6f2;
        }

        .treasury-grid {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0.55;
          background-image:
            linear-gradient(
              rgba(125, 125, 125, 0.11) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(125, 125, 125, 0.11) 1px,
              transparent 1px
            );
          background-size: 42px 42px;
          mask-image: linear-gradient(to bottom, black, transparent 92%);
        }

        .treasury-wrap {
          position: relative;
          width: min(1180px, calc(100% - 36px));
          margin: 0 auto;
          padding: 30px 0 60px;
        }

        .treasury-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          padding-bottom: 25px;
          border-bottom: 1px solid #d7d7d3;
        }

        .treasury-logo {
          display: block;
          width: min(180px, 42vw);
          height: auto;
        }

        .header-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          flex-wrap: wrap;
          gap: 10px;
        }

        .network-pill {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 10px 15px;
          border: 1px solid #d2d2ce;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.82);
          color: #747474;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          white-space: nowrap;
        }

        .network-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #f31332;
          box-shadow: 0 0 12px rgba(243, 19, 50, 0.35);
        }

        .wallet-chip {
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 40px;
          padding: 6px 8px 6px 14px;
          border: 1px solid #d2d2ce;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.82);
        }

        .wallet-chip-addr {
          color: #555;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.02em;
        }

        .disconnect-button {
          min-height: 28px;
          padding: 6px 12px;
          border: 0;
          border-radius: 999px;
          background: #f0f0ec;
          color: #666;
          cursor: pointer;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .disconnect-button:hover {
          background: #e6e6e2;
          color: #333;
        }

        .disconnect-button.ghost {
          margin-top: 4px;
          min-height: 44px;
          padding: 11px 18px;
          border: 1px solid #d8d8d4;
          border-radius: 12px;
          background: #fff;
          color: #666;
          font-size: 11px;
        }

        .access-gate {
          min-height: 520px;
          display: grid;
          place-items: center;
          padding: 55px 20px;
        }

        .access-card {
          width: min(560px, 100%);
          padding: 44px;
          border: 1px solid #d8d8d4;
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.94);
          box-shadow: 0 24px 70px rgba(70, 70, 70, 0.1);
          text-align: center;
        }

        .access-symbol {
          width: 62px;
          height: 62px;
          display: grid;
          place-items: center;
          margin: 0 auto 20px;
          border-radius: 50%;
          background: rgba(243, 19, 50, 0.07);
          color: #f31332;
          font-size: 25px;
          font-weight: 800;
        }

        .access-card h1 {
          margin: 8px 0 12px;
          color: #555;
          font-size: clamp(28px, 5vw, 40px);
          letter-spacing: -0.035em;
        }

        .access-card p {
          max-width: 440px;
          margin: 0 auto 24px;
          color: #858585;
          font-size: 13px;
          line-height: 1.7;
        }

        .access-wallet {
          margin: -8px 0 24px;
          color: #777;
          font-family: monospace;
          font-size: 11px;
        }

        .connect-button {
          border: 0;
          border-radius: 12px;
          padding: 14px 24px;
          background: #f31332;
          color: white;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          cursor: pointer;
          box-shadow: 0 10px 25px rgba(243, 19, 50, 0.18);
        }

        .connect-button:hover {
          filter: brightness(0.94);
        }

        .connect-button:disabled {
          cursor: wait;
          opacity: 0.65;
        }

        .access-note {
          margin-top: 22px !important;
          color: #a0a09b !important;
          font-size: 10px !important;
        }

        .treasury-hero {
          padding: 44px 0 27px;
        }

        .kicker {
          color: #f31332;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.2em;
          text-transform: uppercase;
        }

        .treasury-hero h1 {
          margin: 6px 0 6px;
          color: #626262;
          font-size: clamp(22px, 3.2vw, 30px);
          line-height: 1.1;
          letter-spacing: -0.03em;
        }

        .safe-address {
          color: #858585;
          font-family: monospace;
          font-size: 12px;
        }

        .safe-address strong {
          color: #555;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-bottom: 24px;
        }

        .stat-card {
          min-height: 118px;
          padding: 20px;
          border: 1px solid #d8d8d4;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.9);
          box-shadow: 0 14px 40px rgba(70, 70, 70, 0.06);
        }

        .stat-label {
          color: #8b8b87;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .stat-value {
          margin-top: 13px;
          color: #555;
          font-size: 22px;
          font-weight: 800;
        }

        .stat-value.red {
          color: #f31332;
        }

        .stat-sub {
          margin-top: 5px;
          color: #a0a09b;
          font-size: 10px;
        }

        .dashboard-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 20px;
          align-items: start;
          margin-top: 16px;
        }

        .dashboard-layout.with-side {
          grid-template-columns: minmax(0, 1.6fr) minmax(260px, 0.8fr);
        }

        .panel {
          border: 1px solid #d8d8d4;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.9);
          box-shadow: 0 18px 50px rgba(70, 70, 70, 0.08);
        }

        .pending-panel {
          overflow: hidden;
        }

        .panel-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          padding: 23px 24px 20px;
          border-bottom: 1px solid #e0e0dc;
        }

        .panel-head h2 {
          margin: 6px 0 0;
          color: #555;
          font-size: 20px;
        }

        .panel-head p {
          margin: 7px 0 0;
          color: #858585;
          font-size: 12px;
          line-height: 1.6;
        }

        .panel-head-actions {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 10px;
          flex: 0 0 auto;
        }

        .pending-count {
          display: grid;
          place-items: center;
          min-width: 38px;
          height: 38px;
          padding: 0 11px;
          border-radius: 12px;
          background: #f31332;
          color: white;
          font-size: 14px;
          font-weight: 800;
        }

        .new-proposal-btn {
          min-height: 44px;
          padding: 11px 16px;
          border: 0;
          border-radius: 10px;
          background: #f31332;
          color: #fff;
          cursor: pointer;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.04em;
          white-space: nowrap;
        }

        .back-to-queue {
          display: inline-flex;
          align-items: center;
          min-height: 36px;
          margin: 0;
          padding: 0;
          border: 0;
          background: transparent;
          color: #777;
          cursor: pointer;
          font-size: 12px;
          font-weight: 700;
        }

        .back-to-queue:hover {
          color: #f31332;
        }

        .propose-new-wrap {
          border-bottom: 1px solid #e0e0dc;
        }

        .propose-new-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 16px 24px 0;
        }

        .pending-content {
          padding: 18px;
        }

        .empty-state {
          padding: 45px 20px;
          text-align: center;
        }

        .empty-icon {
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          margin: 0 auto 14px;
          border: 1px solid #d8d8d4;
          border-radius: 50%;
          color: #f31332;
          background: #fafaf8;
          font-size: 18px;
        }

        .empty-state strong {
          display: block;
          color: #555;
          font-size: 14px;
        }

        .empty-state p {
          margin: 7px auto 0;
          max-width: 390px;
          color: #969691;
          font-size: 12px;
          line-height: 1.6;
        }

        .api-warning {
          margin: 0 18px 18px;
          padding: 12px 14px;
          border: 1px solid rgba(243, 19, 50, 0.25);
          border-radius: 10px;
          background: rgba(243, 19, 50, 0.05);
          color: #a7555f;
          font-size: 11px;
          line-height: 1.5;
        }

        .dash-tabs {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 4px;
          margin: 14px 0 0;
          padding: 5px;
          border: 1px solid #d4d4d0;
          border-radius: 14px;
          background: #ecece8;
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.04);
        }

        .dash-tab {
          position: relative;
          min-height: 44px;
          padding: 12px 8px;
          border: 1px solid transparent;
          border-radius: 10px;
          background: transparent;
          color: #6f6f6b;
          cursor: pointer;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .dash-tab:hover {
          color: #333;
          background: rgba(255, 255, 255, 0.45);
        }

        .dash-tab.active {
          border-color: #d8d8d4;
          background: #fff;
          color: #1a1a1a;
          box-shadow: 0 1px 3px rgba(40, 40, 40, 0.08);
        }

        .dash-tab.active::after {
          content: "";
          position: absolute;
          left: 18%;
          right: 18%;
          bottom: 6px;
          height: 2px;
          border-radius: 2px;
          background: #f31332;
        }

        .tab-panel {
          margin-top: 16px;
          overflow: hidden;
        }

        .tab-panel-body {
          padding: 22px 24px 24px;
        }

        .site-footer {
          position: relative;
          margin-top: 45px;
          border-top: 1px solid #d7d7d3;
          background: rgba(255,255,255,.58);
        }

        .site-footer-inner {
          width: min(1180px, calc(100% - 36px));
          margin: 0 auto;
          padding: 35px 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 30px;
        }

        .site-footer-brand {
          display: flex;
          align-items: center;
          gap: 25px;
        }

        .site-footer-logo {
          width: 220px;
          height: auto;
        }

        .site-footer-community {
          padding-left: 25px;
          border-left: 1px solid #d6d6d2;
        }

        .site-footer-community-logo {
          display: block;
          width: 105px;
          max-height: 72px;
          object-fit: contain;
        }

        .site-footer-community strong,
        .site-footer-community span {
          display: block;
        }

        .site-footer-community strong {
          color: #555;
          font-size: 13px;
        }

        .site-footer-community span {
          margin-top: 5px;
          color: #9b4cff;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: .12em;
        }

        .site-footer-links {
          display: grid;
          gap: 9px;
          text-align: right;
          color: #858585;
          font-size: 10px;
          font-weight: 700;
        }

        .site-footer-links a {
          color: #f31332;
          text-decoration: none;
        }

        .site-footer-bottom {
          padding: 15px 18px;
          display: flex;
          justify-content: center;
          gap: 30px;
          border-top: 1px solid #e0e0dc;
          color: #969691;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: .13em;
        }

        .treasury-footer {
          margin-top: 32px;
          text-align: center;
          color: #92928e;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
        }

        @media (max-width: 900px) {
          .stats {
            grid-template-columns: 1fr 1fr;
          }

          .stats .stat-card:last-child {
            grid-column: 1 / -1;
          }

          .dashboard-layout,
          .dashboard-layout.with-side {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 620px) {
          .treasury-wrap {
            width: min(100% - 22px, 1180px);
          }

          .treasury-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .header-actions {
            width: 100%;
            justify-content: flex-start;
          }

          .wallet-chip {
            flex: 1;
            min-width: 0;
            justify-content: space-between;
          }

          .treasury-logo {
            width: min(150px, 48vw);
          }

          .stats {
            grid-template-columns: 1fr;
          }

          .panel-head {
            align-items: stretch;
            flex-direction: column;
          }

          .panel-head-actions {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            width: 100%;
          }

          .new-proposal-btn {
            width: 100%;
          }

          .panel-head-actions .new-proposal-btn {
            width: auto;
          }

          .dash-tabs {
            padding: 4px;
            gap: 3px;
          }

          .dash-tab {
            padding: 12px 2px;
            font-size: 10px;
            letter-spacing: 0.03em;
          }

          .dash-tab.active::after {
            left: 12%;
            right: 12%;
            bottom: 5px;
          }

          .tab-panel-body {
            padding: 16px;
          }
        }
      `}</style>

      <main className="treasury-page">
        <div className="treasury-grid" />

        <div className="treasury-wrap">
          <header className="treasury-header">
            <img
              src="/bdag-so-sorted-logo.png"
              alt="BDAG So Sorted"
              className="treasury-logo"
            />

            <div className="header-actions">
              <div className="network-pill">
                <span className="network-dot" />
                BLOCKDAG MAINNET · CHAIN 1404
              </div>

              {connectedAccount && (
                <div className="wallet-chip">
                  <span className="wallet-chip-addr">
                    {shortAddress(connectedAccount)}
                  </span>
                  <button
                    type="button"
                    className="disconnect-button"
                    onClick={disconnectWallet}
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          </header>

          {access !== "authorized" ? (
            <section className="access-gate">
              <div className="access-card">
                <div className="access-symbol">
                  {access === "denied" || access === "wrong-network" ? "×" : "◆"}
                </div>

                <div className="kicker">BDAG Multisig Treasury</div>

                {access === "disconnected" && (
                  <>
                    <h1>Connect Wallet</h1>
                    <p>
                      Connect an authorised Safe owner wallet to access the
                      treasury management dashboard.
                    </p>

                    <button
                      className="connect-button"
                      onClick={connectWallet}
                    >
                      Connect Wallet
                    </button>

                    <p className="access-note">
                      Access is verified directly against the Safe contract on
                      BlockDAG Mainnet.
                    </p>
                  </>
                )}

                {access === "checking" && (
                  <>
                    <h1>Verifying Access</h1>
                    <p>
                      Checking your wallet against the Safe owners on BlockDAG
                      Mainnet.
                    </p>

                    <button className="connect-button" disabled>
                      Checking Wallet…
                    </button>
                  </>
                )}

                {access === "wrong-network" && (
                  <>
                    <h1>Wrong Network</h1>
                    <p>
                      Your wallet is connected, but it is not currently using
                      BlockDAG Mainnet (Chain ID 1404). Switch networks in your
                      wallet and this page will automatically re-check access.
                    </p>

                    {connectedAccount && (
                      <div className="access-wallet">
                        {shortAddress(connectedAccount)}
                      </div>
                    )}

                    <button
                      type="button"
                      className="disconnect-button ghost"
                      onClick={disconnectWallet}
                    >
                      Disconnect Wallet
                    </button>
                  </>
                )}

                {access === "denied" && (
                  <>
                    <h1>Not Authorised</h1>
                    <p>
                      This wallet is not an owner of this Safe and cannot access
                      the treasury management dashboard.
                    </p>

                    {connectedAccount && (
                      <div className="access-wallet">
                        {shortAddress(connectedAccount)}
                      </div>
                    )}

                    <button
                      type="button"
                      className="disconnect-button ghost"
                      onClick={disconnectWallet}
                    >
                      Disconnect Wallet
                    </button>

                    <p className="access-note">
                      Disconnect, then connect an authorised owner account to
                      continue.
                    </p>
                  </>
                )}
              </div>
            </section>
          ) : (
            <>
          <section className="treasury-hero">
            <div className="kicker">Community Multisig</div>
            <h1>Treasury Dashboard</h1>
            <div className="safe-address">
              SAFE · <strong>{shortAddress(address)}</strong>
            </div>
          </section>

          <section className="stats">
            <Stat
              label="BDAG Balance"
              value={
                balance !== undefined
                  ? `${Number(formatEther(balance)).toFixed(6)}`
                  : "…"
              }
              sub="BDAG"
            />

            <Stat
              label="Pending Transactions"
              value={String(pending.length)}
              sub="Awaiting approvals"
              red={pending.length > 0}
            />

            <Stat
              label="Network"
              value="1404"
              sub="BlockDAG Mainnet"
              red
            />
          </section>

          <nav className="dash-tabs" aria-label="Safe dashboard sections">
            {(
              [
                ["fund", "Fund"],
                ["propose", "Propose"],
                ["history", "History"],
                ["governance", "Gov"],
                ["settings", "Settings"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={tab === id ? "dash-tab active" : "dash-tab"}
                onClick={() => selectTab(id)}
              >
                {label}
                {id === "propose" && pending.length > 0
                  ? ` (${pending.length})`
                  : ""}
                {id === "history" && auditRows.length > 0
                  ? ` (${auditRows.length})`
                  : ""}
              </button>
            ))}
          </nav>

          {tab === "fund" && (
            <div className="dashboard-layout with-side">
              <section className="panel pending-panel">
                <NewTransaction
                  mode="fund"
                  safeAddress={address}
                  onBalanceChange={(next) => {
                    setBalance(next);
                    fetchSafeOnChainActivity(address)
                      .then(setOnChainActivity)
                      .catch(() => {});
                  }}
                />
              </section>

              <FundSharePanel
                safeAddress={address}
                balance={balance}
                onBalanceChange={(next) => {
                  setBalance(next);
                  fetchSafeOnChainActivity(address)
                    .then(setOnChainActivity)
                    .catch(() => {});
                }}
                onGoToPropose={() => selectTab("propose")}
              />
            </div>
          )}

          {tab === "propose" && (
            <div className="dashboard-layout">
              <section className="panel pending-panel">
                {proposeMode === "new" ? (
                  <div className="propose-new-wrap">
                    <div className="propose-new-bar">
                      <button
                        type="button"
                        className="back-to-queue"
                        onClick={() => setProposeMode("queue")}
                      >
                        ← Back to queue
                      </button>
                    </div>
                    <NewTransaction
                      mode="propose"
                      safeAddress={address}
                      onBalanceChange={(next) => {
                        setBalance(next);
                        fetchSafeOnChainActivity(address)
                          .then(setOnChainActivity)
                          .catch(() => {});
                      }}
                      onGoToFund={() => selectTab("fund")}
                      onCreated={() => {
                        refreshPending();
                        setProposeMode("queue");
                        publicClient()
                          .getBalance({ address: address as `0x${string}` })
                          .then(setBalance)
                          .catch(() => {});
                        fetchSafeOnChainActivity(address)
                          .then(setOnChainActivity)
                          .catch(() => {});
                      }}
                    />
                  </div>
                ) : (
                  <>
                    <div className="panel-head">
                      <div>
                        <div className="kicker">Approval Queue</div>
                        <h2>Pending Transactions</h2>
                        <p>
                          Signatures are collected off-chain. Payment proposals
                          need Safe balance; configuration proposals only need
                          signatures then execute.
                        </p>
                      </div>

                      <div className="panel-head-actions">
                        <div className="pending-count">{pending.length}</div>
                        <button
                          type="button"
                          className="new-proposal-btn"
                          onClick={() => setProposeMode("new")}
                        >
                          New Proposal
                        </button>
                      </div>
                    </div>

                    <div className="pending-content">
                      {pending.length === 0 ? (
                        <div className="empty-state">
                          <div className="empty-icon">✓</div>
                          <strong>No transactions waiting</strong>
                          <p>
                            Payment and configuration proposals will appear
                            here for signing and execution. Create one with
                            New Proposal.
                          </p>
                          <button
                            type="button"
                            className="new-proposal-btn"
                            style={{ marginTop: 16 }}
                            onClick={() => setProposeMode("new")}
                          >
                            New Proposal
                          </button>
                        </div>
                      ) : (
                        pending.map((tx) => (
                          <TxCard key={tx.id} tx={tx} safeBalance={balance} />
                        ))
                      )}
                    </div>

                    {!apiOnline && (
                      <div className="api-warning">
                        The signature service is currently unavailable. On-chain
                        Safe funds are not affected, but pending proposals
                        cannot be loaded until the API is available.
                      </div>
                    )}
                  </>
                )}
              </section>
            </div>
          )}

          {tab === "history" && (
            <section className="panel tab-panel">
              <div className="tab-panel-body">
                <SafeHistory
                  rows={auditRows}
                  activityError={activityError}
                />
              </div>
            </section>
          )}

          {tab === "governance" && (
            <section className="panel tab-panel">
              <div className="tab-panel-body">
                <SafeGovernance />
              </div>
            </section>
          )}

          {tab === "settings" && (
            <section className="panel tab-panel">
              <div className="tab-panel-body">
                <SafeSettings
                  safeAddress={address}
                  onProposed={() => {
                    refreshPending();
                    selectTab("propose");
                  }}
                />
              </div>
            </section>
          )}

            </>
          )}

          <footer className="treasury-footer">
            BDAG SO SORTED · COMMUNITY BUILT BLOCKDAG INFRASTRUCTURE
          </footer>
        </div>
        <SiteFooter />
      </main>
    </>
  );
}

function Stat({
  label,
  value,
  sub,
  red = false,
}: {
  label: string;
  value: string;
  sub: string;
  red?: boolean;
}) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${red ? "red" : ""}`}>{value}</div>
      <div className="stat-sub">{sub}</div>
    </div>
  );
}

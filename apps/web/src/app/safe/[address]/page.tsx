"use client";

import { useEffect, useState } from "react";
import { formatEther } from "viem";
import { api, type PendingTx } from "@/lib/api";
import { publicClient, erc20Abi } from "@/lib/voting";
import addresses from "../../../../../../contracts/deployments/blockdag.json";
import TxCard from "@/components/TxCard";
import NewTransaction from "@/components/NewTransaction";
import SignerList from "@/components/SignerList";
import SiteFooter from "@/components/SiteFooter";

export default function SafePage({
  params,
}: {
  params: { address: string };
}) {
  const { address } = params;

  const [balance, setBalance] = useState<bigint>();
  const [pending, setPending] = useState<PendingTx[]>([]);
  const [history, setHistory] = useState<PendingTx[]>([]);
  const [tokenSymbol, setTokenSymbol] = useState<string>();
  const [tokenBalance, setTokenBalance] = useState<bigint>();
  const [apiOnline, setApiOnline] = useState(true);
  const [access, setAccess] = useState<
    "disconnected" | "checking" | "authorized" | "denied" | "wrong-network"
  >("disconnected");
  const [connectedAccount, setConnectedAccount] = useState<string>();

  const safeOwnerAbi = [
    {
      type: "function",
      name: "getOwners",
      stateMutability: "view",
      inputs: [],
      outputs: [{ name: "", type: "address[]" }],
    },
  ] as const;

  async function verifyOwner(account: string) {
    setAccess("checking");

    try {
      const ethereum = (window as any).ethereum;

      if (!ethereum) {
        setAccess("disconnected");
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
      setAccess("denied");
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

  useEffect(() => {
    const ethereum = (window as any).ethereum;
    if (!ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      setBalance(undefined);
      setPending([]);
      setHistory([]);
      setTokenBalance(undefined);

      if (!accounts.length) {
        setConnectedAccount(undefined);
        setAccess("disconnected");
        return;
      }

      verifyOwner(accounts[0]);
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    ethereum.on?.("accountsChanged", handleAccountsChanged);
    ethereum.on?.("chainChanged", handleChainChanged);

    return () => {
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

    const token = (
      addresses as typeof addresses & { VoteToken?: string }
    ).VoteToken as `0x${string}` | undefined;

    if (token && !token.startsWith("0x0000")) {
      client
        .readContract({
          address: token,
          abi: erc20Abi,
          functionName: "symbol",
        })
        .then(setTokenSymbol)
        .catch(() => {});

      client
        .readContract({
          address: token,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [address as `0x${string}`],
        })
        .then(setTokenBalance)
        .catch(() => {});
    }

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
  }, [address, access]);

  function shortAddress(value: string) {
    return `${value.slice(0, 8)}…${value.slice(-6)}`;
  }

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
          width: min(390px, 55vw);
          height: auto;
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
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 30px;
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
          margin: 8px 0 8px;
          color: #626262;
          font-size: clamp(34px, 5vw, 54px);
          line-height: 1;
          letter-spacing: -0.04em;
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
          grid-template-columns: repeat(4, 1fr);
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
          grid-template-columns: minmax(0, 1.6fr) minmax(290px, 0.8fr);
          gap: 20px;
          align-items: start;
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

        .side-stack {
          display: grid;
          gap: 20px;
        }

        .info-panel {
          padding: 23px;
        }

        .info-panel h3 {
          margin: 7px 0 17px;
          color: #555;
          font-size: 17px;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          padding: 12px 0;
          border-top: 1px solid #e3e3df;
          font-size: 12px;
        }

        .info-row span:first-child {
          color: #8c8c88;
        }

        .info-row strong {
          color: #555;
          text-align: right;
        }

        .red-text {
          color: #f31332 !important;
        }

        .security-panel {
          padding: 22px;
          border-color: rgba(243, 19, 50, 0.28);
          background: linear-gradient(
            145deg,
            rgba(243, 19, 50, 0.055),
            rgba(255, 255, 255, 0.92)
          );
        }

        .security-symbol {
          color: #f31332;
          font-size: 19px;
        }

        .security-panel strong {
          display: block;
          margin: 9px 0 6px;
          color: #555;
          font-size: 13px;
        }

        .security-panel p {
          margin: 0;
          color: #888;
          font-size: 11px;
          line-height: 1.6;
        }

        .signers-wrap {
          margin-top: 20px;
        }

        .history-panel {
          margin-top: 20px;
          overflow: hidden;
        }

        .history-content {
          padding: 0 24px 10px;
        }

        .history-row {
          display: grid;
          grid-template-columns: minmax(190px, 1.5fr) minmax(120px, .8fr) minmax(150px, 1fr) 80px 90px 120px;
          gap: 18px;
          align-items: center;
          padding: 18px 0;
          border-bottom: 1px solid #e3e3df;
        }

        .history-row:last-child {
          border-bottom: 0;
        }

        .history-title {
          color: #555;
          font-size: 12px;
          font-weight: 800;
        }

        .history-meta {
          margin-top: 5px;
          color: #999;
          font-family: monospace;
          font-size: 9px;
        }

        .history-label {
          display: none;
          margin-bottom: 4px;
          color: #999;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: .1em;
          text-transform: uppercase;
        }

        .history-value {
          color: #666;
          font-size: 11px;
          font-weight: 700;
        }

        .history-status {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 7px 10px;
          border-radius: 999px;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .history-status.executed {
          background: rgba(35, 150, 80, .1);
          color: #238f52;
        }

        .history-status.pending {
          background: rgba(243, 19, 50, .08);
          color: #f31332;
        }

        .history-status.stale {
          background: rgba(110, 110, 110, .1);
          color: #777;
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
            grid-template-columns: repeat(2, 1fr);
          }

          .dashboard-layout {
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

          .treasury-logo {
            width: min(390px, 90vw);
          }

          .treasury-hero {
            align-items: flex-start;
            flex-direction: column;
          }

          .stats {
            grid-template-columns: 1fr;
          }

          .panel-head {
            align-items: flex-start;
          }

          .history-row {
            grid-template-columns: 1fr 1fr;
            gap: 14px 20px;
          }

          .history-row > div:first-child {
            grid-column: 1 / -1;
          }

          .history-label {
            display: block;
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

            <div className="network-pill">
              <span className="network-dot" />
              BLOCKDAG MAINNET · CHAIN 1404
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

                    <p className="access-note">
                      Select an authorised owner account in your wallet to
                      continue.
                    </p>
                  </>
                )}
              </div>
            </section>
          ) : (
            <>
          <section className="treasury-hero">
            <div>
              <div className="kicker">Community Multisig</div>
              <h1>Treasury Dashboard</h1>
              <div className="safe-address">
                SAFE · <strong>{shortAddress(address)}</strong>
              </div>
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
              label={tokenSymbol ? `${tokenSymbol} Held` : "Governance Token"}
              value={
                tokenBalance !== undefined
                  ? Number(formatEther(tokenBalance)).toFixed(2)
                  : "—"
              }
              sub={tokenSymbol ?? "Not configured"}
            />

            <Stat
              label="Network"
              value="1404"
              sub="BlockDAG Mainnet"
              red
            />
          </section>

          <div className="dashboard-layout">
            <section className="panel pending-panel">
              <NewTransaction
                safeAddress={address}
                onCreated={() => {
                  api
                    .pending(address)
                    .then((items) => {
                      setPending(items);
                      setApiOnline(true);
                    })
                    .catch(() => setApiOnline(false));
                }}
              />

              <div className="panel-head">
                <div>
                  <div className="kicker">Approval Queue</div>
                  <h2>Pending Transactions</h2>
                  <p>
                    Signatures are collected off-chain. The last signer
                    executes and pays gas.
                  </p>
                </div>

                <div className="pending-count">{pending.length}</div>
              </div>

              <div className="pending-content">
                {pending.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">✓</div>
                    <strong>No transactions waiting</strong>
                    <p>
                      New treasury proposals requiring owner signatures will
                      appear here.
                    </p>
                  </div>
                ) : (
                  pending.map((tx) => <TxCard key={tx.id} tx={tx} />)
                )}
              </div>

              {!apiOnline && (
                <div className="api-warning">
                  The signature service is currently unavailable. On-chain Safe
                  funds are not affected, but pending proposals cannot be loaded
                  until the API is available.
                </div>
              )}
            </section>

            <aside className="side-stack">
              <div className="panel info-panel">
                <div className="kicker">Safe Details</div>
                <h3>Configuration</h3>

                <div className="info-row">
                  <span>Network</span>
                  <strong>BlockDAG</strong>
                </div>

                <div className="info-row">
                  <span>Chain ID</span>
                  <strong className="red-text">1404</strong>
                </div>

                <div className="info-row">
                  <span>Safe</span>
                  <strong>{shortAddress(address)}</strong>
                </div>

                <div className="info-row">
                  <span>Pending</span>
                  <strong>{pending.length}</strong>
                </div>
              </div>

              <div className="panel security-panel">
                <div className="security-symbol">◆</div>
                <strong>Multisig Security</strong>
                <p>
                  Treasury transactions require the configured number of Safe
                  owners to approve them before execution.
                </p>
              </div>
            </aside>
          </div>

          <section className="panel history-panel">
            <div className="panel-head">
              <div>
                <div className="kicker">Audit Trail</div>
                <h2>Transaction History</h2>
                <p>
                  Treasury proposals recorded by the BDAG multisig service.
                </p>
              </div>

              <div className="pending-count">{history.length}</div>
            </div>

            <div className="history-content">
              {history.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">✓</div>
                  <strong>No transaction history yet</strong>
                  <p>
                    Completed and previous treasury proposals will appear here.
                  </p>
                </div>
              ) : (
                history.map((tx) => (
                  <div className="history-row" key={tx.id}>
                    <div>
                      <div className="history-title">
                        {tx.description || "Treasury Transaction"}
                      </div>
                      <div className="history-meta">
                        {tx.safe_tx_hash
                          ? `${tx.safe_tx_hash.slice(0, 10)}…${tx.safe_tx_hash.slice(-8)}`
                          : tx.id}
                      </div>
                    </div>

                    <div>
                      <span className="history-label">Amount</span>
                      <div className="history-value">
                        {Number(formatEther(BigInt(tx.value))).toFixed(6)} BDAG
                      </div>
                    </div>

                    <div>
                      <span className="history-label">Recipient</span>
                      <div className="history-value">
                        {shortAddress(tx.to)}
                      </div>
                    </div>

                    <div>
                      <span className="history-label">Nonce</span>
                      <div className="history-value">#{tx.nonce}</div>
                    </div>

                    <div>
                      <span className="history-label">Signatures</span>
                      <div className="history-value">
                        {tx.signatures?.length ?? 0}
                      </div>
                    </div>

                    <div>
                      <span className="history-label">Status</span>
                      <span
                        className={`history-status ${String(
                          tx.status
                        ).toLowerCase()}`}
                      >
                        {tx.status}
                      </span>
                      <div className="history-meta">
                        {tx.created_at
                          ? new Date(tx.created_at).toLocaleDateString("en-GB")
                          : "—"}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <div className="signers-wrap">
            <SignerList safeAddress={address} />
          </div>

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

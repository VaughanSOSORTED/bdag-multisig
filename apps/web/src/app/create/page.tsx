"use client";

import { useEffect, useState } from "react";
import { isAddress } from "viem";
import { createSafe } from "@/lib/safe";

export default function CreatePage() {
  const [owners, setOwners] = useState<string[]>([""]);
  const [threshold, setThreshold] = useState(1);
  const [busy, setBusy] = useState(false);
  const [safeAddress, setSafeAddress] = useState<string>();
  const [error, setError] = useState<string>();

  const valid = owners.filter((owner) => isAddress(owner));

  const duplicateOwners =
    new Set(valid.map((owner) => owner.toLowerCase())).size !== valid.length;

  useEffect(() => {
    async function loadConnectedWallet() {
      if (typeof window === "undefined" || !(window as any).ethereum) return;

      try {
        const accounts = await (window as any).ethereum.request({
          method: "eth_accounts",
        });

        if (accounts?.[0]) {
          setOwners((current) => {
            if (current.length === 1 && current[0] === "") {
              return [accounts[0]];
            }
            return current;
          });
        }
      } catch {
        // Wallet can still be connected when the user deploys.
      }
    }

    loadConnectedWallet();
  }, []);

  function addOwner() {
    setOwners([...owners, ""]);
  }

  function removeOwner(index: number) {
    const next = owners.filter((_, i) => i !== index);
    setOwners(next);

    const count = next.filter((owner) => isAddress(owner)).length;
    if (threshold > Math.max(count, 1)) {
      setThreshold(Math.max(count, 1));
    }
  }

  async function deploy() {
    if (
      valid.length === 0 ||
      duplicateOwners ||
      threshold < 1 ||
      threshold > valid.length
    ) return;

    setBusy(true);
    setError(undefined);

    try {
      const deployedSafeAddress = await createSafe(valid, threshold);
      setSafeAddress(deployedSafeAddress);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Safe deployment failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <style jsx global>{`
        * { box-sizing: border-box; }

        html, body {
          margin: 0;
          background: #f6f6f2;
          color: #292929;
          font-family: Arial, Helvetica, sans-serif;
        }

        body {
          min-height: 100vh;
        }

        .page {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(circle at 86% 18%, rgba(244, 18, 48, .07), transparent 25%),
            radial-gradient(circle at 15% 65%, rgba(140,140,140,.06), transparent 30%),
            #f6f6f2;
        }

        .grid {
          position: absolute;
          inset: 0;
          opacity: .55;
          pointer-events: none;
          background-image:
            linear-gradient(rgba(125,125,125,.12) 1px, transparent 1px),
            linear-gradient(90deg, rgba(125,125,125,.12) 1px, transparent 1px);
          background-size: 42px 42px;
          mask-image: linear-gradient(to bottom, black, transparent 80%);
        }

        .wrap {
          position: relative;
          width: min(1180px, calc(100% - 36px));
          margin: 0 auto;
          padding: 32px 0 60px;
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 30px;
          padding: 8px 0 28px;
          border-bottom: 1px solid #d7d7d3;
        }

        .logo {
          display: block;
          width: min(440px, 56vw);
          height: auto;
        }

        .network {
          display: flex;
          align-items: center;
          gap: 10px;
          border: 1px solid #d2d2ce;
          background: rgba(255,255,255,.78);
          padding: 11px 16px;
          border-radius: 999px;
          color: #747474;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: .08em;
          white-space: nowrap;
        }

        .network-dot {
          width: 8px;
          height: 8px;
          background: #f31332;
          border-radius: 50%;
          box-shadow: 0 0 14px rgba(243,19,50,.35);
        }

        .hero {
          padding: 54px 0 35px;
          max-width: 760px;
        }

        .eyebrow {
          color: #f31332;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: .22em;
          text-transform: uppercase;
          margin-bottom: 13px;
        }

        h1 {
          color: #858585;
          margin: 0;
          font-size: clamp(38px, 5vw, 66px);
          line-height: 1;
          letter-spacing: -.045em;
          font-weight: 800;
        }

        .hero p {
          margin: 18px 0 0;
          color: #626262;
          max-width: 650px;
          line-height: 1.7;
          font-size: 15px;
        }

        .layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 340px;
          gap: 24px;
          align-items: start;
        }

        .card {
          border: 1px solid #d8d8d4;
          background: rgba(255,255,255,.88);
          border-radius: 22px;
          box-shadow: 0 22px 60px rgba(70,70,70,.10);
        }

        .main-card {
          padding: 32px;
        }

        .section-number {
          color: #f31332;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .18em;
        }

        h2 {
          color: #555555;
          margin: 7px 0 7px;
          font-size: 23px;
        }

        .muted {
          color: #777777;
          font-size: 13px;
          line-height: 1.6;
        }

        .owner {
          margin-top: 18px;
          border: 1px solid #dededa;
          background: #fafaf8;
          border-radius: 15px;
          padding: 15px;
        }

        .owner-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 9px;
        }

        .owner-title {
          color: #777777;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .12em;
          text-transform: uppercase;
        }

        .remove {
          background: none;
          border: 0;
          color: #858585;
          cursor: pointer;
          font-size: 12px;
        }

        .remove:hover { color: #f31332; }

        .address {
          width: 100%;
          padding: 14px 15px;
          color: #292929;
          background: #ffffff;
          border: 1px solid #d3d3cf;
          border-radius: 10px;
          outline: none;
          font-family: monospace;
          font-size: 14px;
        }

        .address:focus {
          border-color: #f31332;
          box-shadow: 0 0 0 3px rgba(243,19,50,.10);
        }

        .validation {
          margin-top: 8px;
          font-size: 11px;
        }

        .valid { color: #9fcf9f; }
        .invalid { color: #e3a4aa; }

        .add {
          margin-top: 14px;
          border: 1px solid #cececa;
          background: #f1f1ee;
          color: #555555;
          border-radius: 10px;
          padding: 11px 15px;
          cursor: pointer;
          font-weight: 700;
        }

        .add:hover {
          border-color: #aaaaa5;
          background: #e8e8e4;
        }

        .divider {
          height: 1px;
          background: #ddddda;
          margin: 30px 0;
        }

        .threshold-row {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
        }

        .threshold-big {
          font-size: 38px;
          font-weight: 800;
          color: #555555;
        }

        .threshold-of {
          color: #858585;
          margin-left: 7px;
        }

        input[type="range"] {
          width: 100%;
          margin-top: 24px;
          accent-color: #f31332;
        }

        .deploy {
          width: 100%;
          margin-top: 28px;
          padding: 16px 20px;
          border: 1px solid #f31332;
          border-radius: 12px;
          cursor: pointer;
          background: linear-gradient(180deg, #f51b39, #e50929);
          color: #ffffff;
          font-weight: 800;
          letter-spacing: .06em;
          box-shadow: 0 12px 30px rgba(243,19,50,.20);
        }

        .deploy:hover:not(:disabled) {
          filter: brightness(1.1);
          transform: translateY(-1px);
        }

        .deploy:disabled {
          cursor: not-allowed;
          opacity: .32;
        }

        .side {
          display: grid;
          gap: 18px;
        }

        .side-card {
          padding: 24px;
        }

        .side-title {
          font-size: 11px;
          color: #777777;
          font-weight: 800;
          letter-spacing: .16em;
          text-transform: uppercase;
          margin-bottom: 20px;
        }

        .stat {
          display: flex;
          justify-content: space-between;
          padding: 13px 0;
          border-bottom: 1px solid #dededa;
          font-size: 13px;
        }

        .stat:last-child { border-bottom: 0; }

        .stat span:first-child { color: #858585; }

        .chain {
          color: #f31332;
          font-family: monospace;
          font-weight: 700;
        }

        .security {
          border-color: rgba(243,19,50,.35);
          background: linear-gradient(145deg, rgba(243,19,50,.07), rgba(255,255,255,.92));
        }

        .shield {
          color: #f31332;
          font-size: 22px;
          margin-bottom: 12px;
        }

        .security strong {
          display: block;
          margin-bottom: 8px;
        }

        .security p {
          color: #777777;
          margin: 0;
          font-size: 12px;
          line-height: 1.7;
        }

        .error {
          margin-top: 20px;
          padding: 13px;
          border-radius: 10px;
          border: 1px solid rgba(225,25,45,.4);
          background: rgba(225,25,45,.08);
          color: #ff9ca6;
          font-size: 13px;
        }

        .success {
          margin-top: 20px;
          padding: 15px;
          border-radius: 10px;
          border: 1px solid #385338;
          background: rgba(50,100,50,.1);
          font-size: 12px;
        }

        .success a {
          display: block;
          margin-top: 7px;
          color: #292929;
          font-family: monospace;
          word-break: break-all;
        }

        .footer {
          margin-top: 35px;
          text-align: center;
          color: #8a8a86;
          font-size: 11px;
          letter-spacing: .08em;
        }

        @media (max-width: 850px) {
          .layout { grid-template-columns: 1fr; }
          .header { align-items: flex-start; flex-direction: column; }
          .logo { width: min(430px, 90vw); }
          .hero { padding-top: 38px; }
        }

        @media (max-width: 520px) {
          .wrap { width: min(100% - 22px, 1180px); }
          .main-card { padding: 20px; }
          .network { font-size: 10px; }
          .threshold-row { align-items: flex-start; }
        }
      `}</style>

      <main className="page">
        <div className="grid" />

        <div className="wrap">
          <header className="header">
            <img
              src="/bdag-so-sorted-logo.png"
              alt="BDAG So Sorted"
              className="logo"
            />

            <div className="network">
              <span className="network-dot" />
              BLOCKDAG MAINNET · CHAIN 1404
            </div>
          </header>

          <section className="hero">
            <div className="eyebrow">Community Multisig</div>
            <h1>Secure treasury control.</h1>
            <p>
              Create a BlockDAG multisig treasury where important transactions
              require approval from multiple trusted owners before execution.
            </p>
          </section>

          <div className="layout">
            <section className="card main-card">
              <div className="section-number">01 / OWNERS</div>
              <h2>Authorised Wallets</h2>
              <div className="muted">
                Add each wallet that will have authority over the multisig.
              </div>

              {owners.map((owner, index) => (
                <div className="owner" key={index}>
                  <div className="owner-head">
                    <div className="owner-title">Owner {index + 1}</div>

                    {owners.length > 1 && (
                      <button
                        className="remove"
                        onClick={() => removeOwner(index)}
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <input
                    className="address"
                    placeholder="0x..."
                    value={owner}
                    onChange={(e) =>
                      setOwners(
                        owners.map((value, i) =>
                          i === index ? e.target.value : value
                        )
                      )
                    }
                  />

                  {owner && (
                    <div
                      className={`validation ${
                        isAddress(owner) ? "valid" : "invalid"
                      }`}
                    >
                      {isAddress(owner)
                        ? "✓ Valid wallet address"
                        : "Enter a valid wallet address"}
                    </div>
                  )}
                </div>
              ))}

              <button className="add" onClick={addOwner}>
                + Add Owner
              </button>

              <div className="divider" />

              <div className="threshold-row">
                <div>
                  <div className="section-number">02 / APPROVALS</div>
                  <h2>Signature Threshold</h2>
                  <div className="muted">
                    Number of owners required to approve a transaction.
                  </div>
                </div>

                <div>
                  <span className="threshold-big">{threshold}</span>
                  <span className="threshold-of">
                    of {valid.length || "—"}
                  </span>
                </div>
              </div>

              <input
                type="range"
                min={1}
                max={Math.max(valid.length, 1)}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
              />

              {duplicateOwners && (
                <div className="error">
                  Each owner must use a different wallet address.
                </div>
              )}

              {error && <div className="error">{error}</div>}

              {safeAddress && (
                <div className="success">
                  SAFE DEPLOYED SUCCESSFULLY
                  <a href={`/safe/${safeAddress}`}>{safeAddress}</a>
                </div>
              )}

              <button
                className="deploy"
                disabled={
                  busy ||
                  valid.length === 0 ||
                  duplicateOwners ||
                  threshold > valid.length
                }
                onClick={deploy}
              >
                {busy ? "DEPLOYING SAFE…" : "DEPLOY MULTISIG SAFE"}
              </button>
            </section>

            <aside className="side">
              <div className="card side-card">
                <div className="side-title">Configuration</div>

                <div className="stat">
                  <span>Network</span>
                  <strong>BlockDAG</strong>
                </div>

                <div className="stat">
                  <span>Chain ID</span>
                  <span className="chain">1404</span>
                </div>

                <div className="stat">
                  <span>Valid Owners</span>
                  <strong>{valid.length}</strong>
                </div>

                <div className="stat">
                  <span>Threshold</span>
                  <strong>
                    {threshold} / {valid.length || "—"}
                  </strong>
                </div>
              </div>

              <div className="card side-card security">
                <div className="shield">◆</div>
                <strong>Mainnet Security</strong>
                <p>
                  Deployment is restricted to BlockDAG Mainnet Chain 1404.
                  Your connected wallet must also be on Chain 1404 before a
                  deployment transaction can be submitted.
                </p>
              </div>
            </aside>
          </div>

          <div className="footer">
            BDAG SO SORTED · COMMUNITY BUILT BLOCKDAG INFRASTRUCTURE
          </div>
        </div>
      </main>
    </>
  );
}

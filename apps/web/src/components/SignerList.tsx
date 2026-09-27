"use client";

import { useEffect, useState } from "react";
import { createPublicClient, http, parseAbi } from "viem";
import { blockdag } from "@/lib/chain";

const safeAbi = parseAbi([
  "function getOwners() view returns (address[])",
  "function getThreshold() view returns (uint256)",
]);

export default function SignerList({ safeAddress }: { safeAddress: string }) {
  const [owners, setOwners] = useState<string[]>([]);
  const [threshold, setThreshold] = useState<number>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const client = createPublicClient({
          chain: blockdag,
          transport: http(process.env.NEXT_PUBLIC_RPC_URL!),
        });

        const [safeOwners, safeThreshold] = await Promise.all([
          client.readContract({
            address: safeAddress as `0x${string}`,
            abi: safeAbi,
            functionName: "getOwners",
          }),
          client.readContract({
            address: safeAddress as `0x${string}`,
            abi: safeAbi,
            functionName: "getThreshold",
          }),
        ]);

        setOwners([...safeOwners]);
        setThreshold(Number(safeThreshold));
      } catch (error) {
        console.error("Unable to read Safe owners", error);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [safeAddress]);

  function short(address: string) {
    return `${address.slice(0, 8)}…${address.slice(-6)}`;
  }

  return (
    <section className="signer-panel">
      <div className="signer-heading">
        <div>
          <div className="signer-kicker">MULTISIG CONTROL</div>
          <h2>Owners &amp; Threshold</h2>
        </div>

        {threshold !== undefined && (
          <div className="threshold-pill">
            {threshold}-of-{owners.length}
          </div>
        )}
      </div>

      {threshold !== undefined && owners.length > 0 && (
        <p className="signer-description">
          {threshold} of {owners.length} owner
          {owners.length === 1 ? "" : "s"} required to approve.
        </p>
      )}

      {loading && <p className="signer-empty">Reading Safe configuration…</p>}

      {!loading && owners.length === 0 && (
        <p className="signer-empty">No owners could be read from this Safe.</p>
      )}

      <div className="owner-list">
        {owners.map((owner, index) => (
          <div className="owner-row" key={owner}>
            <div className="owner-avatar">{index + 1}</div>

            <div className="owner-info">
              <strong>Owner {index + 1}</strong>
              <span title={owner}>{short(owner)}</span>
            </div>

            <div className="owner-status">SIGNER</div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .signer-panel {
          border: 1px solid #d8d8d4;
          background: rgba(255, 255, 255, 0.9);
          border-radius: 18px;
          padding: 24px;
          box-shadow: 0 18px 50px rgba(70, 70, 70, 0.08);
        }

        .signer-heading {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 15px;
        }

        .signer-kicker {
          color: #f31332;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.18em;
        }

        h2 {
          margin: 6px 0 0;
          color: #555;
          font-size: 19px;
        }

        .threshold-pill {
          border: 1px solid rgba(243, 19, 50, 0.3);
          background: rgba(243, 19, 50, 0.06);
          color: #f31332;
          border-radius: 999px;
          padding: 7px 11px;
          font-size: 11px;
          font-weight: 800;
        }

        .signer-description {
          color: #777;
          font-size: 12px;
          margin: 8px 0 18px;
        }

        .signer-empty {
          color: #888;
          font-size: 12px;
          margin-top: 18px;
        }

        .owner-list {
          margin-top: 12px;
        }

        .owner-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 13px 0;
          border-top: 1px solid #e3e3df;
        }

        .owner-avatar {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          border-radius: 50%;
          background: #f31332;
          color: white;
          font-size: 12px;
          font-weight: 800;
        }

        .owner-info {
          display: flex;
          flex-direction: column;
          min-width: 0;
          flex: 1;
        }

        .owner-info strong {
          color: #444;
          font-size: 12px;
        }

        .owner-info span {
          margin-top: 3px;
          color: #8a8a86;
          font-family: monospace;
          font-size: 11px;
        }

        .owner-status {
          color: #999;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.12em;
        }
      `}</style>
    </section>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { createPublicClient, http } from "viem";
import { blockdag } from "@/lib/chain";
import {
  buildAddOwnerData,
  buildChangeThresholdData,
  buildRemoveOwnerData,
  proposeConfigTx,
  safeConfigAbi,
  validateAddOwner,
  validateChangeThreshold,
  validateRemoveOwner,
} from "@/lib/safeConfig";

const SECTION_TIPS = {
  current: [
    {
      title: "Who can act",
      body: "Owners listed here are the only wallets that can propose, sign, and execute Safe transactions.",
    },
    {
      title: "Threshold",
      body: "The N-of-M value is how many owner signatures are required before a proposal can be executed on-chain.",
    },
  ],
  add: [
    {
      title: "Adds a signer",
      body: "Proposes adding a new owner address to the Safe. The change is not live until signed and executed.",
    },
    {
      title: "Set the new threshold",
      body: "Pick how many signatures will be required after the owner is added (1 through current owners + 1).",
    },
    {
      title: "Then approve",
      body: "Other owners may need to sign. Execute from the Propose tab when the threshold is met.",
    },
  ],
  remove: [
    {
      title: "Removes a signer",
      body: "Proposes removing an existing owner. You cannot remove the last owner.",
    },
    {
      title: "Keep threshold valid",
      body: "The new threshold must fit the remaining owners (at least 1, at most owners − 1).",
    },
    {
      title: "Then approve",
      body: "Sign and execute like any other Safe proposal from the Propose queue.",
    },
  ],
  threshold: [
    {
      title: "Change required signatures",
      body: "Updates how many owners must approve before execution, without changing who the owners are.",
    },
    {
      title: "Valid range",
      body: "Threshold must be between 1 and the current number of owners.",
    },
    {
      title: "Then approve",
      body: "This is still a multisig proposal — it needs signatures and an execute step to take effect.",
    },
  ],
} as const;

type SectionKey = keyof typeof SECTION_TIPS;

function SectionInfo({
  section,
  label,
}: {
  section: SectionKey;
  label: string;
}) {
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const open = hovered || pinned;
  const tips = SECTION_TIPS[section];

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
      className="section-info"
      ref={rootRef}
      data-open={open ? "true" : "false"}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        className="section-info-btn"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setPinned((value) => !value)}
      >
        i
      </button>

      {open && (
        <div className="section-info-panel" role="dialog" aria-label={label}>
          <div className="section-info-kicker">How it works</div>
          <ol className="section-info-list">
            {tips.map((item, index) => (
              <li key={item.title}>
                <span className="section-info-num">{index + 1}</span>
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
        .section-info {
          position: relative;
          z-index: 20;
          flex: 0 0 auto;
        }

        .section-info-btn {
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
          min-height: 22px;
        }

        .section-info-btn:hover,
        .section-info-btn:focus-visible,
        .section-info[data-open="true"] .section-info-btn {
          border-color: #f31332;
          color: #f31332;
          outline: none;
        }

        .section-info-panel {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          width: min(320px, calc(100vw - 48px));
          max-width: calc(100vw - 32px);
          padding: 14px 14px 12px;
          border: 1px solid #d7d7d3;
          border-radius: 12px;
          background: #f6f6f2;
          color: #555;
          box-shadow: 0 12px 30px rgba(40, 40, 40, 0.08);
        }

        .section-info-kicker {
          margin-bottom: 10px;
          color: #999;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .section-info-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 10px;
        }

        .section-info-list li {
          display: grid;
          grid-template-columns: 20px 1fr;
          gap: 10px;
          align-items: flex-start;
        }

        .section-info-num {
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

        .section-info-list strong {
          display: block;
          color: #555;
          font-size: 12px;
          font-weight: 800;
        }

        .section-info-list p {
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

export default function SafeSettings({
  safeAddress,
  onProposed,
}: {
  safeAddress: string;
  onProposed?: () => void;
}) {
  const [owners, setOwners] = useState<string[]>([]);
  const [threshold, setThreshold] = useState<number>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const [newOwner, setNewOwner] = useState("");
  const [addThreshold, setAddThreshold] = useState(1);
  const [removeOwner, setRemoveOwner] = useState("");
  const [removeThreshold, setRemoveThreshold] = useState(1);
  const [nextThreshold, setNextThreshold] = useState(1);

  async function loadConfig() {
    setLoading(true);
    try {
      const client = createPublicClient({
        chain: blockdag,
        transport: http(process.env.NEXT_PUBLIC_RPC_URL!),
      });

      const [safeOwners, safeThreshold] = await Promise.all([
        client.readContract({
          address: safeAddress as `0x${string}`,
          abi: safeConfigAbi,
          functionName: "getOwners",
        }),
        client.readContract({
          address: safeAddress as `0x${string}`,
          abi: safeConfigAbi,
          functionName: "getThreshold",
        }),
      ]);

      const list = [...safeOwners];
      const current = Number(safeThreshold);
      setOwners(list);
      setThreshold(current);
      setAddThreshold(current);
      setRemoveThreshold(Math.max(1, Math.min(current, list.length - 1)));
      setNextThreshold(current);
      if (!removeOwner && list[0]) {
        setRemoveOwner(list[0]);
      }
    } catch (error) {
      console.error("Unable to load Safe settings", error);
      setMessage("Unable to read Safe owners and threshold.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeAddress]);

  function short(value: string) {
    return `${value.slice(0, 8)}…${value.slice(-6)}`;
  }

  async function runPropose(
    action: () => Promise<void>,
    success: string
  ) {
    try {
      setBusy(true);
      setMessage("");
      await action();
      setMessage(success);
      onProposed?.();
      await loadConfig();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to create configuration proposal."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="safe-settings">
      <div className="settings-intro">
        <div className="kicker">Safe configuration</div>
        <h2>Owners &amp; threshold</h2>
        <p>
          Changes are proposed as Safe transactions. Other owners may need to
          sign, then someone executes from the Propose tab. Nothing updates
          on-chain until execution succeeds.
        </p>
      </div>

      <section className="settings-card">
        <div className="settings-card-head">
          <div className="settings-card-title">
            <strong>Current configuration</strong>
            <SectionInfo
              section="current"
              label="About current configuration"
            />
          </div>
          {threshold !== undefined && (
            <span className="threshold-pill">
              {threshold}-of-{owners.length}
            </span>
          )}
        </div>

        {loading ? (
          <p className="muted">Reading Safe configuration…</p>
        ) : (
          <ul className="owner-list">
            {owners.map((owner) => (
              <li key={owner}>
                <span>{short(owner)}</span>
                <code>{owner}</code>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="settings-card">
        <div className="settings-card-title">
          <h3>Add owner</h3>
          <SectionInfo section="add" label="About adding an owner" />
        </div>
        <p className="muted">
          Propose adding a new signer. Choose the threshold that will apply
          after the owner is added.
        </p>
        <label>
          New owner address
          <input
            type="text"
            value={newOwner}
            onChange={(e) => setNewOwner(e.target.value)}
            placeholder="0x..."
            disabled={busy || loading}
          />
        </label>
        <label>
          New threshold
          <input
            type="number"
            min={1}
            max={owners.length + 1}
            value={addThreshold}
            onChange={(e) => setAddThreshold(Number(e.target.value))}
            disabled={busy || loading}
          />
        </label>
        <button
          type="button"
          disabled={busy || loading}
          onClick={() =>
            runPropose(async () => {
              const validated = validateAddOwner({
                owner: newOwner,
                threshold: addThreshold,
                currentOwners: owners,
              });
              await proposeConfigTx({
                safeAddress,
                data: buildAddOwnerData(
                  validated.owner,
                  validated.threshold
                ),
                description: `Add owner ${validated.owner} (threshold ${validated.threshold})`,
              });
              setNewOwner("");
            }, "Add-owner proposal created. Open Propose to sign/execute.")
          }
        >
          {busy ? "Working…" : "Propose add owner"}
        </button>
      </section>

      <section className="settings-card">
        <div className="settings-card-title">
          <h3>Remove owner</h3>
          <SectionInfo section="remove" label="About removing an owner" />
        </div>
        <p className="muted">
          Propose removing a signer. Threshold must still fit the remaining
          owners.
        </p>
        <label>
          Owner to remove
          <select
            value={removeOwner}
            onChange={(e) => setRemoveOwner(e.target.value)}
            disabled={busy || loading || owners.length <= 1}
          >
            {owners.map((owner) => (
              <option key={owner} value={owner}>
                {short(owner)} — {owner}
              </option>
            ))}
          </select>
        </label>
        <label>
          New threshold
          <input
            type="number"
            min={1}
            max={Math.max(1, owners.length - 1)}
            value={removeThreshold}
            onChange={(e) => setRemoveThreshold(Number(e.target.value))}
            disabled={busy || loading || owners.length <= 1}
          />
        </label>
        <button
          type="button"
          disabled={busy || loading || owners.length <= 1}
          onClick={() =>
            runPropose(async () => {
              const validated = validateRemoveOwner({
                owner: removeOwner,
                threshold: removeThreshold,
                currentOwners: owners,
              });
              await proposeConfigTx({
                safeAddress,
                data: buildRemoveOwnerData(
                  validated.prevOwner,
                  validated.owner,
                  validated.threshold
                ),
                description: `Remove owner ${validated.owner} (threshold ${validated.threshold})`,
              });
            }, "Remove-owner proposal created. Open Propose to sign/execute.")
          }
        >
          {busy ? "Working…" : "Propose remove owner"}
        </button>
      </section>

      <section className="settings-card">
        <div className="settings-card-title">
          <h3>Change threshold</h3>
          <SectionInfo
            section="threshold"
            label="About changing the threshold"
          />
        </div>
        <p className="muted">
          Propose a new number of required signatures without changing the
          owner set.
        </p>
        <label>
          New threshold
          <input
            type="number"
            min={1}
            max={Math.max(1, owners.length)}
            value={nextThreshold}
            onChange={(e) => setNextThreshold(Number(e.target.value))}
            disabled={busy || loading}
          />
        </label>
        <button
          type="button"
          disabled={busy || loading}
          onClick={() =>
            runPropose(async () => {
              const validated = validateChangeThreshold({
                threshold: nextThreshold,
                ownerCount: owners.length,
              });
              if (validated.threshold === threshold) {
                throw new Error("Choose a different threshold.");
              }
              await proposeConfigTx({
                safeAddress,
                data: buildChangeThresholdData(validated.threshold),
                description: `Change threshold to ${validated.threshold}`,
              });
            }, "Threshold proposal created. Open Propose to sign/execute.")
          }
        >
          {busy ? "Working…" : "Propose threshold change"}
        </button>
      </section>

      {message && <div className="settings-message">{message}</div>}

      <style jsx>{`
        .safe-settings {
          display: grid;
          gap: 16px;
        }

        .settings-intro h2 {
          margin: 6px 0 8px;
          color: #555;
          font-size: 22px;
        }

        .settings-intro p,
        .muted {
          margin: 0;
          color: #858585;
          font-size: 12px;
          line-height: 1.6;
        }

        .kicker {
          color: #999;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .settings-card {
          padding: 18px;
          border: 1px solid #e0e0dc;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.82);
        }

        .settings-card h3 {
          margin: 0;
          color: #555;
          font-size: 15px;
        }

        .settings-card-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 6px;
        }

        .settings-card-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 12px;
        }

        .settings-card-head .settings-card-title {
          margin-bottom: 0;
          flex: 1;
          min-width: 0;
        }

        .settings-card-head strong {
          color: #555;
          font-size: 13px;
        }

        .threshold-pill {
          padding: 6px 10px;
          border-radius: 999px;
          background: rgba(243, 19, 50, 0.08);
          color: #f31332;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.06em;
        }

        .owner-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 8px;
        }

        .owner-list li {
          display: grid;
          gap: 4px;
          padding: 10px 12px;
          border: 1px solid #ecece8;
          border-radius: 10px;
          background: #fafaf8;
        }

        .owner-list span {
          color: #555;
          font-size: 12px;
          font-weight: 700;
        }

        .owner-list code {
          color: #888;
          font-size: 10px;
          word-break: break-all;
        }

        label {
          display: block;
          margin-top: 12px;
          color: #777;
          font-size: 11px;
          font-weight: 700;
        }

        input,
        select {
          display: block;
          width: 100%;
          margin-top: 7px;
          padding: 12px 13px;
          border: 1px solid #d8d8d4;
          border-radius: 10px;
          background: white;
          color: #444;
          font-size: 13px;
        }

        button:not(.section-info-btn) {
          width: 100%;
          margin-top: 14px;
          padding: 13px 16px;
          border: 0;
          border-radius: 10px;
          background: #f31332;
          color: white;
          cursor: pointer;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.04em;
          min-height: 44px;
        }

        button:not(.section-info-btn):disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        .settings-message {
          padding: 12px;
          border: 1px solid #dededa;
          border-radius: 10px;
          background: #fff;
          color: #666;
          font-size: 12px;
          line-height: 1.5;
          word-break: break-word;
        }

        @media (max-width: 720px) {
          .settings-card {
            padding: 16px;
          }

          .owner-list li {
            padding: 12px;
          }
        }
      `}</style>
    </div>
  );
}

"use client";
// New multisig wizard: owner addresses + threshold -> deploys a Safe proxy.
import { useState } from "react";
import { isAddress } from "viem";
import { createSafe } from "@/lib/safe";

export default function CreatePage() {
  const [owners, setOwners] = useState<string[]>([""]);
  const [threshold, setThreshold] = useState(1);
  const [busy, setBusy] = useState(false);
  const [safeAddress, setSafeAddress] = useState<string>();

  const valid = owners.filter(isAddress);

  async function deploy() {
    if (valid.length === 0 || threshold < 1 || threshold > valid.length) return;
    setBusy(true);
    try {
      const safe = await createSafe(valid, threshold);
      setSafeAddress(await safe.getAddress());
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-2xl font-semibold">Create a Safe on BlockDAG</h1>
      <p className="text-sm text-neutral-400">Owners sign with their browser wallet. Threshold is how many must sign before execution.</p>

      {owners.map((o, i) => (
        <div key={i} className="mt-3 flex gap-2">
          <input
            className="w-full rounded-md border p-2 text-sm"
            placeholder={`Owner ${i + 1} address`}
            value={o}
            onChange={(e) => setOwners(owners.map((x, j) => (j === i ? e.target.value : x)))}
          />
          {owners.length > 1 && (
            <button className="rounded-md border px-3 text-sm" onClick={() => setOwners(owners.filter((_, j) => j !== i))}>Remove</button>
          )}
        </div>
      ))}
      <button className="mt-3 rounded-md border px-3 py-1.5 text-sm" onClick={() => setOwners([...owners, ""])}>Add owner</button>

      <label className="mt-6 block text-sm">
        Threshold: {threshold} of {valid.length || "…"}
        <input type="range" min={1} max={Math.max(valid.length, 1)} value={threshold}
               onChange={(e) => setThreshold(Number(e.target.value))} className="mt-2 w-full" />
      </label>

      <button disabled={busy || valid.length === 0} onClick={deploy}
              className="mt-6 rounded-md bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-40">
        {busy ? "Deploying…" : "Deploy Safe"}
      </button>

      {safeAddress && (
        <p className="mt-4 text-sm">Done: <a className="underline" href={`/safe/${safeAddress}`}>{safeAddress}</a></p>
      )}
    </main>
  );
}

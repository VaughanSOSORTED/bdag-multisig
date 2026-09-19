"use client";
import { formatEther } from "viem";
import { api, type PendingTx } from "@/lib/api";

export default function TxCard({ tx }: { tx: PendingTx }) {
  async function sign() {
    // owner signs the safe tx hash with their browser wallet, posts the sig
    const signature = await (window as any).ethereum.request({
      method: "personal_sign",
      params: [tx.safe_tx_hash, (await (window as any).ethereum.request({ method: "eth_requestAccounts" }))[0]],
    });
    await api.sign(tx.id, signature, tx.signatures.length + "th-owner");
  }

  return (
    <div className="rounded-lg border p-4">
      <div className="flex justify-between">
        <p className="font-mono text-xs">{tx.to}</p>
        <p className="font-medium">{formatEther(BigInt(tx.value))} BDAG</p>
      </div>
      {tx.description && <p className="mt-1 text-sm text-neutral-400">{tx.description}</p>}
      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-neutral-500">{tx.signatures.length} signature(s) collected</p>
        <button className="rounded-md border px-3 py-1 text-xs" onClick={sign}>Sign</button>
      </div>
    </div>
  );
}

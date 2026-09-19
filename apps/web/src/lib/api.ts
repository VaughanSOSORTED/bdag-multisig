// Thin client for the signature API. It stores proposals + signatures only;
// if it's ever down, owners can still sign and execute manually.

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface PendingTx {
  id: string;
  safe_address: string;
  to: string;
  value: string;
  data: string;
  safe_tx_hash: string;
  description?: string;
  signatures: { signer: string; signature: string }[];
}

export const api = {
  async propose(body: {
    safeAddress: string; to: string; value: string; data: string;
    safeTxHash: string; signature: string; description?: string;
  }) {
    const r = await fetch(`${BASE}/transactions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async pending(safeAddress: string): Promise<PendingTx[]> {
    const r = await fetch(`${BASE}/transactions?safe=${safeAddress}`);
    return r.json();
  },
  async sign(txId: string, signature: string, signer: string) {
    const r = await fetch(`${BASE}/signatures`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tx_id: txId, signature, signer }),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async markExecuted(txId: string) {
    const r = await fetch(`${BASE}/transactions/${txId}/executed`, { method: "POST" });
    return r.json();
  },
};

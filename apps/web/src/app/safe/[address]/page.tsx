"use client";
// Treasury dashboard: balances, owners, pending queue, history.
import { use, useEffect, useState } from "react";
import { formatEther } from "viem";
import { api, type PendingTx } from "@/lib/api";
import { publicClient, erc20Abi } from "@/lib/voting";
import addresses from "../../../../../contracts/deployments/blockdag.json";
import TxCard from "@/components/TxCard";
import SignerList from "@/components/SignerList";
import ThresholdBadge from "@/components/ThresholdBadge";

export default function SafePage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = use(params);
  const [balance, setBalance] = useState<bigint>();
  const [pending, setPending] = useState<PendingTx[]>([]);
  const [tokenSymbol, setTokenSymbol] = useState<string>();
  const [tokenBalance, setTokenBalance] = useState<bigint>();

  useEffect(() => {
    const client = publicClient();
    client.getBalance({ address: address as `0x${string}` }).then(setBalance);

    const token = addresses.VoteToken as `0x${string}`;
    if (token && !token.startsWith("0x0000")) {
      client.readContract({ address: token, abi: erc20Abi, functionName: "symbol" }).then(setTokenSymbol);
      client.readContract({ address: token, abi: erc20Abi, functionName: "balanceOf", args: [address as `0x${string}`] }).then(setTokenBalance);
    }
    api.pending(address).then(setPending).catch(() => {});
  }, [address]);

  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Treasury</h1>
          <p className="font-mono text-xs text-neutral-500">{address}</p>
        </div>
        <ThresholdBadge />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="BDAG balance" value={balance !== undefined ? `${Number(formatEther(balance)).toFixed(2)} BDAG` : "…"} />
        <Stat label={tokenSymbol ? `${tokenSymbol} held` : "Token held"} value={tokenBalance !== undefined ? formatEther(tokenBalance) : "…"} />
        <Stat label="Pending txs" value={String(pending.length)} />
        <Stat label="Network" value="BlockDAG Testnet" />
      </div>

      <h2 className="mt-10 text-lg font-medium">Pending transactions</h2>
      <div className="mt-3 space-y-3">
        {pending.length === 0 && <p className="text-sm text-neutral-500">Nothing waiting on signatures.</p>}
        {pending.map((tx) => <TxCard key={tx.id} tx={tx} />)}
      </div>

      <SignerList safeAddress={address} />
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-xs text-neutral-400">{label}</p>
      <p className="mt-1 text-lg font-medium">{value}</p>
    </div>
  );
}

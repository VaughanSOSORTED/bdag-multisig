"use client";
// Token-gated voting: read proposals from BdagVote, cast weighted votes.
// Passing a proposal queues nothing automatically — the Safe owners then
// submit the calldata through the normal multisig flow.
import { use, useEffect, useState } from "react";
import { formatEther, parseUnits } from "viem";
import { publicClient, walletClient, voteContract, erc20Abi } from "@/lib/voting";
import addresses from "../../../../../contracts/deployments/blockdag.json";

interface ProposalView {
  id: number; title: string; end: bigint;
  forVotes: bigint; againstVotes: bigint; passed: boolean;
}

export default function VotePage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = use(params); // Safe treasury address
  const [proposals, setProposals] = useState<ProposalView[]>([]);
  const [quorum, setQuorum] = useState<bigint>();
  const [myWeight, setMyWeight] = useState<bigint>();

  async function load() {
    const client = publicClient();
    const nextId = Number(await client.readContract({ ...voteContract, functionName: "nextId" }));
    setQuorum(await client.readContract({ ...voteContract, functionName: "quorum" }));

    const [acct] = await (window as any).ethereum.request({ method: "eth_requestAccounts" });
    const token = addresses.VoteToken as `0x${string}`;
    setMyWeight(await client.readContract({ address: token, abi: erc20Abi, functionName: "balanceOf", args: [acct] }));

    const out: ProposalView[] = [];
    for (let id = 1; id < nextId; id++) {
      const p: any = await client.readContract({ ...voteContract, functionName: "proposals", args: [BigInt(id)] });
      const passed = await client.readContract({ ...voteContract, functionName: "passed", args: [BigInt(id)] });
      out.push({ id, title: p[0], end: p[4], forVotes: p[5], againstVotes: p[6], passed });
    }
    setProposals(out.reverse());
  }
  useEffect(() => { load().catch(console.error); }, [address]);

  async function vote(id: number, support: boolean) {
    const wc = await walletClient();
    const [acct] = await (window as any).ethereum.request({ method: "eth_requestAccounts" });
    const hash = await wc.writeContract({
      ...voteContract, functionName: "vote", args: [BigInt(id), support],
      account: acct,
    });
    await publicClient().waitForTransactionReceipt({ hash });
    load();
  }

  const q = quorum ? Number(formatEther(quorum)) : 0;

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">Token-gated voting</h1>
      <p className="text-sm text-neutral-400">
        Treasury: <span className="font-mono">{address}</span> · Quorum: {q} tokens
        {myWeight !== undefined && <> · Your weight: {formatEther(myWeight)}</>}
      </p>

      <div className="mt-6 space-y-4">
        {proposals.length === 0 && <p className="text-sm text-neutral-500">No proposals yet.</p>}
        {proposals.map((p) => {
          const total = p.forVotes + p.againstVotes;
          const forPct = total > 0n ? Number((p.forVotes * 100n) / total) : 0;
          return (
            <div key={p.id} className="rounded-lg border p-4">
              <div className="flex justify-between">
                <p className="font-medium">#{p.id} {p.title}</p>
                <span className={p.passed ? "text-sm text-emerald-500" : "text-sm text-neutral-400"}>
                  {p.passed ? "Passed" : `Ends ${new Date(Number(p.end) * 1000).toLocaleDateString()}`}
                </span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-neutral-200">
                <div className="h-2 rounded-full bg-neutral-900" style={{ width: `${forPct}%` }} />
              </div>
              <p className="mt-1 text-xs text-neutral-500">
                For {formatEther(p.forVotes)} · Against {formatEther(p.againstVotes)}
              </p>
              {!p.passed && p.end > BigInt(Math.floor(Date.now() / 1000)) && (
                <div className="mt-3 flex gap-2">
                  <button className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs text-white" onClick={() => vote(p.id, true)}>Vote for</button>
                  <button className="rounded-md border px-3 py-1.5 text-xs" onClick={() => vote(p.id, false)}>Vote against</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}

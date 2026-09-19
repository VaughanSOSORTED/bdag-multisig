"use client";
import { useEffect, useState } from "react";

// Reads the Safe's owners + threshold from the chain.
export default function SignerList({ safeAddress }: { safeAddress: string }) {
  const [owners, setOwners] = useState<string[]>([]);
  const [threshold, setThreshold] = useState<number>();

  useEffect(() => {
    (window as any).ethereum
      .request({ method: "eth_call",
        params: [{ to: safeAddress, data: "0xa0e67e2b" }, "latest"] }) // getOwners()
      .then((data: string) => {
        const arr: string[] = [];
        for (let i = 2; i < data.length; i += 64) {
          const addr = "0x" + data.slice(i + 24, i + 64);
          if (addr !== "0x" && BigInt(addr) !== 0n) arr.push(addr);
        }
        setOwners(arr);
      }).catch(() => {});
  }, [safeAddress]);

  return (
    <section className="mt-10">
      <h2 className="text-lg font-medium">Owners {threshold ? `(${threshold} required)` : ""}</h2>
      <ul className="mt-3 space-y-1">
        {owners.map((o) => <li key={o} className="font-mono text-xs text-neutral-500">{o}</li>)}
      </ul>
    </section>
  );
}

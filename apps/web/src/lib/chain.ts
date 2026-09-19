import { defineChain } from "viem";

// Fill the real values from BlockDAG's official docs before using.
export const blockdag = defineChain({
  id: Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 991),
  name: "BlockDAG",
  nativeCurrency: { name: "BlockDAG", symbol: "BDAG", decimals: 18 },
  rpcUrls: { default: { http: [process.env.NEXT_PUBLIC_RPC_URL!] } },
  blockExplorers: {
    default: { name: "Explorer", url: process.env.NEXT_PUBLIC_EXPLORER_URL ?? "" },
  },
  testnet: true, // flip to false for mainnet
});

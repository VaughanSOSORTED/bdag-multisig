import { defineChain } from "viem";

const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 1404);
const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;

if (chainId !== 1404) {
  throw new Error(`Expected BlockDAG Mainnet chain 1404, received ${chainId}`);
}

if (!rpcUrl) {
  throw new Error("NEXT_PUBLIC_RPC_URL is not configured");
}

export const blockdag = defineChain({
  id: 1404,
  name: "BlockDAG Mainnet",
  nativeCurrency: {
    name: "BlockDAG",
    symbol: "BDAG",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [rpcUrl],
    },
  },
  blockExplorers: {
    default: {
      name: "BlockDAG Explorer",
      url: process.env.NEXT_PUBLIC_EXPLORER_URL ?? "",
    },
  },
  testnet: false,
});

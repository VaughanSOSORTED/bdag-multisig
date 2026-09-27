import {
  createPublicClient,
  http,
  getAddress,
  recoverAddress,
  type Address,
  type Hex,
} from "viem";
import { defineChain } from "viem";

const blockdag = defineChain({
  id: 1404,
  name: "BlockDAG Mainnet",
  nativeCurrency: {
    name: "BDAG",
    symbol: "BDAG",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [process.env.RPC_URL || "https://rpc.capedag.com/"],
    },
  },
});

export const chainClient = createPublicClient({
  chain: blockdag,
  transport: http(process.env.RPC_URL || "https://rpc.capedag.com/"),
});

const safeAbi = [
  {
    type: "function",
    name: "getOwners",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address[]", name: "" }],
  },
  {
    type: "function",
    name: "getThreshold",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256", name: "" }],
  },
  {
    type: "function",
    name: "nonce",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256", name: "" }],
  },
  {
    type: "function",
    name: "getTransactionHash",
    stateMutability: "view",
    inputs: [
      { type: "address", name: "to" },
      { type: "uint256", name: "value" },
      { type: "bytes", name: "data" },
      { type: "uint8", name: "operation" },
      { type: "uint256", name: "safeTxGas" },
      { type: "uint256", name: "baseGas" },
      { type: "uint256", name: "gasPrice" },
      { type: "address", name: "gasToken" },
      { type: "address", name: "refundReceiver" },
      { type: "uint256", name: "_nonce" },
    ],
    outputs: [{ type: "bytes32", name: "" }],
  },
] as const;

export type SafeTxFields = {
  safeAddress: string;
  to: string;
  value: string;
  data: string;
  operation: number;
  safeTxGas: string;
  baseGas: string;
  gasPrice: string;
  gasToken: string;
  refundReceiver: string;
  nonce: number;
};

export async function verifySafeTransaction(
  tx: SafeTxFields,
  claimedHash: string,
) {
  const safeAddress = getAddress(tx.safeAddress);
  const code = await chainClient.getCode({ address: safeAddress });

  if (!code || code === "0x") {
    throw new Error("Safe contract not found on BlockDAG Mainnet");
  }

  const hash = await chainClient.readContract({
    address: safeAddress,
    abi: safeAbi,
    functionName: "getTransactionHash",
    args: [
      getAddress(tx.to),
      BigInt(tx.value),
      tx.data as Hex,
      tx.operation,
      BigInt(tx.safeTxGas),
      BigInt(tx.baseGas),
      BigInt(tx.gasPrice),
      getAddress(tx.gasToken),
      getAddress(tx.refundReceiver),
      BigInt(tx.nonce),
    ],
  });

  if (hash.toLowerCase() !== claimedHash.toLowerCase()) {
    throw new Error("Safe transaction hash does not match on-chain calculation");
  }

  return hash as Hex;
}

export async function verifyOwnerSignature(
  safeAddressInput: string,
  safeTxHash: string,
  signature: string,
  claimedSigner: string,
) {
  const safeAddress = getAddress(safeAddressInput);
  const claimed = getAddress(claimedSigner);

  const owners = await chainClient.readContract({
    address: safeAddress,
    abi: safeAbi,
    functionName: "getOwners",
  });

  const isOwner = owners.some(
    (owner) => owner.toLowerCase() === claimed.toLowerCase(),
  );

  if (!isOwner) {
    throw new Error("Signer is not an owner of this Safe");
  }

  const recovered = await recoverAddress({
    hash: safeTxHash as Hex,
    signature: signature as Hex,
  });

  if (recovered.toLowerCase() !== claimed.toLowerCase()) {
    throw new Error("Signature does not match the claimed Safe owner");
  }

  return claimed as Address;
}

export async function getSafeThreshold(safeAddressInput: string) {
  return Number(
    await chainClient.readContract({
      address: getAddress(safeAddressInput),
      abi: safeAbi,
      functionName: "getThreshold",
    }),
  );
}


export async function getSafeNonce(safeAddressInput: string) {
  return Number(
    await chainClient.readContract({
      address: getAddress(safeAddressInput),
      abi: safeAbi,
      functionName: "nonce",
    }),
  );
}

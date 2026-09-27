import { encodeFunctionData, getAddress, isAddress, parseAbi } from "viem";
import { api } from "./api";
import { getSafeWithSigner } from "./safe";

export const SENTINEL_OWNERS =
  "0x0000000000000000000000000000000000000001";

export const safeConfigAbi = parseAbi([
  "function addOwnerWithThreshold(address owner, uint256 _threshold)",
  "function removeOwner(address prevOwner, address owner, uint256 _threshold)",
  "function changeThreshold(uint256 _threshold)",
  "function getOwners() view returns (address[])",
  "function getThreshold() view returns (uint256)",
]);

export function getPrevOwner(
  owners: string[],
  ownerToRemove: string
): string {
  const index = owners.findIndex(
    (owner) => owner.toLowerCase() === ownerToRemove.toLowerCase()
  );

  if (index < 0) {
    throw new Error("Owner not found on this Safe.");
  }

  return index === 0 ? SENTINEL_OWNERS : owners[index - 1];
}

export function buildAddOwnerData(owner: string, threshold: number): `0x${string}` {
  return encodeFunctionData({
    abi: safeConfigAbi,
    functionName: "addOwnerWithThreshold",
    args: [getAddress(owner), BigInt(threshold)],
  });
}

export function buildRemoveOwnerData(
  prevOwner: string,
  owner: string,
  threshold: number
): `0x${string}` {
  return encodeFunctionData({
    abi: safeConfigAbi,
    functionName: "removeOwner",
    args: [getAddress(prevOwner), getAddress(owner), BigInt(threshold)],
  });
}

export function buildChangeThresholdData(threshold: number): `0x${string}` {
  return encodeFunctionData({
    abi: safeConfigAbi,
    functionName: "changeThreshold",
    args: [BigInt(threshold)],
  });
}

async function ensureOwnerSigner(safeAddress: string) {
  const ethereum = (window as any).ethereum;

  if (!ethereum) {
    throw new Error("Browser wallet not found.");
  }

  const chainId = await ethereum.request({ method: "eth_chainId" });
  if (Number.parseInt(chainId, 16) !== 1404) {
    throw new Error(
      "Wrong wallet network. Connect MetaMask to BlockDAG Mainnet."
    );
  }

  const accounts = (await ethereum.request({
    method: "eth_requestAccounts",
  })) as string[];

  const signer = accounts?.[0];
  if (!signer) {
    throw new Error("No wallet account connected.");
  }

  const protocolKit = await getSafeWithSigner(safeAddress, signer);
  if (!(await protocolKit.isOwner(signer))) {
    throw new Error("The connected wallet is not an owner of this Safe.");
  }

  return { signer, protocolKit };
}

export async function proposeConfigTx(args: {
  safeAddress: string;
  data: `0x${string}`;
  description: string;
}) {
  const { signer, protocolKit } = await ensureOwnerSigner(args.safeAddress);

  const safeTransaction = await protocolKit.createTransaction({
    transactions: [
      {
        to: args.safeAddress,
        value: "0",
        data: args.data,
      },
    ],
  });

  const safeTxHash = await protocolKit.getTransactionHash(safeTransaction);
  const signedTransaction = await protocolKit.signTransaction(safeTransaction);
  const signature = signedTransaction.getSignature(signer)?.data;

  if (!signature) {
    throw new Error("Safe signature was not returned by the wallet.");
  }

  const tx = safeTransaction.data;

  await api.propose({
    safeAddress: args.safeAddress,
    to: tx.to,
    value: tx.value,
    data: tx.data,
    safeTxHash,
    operation: Number(tx.operation),
    safeTxGas: tx.safeTxGas,
    baseGas: tx.baseGas,
    gasPrice: tx.gasPrice,
    gasToken: tx.gasToken,
    refundReceiver: tx.refundReceiver,
    nonce: tx.nonce,
    signature,
    signer,
    description: args.description,
  });

  return { safeTxHash };
}

export function validateAddOwner(args: {
  owner: string;
  threshold: number;
  currentOwners: string[];
}) {
  if (!isAddress(args.owner)) {
    throw new Error("Enter a valid owner address.");
  }

  const normalized = getAddress(args.owner);
  if (
    args.currentOwners.some(
      (owner) => owner.toLowerCase() === normalized.toLowerCase()
    )
  ) {
    throw new Error("That address is already an owner.");
  }

  const maxThreshold = args.currentOwners.length + 1;
  if (args.threshold < 1 || args.threshold > maxThreshold) {
    throw new Error(
      `Threshold must be between 1 and ${maxThreshold}.`
    );
  }

  return { owner: normalized, threshold: args.threshold };
}

export function validateRemoveOwner(args: {
  owner: string;
  threshold: number;
  currentOwners: string[];
}) {
  if (args.currentOwners.length <= 1) {
    throw new Error("Cannot remove the last Safe owner.");
  }

  if (!isAddress(args.owner)) {
    throw new Error("Select a valid owner to remove.");
  }

  const normalized = getAddress(args.owner);
  if (
    !args.currentOwners.some(
      (owner) => owner.toLowerCase() === normalized.toLowerCase()
    )
  ) {
    throw new Error("That address is not an owner of this Safe.");
  }

  const maxThreshold = args.currentOwners.length - 1;
  if (args.threshold < 1 || args.threshold > maxThreshold) {
    throw new Error(
      `After removal, threshold must be between 1 and ${maxThreshold}.`
    );
  }

  const prevOwner = getPrevOwner(args.currentOwners, normalized);
  return { owner: normalized, prevOwner, threshold: args.threshold };
}

export function validateChangeThreshold(args: {
  threshold: number;
  ownerCount: number;
}) {
  if (args.ownerCount < 1) {
    throw new Error("Safe has no owners.");
  }

  if (args.threshold < 1 || args.threshold > args.ownerCount) {
    throw new Error(
      `Threshold must be between 1 and ${args.ownerCount}.`
    );
  }

  return { threshold: args.threshold };
}

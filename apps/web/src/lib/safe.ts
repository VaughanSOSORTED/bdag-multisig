import Safe from "@safe-global/protocol-kit";
import type { ContractNetworksConfig } from "@safe-global/protocol-kit";
import addresses from "../../../../contracts/deployments/blockdag.json";
import { blockdag } from "./chain";

export const contractNetworks: ContractNetworksConfig = {
  [blockdag.id.toString()]: {
    safeSingletonAddress: addresses.SafeL2,
    safeProxyFactoryAddress: addresses.SafeProxyFactory,
    multiSendAddress: addresses.MultiSend,
    multiSendCallOnlyAddress: addresses.MultiSendCallOnly,
    fallbackHandlerAddress: addresses.CompatibilityFallbackHandler,
  },
};

export const L2_CHAIN = true;

export async function createSafe(owners: string[], threshold: number) {
  if (typeof window === "undefined" || !(window as any).ethereum) {
    throw new Error("Browser wallet not found");
  }

  if (blockdag.id !== 1404) {
    throw new Error(`Refusing Safe creation on unexpected chain ${blockdag.id}`);
  }

  const ethereum = (window as any).ethereum;

  const walletChainId = await ethereum.request({
    method: "eth_chainId",
  });

  if (Number.parseInt(walletChainId, 16) !== 1404) {
    throw new Error(
      `Wrong wallet network. Connect MetaMask to BlockDAG Mainnet (Chain ID 1404).`
    );
  }

  const accounts = await ethereum.request({
    method: "eth_requestAccounts",
  });

  if (!accounts?.[0]) {
    throw new Error("No wallet account connected");
  }

  const sender = accounts[0];

  if (owners.length === 0) {
    throw new Error("At least one owner is required");
  }

  if (threshold < 1 || threshold > owners.length) {
    throw new Error("Invalid Safe threshold");
  }

  const protocolKit = await Safe.init({
    provider: process.env.NEXT_PUBLIC_RPC_URL!,
    signer: sender,
    predictedSafe: {
      safeAccountConfig: {
        owners,
        threshold,
      },
    },
    isL1SafeSingleton: false,
    contractNetworks,
  });

  const safeAddress = await protocolKit.getAddress();
  const deploymentTx = await protocolKit.createSafeDeploymentTransaction();

  const txHash = await (window as any).ethereum.request({
    method: "eth_sendTransaction",
    params: [
      {
        from: sender,
        to: deploymentTx.to,
        value: `0x${BigInt(deploymentTx.value).toString(16)}`,
        data: deploymentTx.data,
      },
    ],
  });

  const receipt = await waitForReceipt(txHash);

  if (receipt.status !== "0x1") {
    throw new Error("Safe deployment transaction failed");
  }

  return safeAddress;
}

async function waitForReceipt(txHash: string) {
  const provider = (window as any).ethereum;

  for (let attempt = 0; attempt < 120; attempt++) {
    const receipt = await provider.request({
      method: "eth_getTransactionReceipt",
      params: [txHash],
    });

    if (receipt) {
      return receipt;
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error("Timed out waiting for Safe deployment confirmation");
}

export async function getSafe(safeAddress: string) {
  return await Safe.init({
    safeAddress,
    provider: process.env.NEXT_PUBLIC_RPC_URL!,
    isL1SafeSingleton: false,
    contractNetworks,
  });
}

export async function getSafeWithSigner(
  safeAddress: string,
  signer: string
) {
  if (typeof window === "undefined" || !(window as any).ethereum) {
    throw new Error("Browser wallet not found");
  }

  const ethereum = (window as any).ethereum;

  const chainId = await ethereum.request({
    method: "eth_chainId",
  });

  if (Number.parseInt(chainId, 16) !== 1404) {
    throw new Error(
      "Wrong wallet network. Connect MetaMask to BlockDAG Mainnet (Chain ID 1404)."
    );
  }

  return await Safe.init({
    safeAddress,
    provider: ethereum,
    signer,
    isL1SafeSingleton: false,
    contractNetworks,
  });
}

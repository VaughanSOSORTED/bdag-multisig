import Safe, { type SafeFactory } from "@safe-global/protocol-kit";
import addresses from "../../../../contracts/deployments/blockdag.json";
import { blockdag } from "./chain";

// BlockDAG isn't in the SDK's built-in network list, so we point it at the
// contracts we deployed ourselves. Exact option shape varies by Protocol Kit
// version — check the current docs for your pinned release.
export const contractNetworks = {
  [blockdag.id]: {
    safeSingletonAddress: addresses.SafeL2,
    safeProxyFactoryAddress: addresses.SafeProxyFactory,
    multiSendAddress: addresses.MultiSend,
    multiSendCallOnlyAddress: addresses.MultiSendCallOnly,
    fallbackHandlerAddress: addresses.CompatibilityFallbackHandler,
    // if your release needs them:
    // signMessageLibAddress, createCallAddress, simulateTxAccessorAddress
  },
} as const;

export const L2_CHAIN = true; // deploy SafeL2: emits events for everything

export async function createSafe(owners: string[], threshold: number) {
  const safeFactory = (await import("@safe-global/protocol-kit")).default;
  const factory: SafeFactory = await (safeFactory as any).init({
    provider: process.env.NEXT_PUBLIC_RPC_URL!,
    signer: (window as any).ethereum, // browser wallet only, never a server key
    network: chainIdToNetworkName(blockdag.id),
  });
  return factory.deploySafe({
    safeAccountConfig: { owners, threshold },
    isL1SafeSingleton: false,
  });
}

function chainIdToNetworkName(id: number): string {
  return `custom-${id}`; // Protocol Kit accepts custom networks via contractNetworks
}

export async function getSafe(safeAddress: string) {
  return await Safe.init({ safeAddress, provider: process.env.NEXT_PUBLIC_RPC_URL! });
}

import { ethers } from "hardhat";
import fs from "node:fs";
import path from "node:path";

const SAFE_ARTIFACT_BASE =
  "node_modules/@safe-global/safe-smart-account/build/artifacts/contracts";

const ARTIFACTS = [
  {
    key: "SafeL2",
    file: "SafeL2.sol/SafeL2.json",
  },
  {
    key: "SafeProxyFactory",
    file: "proxies/SafeProxyFactory.sol/SafeProxyFactory.json",
  },
  {
    key: "MultiSend",
    file: "libraries/MultiSend.sol/MultiSend.json",
  },
  {
    key: "MultiSendCallOnly",
    file: "libraries/MultiSendCallOnly.sol/MultiSendCallOnly.json",
  },
  {
    key: "CompatibilityFallbackHandler",
    file: "handler/CompatibilityFallbackHandler.sol/CompatibilityFallbackHandler.json",
  },
] as const;

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  if (Number(network.chainId) !== 1404) {
    throw new Error(
      `Refusing deployment: expected BlockDAG Mainnet chain 1404, got ${network.chainId}`
    );
  }

  console.log("Chain ID:", network.chainId.toString());
  console.log("Deploying packaged Safe artifacts from:", deployer.address);

  const out: Record<string, string> = {};

  for (const { key, file } of ARTIFACTS) {
    const artifactPath = path.resolve(SAFE_ARTIFACT_BASE, file);
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

    if (!artifact.bytecode || artifact.bytecode === "0x") {
      throw new Error(`${key}: packaged artifact has no deployment bytecode`);
    }

    if (
      artifact.linkReferences &&
      Object.keys(artifact.linkReferences).length > 0
    ) {
      throw new Error(`${key}: packaged artifact contains unresolved links`);
    }

    const factory = new ethers.ContractFactory(
      artifact.abi,
      artifact.bytecode,
      deployer
    );

    const contract = await factory.deploy();
    await contract.waitForDeployment();

    const address = await contract.getAddress();
    out[key] = address;

    console.log(`${key} -> ${address}`);
  }

  fs.mkdirSync("deployments", { recursive: true });

  const output = {
    chainId: Number(network.chainId),
    source: "@safe-global/safe-smart-account packaged artifacts",
    deployedAt: new Date().toISOString(),
    ...out,
  };

  fs.writeFileSync(
    "deployments/blockdag-packaged.json",
    JSON.stringify(output, null, 2)
  );

  console.log("Wrote deployments/blockdag-packaged.json");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

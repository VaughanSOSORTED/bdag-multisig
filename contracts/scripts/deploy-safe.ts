/**
 * Deploys Safe's audited contracts, unmodified, from the pinned
 * @safe-global/safe-smart-account release. SafeL2 is used (not Safe) because
 * it emits events for every action, so you can index activity from logs
 * instead of needing node trace support.
 *
 * After deploy: verify all five on the explorer and commit blockdag.json.
 */
import { ethers } from "hardhat";
import fs from "node:fs";

const ARTIFACTS = [
  { name: "SafeL2", key: "SafeL2" },
  { name: "SafeProxyFactory", key: "SafeProxyFactory" },
  { name: "MultiSend", key: "MultiSend" },
  { name: "MultiSendCallOnly", key: "MultiSendCallOnly" },
  { name: "CompatibilityFallbackHandler", key: "CompatibilityFallbackHandler" },
] as const;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying Safe contracts from:", deployer.address);

  const out: Record<string, string> = {};
  for (const { name, key } of ARTIFACTS) {
    const Factory = await ethers.getContractFactory(name);
    const c = await Factory.deploy();
    await c.waitForDeployment();
    out[key] = await c.getAddress();
    console.log(`${key} -> ${out[key]}`);
  }

  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  fs.mkdirSync("deployments", { recursive: true });
  fs.writeFileSync(
    "deployments/blockdag.json",
    JSON.stringify({ chainId, deployedAt: new Date().toISOString(), ...out }, null, 2)
  );
  console.log("Wrote deployments/blockdag.json");
}

main().catch((e) => { console.error(e); process.exit(1); });

/**
 * Deploys BdagVote pointed at an existing Safe address.
 * Env: VOTE_TOKEN (ERC20 used for vote weight), TREASURY (Safe address),
 *      QUORUM (whole tokens, e.g. 100)
 */
import { ethers } from "hardhat";
import fs from "node:fs";

async function main() {
  const [deployer] = await ethers.getSigners();
  const token = process.env.VOTE_TOKEN!;
  const treasury = process.env.TREASURY!;
  const quorum = ethers.parseUnits(process.env.QUORUM ?? "100", 18);

  const BdagVote = await ethers.getContractFactory("BdagVote");
  const vote = await BdagVote.deploy(token, treasury, quorum);
  await vote.waitForDeployment();

  const addr = await vote.getAddress();
  console.log("BdagVote ->", addr);

  // merge into the deployments file so the web app reads one source of truth
  const path = "deployments/blockdag.json";
  const json = JSON.parse(fs.readFileSync(path, "utf8"));
  json.BdagVote = addr;
  json.VoteToken = token;
  fs.writeFileSync(path, JSON.stringify(json, null, 2));
  console.log(`Treasury ${treasury} can now create proposals via BdagVote`);
}

main().catch((e) => { console.error(e); process.exit(1); });

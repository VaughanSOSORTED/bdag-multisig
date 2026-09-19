import { createPublicClient, createWalletClient, custom, http, parseAbi } from "viem";
import { blockdag } from "./chain";
import addresses from "../../../../contracts/deployments/blockdag.json";

export const bdagVoteAbi = parseAbi([
  "function createProposal(string title, address target, bytes data, uint64 duration) returns (uint256 id)",
  "function vote(uint256 id, bool support)",
  "function proposals(uint256) view returns (string title, address target, bytes data, uint64 start, uint64 end, uint256 forVotes, uint256 againstVotes, bool executed)",
  "function passed(uint256) view returns (bool)",
  "function quorum() view returns (uint256)",
  "function nextId() view returns (uint256)",
  "event Voted(uint256 indexed id, address indexed voter, bool support, uint256 weight)",
  "event ProposalCreated(uint256 indexed id, string title, address target, uint64 end)",
]);

export const erc20Abi = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
]);

export const voteContract = {
  address: addresses.BdagVote as `0x${string}`,
  abi: bdagVoteAbi,
};

export function publicClient() {
  return createPublicClient({ chain: blockdag, transport: http() });
}

export async function walletClient() {
  return createWalletClient({ chain: blockdag, transport: custom((window as any).ethereum) });
}

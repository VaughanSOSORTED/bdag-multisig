import {
  decodeEventLog,
  formatEther,
  parseAbiItem,
  type Address,
  type Hash,
  type Log,
} from "viem";
import { publicClient } from "./voting";

const LOOKBACK_BLOCKS = 120_000n;
const CHUNK_SIZE = 40_000n;
const CHUNK_PAUSE_MS = 120;
const MAX_RETRIES = 4;

const safeReceivedEvent = parseAbiItem(
  "event SafeReceived(address indexed sender, uint256 value)"
);

const executionSuccessEvent = parseAbiItem(
  "event ExecutionSuccess(bytes32 indexed txHash, uint256 payment)"
);

const safeSetupEvent = parseAbiItem(
  "event SafeSetup(address indexed initiator, address[] owners, uint256 threshold, address initializer, address fallbackHandler)"
);

const safeMultiSigTransactionEvent = parseAbiItem(
  "event SafeMultiSigTransaction(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, bytes signatures, bytes additionalInfo)"
);

const TOPIC = {
  received: "0x3d0ce9bfc3ed7d6862dbb28b2dea94561fe714a1b4d019aa8af39730d1ad7c3d",
  executed: "0x442e715f626346e8c54381002da614f62bee8d27386535b2521ec8540898556e",
  setup: "0x141df868a6331af528e38c83b7aa03edc19be66e37ae67f9285bf4f8e3c6a1a8",
  multiSig:
    "0x66753cd2356569ee081232e3be8909b950e0a76c1f8460c3a5e3c2be32b11bed",
} as const;

export type OnChainSafeActivity = {
  id: string;
  kind: "received" | "executed" | "setup";
  title: string;
  amountWei?: bigint;
  counterparty?: string;
  safeTxHash?: Hash;
  transactionHash: Hash;
  blockNumber: bigint;
  timestamp?: number;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isRateLimitError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : String(error ?? "");
  return /rate limit|exceeds defined limit|429/i.test(message);
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isRateLimitError(error) || attempt === MAX_RETRIES - 1) {
        throw error;
      }
      await sleep(400 * 2 ** attempt);
    }
  }

  throw lastError;
}

async function getAddressLogs(args: {
  address: Address;
  fromBlock: bigint;
  toBlock: bigint;
}): Promise<Log[]> {
  const client = publicClient();
  const logs: Log[] = [];

  for (
    let start = args.fromBlock;
    start <= args.toBlock;
    start += CHUNK_SIZE
  ) {
    const end =
      start + CHUNK_SIZE - 1n > args.toBlock
        ? args.toBlock
        : start + CHUNK_SIZE - 1n;

    const chunk = await withRetry(() =>
      client.getLogs({
        address: args.address,
        fromBlock: start,
        toBlock: end,
      })
    );

    logs.push(...chunk);

    if (end < args.toBlock) {
      await sleep(CHUNK_PAUSE_MS);
    }
  }

  return logs;
}

async function resolveTimestamps(
  blockNumbers: bigint[]
): Promise<Map<string, number>> {
  const client = publicClient();
  const unique = [...new Set(blockNumbers.map((b) => b.toString()))];
  const map = new Map<string, number>();

  // Sequential on purpose — Capedag rate-limits parallel eth_getBlockByNumber.
  for (const key of unique) {
    try {
      const block = await withRetry(() =>
        client.getBlock({
          blockNumber: BigInt(key),
        })
      );
      map.set(key, Number(block.timestamp));
      await sleep(40);
    } catch {
      // Leave timestamp unset; UI can still show the block number.
    }
  }

  return map;
}

export async function fetchSafeOnChainActivity(
  safeAddress: string
): Promise<OnChainSafeActivity[]> {
  const address = safeAddress as Address;
  const client = publicClient();
  const latest = await withRetry(() => client.getBlockNumber());
  const fromBlock =
    latest > LOOKBACK_BLOCKS ? latest - LOOKBACK_BLOCKS : 0n;

  // One address-scoped log scan instead of 4 parallel topic queries.
  const logs = await getAddressLogs({
    address,
    fromBlock,
    toBlock: latest,
  });

  const multiByTx = new Map<string, { to?: Address; value?: bigint }>();
  const activities: OnChainSafeActivity[] = [];

  for (const log of logs) {
    const topic0 = log.topics[0]?.toLowerCase();
    if (!topic0 || !log.transactionHash || log.blockNumber === null) {
      continue;
    }

    if (topic0 === TOPIC.multiSig) {
      try {
        const decoded = decodeEventLog({
          abi: [safeMultiSigTransactionEvent],
          data: log.data,
          topics: log.topics,
        });
        const args = decoded.args as {
          to?: Address;
          value?: bigint;
        };
        multiByTx.set(log.transactionHash.toLowerCase(), args);
      } catch {
        // Ignore companion decode failures.
      }
    }
  }

  for (const log of logs) {
    const topic0 = log.topics[0]?.toLowerCase();
    if (!topic0 || !log.transactionHash || log.blockNumber === null) {
      continue;
    }

    if (topic0 === TOPIC.setup) {
      activities.push({
        id: `setup-${log.transactionHash}-${log.logIndex}`,
        kind: "setup",
        title: "Safe created",
        transactionHash: log.transactionHash,
        blockNumber: log.blockNumber,
      });
      continue;
    }

    if (topic0 === TOPIC.received) {
      try {
        const decoded = decodeEventLog({
          abi: [safeReceivedEvent],
          data: log.data,
          topics: log.topics,
        });
        const args = decoded.args as {
          sender?: Address;
          value?: bigint;
        };
        activities.push({
          id: `received-${log.transactionHash}-${log.logIndex}`,
          kind: "received",
          title: "Funds received",
          amountWei: args.value,
          counterparty: args.sender,
          transactionHash: log.transactionHash,
          blockNumber: log.blockNumber,
        });
      } catch {
        // Skip undecodable receive logs.
      }
      continue;
    }

    if (topic0 === TOPIC.executed) {
      try {
        const decoded = decodeEventLog({
          abi: [executionSuccessEvent],
          data: log.data,
          topics: log.topics,
        });
        const args = decoded.args as { txHash?: Hash };
        const multi = multiByTx.get(log.transactionHash.toLowerCase());

        activities.push({
          id: `executed-${log.transactionHash}-${log.logIndex}`,
          kind: "executed",
          title: "Safe transfer executed",
          amountWei: multi?.value,
          counterparty: multi?.to,
          safeTxHash: args.txHash,
          transactionHash: log.transactionHash,
          blockNumber: log.blockNumber,
        });
      } catch {
        // Skip undecodable execution logs.
      }
    }
  }

  const timestamps = await resolveTimestamps(
    activities.map((item) => item.blockNumber)
  );

  for (const item of activities) {
    item.timestamp = timestamps.get(item.blockNumber.toString());
  }

  activities.sort((a, b) => {
    if (a.blockNumber === b.blockNumber) {
      return a.id < b.id ? 1 : -1;
    }
    return a.blockNumber < b.blockNumber ? 1 : -1;
  });

  return activities;
}

export function formatActivityAmount(amountWei?: bigint): string {
  if (amountWei === undefined) return "—";
  return `${Number(formatEther(amountWei)).toFixed(6)} BDAG`;
}

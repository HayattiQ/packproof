import "server-only";
import {
  createWalletClient,
  http,
  keccak256,
  toBytes,
  toHex,
  encodePacked,
  parseEventLogs,
  parseAbiItem,
  type Abi,
  type Address,
  type Hex,
  type TransactionReceipt,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getMantleChain } from "@/lib/chain/mantle";
import { getContractAddress, isContractConfigured, type ContractKey } from "@/lib/chain/addresses";
import { getPublicClient } from "@/lib/chain/client";
import {
  attestationLogAbi,
  externalCardNftAbi,
  packManagerAbi,
  AGENT_IDS,
  CUSTODY_STATE,
  SUBJECT_KIND,
} from "@/lib/chain/abis";
import type { CustodyTier } from "@/lib/agents/types";

/**
 * Server-only relayer: implements sponsored signing so the consumer happy path
 * has NO wallet pop-up. All writes go through a single relayer signer against
 * the four PackProof contracts (ExternalCardNFT, AttestationLog, PackManager,
 * RewardNFT).
 *
 * MODES:
 *   - REAL: RELAYER_PRIVATE_KEY is set AND the target contract address is
 *     configured. Transactions are signed and broadcast to Mantle.
 *   - SIMULATED (default for the demo, no secrets): when the key OR the target
 *     contract address is absent, every write returns a deterministic fake
 *     receipt (a keccak-derived txhash) so the entire flow runs offline.
 *     `simulated: true` is always set so the UI can label it honestly.
 */

export type TxReceipt = {
  txHash: Hex;
  simulated: boolean;
  /** decoded/known return value when applicable (e.g. new token id). */
  returnValue?: string;
};

const ABIS: Record<ContractKey, Abi> = {
  externalCardNft: externalCardNftAbi as unknown as Abi,
  attestationLog: attestationLogAbi as unknown as Abi,
  packManager: packManagerAbi as unknown as Abi,
  rewardNft: [] as unknown as Abi,
};

function realModeFor(key: ContractKey): boolean {
  return Boolean(process.env.RELAYER_PRIVATE_KEY) && isContractConfigured(key);
}

export function relayerMode(): "real" | "simulated" {
  return Boolean(process.env.RELAYER_PRIVATE_KEY) && isContractConfigured() ? "real" : "simulated";
}

function getRelayerAccount() {
  const key = process.env.RELAYER_PRIVATE_KEY;
  if (!key) return null;
  const normalized = (key.startsWith("0x") ? key : `0x${key}`) as Hex;
  return privateKeyToAccount(normalized);
}

function getWalletClient(): WalletClient | null {
  const account = getRelayerAccount();
  if (!account) return null;
  return createWalletClient({
    account,
    chain: getMantleChain(),
    transport: http(process.env.MANTLE_RPC_URL || undefined),
  });
}

/** Deterministic simulated txhash from a label + nonce-ish payload. */
function simulatedTxHash(label: string, payload: unknown): Hex {
  return keccak256(toBytes(`simtx:${label}:${JSON.stringify(payload)}`));
}

function simulatedReceipt(w: WriteArgs): TxReceipt {
  return {
    txHash: simulatedTxHash(w.label, { fn: w.functionName, args: serializeArgs(w.args) }),
    simulated: true,
    returnValue: w.simulatedReturn,
  };
}

/** keccak256 of an agent label, as written to recordAgentLog. */
export function agentIdHash(agent: keyof typeof AGENT_IDS): Hex {
  return keccak256(toBytes(AGENT_IDS[agent]));
}

type WriteArgs = {
  contract: ContractKey;
  functionName: string;
  args: readonly unknown[];
  value?: bigint;
  label: string;
  simulatedReturn?: string;
  extractReturnValue?: (receipt: TransactionReceipt) => string | undefined;
};

/**
 * Central write path. Either broadcasts via the relayer signer or returns a
 * deterministic simulated receipt. Never throws on missing secrets.
 */
export async function relayWrite(w: WriteArgs): Promise<TxReceipt> {
  if (!realModeFor(w.contract)) {
    return simulatedReceipt(w);
  }

  const wallet = getWalletClient();
  const account = getRelayerAccount();
  if (!wallet || !account) {
    return simulatedReceipt(w);
  }

  try {
    const txHash = await wallet.writeContract({
      account,
      chain: getMantleChain(),
      address: getContractAddress(w.contract),
      abi: ABIS[w.contract],
      functionName: w.functionName as never,
      args: w.args as never,
      value: w.value,
    });
    const receipt = await getPublicClient().waitForTransactionReceipt({ hash: txHash });
    let returnValue = w.simulatedReturn;
    try {
      returnValue = w.extractReturnValue?.(receipt) ?? w.simulatedReturn;
    } catch (error) {
      console.warn(`Relayer write succeeded for ${w.label}; failed to decode return value.`, error);
    }
    return { txHash, simulated: false, returnValue };
  } catch (error) {
    console.error(`Relayer write failed for ${w.label}; falling back to simulated receipt.`, error);
    return simulatedReceipt(w);
  }
}

function serializeArgs(args: readonly unknown[]): unknown[] {
  return args.map((a) => (typeof a === "bigint" ? a.toString() : a));
}

function packManagerEventArg(
  receipt: TransactionReceipt,
  eventName: "PackPurchased" | "PackRevealed",
  argName: string,
): string | undefined {
  const logs = parseEventLogs({
    abi: packManagerAbi,
    eventName,
    logs: receipt.logs,
  }) as Array<{ args?: Record<string, unknown> }>;
  const value = logs[0]?.args?.[argName];
  if (typeof value === "bigint") return value.toString();
  return value == null ? undefined : String(value);
}

// --- High-level operations used by the API routes --------------------------

const ASSET_CLASS_PSA = keccak256(toBytes("PSA_GRADED_CARD"));
const CARD_MINTED_EVENT = parseAbiItem(
  "event CardMinted(uint256 indexed tokenId, bytes32 indexed certHash, address indexed owner, uint8 custody, bytes32 reportHash)",
);
const LOG_SCAN_CHUNK = 9_000n;
const MINT_LOOKBACK_BLOCKS = 250_000n;

export type ExternalCardMint = {
  tokenId: string;
  txHash: Hex;
};

/** keccak256 hex of an arbitrary string (for input/identity hashes). */
export function hashString(s: string): Hex {
  return keccak256(toHex(s));
}

/**
 * Mint an external NFT for an authenticated card (ExternalCardNFT.mintCard).
 * Grade is encoded as gradex10 to match the uint16 on-chain field.
 */
export async function mintExternalCard(params: {
  to?: Address;
  certNumber: string;
  cardIdentity: string;
  grade: number;
  reportHash: Hex;
  valuationLowUsd: number;
  valuationHighUsd: number;
  custodyTier: CustodyTier;
}): Promise<TxReceipt> {
  const certHash = keccak256(toBytes(params.certNumber));
  const custody = params.custodyTier === "custodial" ? CUSTODY_STATE.Custodial : CUSTODY_STATE.NonCustodial;
  const to = params.to ?? relayerAddress() ?? "0x000000000000000000000000000000000000dEaD";
  return relayWrite({
    contract: "externalCardNft",
    functionName: "mintCard",
    args: [
      to,
      certHash,
      ASSET_CLASS_PSA,
      keccak256(toBytes(params.cardIdentity)),
      Math.max(0, Math.min(100, Math.round(params.grade * 10))),
      params.reportHash,
      BigInt(Math.max(0, Math.round(params.valuationLowUsd))),
      BigInt(Math.max(0, Math.round(params.valuationHighUsd))),
      custody,
    ],
    label: `mintCard:${params.certNumber}`,
    simulatedReturn: (BigInt(certHash) % 100000n).toString(),
  });
}

/**
 * Find the real on-chain mint transaction for an already-tokenized cert.
 *
 * Register demo certs are reused by many judges. The contract correctly rejects
 * duplicate mints, so repeat submissions should point at the original mint tx
 * instead of falling back to a synthetic receipt.
 */
export async function findExternalCardMint(certNumber: string): Promise<ExternalCardMint | null> {
  if (!isContractConfigured("externalCardNft")) return null;

  const address = getContractAddress("externalCardNft");
  const certHash = keccak256(toBytes(certNumber));
  const client = getPublicClient();

  let tokenId: bigint;
  try {
    tokenId = await client.readContract({
      address,
      abi: externalCardNftAbi,
      functionName: "tokenIdForCert",
      args: [certHash],
    }) as bigint;
  } catch {
    return null;
  }
  if (tokenId === 0n) return null;

  const latest = await client.getBlockNumber();
  const floor = latest > MINT_LOOKBACK_BLOCKS ? latest - MINT_LOOKBACK_BLOCKS : 0n;
  let toBlock = latest;

  while (toBlock >= floor) {
    const fromBlock = toBlock > floor + LOG_SCAN_CHUNK ? toBlock - LOG_SCAN_CHUNK : floor;
    const logs = await client.getLogs({
      address,
      event: CARD_MINTED_EVENT,
      args: { certHash },
      fromBlock,
      toBlock,
    });
    const log = logs.find((l) => l.args.tokenId === tokenId) ?? logs[0];
    if (log?.transactionHash) {
      return { tokenId: tokenId.toString(), txHash: log.transactionHash };
    }
    if (fromBlock === floor) break;
    toBlock = fromBlock - 1n;
  }

  return null;
}

/** Write an AI agent attestation log (AttestationLog.recordAgentLog). */
export async function recordAgentLog(params: {
  agent: keyof typeof AGENT_IDS;
  subjectKind?: keyof typeof SUBJECT_KIND;
  subjectId: bigint;
  inputHash: Hex;
  outputHash: Hex;
  score: number;
}): Promise<TxReceipt> {
  const score = Math.max(0, Math.min(100, Math.round(params.score)));
  const kind = SUBJECT_KIND[params.subjectKind ?? "card"];
  return relayWrite({
    contract: "attestationLog",
    functionName: "recordAgentLog",
    args: [agentIdHash(params.agent), kind, params.subjectId, params.inputHash, params.outputHash, score],
    label: `recordAgentLog:${params.agent}:${params.subjectId}`,
  });
}

/**
 * Commit-reveal seed pair. The relayer holds the serverSeed; only its keccak
 * commitment is published at purchase time. The pair is deterministic per
 * pack-token-key so the simulated reveal can reproduce it.
 */
export function deriveSeedPair(key: string): { serverSeed: Hex; seedCommitment: Hex } {
  const serverSeed = keccak256(toBytes(`serverseed:${process.env.RELAYER_PRIVATE_KEY ? "live" : "sim"}:${key}`));
  const seedCommitment = keccak256(encodePacked(["bytes32"], [serverSeed]));
  return { serverSeed, seedCommitment };
}

/** Read the current on-chain pack price, falling back to the display-config price offline. */
export async function readPackPrice(packId: bigint, fallback: bigint): Promise<bigint> {
  if (!isContractConfigured("packManager")) return fallback;
  try {
    const pack = (await getPublicClient().readContract({
      address: getContractAddress("packManager"),
      abi: packManagerAbi,
      functionName: "packs",
      args: [packId],
    })) as readonly [bigint, bigint, bigint, bigint, Hex, Hex, number];
    return pack[0] > 0n ? pack[0] : fallback;
  } catch {
    return fallback;
  }
}

export type PackRevealVerification = {
  revealed: boolean;
  matches: boolean;
  recomputedRank: number;
  storedRank: number;
};

/** Read PackManager.verifyReveal for a real on-chain pack token. */
export async function readPackRevealVerification(packTokenId: bigint): Promise<PackRevealVerification | null> {
  if (!isContractConfigured("packManager")) return null;
  try {
    const result = (await getPublicClient().readContract({
      address: getContractAddress("packManager"),
      abi: packManagerAbi,
      functionName: "verifyReveal",
      args: [packTokenId],
    })) as readonly [boolean, boolean, number, number];
    return {
      revealed: result[0],
      matches: result[1],
      recomputedRank: Number(result[2]),
      storedRank: Number(result[3]),
    };
  } catch {
    return null;
  }
}

/** Purchase a sealed pack token (sponsored). Publishes the seed commitment. */
export async function purchasePack(packId: bigint, price: bigint, seedCommitment: Hex): Promise<TxReceipt> {
  return relayWrite({
    contract: "packManager",
    functionName: "purchasePack",
    args: [packId, seedCommitment],
    value: price,
    label: `purchasePack:${packId}`,
    simulatedReturn: deterministicId("packToken", packId),
    extractReturnValue: (receipt) => packManagerEventArg(receipt, "PackPurchased", "packTokenId"),
  });
}

/** Reveal a sealed pack token with the committed serverSeed + a user salt. */
export async function revealPack(packTokenId: bigint, serverSeed: Hex, userSalt: Hex): Promise<TxReceipt> {
  return relayWrite({
    contract: "packManager",
    functionName: "revealPack",
    args: [packTokenId, serverSeed, userSalt],
    label: `revealPack:${packTokenId}`,
    simulatedReturn: deterministicId("reward", packTokenId),
    extractReturnValue: (receipt) => packManagerEventArg(receipt, "PackRevealed", "rewardTokenId"),
  });
}

/** Redeem a reward (idempotent on-chain). */
export async function redeemReward(rewardTokenId: bigint): Promise<TxReceipt> {
  return relayWrite({
    contract: "packManager",
    functionName: "redeemReward",
    args: [rewardTokenId],
    label: `redeemReward:${rewardTokenId}`,
  });
}

/** Redeem (burn/lock) a custodial external card NFT for the physical card. */
export async function redeemCard(tokenId: bigint): Promise<TxReceipt> {
  return relayWrite({
    contract: "externalCardNft",
    functionName: "redeem",
    args: [tokenId],
    label: `redeemCard:${tokenId}`,
  });
}

/** Relayer signer address (or null in simulated/no-key mode). */
export function relayerAddress(): Address | null {
  return getRelayerAccount()?.address ?? null;
}

/** A deterministic synthetic token id for simulated receipts. */
function deterministicId(kind: string, seed: bigint): string {
  const h = keccak256(toBytes(`${kind}:${seed.toString()}`));
  return (BigInt(h) % 1_000_000n).toString();
}

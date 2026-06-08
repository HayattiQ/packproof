import "server-only";
import {
  createWalletClient,
  http,
  keccak256,
  toBytes,
  toHex,
  encodePacked,
  type Abi,
  type Address,
  type Hex,
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
};

/**
 * Central write path. Either broadcasts via the relayer signer or returns a
 * deterministic simulated receipt. Never throws on missing secrets.
 */
export async function relayWrite(w: WriteArgs): Promise<TxReceipt> {
  if (!realModeFor(w.contract)) {
    return {
      txHash: simulatedTxHash(w.label, { fn: w.functionName, args: serializeArgs(w.args) }),
      simulated: true,
      returnValue: w.simulatedReturn,
    };
  }

  const wallet = getWalletClient();
  const account = getRelayerAccount();
  if (!wallet || !account) {
    return { txHash: simulatedTxHash(w.label, w.args), simulated: true, returnValue: w.simulatedReturn };
  }

  const txHash = await wallet.writeContract({
    account,
    chain: getMantleChain(),
    address: getContractAddress(w.contract),
    abi: ABIS[w.contract],
    functionName: w.functionName as never,
    args: w.args as never,
    value: w.value,
  });
  await getPublicClient().waitForTransactionReceipt({ hash: txHash });
  return { txHash, simulated: false, returnValue: w.simulatedReturn };
}

function serializeArgs(args: readonly unknown[]): unknown[] {
  return args.map((a) => (typeof a === "bigint" ? a.toString() : a));
}

// --- High-level operations used by the API routes --------------------------

const ASSET_CLASS_PSA = keccak256(toBytes("PSA_GRADED_CARD"));

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

/** Purchase a sealed pack token (sponsored). Publishes the seed commitment. */
export async function purchasePack(packId: bigint, price: bigint, seedCommitment: Hex): Promise<TxReceipt> {
  return relayWrite({
    contract: "packManager",
    functionName: "purchasePack",
    args: [packId, seedCommitment],
    value: price,
    label: `purchasePack:${packId}`,
    simulatedReturn: deterministicId("packToken", packId),
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

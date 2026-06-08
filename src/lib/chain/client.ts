import { createPublicClient, http, type PublicClient } from "viem";
import { getMantleChain } from "@/lib/chain/mantle";
import { isContractConfigured } from "@/lib/chain/addresses";

/**
 * Read-only viem public client for Mantle.
 *
 * Uses MANTLE_RPC_URL when set, otherwise the chain default public RPC. Reads
 * are only attempted when a real contract address is configured; callers should
 * gate on `canReadChain()` and otherwise use simulated/local data so the app
 * runs with no network.
 */
let cached: PublicClient | null = null;

export function getPublicClient(): PublicClient {
  if (cached) return cached;
  const chain = getMantleChain();
  const rpcUrl = process.env.MANTLE_RPC_URL || undefined;
  cached = createPublicClient({
    chain,
    transport: http(rpcUrl),
  }) as PublicClient;
  return cached;
}

/** Whether real on-chain reads should be attempted. */
export function canReadChain(): boolean {
  return isContractConfigured();
}

/** Explorer tx URL for a hash, using the configured explorer base. */
export function explorerTxUrl(txHash: string): string {
  const base =
    process.env.NEXT_PUBLIC_MANTLE_EXPLORER_URL ||
    getMantleChain().blockExplorers?.default.url ||
    "https://sepolia.mantlescan.xyz";
  return `${base.replace(/\/$/, "")}/tx/${txHash}`;
}

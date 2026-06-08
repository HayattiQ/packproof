import { defineChain } from "viem";

/**
 * Mantle chain definitions. Default for the demo is Mantle Sepolia (5003).
 * Selection is driven by NEXT_PUBLIC_MANTLE_CHAIN_ID.
 */
export const mantleMainnet = defineChain({
  id: 5000,
  name: "Mantle",
  nativeCurrency: { name: "Mantle", symbol: "MNT", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.mantle.xyz"] } },
  blockExplorers: { default: { name: "Mantle Explorer", url: "https://mantlescan.xyz" } },
});

export const mantleSepolia = defineChain({
  id: 5003,
  name: "Mantle Sepolia",
  nativeCurrency: { name: "Mantle", symbol: "MNT", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.sepolia.mantle.xyz"] } },
  blockExplorers: { default: { name: "Mantle Sepolia Explorer", url: "https://sepolia.mantlescan.xyz" } },
  testnet: true,
});

export function getMantleChainId(): number {
  return Number(process.env.NEXT_PUBLIC_MANTLE_CHAIN_ID || "5003");
}

export function getMantleChain() {
  return getMantleChainId() === 5000 ? mantleMainnet : mantleSepolia;
}

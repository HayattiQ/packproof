import type { Address } from "viem";

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

/**
 * Deployed PackProof contract addresses (set by the contracts domain after
 * `contracts/script/Deploy.s.sol` runs). The system is four contracts:
 * ExternalCardNFT, AttestationLog, PackManager, RewardNFT.
 *
 * When an address is unset / zero, the relayer + chain client run in SIMULATED
 * mode for operations on that contract, so the app runs end-to-end offline.
 */
export type ContractKey = "externalCardNft" | "attestationLog" | "packManager" | "rewardNft";

function read(envName: string): Address {
  return ((process.env[envName] || ZERO_ADDRESS) as Address);
}

export function getContractAddress(key: ContractKey): Address {
  switch (key) {
    case "externalCardNft":
      return read("NEXT_PUBLIC_EXTERNAL_CARD_NFT_ADDRESS");
    case "attestationLog":
      return read("NEXT_PUBLIC_ATTESTATION_LOG_ADDRESS");
    case "packManager":
      // Back-compat: fall back to the legacy single-address var if present.
      return ((process.env.NEXT_PUBLIC_PACK_MANAGER_ADDRESS ||
        process.env.NEXT_PUBLIC_PACKPROOF_CONTRACT_ADDRESS ||
        ZERO_ADDRESS) as Address);
    case "rewardNft":
      return read("NEXT_PUBLIC_REWARD_NFT_ADDRESS");
  }
}

export function isContractConfigured(key?: ContractKey): boolean {
  if (key) return getContractAddress(key).toLowerCase() !== ZERO_ADDRESS;
  // Any contract configured => not fully simulated.
  return (["externalCardNft", "attestationLog", "packManager", "rewardNft"] as ContractKey[]).some(
    (k) => getContractAddress(k).toLowerCase() !== ZERO_ADDRESS,
  );
}

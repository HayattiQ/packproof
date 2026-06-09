/**
 * Hand-authored ABIs (`as const`) for the PackProof contract system.
 *
 * These MUST match the function/event signatures in contracts/src/*.sol. The
 * contracts domain owns the Solidity source; this file is the TS-side mirror
 * used by viem for encoding/decoding. The system is split into four contracts:
 *
 *   - ExternalCardNFT  (RWA tokenization core: mint/custody/redeem + views)
 *   - AttestationLog   (append-only AI agent attestation log)
 *   - PackManager      (commit-reveal packs + public verifyReveal)
 *   - RewardNFT        (internal pack-reward NFTs; minted by PackManager)
 *
 * Enum encodings (uint8): CustodyState { NonCustodial=0, Custodial=1 };
 * RedemptionState { Active=0, Redeemed=1 }; PackStatus { Draft=0, Live=1,
 * Paused=2, SoldOut=3, Ended=4 }; PackTokenStatus { Sealed=0, Revealed=1 }.
 */

// --- ExternalCardNFT --------------------------------------------------------
export const externalCardNftAbi = [
  { type: "constructor", inputs: [{ name: "admin", type: "address" }], stateMutability: "nonpayable" },
  {
    type: "function",
    name: "mintCard",
    inputs: [
      { name: "to", type: "address" },
      { name: "certHash", type: "bytes32" },
      { name: "assetClass", type: "bytes32" },
      { name: "cardIdentity", type: "bytes32" },
      { name: "grade", type: "uint16" },
      { name: "reportHash", type: "bytes32" },
      { name: "valuationLow", type: "uint128" },
      { name: "valuationHigh", type: "uint128" },
      { name: "custody", type: "uint8" },
    ],
    outputs: [{ name: "tokenId", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "upgradeToCustodial",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "updateValuation",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "valuationLow", type: "uint128" },
      { name: "valuationHigh", type: "uint128" },
      { name: "reportHash", type: "bytes32" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  { type: "function", name: "redeem", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  {
    type: "function",
    name: "isListingEligible",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "custodyOf",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "uint8" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "redemptionOf",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "uint8" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "tokenIdForCert",
    inputs: [{ name: "certHash", type: "bytes32" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getCard",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "certHash", type: "bytes32" },
          { name: "assetClass", type: "bytes32" },
          { name: "cardIdentity", type: "bytes32" },
          { name: "grade", type: "uint16" },
          { name: "reportHash", type: "bytes32" },
          { name: "valuationLow", type: "uint128" },
          { name: "valuationHigh", type: "uint128" },
          { name: "custody", type: "uint8" },
          { name: "redemption", type: "uint8" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "ownerOf",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "address" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "CardMinted",
    inputs: [
      { name: "tokenId", type: "uint256", indexed: true },
      { name: "certHash", type: "bytes32", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "custody", type: "uint8", indexed: false },
      { name: "reportHash", type: "bytes32", indexed: false },
    ],
  },
  {
    type: "event",
    name: "CardRedeemed",
    inputs: [
      { name: "tokenId", type: "uint256", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "certHash", type: "bytes32", indexed: false },
    ],
  },
] as const;

// --- AttestationLog ---------------------------------------------------------
export const attestationLogAbi = [
  { type: "constructor", inputs: [{ name: "admin", type: "address" }], stateMutability: "nonpayable" },
  {
    type: "function",
    name: "recordAgentLog",
    inputs: [
      { name: "agentId", type: "bytes32" },
      { name: "subjectKind", type: "uint8" },
      { name: "subjectId", type: "uint256" },
      { name: "inputHash", type: "bytes32" },
      { name: "outputHash", type: "bytes32" },
      { name: "score", type: "uint8" },
    ],
    outputs: [{ name: "logId", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  { type: "function", name: "logCount", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  {
    type: "function",
    name: "getLog",
    inputs: [{ name: "logId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "agentId", type: "bytes32" },
          { name: "subjectKind", type: "uint8" },
          { name: "subjectId", type: "uint256" },
          { name: "inputHash", type: "bytes32" },
          { name: "outputHash", type: "bytes32" },
          { name: "score", type: "uint8" },
          { name: "timestamp", type: "uint256" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "AgentLogRecorded",
    inputs: [
      { name: "logId", type: "uint256", indexed: true },
      { name: "agentId", type: "bytes32", indexed: true },
      { name: "subjectKind", type: "uint8", indexed: false },
      { name: "subjectId", type: "uint256", indexed: true },
      { name: "outputHash", type: "bytes32", indexed: false },
      { name: "score", type: "uint8", indexed: false },
    ],
  },
] as const;

// --- PackManager ------------------------------------------------------------
export const packManagerAbi = [
  {
    type: "constructor",
    inputs: [
      { name: "admin", type: "address" },
      { name: "treasury_", type: "address" },
      { name: "rewardNFT_", type: "address" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "createPack",
    inputs: [
      { name: "price", type: "uint256" },
      { name: "totalSupply", type: "uint256" },
      { name: "perWalletLimit", type: "uint256" },
      { name: "inventoryRoot", type: "bytes32" },
      { name: "oddsHash", type: "bytes32" },
    ],
    outputs: [{ name: "packId", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setPackStatus",
    inputs: [
      { name: "packId", type: "uint256" },
      { name: "status", type: "uint8" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "purchasePack",
    inputs: [
      { name: "packId", type: "uint256" },
      { name: "seedCommitment", type: "bytes32" },
    ],
    outputs: [{ name: "packTokenId", type: "uint256" }],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "revealPack",
    inputs: [
      { name: "packTokenId", type: "uint256" },
      { name: "serverSeed", type: "bytes32" },
      { name: "userSalt", type: "bytes32" },
    ],
    outputs: [{ name: "rewardTokenId", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "redeemReward",
    inputs: [{ name: "rewardTokenId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "verifyReveal",
    inputs: [{ name: "packTokenId", type: "uint256" }],
    outputs: [
      { name: "revealed", type: "bool" },
      { name: "matches", type: "bool" },
      { name: "recomputedRank", type: "uint8" },
      { name: "storedRank", type: "uint8" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "packs",
    inputs: [{ name: "packId", type: "uint256" }],
    outputs: [
      { name: "price", type: "uint256" },
      { name: "totalSupply", type: "uint256" },
      { name: "sold", type: "uint256" },
      { name: "perWalletLimit", type: "uint256" },
      { name: "inventoryRoot", type: "bytes32" },
      { name: "oddsHash", type: "bytes32" },
      { name: "status", type: "uint8" },
    ],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "PackPurchased",
    inputs: [
      { name: "packId", type: "uint256", indexed: true },
      { name: "packTokenId", type: "uint256", indexed: true },
      { name: "buyer", type: "address", indexed: true },
      { name: "seedCommitment", type: "bytes32", indexed: false },
    ],
  },
  {
    type: "event",
    name: "PackRevealed",
    inputs: [
      { name: "packId", type: "uint256", indexed: true },
      { name: "packTokenId", type: "uint256", indexed: true },
      { name: "rewardTokenId", type: "uint256", indexed: true },
      { name: "rewardId", type: "bytes32", indexed: false },
      { name: "rank", type: "uint8", indexed: false },
    ],
  },
  {
    type: "event",
    name: "RewardRedeemed",
    inputs: [
      { name: "rewardTokenId", type: "uint256", indexed: true },
      { name: "owner", type: "address", indexed: true },
    ],
  },
] as const;

/** CustodyState enum encoding used by ExternalCardNFT. */
export const CUSTODY_STATE = { NonCustodial: 0, Custodial: 1 } as const;

/** subjectKind values for AttestationLog.recordAgentLog. */
export const SUBJECT_KIND = { card: 0, pack: 1, other: 2 } as const;

/**
 * Agent ids used in recordAgentLog. keccak256 of these labels is computed in the
 * relayer; kept here so the value is documented next to the ABI.
 */
export const AGENT_IDS = {
  authentication: "packproof.agent.authentication",
  pricing: "packproof.agent.pricing",
  compliance: "packproof.agent.compliance",
  fairness: "packproof.agent.fairness",
} as const;

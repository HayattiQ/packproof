/**
 * PackProof verify-Skill handler (Minds Bazaar scaffold)
 * =====================================================
 *
 * Given a PackProof token id OR a PSA cert number, this handler returns four
 * independent checks, exactly as the requirements / proposal promise a verifying
 * agent:
 *
 *   (a) psaMatch        - does the on-chain record match PSA's public registry?
 *   (b) reportHashMatch - does the stored authentication-report hash re-derive
 *                         from the report content? (recompute algorithm below)
 *   (c) revealMatch     - for pack rewards, does verifyReveal pass? (recompute
 *                         the reveal from the committed seed + inventory)
 *   (d) provenance      - the on-chain transfer chain for the token
 *
 * SCAFFOLD NOTES (a human finishes this before publishing):
 *   - All on-chain access is hidden behind the `OnChainReader` interface. A
 *     `MockReader` (deterministic, no network) lets this run today; a
 *     `ViemReader` shows the live wiring. Flip `USE_MOCK` / set env vars when the
 *     contract is deployed.
 *   - The ABIs here are *intentionally duplicated minimal fragments* of the
 *     deployed PackProof contract surface, so this Skill is self-contained and
 *     portable into the Minds Bazaar with zero builder context. Keep them in
 *     sync with contracts/PackProof.sol when the verify views land.
 *   - viem is imported lazily so the file type-checks and the mock path runs
 *     even when viem is not installed.
 */

/* ------------------------------------------------------------------ *
 * Public types
 * ------------------------------------------------------------------ */

export type CustodyState = "custodial" | "non-custodial" | "redeemed";

export type Check = {
  /** null = check not applicable (e.g. revealMatch on a non-reward token). */
  passed: boolean | null;
  detail: string;
};

export type ProvenanceEntry = {
  from: string;
  to: string;
  txHash: string;
  /** Unix seconds. */
  timestamp: number;
};

export type VerifyResult = {
  query: { tokenId?: string; certNumber?: string };
  resolvedTokenId: string | null;
  tokenKind: "external-nft" | "reward-nft" | "unknown";
  /** true only if every applicable check passed. */
  verified: boolean;
  checks: {
    psaMatch: Check;
    reportHashMatch: Check;
    revealMatch: Check;
  };
  custodyState: CustodyState | null;
  /** True for custodial tokens only; mirrors the on-chain listing gate. */
  marketplaceTradable: boolean | null;
  provenance: ProvenanceEntry[];
  /** Human-readable, safe to relay verbatim to the end user. */
  summary: string;
  /** Set when the query could not be resolved at all. */
  error?: string;
};

/* ------------------------------------------------------------------ *
 * On-chain record shapes (mirror contracts/PackProof.sol surface)
 * ------------------------------------------------------------------ */

/**
 * Authentication report as stored off-chain. Its canonical hash is written
 * on-chain at mint time. `reportHashMatch` recomputes a hash over this object
 * and compares it to the on-chain `authReportHash`.
 */
export type AuthReport = {
  certNumber: string;
  cardIdentity: string;
  grade: string;
  identityMatch: boolean;
  gradeMatch: boolean;
  counterfeitRiskScore: number; // 0..100, lower is safer
  valueRangeUsd: [number, number];
  model: string;
  modelVersion: string;
  timestamp: number; // Unix seconds
};

export type ExternalNftRecord = {
  tokenId: string;
  kind: "external-nft";
  certNumber: string;
  cardIdentity: string;
  grade: string;
  owner: string;
  custodyState: CustodyState;
  /** keccak256 of the canonical authentication report, written at mint. */
  authReportHash: string;
};

export type RewardNftRecord = {
  tokenId: string;
  kind: "reward-nft";
  owner: string;
  packId: string;
  rank: number;
  rewardId: string;
};

export type TokenRecord = ExternalNftRecord | RewardNftRecord;

/**
 * Commit-reveal data for a pack token, as recorded on-chain.
 * `verifyReveal` recomputes the reward from these committed values.
 */
export type RevealData = {
  packTokenId: string;
  packId: string;
  /** Committed before sale: keccak256(inventory + seed). */
  commitmentHash: string;
  /** Revealed seed + inventory whose hash MUST equal commitmentHash. */
  revealedInventoryRoot: string;
  revealedSeed: string;
  /** Inputs that bound the reveal entropy on-chain (see _rankFromEntropy). */
  owner: string;
  userSalt: string;
  blockPrevrandao: string;
  blockTimestamp: number;
  /** What the chain emitted as the result. */
  observedRewardId: string;
  observedRank: number;
};

/**
 * PSA public-registry record for a cert number (verification + attribution
 * only; PackProof claims no affiliation with PSA).
 */
export type PsaRegistryRecord = {
  certNumber: string;
  cardIdentity: string;
  grade: string;
  found: boolean;
};

/* ------------------------------------------------------------------ *
 * Reader interface — the single seam between this Skill and the chain.
 * ------------------------------------------------------------------ */

export interface OnChainReader {
  /** Resolve a PSA cert number to a PackProof token id, or null if untokenized. */
  tokenIdForCert(certNumber: string): Promise<string | null>;
  /** Full token record, or null if the id does not exist. */
  getToken(tokenId: string): Promise<TokenRecord | null>;
  /** Commit-reveal data for a reward/pack token, or null. */
  getReveal(tokenId: string): Promise<RevealData | null>;
  /** Off-chain authentication report referenced by an external NFT, or null. */
  getAuthReport(tokenId: string): Promise<AuthReport | null>;
  /** Ordered transfer history (provenance) for a token. */
  getProvenance(tokenId: string): Promise<ProvenanceEntry[]>;
  /** PSA registry lookup for a cert number. */
  psaLookup(certNumber: string): Promise<PsaRegistryRecord>;
}

/* ------------------------------------------------------------------ *
 * Hash primitives
 *
 * keccak256 of UTF-8 bytes. Wired to viem's keccak256 when available; falls
 * back to a clearly-labelled non-cryptographic digest so the mock path runs
 * without dependencies. The PRODUCTION reader MUST use a real keccak256 — the
 * recompute algorithm below is what the /agent-guide documents verbatim.
 * ------------------------------------------------------------------ */

let _keccak: ((utf8: string) => string) | null = null;

/**
 * Dynamic import of viem behind an indirect specifier. viem is an optional,
 * pre-publish dependency; keeping the specifier in a variable means the mock
 * path type-checks and runs without viem installed.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function importViem(): Promise<any> {
  const specifier = "viem";
  return import(/* @vite-ignore */ specifier);
}

async function keccakUtf8(input: string): Promise<string> {
  if (_keccak) return _keccak(input);
  try {
    // Lazy: viem is optional at scaffold time. The specifier is held in a
    // variable so the type-checker does not require viem to be installed for
    // the mock path to compile.
    const viem = (await importViem()) as {
      keccak256: (b: `0x${string}`) => string;
      toHex: (s: string) => `0x${string}`;
    };
    _keccak = (utf8: string) => viem.keccak256(viem.toHex(utf8));
    return _keccak(input);
  } catch {
    _keccak = fallbackDigest;
    return _keccak(input);
  }
}

/** NON-CRYPTOGRAPHIC. Deterministic stand-in for the mock path only. */
function fallbackDigest(utf8: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < utf8.length; i++) {
    const c = utf8.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul((h2 + c) ^ (c << 5), 0x85ebca6b) >>> 0;
  }
  const hex = (h1.toString(16) + h2.toString(16)).padStart(16, "0");
  return ("0x" + hex.repeat(8)).slice(0, 66) + "__MOCK";
}

/* ------------------------------------------------------------------ *
 * Recompute algorithms (documented verbatim in agent-guide.md)
 * ------------------------------------------------------------------ */

/**
 * Canonical authentication-report serialization.
 *
 * The fields are concatenated in a FIXED order with `|` separators; numbers are
 * decimal, booleans are "true"/"false", the value range is "lo-hi". This exact
 * string is what gets hashed both at mint time (on-chain `authReportHash`) and
 * here during verification. Any change to field order, separators, or number
 * formatting breaks the match — keep this identical to the minting pipeline.
 */
export function serializeAuthReport(r: AuthReport): string {
  return [
    "PACKPROOF_AUTH_REPORT_V1",
    r.certNumber,
    r.cardIdentity,
    r.grade,
    r.identityMatch ? "true" : "false",
    r.gradeMatch ? "true" : "false",
    String(r.counterfeitRiskScore),
    `${r.valueRangeUsd[0]}-${r.valueRangeUsd[1]}`,
    r.model,
    r.modelVersion,
    String(r.timestamp),
  ].join("|");
}

export async function computeReportHash(r: AuthReport): Promise<string> {
  return keccakUtf8(serializeAuthReport(r));
}

/**
 * Pack reveal recompute — mirrors PackProof.sol revealPack / _rankFromEntropy:
 *
 *   entropy = keccak256(prevrandao | timestamp | owner | packTokenId | userSalt)
 *   roll    = uint256(entropy) % 10000
 *   rank    = roll <  100 -> 1
 *             roll <  700 -> 2
 *             roll < 3000 -> 3
 *             else        -> 4
 *   rewardId = keccak256(packId | packTokenId | rank | entropy)
 *
 * We also re-check that keccak256(inventoryRoot | seed) == commitmentHash so the
 * reveal is bound to the pre-sale commitment.
 */
export async function recomputeReveal(d: RevealData): Promise<{
  commitmentOk: boolean;
  rank: number;
  rewardId: string;
  rewardMatches: boolean;
}> {
  const commitment = await keccakUtf8(`${d.revealedInventoryRoot}|${d.revealedSeed}`);
  const commitmentOk = commitment === d.commitmentHash;

  const entropy = await keccakUtf8(
    [d.blockPrevrandao, String(d.blockTimestamp), d.owner, d.packTokenId, d.userSalt].join("|"),
  );
  const rank = rankFromEntropy(entropy);

  const rewardId = await keccakUtf8([d.packId, d.packTokenId, String(rank), entropy].join("|"));

  const rewardMatches =
    commitmentOk && rank === d.observedRank && rewardId === d.observedRewardId;

  return { commitmentOk, rank, rewardId, rewardMatches };
}

function hexToBigInt(hex: string): bigint {
  const clean = hex.replace(/__MOCK$/, "").replace(/^0x/, "");
  // Take the leading 64 hex chars (256 bits); mock digests may be shorter.
  const slice = clean.slice(0, 64) || "0";
  try {
    return BigInt("0x" + slice);
  } catch {
    return BigInt(0);
  }
}

/**
 * roll = uint256(entropy) % 10000; rank bands mirror PackProof.sol
 * _rankFromEntropy (1=S ~1%, 2=A ~6%, 3=B ~23%, 4=C ~70%).
 */
function rankFromEntropy(entropy: string): number {
  const roll = hexToBigInt(entropy) % BigInt(10000);
  if (roll < BigInt(100)) return 1;
  if (roll < BigInt(700)) return 2;
  if (roll < BigInt(3000)) return 3;
  return 4;
}

/* ------------------------------------------------------------------ *
 * Duplicated minimal ABIs (self-contained; sync with deployed contract)
 *
 * These are the ONLY views the Skill needs. They are written as the production
 * ViemReader would consume them.
 *
 * TODO(human, pre-publish) — SYNC WITH REAL CONTRACTS: the monolithic
 * PackProof.sol skeleton was replaced by a 4-contract system. This fragment
 * does NOT yet match the deployed ABIs and is only reached via ViemReader
 * (USE_MOCK=false). Required corrections before going live:
 *   - tokenIdForCert: real arg is `bytes32 certHash` on ExternalCardNFT, NOT
 *     `string certNumber`. The Skill must keccak256 the cert string off-chain.
 *   - externalNft(tokenId): does NOT exist. The real getter is
 *     ExternalCardNFT.getCard(uint256) returning a CardData struct
 *     (certHash, assetClass, cardIdentity, grade, reportHash, valuationLow/High,
 *     custody, redemption, ...). custodyOf/redemptionOf are separate views.
 *   - verifyReveal: lives on PackManager and returns
 *     (bool revealed, bool matches, uint8 recomputedRank, uint8 storedRank),
 *     not a single bool.
 * The running MockReader path is unaffected by this drift.
 * ------------------------------------------------------------------ */

export const PACKPROOF_VERIFY_ABI = [
  {
    type: "function",
    name: "tokenIdForCert",
    stateMutability: "view",
    inputs: [{ name: "certNumber", type: "string" }],
    outputs: [{ name: "tokenId", type: "uint256" }],
  },
  {
    type: "function",
    name: "externalNft",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      { name: "certNumber", type: "string" },
      { name: "cardIdentity", type: "string" },
      { name: "grade", type: "string" },
      { name: "owner", type: "address" },
      { name: "custodyState", type: "uint8" },
      { name: "authReportHash", type: "bytes32" },
    ],
  },
  {
    type: "function",
    name: "verifyReveal",
    stateMutability: "view",
    inputs: [{ name: "packTokenId", type: "uint256" }],
    outputs: [{ name: "matches", type: "bool" }],
  },
] as const;

/* ------------------------------------------------------------------ *
 * Live reader (viem) — documented interface, not wired to a real node here.
 * ------------------------------------------------------------------ */

export type ViemReaderConfig = {
  rpcUrl: string;
  contractAddress: `0x${string}`;
  chainId: number;
  /** PSA registry base URL used for the cert cross-check (attribution-only). */
  psaRegistryBaseUrl: string;
};

/**
 * Production reader. Implemented against viem's createPublicClient + readContract.
 * Left as a thin scaffold: a human fills the off-chain report fetch (the report
 * lives off-chain, only its hash is on-chain) and the PSA registry call.
 */
export class ViemReader implements OnChainReader {
  private readonly cfg: ViemReaderConfig;
  constructor(cfg: ViemReaderConfig) {
    this.cfg = cfg;
  }

  private async client() {
    const viem = await importViem();
    return viem.createPublicClient({
      transport: viem.http(this.cfg.rpcUrl),
    });
  }

  async tokenIdForCert(certNumber: string): Promise<string | null> {
    const client = await this.client();
    const id = (await client.readContract({
      address: this.cfg.contractAddress,
      abi: PACKPROOF_VERIFY_ABI,
      functionName: "tokenIdForCert",
      args: [certNumber],
    })) as bigint;
    return id === BigInt(0) ? null : id.toString();
  }

  async getToken(_tokenId: string): Promise<TokenRecord | null> {
    // TODO(human, pre-publish): read `externalNft(tokenId)` (and the reward
    // registry) and map the tuple onto TokenRecord. Distinguish external vs
    // reward by which registry holds the id.
    throw new Error("ViemReader.getToken not implemented in scaffold — use MockReader");
  }

  async getReveal(_tokenId: string): Promise<RevealData | null> {
    // TODO(human, pre-publish): read the committed seed+inventory and the
    // emitted PackRevealed event for this packTokenId.
    throw new Error("ViemReader.getReveal not implemented in scaffold — use MockReader");
  }

  async getAuthReport(_tokenId: string): Promise<AuthReport | null> {
    // TODO(human, pre-publish): fetch the off-chain report (the on-chain value
    // is only its hash) from the platform's report store / IPFS.
    throw new Error("ViemReader.getAuthReport not implemented in scaffold — use MockReader");
  }

  async getProvenance(_tokenId: string): Promise<ProvenanceEntry[]> {
    // TODO(human, pre-publish): assemble from Transfer logs for this token id.
    throw new Error("ViemReader.getProvenance not implemented in scaffold — use MockReader");
  }

  async psaLookup(_certNumber: string): Promise<PsaRegistryRecord> {
    // TODO(human, pre-publish): GET `${psaRegistryBaseUrl}/cert/${certNumber}`,
    // parse identity + grade. Attribution-only; no claim of PSA affiliation.
    throw new Error("ViemReader.psaLookup not implemented in scaffold — use MockReader");
  }
}

/* ------------------------------------------------------------------ *
 * Mock reader — deterministic fixtures so the Skill runs end-to-end today.
 * ------------------------------------------------------------------ */

const MOCK_REPORT: AuthReport = {
  certNumber: "PSA-58912043",
  cardIdentity: "2003 SP Authentic #115 (placeholder art)",
  grade: "PSA 9 MINT",
  identityMatch: true,
  gradeMatch: true,
  counterfeitRiskScore: 4,
  valueRangeUsd: [420, 580],
  model: "packproof-auth",
  modelVersion: "v1.2.0",
  timestamp: 1_736_000_000,
};

export class MockReader implements OnChainReader {
  /** Lazily-built so the report hash is computed with the same keccak path. */
  private externalCache: ExternalNftRecord | null = null;

  private async externalToken(): Promise<ExternalNftRecord> {
    if (!this.externalCache) {
      this.externalCache = {
        tokenId: "1001",
        kind: "external-nft",
        certNumber: MOCK_REPORT.certNumber,
        cardIdentity: MOCK_REPORT.cardIdentity,
        grade: MOCK_REPORT.grade,
        owner: "0xAa1111111111111111111111111111111111aA11",
        custodyState: "custodial",
        authReportHash: await computeReportHash(MOCK_REPORT),
      };
    }
    return this.externalCache;
  }

  async tokenIdForCert(certNumber: string): Promise<string | null> {
    return certNumber === MOCK_REPORT.certNumber ? "1001" : null;
  }

  async getToken(tokenId: string): Promise<TokenRecord | null> {
    if (tokenId === "1001") return this.externalToken();
    if (tokenId === "2002") {
      return {
        tokenId: "2002",
        kind: "reward-nft",
        owner: "0xBb2222222222222222222222222222222222bB22",
        packId: "7",
        rank: 0, // filled by reveal; left 0 here
        rewardId: "pending",
      };
    }
    return null;
  }

  async getReveal(tokenId: string): Promise<RevealData | null> {
    if (tokenId !== "2002") return null;
    // Build a self-consistent reveal: commitment matches, and observed result
    // equals the recompute (so the mock verifies as PASS).
    const revealedInventoryRoot = "0x7f4d000000000000000000000000000000000000000000000000000000000b93";
    const revealedSeed = "0x91ad0000000000000000000000000000000000000000000000000000000042ff";
    const commitmentHash = await keccakUtf8(`${revealedInventoryRoot}|${revealedSeed}`);

    const base = {
      packTokenId: "2002",
      packId: "7",
      revealedInventoryRoot,
      revealedSeed,
      commitmentHash,
      owner: "0xBb2222222222222222222222222222222222bB22",
      userSalt: "0x" + "cd".repeat(32),
      blockPrevrandao: "0x" + "ab".repeat(32),
      blockTimestamp: 1_736_050_000,
    };
    const entropy = await keccakUtf8(
      [base.blockPrevrandao, String(base.blockTimestamp), base.owner, base.packTokenId, base.userSalt].join("|"),
    );
    const rank = rankFromEntropy(entropy);
    const observedRewardId = await keccakUtf8([base.packId, base.packTokenId, String(rank), entropy].join("|"));
    return { ...base, observedRank: rank, observedRewardId };
  }

  async getAuthReport(tokenId: string): Promise<AuthReport | null> {
    return tokenId === "1001" ? MOCK_REPORT : null;
  }

  async getProvenance(tokenId: string): Promise<ProvenanceEntry[]> {
    if (tokenId === "1001") {
      return [
        {
          from: "0x0000000000000000000000000000000000000000",
          to: "0xAa1111111111111111111111111111111111aA11",
          txHash: "0x" + "11".repeat(32),
          timestamp: MOCK_REPORT.timestamp,
        },
      ];
    }
    if (tokenId === "2002") {
      return [
        {
          from: "0x0000000000000000000000000000000000000000",
          to: "0xBb2222222222222222222222222222222222bB22",
          txHash: "0x" + "22".repeat(32),
          timestamp: 1_736_050_000,
        },
      ];
    }
    return [];
  }

  async psaLookup(certNumber: string): Promise<PsaRegistryRecord> {
    if (certNumber === MOCK_REPORT.certNumber) {
      return {
        certNumber,
        cardIdentity: MOCK_REPORT.cardIdentity,
        grade: MOCK_REPORT.grade,
        found: true,
      };
    }
    return { certNumber, cardIdentity: "", grade: "", found: false };
  }
}

/* ------------------------------------------------------------------ *
 * Reader factory
 * ------------------------------------------------------------------ */

/** Flip to false (and provide env vars) once the contract is deployed. */
export const USE_MOCK = true;

export function createReader(): OnChainReader {
  if (USE_MOCK) return new MockReader();
  const rpcUrl = process.env.PACKPROOF_RPC_URL;
  const contractAddress = process.env.PACKPROOF_CONTRACT_ADDRESS as `0x${string}` | undefined;
  const psaRegistryBaseUrl = process.env.PSA_REGISTRY_BASE_URL;
  const chainId = Number(process.env.PACKPROOF_CHAIN_ID ?? "5003");
  if (!rpcUrl || !contractAddress || !psaRegistryBaseUrl) {
    throw new Error(
      "Live reader needs PACKPROOF_RPC_URL, PACKPROOF_CONTRACT_ADDRESS, PSA_REGISTRY_BASE_URL",
    );
  }
  return new ViemReader({ rpcUrl, contractAddress, chainId, psaRegistryBaseUrl });
}

/* ------------------------------------------------------------------ *
 * Handler entry point (skill.json -> handlerEntry: "verify")
 * ------------------------------------------------------------------ */

export type VerifyInput = { tokenId?: string; certNumber?: string };

export async function verify(
  input: VerifyInput,
  reader: OnChainReader = createReader(),
): Promise<VerifyResult> {
  const query = { tokenId: input.tokenId, certNumber: input.certNumber };
  const notApplicable: Check = { passed: null, detail: "not applicable" };

  const base: VerifyResult = {
    query,
    resolvedTokenId: null,
    tokenKind: "unknown",
    verified: false,
    checks: {
      psaMatch: { ...notApplicable },
      reportHashMatch: { ...notApplicable },
      revealMatch: { ...notApplicable },
    },
    custodyState: null,
    marketplaceTradable: null,
    provenance: [],
    summary: "",
  };

  if (!input.tokenId && !input.certNumber) {
    return { ...base, error: "Provide either a tokenId or a PSA certNumber.", summary: "No input provided." };
  }

  // 1. Resolve to a token id.
  let tokenId = input.tokenId ?? null;
  if (!tokenId && input.certNumber) {
    tokenId = await reader.tokenIdForCert(input.certNumber);
    if (!tokenId) {
      return {
        ...base,
        error: `PSA cert ${input.certNumber} is not tokenized on PackProof.`,
        summary: `No PackProof NFT found for PSA cert ${input.certNumber}.`,
      };
    }
  }

  const token = tokenId ? await reader.getToken(tokenId) : null;
  if (!token) {
    return { ...base, resolvedTokenId: tokenId, error: `Token ${tokenId} does not exist.`, summary: `Token ${tokenId} not found on-chain.` };
  }

  base.resolvedTokenId = token.tokenId;
  base.tokenKind = token.kind;
  base.provenance = await reader.getProvenance(token.tokenId);

  // 2. External NFT checks: PSA match + report-hash match.
  if (token.kind === "external-nft") {
    base.custodyState = token.custodyState;
    base.marketplaceTradable = token.custodyState === "custodial";

    const psa = await reader.psaLookup(token.certNumber);
    const psaOk =
      psa.found &&
      psa.cardIdentity === token.cardIdentity &&
      psa.grade === token.grade;
    base.checks.psaMatch = {
      passed: psaOk,
      detail: psa.found
        ? psaOk
          ? `PSA registry confirms ${token.cardIdentity} / ${token.grade}.`
          : `PSA registry record contradicts the on-chain record (registry: ${psa.cardIdentity} / ${psa.grade}).`
        : `PSA cert ${token.certNumber} did not resolve in the registry.`,
    };

    const report = await reader.getAuthReport(token.tokenId);
    if (!report) {
      base.checks.reportHashMatch = { passed: false, detail: "Authentication report could not be retrieved." };
    } else {
      const recomputed = await computeReportHash(report);
      const hashOk = recomputed === token.authReportHash;
      base.checks.reportHashMatch = {
        passed: hashOk,
        detail: hashOk
          ? "Recomputed report hash matches the on-chain authReportHash."
          : `Report hash mismatch: recomputed ${recomputed} vs on-chain ${token.authReportHash}.`,
      };
    }
  }

  // 3. Reward NFT checks: verifyReveal recompute.
  if (token.kind === "reward-nft") {
    const reveal = await reader.getReveal(token.tokenId);
    if (!reveal) {
      base.checks.revealMatch = { passed: false, detail: "No reveal data found for this reward token." };
    } else {
      const r = await recomputeReveal(reveal);
      base.checks.revealMatch = {
        passed: r.rewardMatches,
        detail: r.rewardMatches
          ? `Reveal verified: commitment binds and recomputed rank ${r.rank} / rewardId matches the on-chain result.`
          : `Reveal MISMATCH (commitmentOk=${r.commitmentOk}, recomputed rank ${r.rank} vs observed ${reveal.observedRank}).`,
      };
    }
  }

  // 4. Overall verdict: every APPLICABLE check must pass.
  const applicable = Object.values(base.checks).filter((c) => c.passed !== null);
  base.verified = applicable.length > 0 && applicable.every((c) => c.passed === true);

  base.summary = buildSummary(base);
  return base;
}

function buildSummary(r: VerifyResult): string {
  const parts: string[] = [];
  parts.push(`Token ${r.resolvedTokenId} (${r.tokenKind}): ${r.verified ? "VERIFIED" : "NOT fully verified"}.`);
  if (r.checks.psaMatch.passed !== null) parts.push(`PSA match: ${r.checks.psaMatch.passed ? "yes" : "no"}.`);
  if (r.checks.reportHashMatch.passed !== null)
    parts.push(`Auth-report hash: ${r.checks.reportHashMatch.passed ? "valid" : "invalid"}.`);
  if (r.checks.revealMatch.passed !== null)
    parts.push(`verifyReveal: ${r.checks.revealMatch.passed ? "pass" : "fail"}.`);
  if (r.custodyState) parts.push(`Custody: ${r.custodyState} (${r.marketplaceTradable ? "tradable" : "not tradable"}).`);
  parts.push(`Provenance entries: ${r.provenance.length}.`);
  return parts.join(" ");
}

import { z } from "zod";

/**
 * Shared request/response schemas + types for the PackProof API.
 *
 * These are the SOURCE OF TRUTH for the wire contract between the API routes
 * (src/app/api/**) and the frontend components. Frontend imports the inferred
 * types; routes parse inputs with the zod schemas. Keep them in one place so
 * client and server can never drift.
 */

export const custodyTierSchema = z.enum(["custodial", "non-custodial"]);
export type CustodyTier = z.infer<typeof custodyTierSchema>;

export const slabImageSchema = z.object({
  side: z.string().min(1),
  data: z.string().min(1),
  mime: z.string().optional(),
});
export type SlabImage = z.infer<typeof slabImageSchema>;

// --- /api/register ----------------------------------------------------------
export const registerRequestSchema = z.object({
  certNumber: z.string().trim().optional(),
  custodyTier: custodyTierSchema,
  images: z.array(slabImageSchema).min(1).max(4),
  jurisdiction: z.string().optional(),
  /** opaque submitter id (email/account) for compliance screening. */
  submitterId: z.string().optional(),
});
export type RegisterRequest = z.infer<typeof registerRequestSchema>;

export type AgentSummary = {
  agent: string;
  label: string;
  status: "passed" | "warning" | "failed";
  score: number;
  summary: string;
  reasons: string[];
};

export type RegisterResponse = {
  ok: boolean;
  /** overall outcome of the authentication gate. */
  verdict: "approved" | "rejected" | "manual_review";
  message: string;
  certNumber: string;
  cardLabel: string | null;
  grade: number | null;
  custodyTier: CustodyTier;
  valuation: { lowUsd: number; highUsd: number; estimateUsd: number } | null;
  /** content hash of the authentication report written on-chain. */
  reportHash: string;
  /** the on-chain attestation receipts (one per agent logged). */
  attestations: Array<{ agent: string; txHash: string; simulated: boolean; score: number }>;
  /** minted external-NFT receipt (present only when approved). */
  mint: { txHash: string; simulated: boolean; tokenId: string } | null;
  agents: AgentSummary[];
};

// --- /api/verify ------------------------------------------------------------
export const verifyRequestSchema = z
  .object({
    certNumber: z.string().trim().optional(),
    tokenId: z.string().trim().optional(),
    packTokenId: z.string().trim().optional(),
    /** the report JSON to re-hash and compare, if the caller has it. */
    report: z.unknown().optional(),
    expectedReportHash: z.string().optional(),
  })
  .refine((v) => v.certNumber || v.tokenId || v.packTokenId, {
    message: "Provide certNumber, tokenId, or packTokenId.",
  });
export type VerifyRequest = z.infer<typeof verifyRequestSchema>;

export type VerifyResponse = {
  ok: boolean;
  checks: Array<{ name: string; pass: boolean | null; detail: string }>;
  psaMatch: boolean | null;
  reportHashVerified: boolean | null;
  revealVerified: boolean | null;
  provenance: Array<{ event: string; detail: string }>;
};

// --- /api/packs -------------------------------------------------------------
export type PackView = {
  id: string;
  name: string;
  priceMnt: string;
  remaining: number;
  total: number;
  healthScore: number;
  inventoryRoot: string;
  probabilityHash: string;
  status: string;
  odds: Array<{ rank: string; label: string; odds: string; estimatedValue: string }>;
};

export type PacksResponse = { packs: PackView[] };

// --- /api/packs/[id]/open ---------------------------------------------------
export const openPackRequestSchema = z.object({
  /** sealed pack-token id owned by the user (simulated id in demo). */
  packTokenId: z.string().trim().optional(),
  /** user-provided salt for commit-reveal; hex or arbitrary string. */
  userSalt: z.string().optional(),
});
export type OpenPackRequest = z.infer<typeof openPackRequestSchema>;

export type OpenPackResponse = {
  ok: boolean;
  packId: string;
  rank: string;
  rewardLabel: string;
  estimatedValue: string;
  rewardTokenId: string;
  purchase: { txHash: string; simulated: boolean } | null;
  reveal: { txHash: string; simulated: boolean };
  /** the commitment + salt so the result can be independently re-verified. */
  commitment: { probabilityHash: string; userSalt: string };
};

// --- /api/marketplace/list --------------------------------------------------
export const listRequestSchema = z.object({
  tokenId: z.string().trim().min(1),
  priceMnt: z.string().trim().min(1),
  custodyTier: custodyTierSchema,
});
export type ListRequest = z.infer<typeof listRequestSchema>;

export type Listing = {
  tokenId: string;
  cardLabel: string;
  grade: number;
  priceMnt: string;
  custodyTier: CustodyTier;
  reportHash: string;
};

export type ListResponse =
  | { ok: true; listing: Listing }
  | { ok: false; error: string };

export type MarketplaceResponse = { listings: Listing[] };

/** Standard error body. */
export type ApiError = { ok: false; error: string };

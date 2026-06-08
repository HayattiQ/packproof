import type { OcrResult, ImageMatchResult, ValuationResult } from "@/lib/ai/types";
import type { PsaCertRecord } from "@/lib/psa/types";

/** Custody tiers — mirrors the on-chain custody state. */
export type CustodyTier = "custodial" | "non-custodial";

/** Overall pipeline verdict driving tokenization eligibility. */
export type AuthVerdict = "approved" | "rejected" | "manual_review";

/** Output of the Authentication Agent. */
export type AuthenticationResult = {
  agent: "authentication";
  verdict: AuthVerdict;
  /** 0..100 integer score written on-chain (recordAgentLog). */
  score: number;
  certNumber: string;
  /** whether PSA cross-check resolved AND matched the photo identity/grade. */
  psaResolved: boolean;
  identityMatch: boolean;
  gradeMatch: boolean;
  counterfeitRisk: number;
  reasons: string[];
  ocr: OcrResult;
  imageMatch: ImageMatchResult;
  psaRecord: PsaCertRecord | null;
};

/** Output of the Pricing Agent. */
export type PricingResult = {
  agent: "pricing";
  score: number;
  lowUsd: number;
  highUsd: number;
  estimateUsd: number;
  confidence: number;
  compCount: number;
  reasons: string[];
};

/** Output of the Compliance Agent. */
export type ComplianceResult = {
  agent: "compliance";
  score: number;
  /** whether registration may proceed without manual compliance intervention. */
  clear: boolean;
  enhancedKycRequired: boolean;
  jurisdictionBlocked: boolean;
  sanctionsFlag: boolean;
  reasons: string[];
};

/** Output of the Fairness Monitor (operates over pack reveal history). */
export type FairnessResult = {
  agent: "fairness";
  score: number;
  healthy: boolean;
  observedDistribution: Record<string, number>;
  expectedDistribution: Record<string, number>;
  /** chi-square-like divergence metric; lower is healthier. */
  divergence: number;
  reasons: string[];
};

/** The full structured authentication report whose hash is written on-chain. */
export type AuthenticationReport = {
  version: string;
  certNumber: string;
  custodyTier: CustodyTier;
  createdAt: string;
  authentication: AuthenticationResult;
  pricing: PricingResult;
  compliance: ComplianceResult;
  /** the model/version provenance of each agent's adapters. */
  provenance: { ocr: string; psa: string; imageMatch: string; valuation: string };
};

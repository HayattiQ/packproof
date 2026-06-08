import type { ComplianceResult } from "@/lib/agents/types";

/**
 * Compliance Agent — AI-assisted AML / sanctions / jurisdiction screening.
 *
 * - Blocks restricted jurisdictions (COMPLIANCE_RESTRICTED_JURISDICTIONS).
 * - Flags enhanced-KYC when the asset value is at/above a configurable USD
 *   threshold (COMPLIANCE_ENHANCED_KYC_USD_THRESHOLD).
 * - Surfaces a sanctions flag from a deterministic screen of the submitter id
 *   (placeholder for a real sanctions-list lookup) and any upstream
 *   counterfeit/fraud signal.
 *
 * Deterministic and offline; no network. Returns `clear=false` when manual
 * intervention is required (blocked jurisdiction or sanctions hit).
 */
export function runCompliance(input: {
  jurisdiction?: string;
  /** opaque submitter identifier (email/account id); screened, never stored raw here. */
  submitterId?: string;
  valueUsd: number;
  /** upstream counterfeit risk from the Authentication Agent, 0..1. */
  counterfeitRisk: number;
}): ComplianceResult {
  const restricted = (process.env.COMPLIANCE_RESTRICTED_JURISDICTIONS || "IR,KP,SY,CU")
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);
  const threshold = Number(process.env.COMPLIANCE_ENHANCED_KYC_USD_THRESHOLD || "5000");

  const jurisdiction = (input.jurisdiction || "").toUpperCase();
  const jurisdictionBlocked = jurisdiction !== "" && restricted.includes(jurisdiction);
  const enhancedKycRequired = input.valueUsd >= threshold;

  // Placeholder deterministic sanctions screen: a real impl would hit an OFAC /
  // sanctions list. Flag a fixed pattern so the path is demonstrable.
  const sanctionsFlag = /(?:^|\b)(sanction|ofac|blocked)\b/i.test(input.submitterId || "");

  const reasons: string[] = [];
  if (jurisdictionBlocked) reasons.push(`Registration from restricted jurisdiction ${jurisdiction} is blocked.`);
  if (enhancedKycRequired)
    reasons.push(
      `Asset value $${input.valueUsd.toLocaleString()} meets the $${threshold.toLocaleString()} enhanced-KYC threshold.`,
    );
  if (sanctionsFlag) reasons.push("Submitter matched a sanctions-screen pattern; manual review required.");
  if (input.counterfeitRisk >= 0.45) reasons.push("Upstream counterfeit signal escalated to compliance.");
  if (reasons.length === 0) reasons.push("No AML / sanctions / jurisdiction flags raised.");

  const clear = !jurisdictionBlocked && !sanctionsFlag;
  // Score: full marks when clear and no enhanced-KYC; deductions otherwise.
  let score = 100;
  if (enhancedKycRequired) score -= 15;
  if (!clear) score = Math.min(score, 30);
  if (input.counterfeitRisk >= 0.45) score = Math.min(score, 25);

  return {
    agent: "compliance",
    score: Math.max(0, score),
    clear,
    enhancedKycRequired,
    jurisdictionBlocked,
    sanctionsFlag,
    reasons,
  };
}

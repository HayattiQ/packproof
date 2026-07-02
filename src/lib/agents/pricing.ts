import type { PricingResult } from "@/lib/agents/types";
import { getValuationAdapter } from "@/lib/ai";

/**
 * Pricing Agent — confidence-banded valuation from comparables.
 *
 * Feeds marketplace pricing and collateral logic. Always returns a RANGE, never
 * a guaranteed price (accuracy guardrail). Score reflects valuation confidence.
 */
export async function runPricing(query: {
  certNumber?: string;
  cardLabel: string;
  grade: number;
}): Promise<PricingResult> {
  const v = await getValuationAdapter().estimate(query);
  const reasons = [
    v.compCount > 0
      ? `Estimated from ${v.compCount} comparable recent sale(s) for ${query.cardLabel} (grade ${query.grade}).`
      : `No exact comparables found; estimate derived from a model baseline for grade ${query.grade}.`,
    `Value range $${v.lowUsd.toLocaleString()} – $${v.highUsd.toLocaleString()} (point estimate $${v.estimateUsd.toLocaleString()}).`,
    "Range is decision-support, not a guaranteed price.",
  ];
  return {
    agent: "pricing",
    score: Math.round(v.confidence * 100),
    lowUsd: v.lowUsd,
    highUsd: v.highUsd,
    estimateUsd: v.estimateUsd,
    confidence: v.confidence,
    compCount: v.compCount,
    reasons,
  };
}

import type { ValuationAdapter, ValuationQuery, ValuationResult } from "@/lib/ai/types";
import { seededRng } from "@/lib/ai/seed";

/**
 * Deterministic valuation mock with NO comps table.
 *
 * Derives a stable point estimate from the card identity + grade, then widens
 * it into a confidence band. Always returns a value range (never a guaranteed
 * price), matching the accuracy-guardrail requirement. Pure, no network.
 */
export class MockValuationAdapter implements ValuationAdapter {
  readonly name = "valuation:mock";

  async estimate(query: ValuationQuery): Promise<ValuationResult> {
    const seed = `${query.cardLabel}#${query.grade}`;
    const rng = seededRng(seed);
    // Grade strongly scales value; base in the low hundreds.
    const gradeMultiplier = Math.pow(1.9, query.grade - 6);
    const estimateUsd = Math.round((120 + rng() * 480) * Math.max(0.5, gradeMultiplier));
    const spread = 0.18 + rng() * 0.12;
    const lowUsd = Math.round(estimateUsd * (1 - spread));
    const highUsd = Math.round(estimateUsd * (1 + spread));
    return {
      lowUsd,
      highUsd,
      estimateUsd,
      confidence: 0.6 + rng() * 0.2,
      compCount: 0,
      source: this.name,
    };
  }
}

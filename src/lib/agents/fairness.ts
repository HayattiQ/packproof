import type { FairnessResult } from "@/lib/agents/types";

/**
 * Fairness Monitor — analyzes pack reveal history for abnormal distributions.
 *
 * Given observed reveal counts per rank and the published (expected) odds, it
 * computes a chi-square-like divergence and flags the pack as unhealthy when the
 * divergence exceeds a threshold scaled by sample size. Deterministic, offline.
 */

const RANKS = ["S", "A", "B", "C"] as const;
export type Rank = (typeof RANKS)[number];

/** Published odds for the demo pack (must sum to 1). */
export const PUBLISHED_ODDS: Record<Rank, number> = {
  S: 0.01,
  A: 0.06,
  B: 0.23,
  C: 0.7,
};

export function runFairness(input: {
  /** observed reveal counts by rank. */
  observed: Partial<Record<Rank, number>>;
  /** expected odds (defaults to the published odds). */
  expected?: Record<Rank, number>;
}): FairnessResult {
  const expected = input.expected ?? PUBLISHED_ODDS;
  const observed: Record<string, number> = {};
  let total = 0;
  for (const r of RANKS) {
    observed[r] = input.observed[r] ?? 0;
    total += observed[r];
  }

  let divergence = 0;
  if (total > 0) {
    for (const r of RANKS) {
      const exp = expected[r] * total;
      if (exp > 0) {
        divergence += Math.pow(observed[r] - exp, 2) / exp;
      }
    }
  }

  // Chi-square critical value for 3 dof at ~p=0.05 is ~7.81; require a minimum
  // sample before flagging so small samples are not penalized.
  const healthy = total < 30 || divergence <= 7.81;
  const reasons = [
    `Observed ${total} reveal(s); chi-square divergence ${divergence.toFixed(2)} (3 dof).`,
    total < 30
      ? "Sample below 30 reveals; distribution not yet conclusive."
      : healthy
        ? "Reveal distribution is within expected bounds for the published odds."
        : "Reveal distribution diverges significantly from published odds; investigate.",
  ];
  const score = Math.max(0, Math.min(100, Math.round(100 - divergence * 4)));

  return {
    agent: "fairness",
    score,
    healthy,
    observedDistribution: observed,
    expectedDistribution: expected as Record<string, number>,
    divergence,
    reasons,
  };
}

import { NextResponse } from "next/server";
import type { PacksResponse } from "@/lib/http/responses";
import { PACKS } from "@/lib/packproof-data";
import { runFairness, type Rank } from "@/lib/agents/fairness";
import { revealCounts } from "@/lib/packproof-data";

export const runtime = "nodejs";

/**
 * GET /api/packs
 *
 * Lists the live provably-fair packs (the design's pack picker). The "health
 * score" is produced by the Fairness Monitor over the observed reveal history
 * (live), not a static constant, and shared across the live packs.
 */
export async function GET() {
  const fairness = runFairness({ observed: revealCounts() as Partial<Record<Rank, number>> });
  const response: PacksResponse = {
    packs: PACKS.map((p) => ({ ...p, healthScore: fairness.score })),
  };
  return NextResponse.json(response);
}

import { NextResponse } from "next/server";
import type { PacksResponse } from "@/lib/http/responses";
import { FEATURED_PACK } from "@/lib/packproof-data";
import { runFairness, type Rank } from "@/lib/agents/fairness";
import { revealCounts } from "@/lib/packproof-data";

export const runtime = "nodejs";

/**
 * GET /api/packs
 *
 * Lists the live provably-fair packs. The pack's "health score" is now produced
 * by the Fairness Monitor over the observed reveal history (live), not a static
 * constant.
 */
export async function GET() {
  const fairness = runFairness({ observed: revealCounts() as Partial<Record<Rank, number>> });
  const response: PacksResponse = {
    packs: [{ ...FEATURED_PACK, healthScore: fairness.score }],
  };
  return NextResponse.json(response);
}

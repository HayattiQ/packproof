import type { ValuationAdapter, ValuationQuery, ValuationResult } from "@/lib/ai/types";
import { MockValuationAdapter } from "@/lib/ai/valuation/mock";
import compsTable from "@/lib/ai/valuation/comps-table.json";

type CompRow = { certNumber?: string; cardLabel: string; grade: number; salesUsd: number[] };
type CompsTable = { comps: CompRow[]; defaultBaselineUsd: number };

const table = compsTable as CompsTable;

/**
 * Comparable-sales valuation adapter.
 *
 * Looks up recent comparable sales for the exact card+grade in a bundled comps
 * table (a realistic best-effort offline data source — no network). The point
 * estimate is the median of comparables; the band is the inter-quartile-ish
 * min/max. Falls back to the deterministic mock when no comps exist for the
 * card+grade, so it always returns a range.
 */
export class CompsValuationAdapter implements ValuationAdapter {
  readonly name = "valuation:comps";
  private fallback = new MockValuationAdapter();

  async estimate(query: ValuationQuery): Promise<ValuationResult> {
    const cert = query.certNumber?.replace(/\D/g, "");
    const row = table.comps.find((c) => cert && c.certNumber === cert)
      ?? table.comps.find((c) => c.cardLabel === query.cardLabel && c.grade === query.grade);
    if (!row || row.salesUsd.length === 0) {
      return this.fallback.estimate(query);
    }
    const sales = [...row.salesUsd].sort((a, b) => a - b);
    const estimateUsd = Math.round(median(sales));
    const lowUsd = sales[0];
    const highUsd = sales[sales.length - 1];
    // Confidence rises with comp count, capped.
    const confidence = Math.min(0.95, 0.55 + sales.length * 0.08);
    return {
      lowUsd,
      highUsd,
      estimateUsd,
      confidence,
      compCount: sales.length,
      source: this.name,
    };
  }
}

function median(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

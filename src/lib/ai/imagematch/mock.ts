import type { ImageMatchAdapter, ImageMatchQuery, ImageMatchResult } from "@/lib/ai/types";
import { fnv1a32, seededRng } from "@/lib/ai/seed";

/**
 * Deterministic image-match mock.
 *
 * Produces a stable similarity / counterfeit-risk score from the cert number
 * and the image bytes. A small deterministic slice of cert numbers (those whose
 * hash falls in a fixed band) is treated as "altered slab" so tests can assert
 * the authentication gate REJECTS high-counterfeit-risk submissions without any
 * real CV. Pure, no network.
 */
export class MockImageMatchAdapter implements ImageMatchAdapter {
  readonly name = "imagematch:mock";

  async match(query: ImageMatchQuery): Promise<ImageMatchResult> {
    const seed = `${query.certNumber}|${query.images.map((i) => i.data.slice(0, 48)).join(",")}`;
    const rng = seededRng(seed);
    // Base similarity high; deterministically degrade a slice to simulate fakes.
    const band = fnv1a32(query.certNumber) % 100;
    const suspicious = band < 8; // ~8% deterministically flagged as altered
    const base = suspicious ? 0.35 + rng() * 0.2 : 0.86 + rng() * 0.12;
    const similarity = Math.min(0.99, base);
    const counterfeitRisk = Math.max(0, Math.min(1, 1 - similarity));
    const notes = [
      `Compared ${query.images.length} submitted face(s) against ${query.referenceImageUrls.length} reference image(s).`,
      suspicious
        ? "Label font kerning and holo position diverge from the reference; flag for manual review."
        : "Slab label layout, font, and holo position are consistent with the reference.",
    ];
    return { similarity, counterfeitRisk, notes, source: this.name };
  }
}

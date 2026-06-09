/**
 * Adapter interfaces for the PackProof AI pipeline.
 *
 * Each capability (OCR, PSA cross-check, image match, valuation) is defined as
 * an interface with TWO implementations:
 *   - a deterministic MOCK (default; pure function of inputs, no network)
 *   - a real, best-effort adapter selected via PACKPROOF_ADAPTERS.
 *
 * The agents (authentication / pricing / compliance / fairness) compose these
 * adapters and never call a vendor SDK directly.
 */

/** A submitted slab photo. `data` is a base64 (no data: prefix) or data URL. */
export type SlabImage = {
  /** e.g. "front" | "back" — free-form label for which face was photographed. */
  side: string;
  /** base64-encoded bytes (with or without a data: URL prefix). */
  data: string;
  /** optional original filename / mime hint. */
  mime?: string;
};

/** Structured fields read off the slab label by OCR. */
export type OcrResult = {
  certNumber: string | null;
  grade: number | null;
  /** e.g. "GEM MT", "MINT" — PSA flatlabel qualifier text. */
  gradeLabel: string | null;
  /** human-readable card label line(s), e.g. "2003 SP Authentic LeBron James". */
  cardLabel: string | null;
  /** OCR confidence 0..1. */
  confidence: number;
  /** which adapter produced this (for the on-chain report + audit). */
  source: string;
};

export interface OcrAdapter {
  readonly name: string;
  extract(images: SlabImage[]): Promise<OcrResult>;
}

/** PSA registry record + image match result types live in their own module. */

/** Comparable-sale-derived value range. */
export type ValuationResult = {
  /** lower bound of the estimated fair-value range, in USD. */
  lowUsd: number;
  /** upper bound, in USD. */
  highUsd: number;
  /** point estimate (typically the median of comparables), in USD. */
  estimateUsd: number;
  /** 0..1 confidence in the range. */
  confidence: number;
  /** number of comparable sales backing the estimate. */
  compCount: number;
  source: string;
};

export type ValuationQuery = {
  /** normalized card identity, e.g. "2003 SP Authentic LeBron James #195". */
  cardLabel: string;
  grade: number;
};

export interface ValuationAdapter {
  readonly name: string;
  estimate(query: ValuationQuery): Promise<ValuationResult>;
}

/** Image-match (counterfeit / altered-slab) signal. */
export type ImageMatchResult = {
  /** 0..1 — how well the submitted slab matches the expected reference. */
  similarity: number;
  /** 0..1 — derived risk that the slab is counterfeit / altered (1 - similarity, adjusted). */
  counterfeitRisk: number;
  /** human-readable notes on what was checked. */
  notes: string[];
  source: string;
};

export type ImageMatchQuery = {
  images: SlabImage[];
  /** reference image URL(s) from the PSA registry, if any. */
  referenceImageUrls: string[];
  certNumber: string;
};

export interface ImageMatchAdapter {
  readonly name: string;
  match(query: ImageMatchQuery): Promise<ImageMatchResult>;
}

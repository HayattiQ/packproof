/**
 * PSA public cert-verification registry adapter.
 *
 * The PSA cross-check is AUTHORITATIVE in the authentication pipeline: a cert
 * that does not resolve, or whose record contradicts the OCR/photo, is rejected
 * regardless of AI optimism (requirements §"AI authentication pipeline").
 */

/** A registry record as returned by PSA's public cert lookup (normalized). */
export type PsaCertRecord = {
  certNumber: string;
  /** normalized card identity line, e.g. "2003 SP Authentic #195 LeBron James RC". */
  cardLabel: string;
  /** numeric grade 1..10. */
  grade: number;
  /** grade qualifier label, e.g. "GEM MT". */
  gradeLabel: string;
  /** brand / set, e.g. "SP Authentic". */
  brand: string;
  /** year of the card. */
  year: number;
  /** reference image URLs from the registry, if published. */
  referenceImageUrls: string[];
};

export type PsaLookupResult =
  | { found: true; record: PsaCertRecord; source: string }
  | { found: false; reason: string; source: string };

export interface PsaAdapter {
  readonly name: string;
  lookup(certNumber: string): Promise<PsaLookupResult>;
}

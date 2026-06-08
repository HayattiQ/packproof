import type { PsaAdapter, PsaCertRecord, PsaLookupResult } from "@/lib/psa/types";
import { PSA_FIXTURES } from "@/lib/psa/fixtures";
import { fnv1a32, seededPick } from "@/lib/ai/seed";

const SAMPLE_LABELS = [
  "2003 SP Authentic #195 LeBron James RC",
  "1999 Pokemon Base Set #4 Charizard Holo",
  "1986 Fleer #57 Michael Jordan RC",
  "2018 Panini Prizm #280 Luka Doncic RC",
] as const;

/**
 * Deterministic PSA mock.
 *
 * - Known fixture cert numbers resolve to their canonical record.
 * - Cert numbers ending in "0000000" (a deterministic, easy-to-type pattern)
 *   are treated as NOT FOUND so the rejection path is exercisable on demand.
 * - Any other numeric cert resolves to a deterministically-derived record so
 *   the mock OCR's fabricated certs still cross-check. Pure, no network.
 */
export class MockPsaAdapter implements PsaAdapter {
  readonly name = "psa:mock";

  async lookup(certNumber: string): Promise<PsaLookupResult> {
    const cert = certNumber.trim();
    if (!/^\d{4,}$/.test(cert)) {
      return { found: false, reason: "Cert number is not a valid PSA numeric cert.", source: this.name };
    }
    if (PSA_FIXTURES[cert]) {
      return { found: true, record: PSA_FIXTURES[cert], source: this.name };
    }
    if (cert.endsWith("0000000")) {
      return { found: false, reason: "Cert number does not resolve in the PSA registry.", source: this.name };
    }
    const seed = `psa:${cert}`;
    const cardLabel = seededPick(seed, SAMPLE_LABELS);
    const grade = [10, 9, 9, 8, 7][fnv1a32(seed + ":g") % 5];
    const record: PsaCertRecord = {
      certNumber: cert,
      cardLabel,
      grade,
      gradeLabel: grade === 10 ? "GEM MT" : grade === 9 ? "MINT" : grade === 8 ? "NM-MT" : "NM",
      brand: cardLabel.split(" ").slice(1, 3).join(" "),
      year: Number(cardLabel.slice(0, 4)) || 2000,
      referenceImageUrls: [`https://example.invalid/psa/${cert}/front.jpg`],
    };
    return { found: true, record, source: this.name };
  }
}

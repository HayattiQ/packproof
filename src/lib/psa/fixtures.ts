import type { PsaCertRecord } from "@/lib/psa/types";

/**
 * A small set of fixed PSA registry records used by the mock adapter and tests.
 * Keyed by cert number. These mirror the sample cards the OCR mock can emit so
 * the end-to-end mock pipeline produces internally-consistent records.
 *
 * Legal note: synthetic / placeholder records for demo use only; PackProof
 * claims no affiliation with or endorsement by PSA.
 */
export const PSA_FIXTURES: Record<string, PsaCertRecord> = {
  "20003195": {
    certNumber: "20003195",
    cardLabel: "2003 SP Authentic #195 LeBron James RC",
    grade: 10,
    gradeLabel: "GEM MT",
    brand: "SP Authentic",
    year: 2003,
    referenceImageUrls: [
      "https://example.invalid/psa/20003195/front.jpg",
      "https://example.invalid/psa/20003195/back.jpg",
    ],
  },
  "19994004": {
    certNumber: "19994004",
    cardLabel: "1999 Pokemon Base Set #4 Charizard Holo",
    grade: 9,
    gradeLabel: "MINT",
    brand: "Pokemon Base Set",
    year: 1999,
    referenceImageUrls: ["https://example.invalid/psa/19994004/front.jpg"],
  },
  "19860057": {
    certNumber: "19860057",
    cardLabel: "1986 Fleer #57 Michael Jordan RC",
    grade: 9,
    gradeLabel: "MINT",
    brand: "Fleer",
    year: 1986,
    referenceImageUrls: ["https://example.invalid/psa/19860057/front.jpg"],
  },
};

/** Cert numbers a verifier can use for a guaranteed-resolving demo. */
export const PSA_DEMO_CERTS = Object.keys(PSA_FIXTURES);

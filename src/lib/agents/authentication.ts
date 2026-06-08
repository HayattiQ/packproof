import type { AuthenticationResult } from "@/lib/agents/types";
import type { SlabImage } from "@/lib/ai/types";
import { getImageMatchAdapter, getOcrAdapter } from "@/lib/ai";
import { getPsaAdapter } from "@/lib/psa";

/**
 * Authentication Agent — gatekeeps tokenization.
 *
 * Runs all four pipeline stages in order: OCR -> PSA cross-check ->
 * image-match -> (valuation runs in the Pricing Agent). It decides eligibility:
 *
 *   - PSA cross-check is AUTHORITATIVE. A cert that does not resolve, or whose
 *     registry identity/grade contradicts the photo, is REJECTED regardless of
 *     AI confidence.
 *   - A counterfeit-risk above HARD_REJECT_RISK is REJECTED.
 *   - A counterfeit-risk in [REVIEW_RISK, HARD_REJECT_RISK) routes to
 *     manual_review (human confirmation required before mint).
 *   - Otherwise APPROVED.
 *
 * The gate logic is explicit and unit-tested (authentication-gate.test.ts).
 */

export const REVIEW_RISK = 0.2;
export const HARD_REJECT_RISK = 0.45;

export type AuthenticationInput = {
  images: SlabImage[];
  /** cert number the user typed; preferred over OCR when present. */
  declaredCertNumber?: string;
};

export async function runAuthentication(
  input: AuthenticationInput,
): Promise<AuthenticationResult> {
  const ocr = await getOcrAdapter().extract(input.images);

  const certNumber = (input.declaredCertNumber || ocr.certNumber || "").trim();
  const reasons: string[] = [];

  const psaResult = await getPsaAdapter().lookup(certNumber);
  const psaResolved = psaResult.found;
  const psaRecord = psaResult.found ? psaResult.record : null;

  if (!certNumber) {
    reasons.push("No cert number was provided or could be read from the photo.");
  }
  if (!psaResolved) {
    reasons.push(
      psaResult.found === false
        ? `PSA cross-check failed: ${psaResult.reason}`
        : "PSA cross-check failed.",
    );
  }

  // Identity / grade match vs OCR.
  //
  // PSA is the authoritative identity/grade source. OCR is decision-support.
  // We only treat an OCR/PSA divergence as a CONTRADICTION (a rejection signal)
  // when OCR was the SOURCE of the cert number (the user did not type it) — i.e.
  // when both OCR and PSA are describing the same photographed slab and disagree.
  // When the user typed the cert and it resolves, PSA stands and OCR cannot
  // override it (requirement: "a failed PSA cross-check is authoritative and
  // overrides AI optimism"; conversely AI noise must not override PSA).
  let identityMatch = false;
  let gradeMatch = false;
  if (psaRecord) {
    const certFromOcr = !input.declaredCertNumber;
    const ocrIdentityDiffers =
      certFromOcr &&
      !!ocr.cardLabel &&
      !normalize(ocr.cardLabel).includes(keyToken(psaRecord.cardLabel)) &&
      !normalize(psaRecord.cardLabel).includes(keyToken(ocr.cardLabel));
    const ocrGradeDiffers = certFromOcr && ocr.grade != null && ocr.grade !== psaRecord.grade;

    identityMatch = !ocrIdentityDiffers;
    gradeMatch = !ocrGradeDiffers;
    if (!identityMatch) {
      reasons.push("Photo card identity does not match the PSA registry record.");
    }
    if (!gradeMatch) {
      reasons.push(
        `Photo grade (${ocr.grade}) contradicts PSA registry grade (${psaRecord.grade}).`,
      );
    }
  }

  const imageMatch = await getImageMatchAdapter().match({
    images: input.images,
    referenceImageUrls: psaRecord?.referenceImageUrls ?? [],
    certNumber: certNumber || "unknown",
  });
  reasons.push(...imageMatch.notes);

  // --- Explicit eligibility gate -------------------------------------------
  let verdict: AuthenticationResult["verdict"];
  if (!certNumber || !psaResolved || !identityMatch || !gradeMatch) {
    verdict = "rejected"; // PSA authority overrides AI optimism.
  } else if (imageMatch.counterfeitRisk >= HARD_REJECT_RISK) {
    verdict = "rejected";
    reasons.push("Counterfeit risk above hard-reject threshold.");
  } else if (imageMatch.counterfeitRisk >= REVIEW_RISK) {
    verdict = "manual_review";
    reasons.push("Counterfeit risk in the manual-review band; human confirmation required.");
  } else {
    verdict = "approved";
  }

  // Score: 0..100. Anchored by PSA resolution + inverse counterfeit risk.
  const base = psaResolved && identityMatch && gradeMatch ? 70 : 0;
  const riskComponent = Math.round((1 - imageMatch.counterfeitRisk) * 30);
  const score = Math.max(0, Math.min(100, base + riskComponent));

  return {
    agent: "authentication",
    verdict,
    score,
    certNumber,
    psaResolved,
    identityMatch,
    gradeMatch,
    counterfeitRisk: imageMatch.counterfeitRisk,
    reasons,
    ocr,
    imageMatch,
    psaRecord,
  };
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

/** A compact identity token (longest word) for loose matching. */
function keyToken(label: string): string {
  const words = normalize(label).split(" ").filter((w) => w.length > 3);
  return words.sort((a, b) => b.length - a.length)[0] ?? normalize(label);
}

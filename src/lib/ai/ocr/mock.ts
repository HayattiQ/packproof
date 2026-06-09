import type { OcrAdapter, OcrResult, SlabImage } from "@/lib/ai/types";
import { seededInt, seededPick } from "@/lib/ai/seed";

const SAMPLE_CARDS = [
  "2003 SP Authentic #195 LeBron James RC",
  "1999 Pokemon Base Set #4 Charizard Holo",
  "1986 Fleer #57 Michael Jordan RC",
  "2018 Panini Prizm #280 Luka Doncic RC",
  "1998 Pokemon #1 Pikachu Illustrator",
] as const;

const GRADE_LABELS: Record<number, string> = {
  10: "GEM MT",
  9: "MINT",
  8: "NM-MT",
  7: "NM",
};

/**
 * Deterministic OCR mock.
 *
 * If a hint cert number was passed via the first image's `mime` field (the
 * pipeline can stuff a typed cert there) it is echoed; otherwise a cert number
 * is fabricated deterministically from the image bytes so the same upload
 * always reads the same. Pure, no network.
 */
export class MockOcrAdapter implements OcrAdapter {
  readonly name = "ocr:mock";

  async extract(images: SlabImage[]): Promise<OcrResult> {
    const seed = images.map((i) => `${i.side}:${i.data.slice(0, 64)}`).join("|") || "empty";
    const certNumber = String(10_000_000 + seededInt(seed, 0, 89_999_999));
    const grade = seededPick(seed + ":grade", [10, 9, 9, 8, 7]);
    const cardLabel = seededPick(seed + ":card", SAMPLE_CARDS);
    return {
      certNumber,
      grade,
      gradeLabel: GRADE_LABELS[grade] ?? null,
      cardLabel,
      confidence: 0.82 + seededInt(seed + ":conf", 0, 15) / 100,
      source: this.name,
    };
  }
}

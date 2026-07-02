import { describe, it, expect } from "vitest";
import { MockOcrAdapter } from "@/lib/ai/ocr/mock";
import { MockImageMatchAdapter } from "@/lib/ai/imagematch/mock";
import { MockValuationAdapter } from "@/lib/ai/valuation/mock";
import { CompsValuationAdapter } from "@/lib/ai/valuation/comps";
import { MockPsaAdapter } from "@/lib/psa/mock";
import { REGISTER_DEMO_ASSETS } from "@/lib/register-demo-assets";
import type { SlabImage } from "@/lib/ai/types";

const images: SlabImage[] = [{ side: "front", data: "AAAABBBBCCCC" }];

describe("mock adapters are deterministic", () => {
  it("OCR returns the same result for the same input", async () => {
    const a = new MockOcrAdapter();
    const r1 = await a.extract(images);
    const r2 = await a.extract(images);
    expect(r1).toEqual(r2);
    expect(r1.certNumber).toMatch(/^\d+$/);
    expect(r1.grade).toBeGreaterThanOrEqual(7);
  });

  it("image-match returns stable similarity and a counterfeit band", async () => {
    const a = new MockImageMatchAdapter();
    const r = await a.match({ images, referenceImageUrls: ["x"], certNumber: "12345678" });
    expect(r.similarity).toBeGreaterThan(0);
    expect(r.counterfeitRisk).toBeCloseTo(1 - r.similarity, 5);
  });

  it("valuation mock always returns a range with low <= estimate <= high", async () => {
    const a = new MockValuationAdapter();
    const r = await a.estimate({ cardLabel: "Test Card", grade: 9 });
    expect(r.lowUsd).toBeLessThanOrEqual(r.estimateUsd);
    expect(r.estimateUsd).toBeLessThanOrEqual(r.highUsd);
  });

  it("comps valuation uses the table for a known card", async () => {
    const a = new CompsValuationAdapter();
    const r = await a.estimate({ cardLabel: "1986 Fleer #57 Michael Jordan RC", grade: 10 });
    expect(r.compCount).toBeGreaterThan(0);
    expect(r.source).toBe("valuation:comps");
  });

  it("uses cert-specific comps for register demo assets", async () => {
    const a = new CompsValuationAdapter();
    for (const asset of REGISTER_DEMO_ASSETS) {
      const r = await a.estimate({
        certNumber: asset.certNumber,
        cardLabel: asset.cardLabel,
        grade: asset.grade,
      });
      expect(r.compCount, asset.id).toBeGreaterThan(0);
      expect(r.source, asset.id).toBe("valuation:comps");
      expect(r.highUsd, asset.id).toBeLessThan(300);
    }
  });

  it("PSA mock resolves fixtures and rejects the all-zeros pattern", async () => {
    const a = new MockPsaAdapter();
    const found = await a.lookup("20003195");
    expect(found.found).toBe(true);
    const missing = await a.lookup("10000000");
    expect(missing.found).toBe(false);
    const invalid = await a.lookup("abc");
    expect(invalid.found).toBe(false);
  });
});

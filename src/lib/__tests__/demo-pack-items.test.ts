import { describe, expect, it } from "vitest";
import { DEMO_PACK_ITEMS, pickDemoPackItem } from "@/lib/packproof-data";

describe("demo pack items", () => {
  it("keeps exactly ten PSA 10 items for the demo open pool", () => {
    expect(DEMO_PACK_ITEMS).toHaveLength(10);
    expect(new Set(DEMO_PACK_ITEMS.map((item) => item.id)).size).toBe(10);
    for (const item of DEMO_PACK_ITEMS) {
      expect(item.grade).toBe(10);
      expect(item.gradeLabel).toBe("GEM MT");
      expect(item.cardLabel).toBeTruthy();
      expect(item.imageUrl).toMatch(/^https:\/\/images\.pokemontcg\.io\/.+_hires\.png$/);
    }
  });

  it("selects a reproducible item from a hash seed", () => {
    const seed = "0x" + "f".repeat(64);
    expect(pickDemoPackItem(seed)).toBe(pickDemoPackItem(seed));
  });
});

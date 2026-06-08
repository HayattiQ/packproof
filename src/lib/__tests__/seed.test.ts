import { describe, it, expect } from "vitest";
import { fnv1a32, seededRng, seededInt, seededPick, shortHex } from "@/lib/ai/seed";

describe("seed helpers", () => {
  it("fnv1a32 is deterministic and stable", () => {
    expect(fnv1a32("packproof")).toBe(fnv1a32("packproof"));
    expect(fnv1a32("a")).not.toBe(fnv1a32("b"));
    expect(fnv1a32("")).toBeTypeOf("number");
  });

  it("seededRng is reproducible and stays in [0,1)", () => {
    const a = seededRng("x");
    const b = seededRng("x");
    for (let i = 0; i < 100; i++) {
      const v = a();
      expect(v).toBe(b());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("seededInt stays within bounds and is deterministic", () => {
    for (let i = 0; i < 50; i++) {
      const v = seededInt(`seed-${i}`, 5, 9);
      expect(v).toBeGreaterThanOrEqual(5);
      expect(v).toBeLessThanOrEqual(9);
    }
    expect(seededInt("k", 0, 100)).toBe(seededInt("k", 0, 100));
  });

  it("seededPick picks deterministically and throws on empty", () => {
    const items = ["a", "b", "c"] as const;
    expect(seededPick("p", items)).toBe(seededPick("p", items));
    expect(() => seededPick("p", [])).toThrow();
  });

  it("shortHex produces 8 hex chars", () => {
    expect(shortHex("hello")).toMatch(/^[0-9a-f]{8}$/);
  });
});

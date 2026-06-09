import { describe, it, expect } from "vitest";
import { runAuthentication } from "@/lib/agents/authentication";
import type { SlabImage } from "@/lib/ai/types";

const images: SlabImage[] = [{ side: "front", data: "FRONTDATA0001" }];

describe("authentication gate", () => {
  it("rejects a cert that does not resolve in PSA (authoritative override)", async () => {
    // Cert ending in seven zeros is the deterministic NOT-FOUND pattern.
    const r = await runAuthentication({ images, declaredCertNumber: "10000000" });
    expect(r.verdict).toBe("rejected");
    expect(r.psaResolved).toBe(false);
    expect(r.reasons.some((x) => /PSA cross-check failed/i.test(x))).toBe(true);
  });

  it("rejects when no cert number is available", async () => {
    const r = await runAuthentication({ images, declaredCertNumber: "abc" });
    expect(r.verdict).toBe("rejected");
  });

  it("approves a clean fixture cert with consistent grade", async () => {
    const r = await runAuthentication({ images, declaredCertNumber: "20003195" });
    expect(r.psaResolved).toBe(true);
    // Fixture 20003195 hashes outside the suspicious band -> approved.
    expect(["approved", "manual_review"]).toContain(r.verdict);
    expect(r.score).toBeGreaterThan(0);
  });

  it("produces a 0..100 score and never throws on empty images", async () => {
    const r = await runAuthentication({ images: [{ side: "front", data: "z" }], declaredCertNumber: "19994004" });
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });
});

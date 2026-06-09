import { describe, it, expect } from "vitest";
import { canonicalize, canonicalizeReport, reportHash, jsonHash } from "@/lib/agents/report";
import type { AuthenticationReport } from "@/lib/agents/types";

function sampleReport(): AuthenticationReport {
  return {
    version: "packproof-report/1",
    certNumber: "20003195",
    custodyTier: "custodial",
    createdAt: new Date(0).toISOString(),
    authentication: {
      agent: "authentication",
      verdict: "approved",
      score: 95,
      certNumber: "20003195",
      psaResolved: true,
      identityMatch: true,
      gradeMatch: true,
      counterfeitRisk: 0.05,
      reasons: ["ok"],
      ocr: { certNumber: "20003195", grade: 10, gradeLabel: "GEM MT", cardLabel: "x", confidence: 0.9, source: "ocr:mock" },
      imageMatch: { similarity: 0.95, counterfeitRisk: 0.05, notes: [], source: "imagematch:mock" },
      psaRecord: null,
    },
    pricing: {
      agent: "pricing",
      score: 80,
      lowUsd: 100,
      highUsd: 200,
      estimateUsd: 150,
      confidence: 0.8,
      compCount: 3,
      reasons: [],
    },
    compliance: {
      agent: "compliance",
      score: 100,
      clear: true,
      enhancedKycRequired: false,
      jurisdictionBlocked: false,
      sanctionsFlag: false,
      reasons: [],
    },
    provenance: { ocr: "ocr:mock", psa: "psa:mock", imageMatch: "imagematch:mock", valuation: "valuation:mock" },
  };
}

describe("report canonicalization + hashing", () => {
  it("canonicalize sorts object keys recursively", () => {
    const out = canonicalize({ b: 1, a: { d: 2, c: 3 } });
    expect(JSON.stringify(out)).toBe('{"a":{"c":3,"d":2},"b":1}');
  });

  it("canonicalize drops undefined values", () => {
    const out = canonicalize({ a: undefined, b: 2 }) as Record<string, unknown>;
    expect("a" in out).toBe(false);
    expect(out.b).toBe(2);
  });

  it("reportHash is a deterministic 0x keccak hash", () => {
    const r = sampleReport();
    const h1 = reportHash(r);
    const h2 = reportHash(r);
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("key ordering does not change the hash (canonical)", () => {
    const r = sampleReport();
    const reordered = JSON.parse(JSON.stringify({ ...r }));
    // swap top-level key order
    const shuffled = {
      provenance: reordered.provenance,
      certNumber: reordered.certNumber,
      version: reordered.version,
      compliance: reordered.compliance,
      createdAt: reordered.createdAt,
      pricing: reordered.pricing,
      custodyTier: reordered.custodyTier,
      authentication: reordered.authentication,
    } as AuthenticationReport;
    expect(reportHash(shuffled)).toBe(reportHash(r));
    expect(canonicalizeReport(shuffled)).toBe(canonicalizeReport(r));
  });

  it("a changed field changes the hash", () => {
    const r = sampleReport();
    const h1 = reportHash(r);
    r.pricing.estimateUsd = 999;
    expect(reportHash(r)).not.toBe(h1);
  });

  it("jsonHash is stable for equal inputs regardless of key order", () => {
    expect(jsonHash({ a: 1, b: 2 })).toBe(jsonHash({ b: 2, a: 1 }));
  });
});

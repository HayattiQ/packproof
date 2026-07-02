import type { PsaAdapter, PsaCertRecord, PsaLookupResult } from "@/lib/psa/types";
import { MockPsaAdapter } from "@/lib/psa/mock";

/**
 * Real best-effort PSA public cert-verification adapter.
 *
 * Server-only. Calls PSA's public API (GetByCertNumber-style endpoint) when
 * PSA_API_TOKEN is configured. On missing token, non-2xx, or parse failure it
 * falls back to the deterministic mock so the pipeline never throws. The exact
 * response shape varies by PSA API tier; we parse defensively.
 */
export class OfficialPsaAdapter implements PsaAdapter {
  readonly name = "psa:official";
  private fallback = new MockPsaAdapter();

  async lookup(certNumber: string): Promise<PsaLookupResult> {
    const token = process.env.PSA_API_TOKEN;
    if (!token) return this.fallback.lookup(certNumber);
    const base = process.env.PSA_API_BASE_URL || "https://api.psacard.com/publicapi";
    const cert = certNumber.trim();

    try {
      const res = await fetch(`${base}/cert/GetByCertNumber/${encodeURIComponent(cert)}`, {
        headers: { authorization: `Bearer ${token}`, accept: "application/json" },
      });
      if (res.status === 404) {
        return { found: false, reason: "Cert number does not resolve in the PSA registry.", source: this.name };
      }
      if (!res.ok) return this.fallback.lookup(certNumber);
      const json = (await res.json()) as {
        IsValidRequest?: boolean;
        ServerMessage?: string;
        PSACert?: Record<string, unknown> | null;
      };
      if (json.IsValidRequest === false) {
        return { found: false, reason: json.ServerMessage || "Invalid PSA cert request.", source: this.name };
      }
      const c = json.PSACert;
      if (!c) {
        return { found: false, reason: json.ServerMessage || "Empty PSA registry response.", source: this.name };
      }

      const grade = parseGrade(c.CardGrade ?? c.GradeDescription);
      const cardLabel = [
        c.YearIssued ?? c.Year,
        c.Brand,
        c.Variety,
        c.CardNumber ? `#${c.CardNumber}` : null,
        c.Subject,
      ]
        .filter((v) => v != null && String(v).trim())
        .map(String)
        .join(" ")
        .trim();
      const imageUrl = stringOrNull(c.ImageURL ?? c.ImageUrl ?? c.ImageUrlFront);
      const record: PsaCertRecord = {
        certNumber: cert,
        cardLabel: cardLabel || String(c.Subject ?? c.Brand ?? "Unknown card"),
        grade,
        gradeLabel: String(c.GradeDescription ?? c.CardGrade ?? ""),
        brand: String(c.Brand ?? ""),
        year: Number(c.YearIssued ?? c.Year) || 0,
        referenceImageUrls: imageUrl ? [imageUrl] : [],
      };
      return { found: true, record, source: this.name };
    } catch {
      return this.fallback.lookup(certNumber);
    }
  }
}

function parseGrade(raw: unknown): number {
  const m = String(raw ?? "").match(/(\d{1,2})/);
  return m ? Math.max(1, Math.min(10, Number(m[1]))) : 0;
}

function stringOrNull(raw: unknown): string | null {
  const s = String(raw ?? "").trim();
  return s ? s : null;
}

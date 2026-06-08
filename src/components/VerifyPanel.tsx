"use client";

import { useState } from "react";
import type { VerifyResponse } from "@/lib/http/responses";
import { StatusBadge } from "@/components/StatusBadge";

/**
 * Public verification surface — the same primitive published as the Minds
 * Bazaar verify Skill. Enter a cert number, token id, or pack token id and the
 * platform recomputes PSA match, report-hash, reveal, and provenance.
 */
export function VerifyPanel() {
  const [certNumber, setCertNumber] = useState("");
  const [tokenId, setTokenId] = useState("");
  const [packTokenId, setPackTokenId] = useState("");
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function verify() {
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          certNumber: certNumber || undefined,
          tokenId: tokenId || undefined,
          packTokenId: packTokenId || undefined,
        }),
      });
      const json = (await res.json()) as VerifyResponse | { ok: false; error: string };
      if (!("checks" in json)) setError(json.error);
      else setResult(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="section proof-section" id="verification">
      <div className="section-title">
        <p className="eyebrow">Verify</p>
        <h3>Independently check any card or pack</h3>
      </div>
      <div className="verify-form">
        <input placeholder="PSA cert number" value={certNumber} onChange={(e) => setCertNumber(e.target.value)} />
        <input placeholder="External NFT token id" value={tokenId} onChange={(e) => setTokenId(e.target.value)} />
        <input placeholder="Pack token id" value={packTokenId} onChange={(e) => setPackTokenId(e.target.value)} />
        <button className="primary-button" type="button" onClick={verify} disabled={loading}>
          {loading ? "Verifying…" : "Verify"}
        </button>
      </div>
      {error && <p className="form-error">{error}</p>}
      {result && (
        <div className="verify-result">
          <div className="result-headline">
            <StatusBadge tone={result.ok ? "passed" : "failed"} />
            <span>{result.ok ? "All available checks passed." : "One or more checks failed."}</span>
          </div>
          <ul className="check-list">
            {result.checks.map((c, i) => (
              <li key={i} className={`check check-${c.pass === null ? "skip" : c.pass ? "ok" : "bad"}`}>
                <strong>{c.name}</strong>
                <span>{c.detail}</span>
              </li>
            ))}
          </ul>
          {result.provenance.length > 0 && (
            <ol className="provenance-list">
              {result.provenance.map((p, i) => (
                <li key={i}>
                  <em>{p.event}</em> — {p.detail}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </section>
  );
}

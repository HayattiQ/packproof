"use client";

import { useState } from "react";
import type { VerifyResponse } from "@/lib/http/responses";
import { GradeSeal, MANTLESCAN } from "@/components/packproof-ui";

/**
 * Verify — cert / tokenId → PSA match, report-hash, verifyReveal, provenance.
 *
 * Wired to POST /api/verify with a single free-form query. Returns the same
 * proof bundle the Minds Bazaar "PackProof Verify" Skill returns: PSA registry
 * match, authentication-report-hash recompute, pack verifyReveal, custody, and
 * the full provenance chain.
 */

type Phase = "idle" | "loading" | "result" | "notfound";

function checkIcon(kind: VerifyResponse["checks"][number]["kind"]): string {
  if (kind === "info") return "⛓";
  if (kind === "bad") return "✕";
  return "✓";
}

export function VerifyPanel() {
  const [q, setQ] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [data, setData] = useState<VerifyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function lookup(preset?: string) {
    const query = (preset != null ? preset : q).trim();
    if (!query) return;
    if (preset != null) setQ(preset);
    setError(null);
    setPhase("loading");
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const json = (await res.json()) as VerifyResponse | { ok: false; error: string };
      if (!("checks" in json)) {
        setError(json.error);
        setPhase("idle");
        return;
      }
      setData(json);
      setPhase(json.status === "notfound" || !json.subject ? "notfound" : "result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed.");
      setPhase("idle");
    }
  }

  return (
    <div className="wrap narrow">
      <div className="screen-head">
        <h1>Verify</h1>
        <p>
          Enter a tokenId or PSA cert number. Get the PSA-registry match,
          authentication-report-hash check, pack <span className="mono">verifyReveal</span>, and the full
          provenance chain — the same result the Bazaar Skill returns.
        </p>
      </div>

      <div className="panel">
        <div className="verify-input">
          <input
            className="input"
            placeholder="tokenId (e.g. 1) or cert (e.g. 84721130)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && lookup()}
          />
          <button
            className="btn btn-primary"
            style={{ height: 50, paddingInline: 26, opacity: q.trim() ? 1 : 0.5, pointerEvents: q.trim() ? "auto" : "none" }}
            onClick={() => lookup()}
          >
            {phase === "loading" ? (
              <>
                <span className="spin" style={{ borderTopColor: "var(--accent-ink)" }} /> Verifying…
              </>
            ) : (
              "Verify"
            )}
          </button>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>Try:</span>
          {["1", "84721130", "0000"].map((s) => (
            <button key={s} className="fbtn" style={{ padding: "5px 12px", fontSize: 12 }} onClick={() => lookup(s)}>
              {s}
            </button>
          ))}
        </div>
        {error && <p style={{ color: "var(--danger)", fontWeight: 700, marginTop: 12 }}>{error}</p>}
      </div>

      {phase === "notfound" && (
        <div className="panel" style={{ borderColor: "rgba(255,92,122,0.3)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--danger)", fontWeight: 700 }}>
            ✕ Not found
          </div>
          <p style={{ color: "var(--ink-dim)", fontSize: 13.5, marginTop: 8 }}>
            No card or pack reward matches that identifier on Mantle Sepolia. Check the tokenId or cert
            number and try again.
          </p>
        </div>
      )}

      {phase === "result" && data?.subject && (
        <div className="panel">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <GradeSeal g={data.subject.grade} sub={data.subject.gradeLabel} />
              <div>
                <div style={{ fontWeight: 700 }}>tokenId #{data.subject.tokenId}</div>
                <div style={{ fontFamily: "var(--f-mono)", fontSize: 12, color: "var(--ink-faint)" }}>
                  CERT {data.subject.cert}
                </div>
              </div>
            </div>
            <span className="chip chip-verified">✓ Authentic &amp; verified</span>
          </div>

          <div className="vresult">
            {data.checks.map((c, i) => {
              const tone = c.kind ?? (c.pass === false ? "bad" : c.pass === null ? "info" : "ok");
              return (
                <div className="vcheck" key={i}>
                  <div className={`vi ${tone}`}>{checkIcon(tone)}</div>
                  <div className="vc-body">
                    <div className="t">{c.name}</div>
                    <div className="d">{c.detail}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {data.provenance.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <span className="field-label">Provenance chain</span>
              <div className="timeline">
                {data.provenance.map((p, i) => (
                  <div className="tl-item" key={i}>
                    {p.when && <div className="when">{p.when}</div>}
                    <div className="what">{p.event}</div>
                    {p.who && <div className="who">{p.who}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <a className="btn btn-ghost mono" style={{ marginTop: 22 }} href={MANTLESCAN} target="_blank" rel="noopener">
            Open on mantlescan ↗
          </a>
        </div>
      )}
    </div>
  );
}

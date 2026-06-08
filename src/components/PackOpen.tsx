"use client";

import { useEffect, useState } from "react";
import type { OpenPackResponse, PackView, PacksResponse } from "@/lib/http/responses";

/**
 * Provably-fair pack open. The odds are published before the open and the
 * reveal is bound to the on-chain commitment + a user salt, so the result is
 * independently verifiable. Purchase + reveal are sponsored (no wallet step).
 */
export function PackOpen() {
  const [pack, setPack] = useState<PackView | null>(null);
  const [result, setResult] = useState<OpenPackResponse | null>(null);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/packs");
        const json = (await res.json()) as PacksResponse;
        if (active) setPack(json.packs[0] ?? null);
      } catch {
        /* non-fatal */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function open() {
    if (!pack) return;
    setOpening(true);
    setError(null);
    try {
      const res = await fetch(`/api/packs/${pack.id}/open`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userSalt: `salt-${Math.random().toString(36).slice(2)}` }),
      });
      const json = (await res.json()) as OpenPackResponse | { ok: false; error: string };
      if (!("rank" in json)) setError(json.error);
      else setResult(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Open failed.");
    } finally {
      setOpening(false);
    }
  }

  const soldPercent = pack ? Math.round(((pack.total - pack.remaining) / pack.total) * 100) : 0;

  return (
    <section className="grid">
      <article className="panel pack-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Live pack</p>
            <h3>{pack?.name ?? "Loading…"}</h3>
          </div>
          {pack && <span className="score">{pack.healthScore}</span>}
        </div>
        {pack && (
          <>
            <div className="meter" aria-label={`${soldPercent}% sold`}>
              <span style={{ width: `${soldPercent}%` }} />
            </div>
            <div className="stats">
              <span>{pack.priceMnt} MNT</span>
              <span>
                {pack.remaining}/{pack.total} left
              </span>
              <span>Fairness {pack.healthScore}</span>
            </div>
            <button className="primary-button" type="button" onClick={open} disabled={opening}>
              {opening ? "Opening…" : "Open pack (sponsored)"}
            </button>
            {error && <p className="form-error">{error}</p>}
          </>
        )}
      </article>

      <article className="panel result-panel">
        <p className="eyebrow">Latest reveal</p>
        {result ? (
          <>
            <div className={`rank rank-${result.rank.toLowerCase()}`}>{result.rank}</div>
            <h3>{result.rewardLabel}</h3>
            <p>{result.estimatedValue}</p>
            <code title="reveal tx">{result.reveal.simulated ? "sim " : "tx "}{result.reveal.txHash.slice(0, 16)}…</code>
            <p className="muted-note">
              Verifiable: salt <strong>{result.commitment.userSalt}</strong> against commitment{" "}
              {result.commitment.probabilityHash.slice(0, 14)}…
            </p>
          </>
        ) : (
          <>
            <div className="rank">?</div>
            <h3>Ready to reveal</h3>
            <p>Open a pack to mint a reward whose odds were committed on-chain first.</p>
          </>
        )}
      </article>
    </section>
  );
}

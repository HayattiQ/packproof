"use client";

import { useEffect, useState } from "react";
import type { Listing, MarketplaceResponse } from "@/lib/http/responses";

/**
 * Marketplace of custodial external NFTs. Only custodial/vaulted tokens are
 * listable on-chain, so everything shown here carries a guaranteed physical
 * claim. Reads live from /api/marketplace/list.
 */
export function Marketplace() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/marketplace/list");
        const json = (await res.json()) as MarketplaceResponse;
        if (active) setListings(json.listings);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Failed to load listings.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="section">
      <div className="section-title">
        <p className="eyebrow">Marketplace</p>
        <h3>Vaulted, authenticated cards</h3>
      </div>
      {loading && <p className="muted-note">Loading listings…</p>}
      {error && <p className="form-error">{error}</p>}
      <div className="listing-grid">
        {listings.map((l) => (
          <article className="listing-card" key={l.tokenId}>
            <div className="listing-head">
              <strong>{l.cardLabel}</strong>
              <span className="grade-chip">PSA {l.grade}</span>
            </div>
            <div className="listing-meta">
              <span>{l.priceMnt} MNT</span>
              <span className="custody-pill">custodial</span>
            </div>
            <code title="authentication report hash">{l.reportHash.slice(0, 18)}…</code>
            <button className="primary-button" type="button">
              Buy (sponsored)
            </button>
          </article>
        ))}
      </div>
      {!loading && listings.length === 0 && <p className="muted-note">No listings yet.</p>}
    </section>
  );
}

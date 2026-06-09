"use client";

import { useEffect, useState } from "react";
import type { Listing, MarketplaceResponse } from "@/lib/http/responses";
import { GradeSeal, money, gradeLabel } from "@/components/packproof-ui";

/**
 * Marketplace — custodial, listing-eligible cards + sponsored buy.
 *
 * Reads live from GET /api/marketplace/list. Every listing is a Custodial token
 * (listing eligibility is enforced on-chain by isListingEligible; non-custodial
 * tokens are rejected). The buy is a sponsored, no-wallet transfer (a
 * custodial-signer approximation in this demo). Card art is placeholder.
 */

const FILTERS = [
  { k: "all", l: "All" },
  { k: "10", l: "PSA 10" },
  { k: "9", l: "PSA 9" },
  { k: "8", l: "PSA 8" },
];

function clientTxHash(): string {
  const hex = "0123456789abcdef";
  const rand = (n: number) =>
    Array.from({ length: n }, () => hex[Math.floor(Math.random() * 16)]).join("");
  return "0x" + rand(8) + "…" + rand(6);
}

export function MarketScreen() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [filter, setFilter] = useState("all");
  const [buying, setBuying] = useState<Listing | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [bought, setBought] = useState<Record<string, string>>({});
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
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const cards = listings.filter((c) => filter === "all" || String(c.grade) === filter);

  function confirmBuy() {
    if (!buying) return;
    setConfirming(true);
    setTimeout(() => {
      setBought((b) => ({ ...b, [buying.tokenId]: clientTxHash() }));
      setConfirming(false);
      setBuying(null);
    }, 1300);
  }

  const priceOf = (c: Listing) => (c.priceUsd != null ? money(c.priceUsd) : `${c.priceMnt} MNT`);

  return (
    <div className="wrap">
      <div className="screen-head">
        <h1>Marketplace</h1>
        <p>
          Every listing is a <strong style={{ color: "var(--ink)" }}>Custodial</strong> card — tradable and
          redeemable 1:1. Listing eligibility is enforced on-chain by{" "}
          <span className="mono">isListingEligible</span>; non-custodial tokens are rejected (HTTP 422).
        </p>
      </div>

      <div className="filters">
        {FILTERS.map((f) => (
          <button key={f.k} className={"fbtn" + (filter === f.k ? " on" : "")} onClick={() => setFilter(f.k)}>
            {f.l}
          </button>
        ))}
      </div>

      {error && <p style={{ color: "var(--danger)", fontWeight: 700 }}>{error}</p>}

      <div className="mgrid">
        {cards.map((c) => (
          <article className="mcard" key={c.tokenId}>
            <div
              className="art"
              style={{
                position: "relative",
                aspectRatio: "63/80",
                overflow: "hidden",
                background:
                  "radial-gradient(120% 90% at 30% 14%, rgba(255,255,255,0.14), transparent 55%), var(--holo)",
                backgroundSize: "auto, 240% 240%",
                animation: "holoShift 10s ease-in-out infinite",
              }}
            >
              <span className="g" style={{ position: "absolute", left: 12, top: 12, zIndex: 2 }}>
                <GradeSeal g={c.grade} sub={c.gradeLabel ?? gradeLabel(c.grade)} size="sm" />
              </span>
              {c.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.imageUrl}
                  alt={c.cardLabel}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    padding: "20% 14% 14%",
                    filter: "drop-shadow(0 8px 18px rgba(0,0,0,0.45))",
                  }}
                />
              ) : (
                <span className="ph">CARD · PLACEHOLDER</span>
              )}
            </div>
            <div className="info">
              <div className="nm">{c.cardLabel}</div>
              <div className="ce">
                {c.setName ? `${c.setName} · ` : ""}CERT {c.cert ?? c.tokenId}
              </div>
              <div className="pr">
                <span className="p">{priceOf(c)}</span>
                <span className="c">✓ tokenId #{c.tokenId}</span>
              </div>
              {bought[c.tokenId] ? (
                <div
                  style={{
                    marginTop: 12,
                    fontSize: 12.5,
                    color: "var(--jade)",
                    fontWeight: 700,
                    fontFamily: "var(--f-mono)",
                  }}
                >
                  ✓ Owned · {bought[c.tokenId]}
                </div>
              ) : (
                <button
                  className="btn btn-ghost"
                  style={{ width: "100%", justifyContent: "center", marginTop: 12, fontSize: 13.5, padding: "10px" }}
                  onClick={() => setBuying(c)}
                >
                  Buy — sponsored
                </button>
              )}
            </div>
          </article>
        ))}
      </div>

      {!error && cards.length === 0 && (
        <p style={{ color: "var(--ink-faint)" }}>No listings match this filter.</p>
      )}

      {buying && (
        <div className="modal-bg" onClick={() => !confirming && setBuying(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <span className="mx" onClick={() => !confirming && setBuying(null)}>
              ✕
            </span>
            <div className="mtitle">Confirm purchase</div>
            <p style={{ color: "var(--ink-dim)", fontSize: 13.5, marginBottom: 18 }}>
              The relayer signs and sponsors this transfer — no wallet pop-up.
            </p>

            <div className="mint-card" style={{ display: "flex", gap: 14, padding: 14, alignItems: "center" }}>
              <div
                style={{
                  width: 64,
                  borderRadius: 8,
                  aspectRatio: "63/80",
                  overflow: "hidden",
                  flexShrink: 0,
                  position: "relative",
                  background:
                    "radial-gradient(120% 90% at 30% 14%, rgba(255,255,255,0.18), transparent 55%), var(--holo)",
                  backgroundSize: "auto, 240% 240%",
                  animation: "holoShift 8s ease-in-out infinite",
                }}
              >
                {buying.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={buying.imageUrl}
                    alt={buying.cardLabel}
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", padding: "18% 8% 8%" }}
                  />
                )}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{buying.cardLabel}</div>
                <div style={{ fontFamily: "var(--f-mono)", fontSize: 11.5, color: "var(--ink-faint)", marginTop: 3 }}>
                  PSA {buying.grade} · CERT {buying.cert ?? buying.tokenId}
                </div>
                <div style={{ marginTop: 8 }}>
                  <GradeSeal g={buying.grade} sub={buying.gradeLabel ?? gradeLabel(buying.grade)} size="sm" />
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", margin: "18px 2px", fontSize: 14 }}>
              <span style={{ color: "var(--ink-dim)" }}>Total</span>
              <span style={{ fontFamily: "var(--f-disp)", fontWeight: 700, fontSize: 20 }}>{priceOf(buying)}</span>
            </div>

            <button
              className="btn btn-primary"
              style={{
                width: "100%",
                justifyContent: "center",
                height: 50,
                opacity: confirming ? 0.7 : 1,
                pointerEvents: confirming ? "none" : "auto",
              }}
              onClick={confirmBuy}
            >
              {confirming ? (
                <>
                  <span className="spin" style={{ borderTopColor: "var(--accent-ink)" }} /> Signing…
                </>
              ) : (
                "Confirm — sponsored signing"
              )}
            </button>
            <p style={{ fontSize: 11.5, color: "var(--ink-faint)", marginTop: 12, textAlign: "center" }}>
              Custodial-signer approximation (demo) — not ERC-4337.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export { MarketScreen as Marketplace };

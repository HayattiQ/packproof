"use client";

import { useEffect, useRef, useState } from "react";
import type { OpenPackResponse, PackView, PacksResponse } from "@/lib/http/responses";
import { GradeSeal, shortHex } from "@/components/packproof-ui";

/**
 * Open a pack — pick → sealed → reveal + on-chain verifyReveal.
 *
 * Lists live packs from GET /api/packs and opens via POST /api/packs/[id]/open
 * (sponsored purchase + commit-reveal). The "Proof of this open" panel renders
 * the real verifyReveal row data returned by the API, recomputed against the
 * published commitment.
 */

type Phase = "pick" | "sealed" | "opening" | "revealed";
type Row = { k: string; v: string; cls: "" | "ok" | "bad"; show: boolean };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const PENDING_ROWS: Array<{ k: string; v: string }> = [
  { k: "commitment", v: "—" },
  { k: "serverSeed", v: "— revealed on open —" },
  { k: "storedRank", v: "—" },
  { k: "recomputed", v: "—" },
  { k: "tx", v: "—" },
];

export function PackOpen({ points, onSpend }: { points: number; onSpend: (n: number) => void }) {
  const [packs, setPacks] = useState<PackView[]>([]);
  const [picked, setPicked] = useState<PackView | null>(null);
  const [phase, setPhase] = useState<Phase>("pick");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [reveal, setReveal] = useState<OpenPackResponse | null>(null);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const burstRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/packs");
        const json = (await res.json()) as PacksResponse;
        if (active) setPacks(json.packs);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Failed to load packs.");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  function choose(p: PackView) {
    setPicked(p);
    setPhase("sealed");
    setRows(null);
    setReveal(null);
    setVerified(false);
    setError(null);
  }

  async function open() {
    if (!picked) return;
    setPhase("opening");
    onSpend(picked.pricePoints);

    let json: OpenPackResponse | { ok: false; error: string };
    try {
      const res = await fetch(`/api/packs/${picked.id}/open`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userSalt: `salt-${Math.random().toString(36).slice(2)}` }),
      });
      json = (await res.json()) as OpenPackResponse | { ok: false; error: string };
    } catch (e) {
      setError(e instanceof Error ? e.message : "Open failed.");
      setPhase("sealed");
      return;
    }
    if (!("rank" in json)) {
      setError(json.error);
      setPhase("sealed");
      return;
    }

    await sleep(600);
    setReveal(json);
    setPhase("revealed");
    setTimeout(() => spawnSparks(burstRef.current), 60);
    runVerify(json);
  }

  function runVerify(res: OpenPackResponse) {
    const v = res.verify;
    const built: Row[] = [
      { k: "commitment", v: shortHex(v.commitment, 8, 4), cls: "", show: false },
      { k: "serverSeed", v: shortHex(v.serverSeed, 8, 4), cls: "", show: false },
      { k: "storedRank", v: String(v.storedRank), cls: "", show: false },
      { k: "recomputed", v: `${v.recomputedRank} ${v.matches ? "✓ match" : "✗ mismatch"}`, cls: v.matches ? "ok" : "bad", show: false },
      { k: "tx", v: shortHex(v.txHash, 8, 6), cls: "ok", show: false },
    ];
    setRows(built);
    setVerified(false);
    built.forEach((_, i) => {
      setTimeout(
        () => setRows((prev) => (prev ? prev.map((r, j) => (j <= i ? { ...r, show: true } : r)) : prev)),
        200 + i * 230,
      );
    });
    setTimeout(() => setVerified(v.matches), 200 + built.length * 230 + 200);
  }

  function spawnSparks(host: HTMLDivElement | null) {
    if (!host) return;
    const colors = ["var(--gold)", "#9b8cff", "#6ee7ff", "#ff8ad8", "var(--jade)"];
    for (let i = 0; i < 26; i++) {
      const s = document.createElement("i");
      s.className = "spark";
      s.style.cssText = "position:absolute;width:7px;height:7px;border-radius:50%;left:50%;top:42%;";
      s.style.background = colors[i % colors.length];
      host.appendChild(s);
      const ang = Math.random() * Math.PI * 2;
      const dist = 70 + Math.random() * 150;
      s.animate(
        [
          { transform: "translate(0,0) scale(1)", opacity: 1 },
          { transform: `translate(${Math.cos(ang) * dist}px,${Math.sin(ang) * dist}px) scale(0)`, opacity: 0 },
        ],
        { duration: 700 + Math.random() * 500, easing: "cubic-bezier(.2,.7,.3,1)" },
      );
    }
    setTimeout(() => {
      host.replaceChildren();
    }, 1300);
  }

  const topTier = picked?.tiers[0] ?? "10";

  return (
    <div className="wrap">
      {phase === "pick" && (
        <>
          <div className="screen-head">
            <h1>Open a pack</h1>
            <p>
              Pick a pack. Drop rates are committed before sale and every result is verifiable on-chain
              with <span className="mono">verifyReveal</span>.
            </p>
          </div>
          {error && <p style={{ color: "var(--danger)", fontWeight: 700 }}>{error}</p>}
          <div className="pack-picker">
            {packs.map((p) => (
              <div className="pp" key={p.id} onClick={() => choose(p)}>
                <div className="pp-art">
                  <span className="lab">{p.label}</span>
                  <span style={{ position: "absolute", left: 14, top: 14, display: "flex", gap: 6 }}>
                    {p.tiers.map((g) => (
                      <GradeSeal key={g} g={g} sub="PSA" size="sm" />
                    ))}
                  </span>
                </div>
                <div className="pp-b">
                  <span className="price">
                    {p.pricePoints.toLocaleString()}
                    <small> pt</small>
                  </span>
                  <span style={{ fontSize: 12, color: "var(--jade)" }}>✦ fair</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {phase !== "pick" && picked && (
        <>
          <span className="back-link" onClick={() => setPhase("pick")}>
            ← All packs
          </span>
          <div className="open-stage" style={{ marginTop: 0 }}>
            <div className="open-flow">
              <div>
                {phase === "revealed" ? (
                  <div className="reveal-card show" style={{ opacity: 1, transform: "none" }}>
                    <div className="burst" ref={burstRef} />
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 10,
                        fontFamily: "var(--f-mono)",
                        fontSize: 10,
                        letterSpacing: ".1em",
                        color: "var(--ink-dim)",
                      }}
                    >
                      <span>PACK REWARD</span>
                      <GradeSeal g={topTier} sub="GEM" size="sm" />
                    </div>
                    <div className="win-window">
                      {reveal?.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={reveal.imageUrl} alt={`${reveal.rewardLabel} reward card`} />
                      )}
                      <div className="shine" />
                    </div>
                    <div className="win-foot">
                      <span>RANK {reveal?.rank ?? "—"} · {reveal?.rewardLabel ?? "TOP TIER"}</span>
                      <span style={{ color: "var(--jade)" }}>✓ revealed</span>
                    </div>
                    <button
                      className="btn btn-ghost"
                      style={{ width: "100%", justifyContent: "center", marginTop: 14, fontSize: 13, padding: 10 }}
                      onClick={() => choose(picked)}
                    >
                      Open another
                    </button>
                  </div>
                ) : (
                  <div
                    className={"sealed" + (phase === "opening" ? " opening" : "")}
                    onClick={() => phase === "sealed" && open()}
                  >
                    <div className="seal-holo" />
                    <div className="seal-mark">
                      {picked.label}
                      <br />
                      SEALED PACK
                    </div>
                    <div className="tap">{phase === "opening" ? "OPENING…" : "TAP TO OPEN"}</div>
                  </div>
                )}
              </div>

              <div>
                <div className="verify-panel">
                  <h3>✦ Proof of this open</h3>
                  <p className="sub">
                    PackManager&apos;s <span className="mono">verifyReveal()</span> recomputes the result
                    against the commitment.
                  </p>
                  <div className="kv">
                    {(rows ?? PENDING_ROWS.map((r) => ({ ...r, cls: "" as const, show: false }))).map((r, i) => (
                      <div
                        className="row"
                        key={i}
                        style={{ opacity: rows ? (r.show ? 1 : 0.18) : 0.6, transition: "opacity .3s" }}
                      >
                        <span className="k">{r.k}</span>
                        <span className={"val" + (r.cls === "ok" ? " ok" : "")}>{r.v}</span>
                      </div>
                    ))}
                  </div>
                  <div className={"verify-result" + (verified ? "" : " pending")}>
                    {verified ? (
                      <>
                        <span>✓</span> Verified — keccak256(serverSeed, inventoryRoot) == commitment
                      </>
                    ) : (
                      <>
                        <span>◷</span> Open the pack to run verification
                      </>
                    )}
                  </div>
                </div>
                {error && <p style={{ color: "var(--danger)", fontWeight: 700, marginTop: 12 }}>{error}</p>}
                <p style={{ fontSize: 11.5, color: "var(--ink-faint)", marginTop: 12 }}>
                  Balance: {points.toLocaleString()} pt
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

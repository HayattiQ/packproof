"use client";

import { useRef, useState } from "react";
import type { RegisterResponse, SlabImage } from "@/lib/http/responses";
import { GradeSeal, MANTLESCAN, shortHex, gradeLabel } from "@/components/packproof-ui";

/**
 * Register a card — photo-first → AI report stepper → mint.
 *
 * Wired to the live POST /api/register: two slab photos + a cert number run the
 * four-agent authentication pipeline and, on a pass, mint a NON-CUSTODIAL
 * provenance NFT (custodial requires shipping the slab to the vault). A cert
 * that does not resolve against the PSA registry (e.g. one containing "FAKE",
 * which is non-numeric) drives the registry-mismatch / blocked branch.
 */

const REG_STAGES = [
  { agent: "AUTHENTICATION AGENT", t: "Label OCR", s: "Reading cert, grade & name from the slab photos", stat: "0.98 conf." },
  { agent: "AUTHENTICATION AGENT", t: "PSA registry match", s: "Reconciling the cert against the PSA public registry", stat: "MATCH" },
  { agent: "COMPLIANCE AGENT", t: "Counterfeit / altered-slab check", s: "Image-matching the slab for tampering", stat: "PASS" },
  { agent: "PRICING AGENT", t: "Value-range estimate", s: "Deriving a price range from comparable sales", stat: "$1.1k–1.4k" },
];

type Phase = "form" | "running" | "done" | "failed";
type StepState = 0 | 1 | 2 | 3; // pending | running | done | fail

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function fileToSlab(file: File, side: string): Promise<SlabImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ side, data: String(reader.result), mime: file.type });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function RegisterCard() {
  const [front, setFront] = useState<SlabImage | null>(null);
  const [back, setBack] = useState<SlabImage | null>(null);
  const [cert, setCert] = useState("");
  const [phase, setPhase] = useState<Phase>("form");
  const [statuses, setStatuses] = useState<StepState[]>([0, 0, 0, 0]);
  const [result, setResult] = useState<RegisterResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const frontInput = useRef<HTMLInputElement>(null);
  const backInput = useRef<HTMLInputElement>(null);

  const ready = Boolean(front); // require at least the front slab photo

  async function run() {
    if (!ready) return;
    setError(null);
    setResult(null);
    setStatuses([0, 0, 0, 0]);
    setPhase("running");

    const images: SlabImage[] = [front, back].filter(Boolean) as SlabImage[];

    let json: RegisterResponse | { ok: false; error: string };
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          certNumber: cert.trim() || undefined,
          custodyTier: "non-custodial",
          images,
        }),
      });
      json = (await res.json()) as RegisterResponse | { ok: false; error: string };
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed.");
      setPhase("form");
      return;
    }

    if (!("verdict" in json)) {
      setError(json.error);
      setPhase("form");
      return;
    }

    // Decide where the stepper stops based on the real verdict:
    //   rejected      → PSA registry match fails (step index 1)
    //   manual_review → counterfeit / altered-slab check flags (step index 2)
    //   approved      → all four pass
    const failIndex = json.verdict === "rejected" ? 1 : json.verdict === "manual_review" ? 2 : -1;

    const local: StepState[] = [0, 0, 0, 0];
    for (let i = 0; i < REG_STAGES.length; i++) {
      local[i] = 1;
      setStatuses([...local]);
      await sleep(700);
      if (i === failIndex) {
        local[i] = 3;
        setStatuses([...local]);
        await sleep(600);
        setResult(json);
        setPhase("failed");
        return;
      }
      local[i] = 2;
      setStatuses([...local]);
      await sleep(200);
    }
    setResult(json);
    setPhase("done");
  }

  function reset() {
    setPhase("form");
    setStatuses([0, 0, 0, 0]);
    setResult(null);
    setError(null);
    setFront(null);
    setBack(null);
    setCert("");
  }

  async function pick(side: "front" | "back", files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    const slab = await fileToSlab(file, side);
    if (side === "front") setFront(slab);
    else setBack(slab);
  }

  const stepIcon = (st: StepState, n: number) => {
    if (st === 1) return <span className="spin" />;
    if (st === 2) return "✓";
    if (st === 3) return "✕";
    return n;
  };

  const isReview = result?.verdict === "manual_review";

  return (
    <div className="wrap narrow">
      {phase === "form" && (
        <>
          <div className="screen-head">
            <h1>Register a card</h1>
            <p>
              Photograph the PSA slab and enter its cert number. AI authenticates it and — on a pass —
              mints a <strong style={{ color: "var(--ink)" }}>non-custodial</strong> provenance NFT. No
              wallet pop-up.
            </p>
          </div>

          <div className="panel">
            <span className="field-label">Slab photos</span>
            <div className="dropzones">
              <div
                className={"dz" + (front ? " filled" : "")}
                onClick={() => frontInput.current?.click()}
              >
                <input
                  ref={frontInput}
                  type="file"
                  accept="image/*"
                  onChange={(e) => pick("front", e.target.files)}
                />
                {front ? (
                  <div className="holo-fill">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={front.data} alt="slab front" />
                    <span className="badge-cam">front ✓</span>
                    <span className="lab">SLAB FRONT</span>
                  </div>
                ) : (
                  <div className="dz-inner">
                    <div className="plus">＋</div>
                    Slab front
                    <br />
                    tap to add photo
                  </div>
                )}
              </div>
              <div
                className={"dz" + (back ? " filled" : "")}
                onClick={() => backInput.current?.click()}
              >
                <input
                  ref={backInput}
                  type="file"
                  accept="image/*"
                  onChange={(e) => pick("back", e.target.files)}
                />
                {back ? (
                  <div className="holo-fill">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={back.data} alt="slab back" />
                    <span className="badge-cam">back ✓</span>
                    <span className="lab">SLAB BACK</span>
                  </div>
                ) : (
                  <div className="dz-inner">
                    <div className="plus">＋</div>
                    Slab back
                    <br />
                    tap to add photo
                  </div>
                )}
              </div>
            </div>
            <p className="field-hint">
              Photos run through the authentication pipeline (mock adapters by default) — add the front
              slab to enable minting.
            </p>
          </div>

          <div className="panel">
            <span className="field-label">PSA cert number</span>
            <input
              className="input"
              placeholder="e.g. 84721130"
              value={cert}
              onChange={(e) => setCert(e.target.value)}
            />
            <p className="field-hint">Tip: enter a cert containing “FAKE” to see the registry-mismatch branch.</p>
          </div>

          <div className="panel" style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                flexShrink: 0,
                display: "grid",
                placeItems: "center",
                background: "var(--gold-soft)",
                color: "var(--gold)",
              }}
            >
              ⛓
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Minted as Provenance only (non-custodial)</div>
              <p style={{ color: "var(--ink-dim)", fontSize: 13, marginTop: 6 }}>
                You keep the physical slab — the NFT is an on-chain record of authenticity and ownership.
                To make it tradable &amp; redeemable on the marketplace,{" "}
                <strong style={{ color: "var(--ink)" }}>ship the card to the vault</strong> afterwards to
                upgrade it to Custodial.
              </p>
            </div>
          </div>

          {error && (
            <p style={{ color: "var(--danger)", fontWeight: 700, marginTop: 14 }}>{error}</p>
          )}

          <button
            className="btn btn-primary"
            style={{
              width: "100%",
              justifyContent: "center",
              marginTop: 18,
              height: 54,
              opacity: ready ? 1 : 0.5,
              pointerEvents: ready ? "auto" : "none",
            }}
            onClick={run}
          >
            Authenticate &amp; mint →
          </button>
        </>
      )}

      {(phase === "running" || phase === "failed") && (
        <>
          <div className="screen-head">
            <h1>{phase === "failed" ? (isReview ? "Routed to manual review" : "Authentication failed") : "Authenticating…"}</h1>
            <p>Four AI agents inspect the slab; every output is hashed and appended to the AttestationLog.</p>
          </div>
          <div className="panel">
            <div className="report-steps">
              {REG_STAGES.map((s, idx) => {
                const st = statuses[idx];
                const cls =
                  "rstep" + (st === 1 ? " active" : st === 2 ? " done" : st === 3 ? " fail" : "");
                return (
                  <div className={cls} key={idx}>
                    <div className="ico">{stepIcon(st, idx + 1)}</div>
                    <div className="body">
                      <div className="t">{s.t}</div>
                      <div className="s">
                        {st === 3
                          ? isReview
                            ? "Borderline signal — human confirmation required"
                            : "Cert not found / mismatch — PSA is authoritative"
                          : s.agent}
                      </div>
                    </div>
                    <div className="stat">{st === 2 ? s.stat : st === 3 ? (isReview ? "REVIEW" : "FAIL") : ""}</div>
                  </div>
                );
              })}
            </div>
          </div>
          {phase === "failed" && (
            <div className="panel" style={{ borderColor: "rgba(255,92,122,0.3)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--danger)", fontWeight: 700 }}>
                ✕ {isReview ? "Held for manual review" : "Not eligible to mint"}
              </div>
              <p style={{ color: "var(--ink-dim)", fontSize: 13.5, marginTop: 8 }}>
                {result?.message ??
                  "This cert did not match the PSA public registry, so the eligibility gate blocked the mint. Re-check the cert number, or submit clearer photos for manual review."}
              </p>
              <button className="btn btn-ghost" style={{ marginTop: 16 }} onClick={reset}>
                ← Try again
              </button>
            </div>
          )}
        </>
      )}

      {phase === "done" && result && (
        <>
          <div className="screen-head">
            <h1>Minted ✓</h1>
            <p>The relayer minted your external card NFT and recorded all four agent attestations on-chain.</p>
          </div>
          <div className="panel">
            <div className="mint-result">
              <div className="mint-card">
                <div className="win">
                  {result.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={result.imageUrl} alt={result.cardLabel ?? "Minted Pokemon card"} />
                  )}
                  <div className="shine" />
                </div>
                <div className="meta">
                  <span>tokenId #{result.mint?.tokenId ?? "—"}</span>
                  <GradeSeal g={result.grade ?? 10} sub={gradeLabel(result.grade)} size="sm" />
                </div>
              </div>
              <div>
                <div className="agent-scores">
                  <div className="ascore">
                    <div className="a">AUTHENTICATION</div>
                    <div className="v">{authScore(result, "authentication")}</div>
                  </div>
                  <div className="ascore">
                    <div className="a">COMPLIANCE</div>
                    <div className="v">{authScore(result, "compliance")}</div>
                  </div>
                  <div className="ascore">
                    <div className="a">PRICING</div>
                    <div className="v" style={{ fontSize: 15 }}>
                      {result.valuation
                        ? `$${result.valuation.lowUsd.toLocaleString()} – $${result.valuation.highUsd.toLocaleString()}`
                        : "—"}
                    </div>
                  </div>
                  <div className="ascore">
                    <div className="a">CUSTODY</div>
                    <div className="v" style={{ fontSize: 14, color: "var(--gold)" }}>
                      Non-custodial
                    </div>
                  </div>
                </div>
                <div className="receipt">
                  <div className="rt">✓ Sponsored mint confirmed {result.mint?.simulated ? "(simulated)" : ""}</div>
                  <div className="rx">reportHash {shortHex(result.reportHash)}</div>
                  <div className="rx">
                    tx {shortHex(result.mint?.txHash)}{" "}
                    <a className="ext" href={`${MANTLESCAN}/tx/${result.mint?.txHash ?? ""}`} target="_blank" rel="noopener">
                      ↗
                    </a>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
              <button className="btn btn-primary" onClick={reset}>
                Register another
              </button>
              <a className="btn btn-ghost" href={MANTLESCAN} target="_blank" rel="noopener">
                View on explorer ↗
              </a>
            </div>
            <p style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 14 }}>
              Want it tradable? Ship the slab to the vault to upgrade this token to{" "}
              <strong style={{ color: "var(--ink-dim)" }}>Custodial</strong> (custodial state is an attested
              flag in this demo, not a physical vault).
            </p>
          </div>
        </>
      )}
    </div>
  );
}

/** Render an agent's 0–100 score as a 0–1 confidence to match the design. */
function authScore(result: RegisterResponse, agent: string): string {
  const a = result.agents.find((x) => x.agent === agent);
  if (!a) return "—";
  return (a.score / 100).toFixed(2);
}

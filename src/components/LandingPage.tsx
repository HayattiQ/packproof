"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Listing, MarketplaceResponse, OpenPackResponse, PackView, PacksResponse } from "@/lib/http/responses";
import { GradeSeal, MANTLESCAN, money, shortHex, gradeLabel } from "@/components/packproof-ui";

/**
 * PackProof landing page — ported from the Claude Design handoff (PackProof.html
 * + app.js + styles.css) into the Next.js app. Concept: 鑑定の儀式 × 開封の興奮 —
 * obsidian + grade-gold + holo. Marketing entry point; the four-screen tool lives
 * at /app. Packs + marketplace preview read live from the API; the hero pack-open
 * demo runs the real /api/packs/[id]/open commit-reveal.
 */

const ZERO = "0x0000000000000000000000000000000000000000";

// Deployed contract addresses — show the configured NEXT_PUBLIC address when
// set, otherwise an illustrative placeholder so the section reads complete.
const ADDRS = [
  { nm: "ExternalCardNFT", sub: "RWA core · ERC-721", env: process.env.NEXT_PUBLIC_EXTERNAL_CARD_NFT_ADDRESS, ph: "0x4e7A…49E9" },
  { nm: "PackManager", sub: "commit-reveal packs", env: process.env.NEXT_PUBLIC_PACK_MANAGER_ADDRESS, ph: "0x2057…D2Ac" },
  { nm: "RewardNFT", sub: "pack-reward collection", env: process.env.NEXT_PUBLIC_REWARD_NFT_ADDRESS, ph: "0x8DAF…1768" },
  { nm: "AttestationLog", sub: "AI agent attestations", env: process.env.NEXT_PUBLIC_ATTESTATION_LOG_ADDRESS, ph: "0xA472…6D67" },
];

function addrDisplay(env: string | undefined, ph: string): { label: string; href: string } {
  if (env && env.toLowerCase() !== ZERO) return { label: shortHex(env, 6, 4), href: `${MANTLESCAN}/address/${env}` };
  return { label: ph, href: MANTLESCAN };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type OpenPhase = "sealed" | "opening" | "revealed";
type Row = { k: string; v: string; cls: "" | "ok" | "bad"; show: boolean };

const PENDING_ROWS: Row[] = [
  { k: "commitment", v: "0x9f3c…a1b8", cls: "", show: true },
  { k: "serverSeed", v: "— revealed on open —", cls: "", show: true },
  { k: "storedRank", v: "—", cls: "", show: true },
  { k: "recomputed", v: "—", cls: "", show: true },
  { k: "tx", v: "—", cls: "", show: true },
];

export function LandingPage() {
  const [packs, setPacks] = useState<PackView[]>([]);
  const [market, setMarket] = useState<Listing[]>([]);

  // hero pack-open demo
  const [phase, setPhase] = useState<OpenPhase>("sealed");
  const [rows, setRows] = useState<Row[]>(PENDING_ROWS);
  const [verified, setVerified] = useState(false);
  const burstRef = useRef<HTMLDivElement>(null);
  const slabRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  // Load live packs + marketplace preview.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [p, m] = await Promise.all([
          fetch("/api/packs").then((r) => r.json() as Promise<PacksResponse>),
          fetch("/api/marketplace/list").then((r) => r.json() as Promise<MarketplaceResponse>),
        ]);
        if (!active) return;
        setPacks(p.packs);
        setMarket(m.listings.slice(0, 4));
      } catch {
        /* non-fatal: marketing copy still renders */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Scroll-reveal for [data-rise] (robust: reveal in-view + safety net).
  useEffect(() => {
    const risers = Array.from(document.querySelectorAll<HTMLElement>("[data-rise]"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -6% 0px" },
    );
    risers.forEach((n) => io.observe(n));
    const safety = setTimeout(() => risers.forEach((n) => n.classList.add("in")), 2600);
    return () => {
      io.disconnect();
      clearTimeout(safety);
    };
  }, []);

  // Hero slab parallax tilt (fine pointers only).
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia("(pointer:fine)").matches) return;
    const stage = stageRef.current;
    const slab = slabRef.current;
    if (!stage || !slab) return;
    const move = (e: MouseEvent) => {
      const r = stage.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      slab.style.animation = "none";
      slab.style.transform = `rotateX(${8 - y * 14}deg) rotateY(${-14 + x * 18}deg)`;
    };
    const leave = () => {
      slab.style.animation = "";
      slab.style.transform = "";
    };
    stage.addEventListener("mousemove", move);
    stage.addEventListener("mouseleave", leave);
    return () => {
      stage.removeEventListener("mousemove", move);
      stage.removeEventListener("mouseleave", leave);
    };
  }, []);

  async function openPack() {
    setPhase("opening");
    let json: OpenPackResponse | { ok: false; error: string };
    try {
      const res = await fetch("/api/packs/psa10/open", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userSalt: `lp-${Math.random().toString(36).slice(2)}` }),
      });
      json = (await res.json()) as OpenPackResponse | { ok: false; error: string };
    } catch {
      setPhase("sealed");
      return;
    }
    if (!("verify" in json)) {
      setPhase("sealed");
      return;
    }
    await sleep(520);
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
      { k: "recomputed", v: `${v.recomputedRank} ${v.matches ? "✓ match" : "✗"}`, cls: v.matches ? "ok" : "bad", show: false },
      { k: "tx", v: shortHex(v.txHash, 8, 6), cls: "ok", show: false },
    ];
    setRows(built);
    setVerified(false);
    built.forEach((_, i) => {
      setTimeout(() => setRows((prev) => prev.map((r, j) => (j <= i ? { ...r, show: true } : r))), 260 + i * 240);
    });
    setTimeout(() => setVerified(v.matches), 260 + built.length * 240 + 200);
  }

  function resetOpen() {
    setPhase("sealed");
    setRows(PENDING_ROWS);
    setVerified(false);
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
    setTimeout(() => host.replaceChildren(), 1300);
  }

  return (
    <>
      {/* ======================= NAV ======================= */}
      <header className="nav">
        <div className="wrap nav-in">
          <a className="brand" href="#top">
            <span className="mark">P</span>PackProof
          </a>
          <nav className="nav-links">
            <a href="#packs">Packs</a>
            <a href="#open">Open</a>
            <a href="#pipeline">AI Verify</a>
            <a href="#market">Market</a>
            <a href="#proof">On-chain</a>
          </nav>
          <div className="nav-cta">
            <span className="chip">
              <span className="dot" />
              Sponsored signing · no wallet
            </span>
            <Link className="btn btn-primary" href="/app#register">
              Register a card
            </Link>
          </div>
        </div>
      </header>

      <main id="top">
        {/* ======================= HERO ======================= */}
        <section className="hero">
          <div className="wrap hero-grid">
            <div>
              <div className="hero-chips">
                <span className="chip chip-verified">✦ PSA registry-matched</span>
                <span className="chip">4 AI agents</span>
                <span className="chip">provably-fair open</span>
              </div>
              <h1>
                Open only the
                <br />
                <span className="accent">real</span>, the proven.
              </h1>
              <p className="lead">
                Photograph a PSA-graded slab, enter its cert number — that&apos;s it. AI cross-checks the
                public registry, catches counterfeit slabs, and estimates value. Cards that pass become an
                NFT on Mantle that carries the cert, grade, valuation and a hash of the authentication
                report. <strong style={{ color: "var(--ink)" }}>No wallet pop-up, ever.</strong>
              </p>
              <div className="hero-cta">
                <Link className="btn btn-primary" href="/app#open">
                  Open a pack
                </Link>
                <a className="btn btn-ghost" href="#pipeline">
                  See how it verifies
                </a>
              </div>
              <div className="hero-stats">
                <div className="s">
                  <div className="v">4</div>
                  <div className="l">AI verification agents</div>
                </div>
                <div className="s">
                  <div className="v">0</div>
                  <div className="l">wallet pop-ups</div>
                </div>
                <div className="s">
                  <div className="v num">100%</div>
                  <div className="l">re-verifiable on-chain</div>
                </div>
                <div className="s">
                  <div className="v num">5003</div>
                  <div className="l">Mantle Sepolia</div>
                </div>
              </div>
            </div>

            {/* floating PSA slab */}
            <div className="slab-stage" ref={stageRef}>
              <div className="slab" ref={slabRef}>
                <span className="badge-onchain">⛓ Minted on Mantle</span>
                <div className="slab-label">
                  <span>PSA · PROFESSIONAL GRADING</span>
                  <GradeSeal g="10" sub="GEM MT" />
                </div>
                <div className="slab-window">
                  <img className="hero-card-art" src="/kairiki-charizard.avif" alt="かいりきリザードン" />
                  <div className="shine" />
                </div>
                <div className="slab-foot">
                  <span className="cert">CERT #8472&nbsp;1130</span>
                  <span className="chip chip-verified" style={{ padding: "5px 10px", fontSize: 11 }}>
                    ✓ Verified
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ======================= PILLARS ======================= */}
        <section className="section" id="why">
          <div className="wrap">
            <span className="eyebrow">Why PackProof</span>
            <h2 className="h-sect">
              The thrill of the pull,
              <br />
              backed by proof.
            </h2>
            <p className="lead">
              No invisible odds. No cards of unknown origin. Authentication, registry matching and proof —
              all of it verifiable.
            </p>
            <div className="pillars">
              <article className="pillar" data-rise>
                <span className="step">01</span>
                <div className="ic">▣</div>
                <h3>PSA registry match</h3>
                <p>
                  Every cert is reconciled against the PSA public registry. PSA is authoritative — a
                  mismatch fails outright, a borderline result is routed to manual review.
                </p>
              </article>
              <article className="pillar" data-rise>
                <span className="step">02</span>
                <div className="ic">◈</div>
                <h3>4 AI agents</h3>
                <p>
                  Label OCR → cert match → counterfeit / altered-slab detection → value estimate. Every
                  agent output is hashed and recorded on-chain.
                </p>
              </article>
              <article className="pillar" data-rise>
                <span className="step">03</span>
                <div className="ic">⛓</div>
                <h3>On-chain proof</h3>
                <p>
                  Cert, grade, owner, valuation snapshot, report hash and custody/redemption state are
                  stamped into a Mantle ERC-721. Duplicate certs are rejected by the chain.
                </p>
              </article>
              <article className="pillar" data-rise>
                <span className="step">04</span>
                <div className="ic">✦</div>
                <h3>Provably-fair open</h3>
                <p>
                  A two-phase commit-reveal scheme. The commitment is published before sale, and anyone can
                  recompute and verify the result with <span className="mono">verifyReveal</span>.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* ======================= PACKS ======================= */}
        <section className="section" id="packs" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <span className="eyebrow">Mystery Packs</span>
            <h2 className="h-sect">See the odds before you break the seal.</h2>
            <p className="lead">
              Every pack is loaded with real, PSA-graded cards. Drop rates are committed and tamper-proof,
              and every result can be verified on-chain.
            </p>
            <div className="packs">
              {packs.map((p) => (
                <article className="pack" key={p.id}>
                  <div className="pack-art">
                    <img className="pack-image" src={p.imageUrl} alt={`${p.label} pack artwork`} />
                    <div className="veil" />
                    <div className="tier">
                      {p.tiers.map((t) => (
                        <GradeSeal key={t} g={t} sub="PSA" size="sm" />
                      ))}
                    </div>
                    <span className="remain">{p.remaining} left</span>
                    <span className="label">{p.label}</span>
                  </div>
                  <div className="pack-body">
                    <div className="pack-meta">
                      <span className="pack-price">
                        {p.priceMnt}
                        <small> MNT / pull</small>
                      </span>
                      <span className="pack-fair">✦ provably fair</span>
                    </div>
                    <div>
                      <div className="bar">
                        <i style={{ width: `${p.fillPercent}%` }} />
                      </div>
                      <div className="pack-foot" style={{ marginTop: 7 }}>
                        <span>{p.topRate}</span>
                        <span>odds committed</span>
                      </div>
                    </div>
                    <Link className="btn btn-primary" href="/app#open" style={{ justifyContent: "center", marginTop: 2 }}>
                      Open this pack
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ======================= PACK OPEN ======================= */}
        <section className="section" id="open" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <span className="eyebrow">Provably-fair Open</span>
            <h2 className="h-sect">Open it, verify it on the spot.</h2>
            <p className="lead">
              Tap to open the pack. Whatever you pull, anyone can recompute the result from the commitment
              and the revealed seed.
            </p>

            <div className="open-stage">
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
                        <GradeSeal g="10" sub="GEM" size="sm" />
                      </div>
                      <div className="win-window">
                        <div className="shine" />
                      </div>
                      <div className="win-foot">
                        <span>RANK {rows[2]?.v ?? "—"} · TOP TIER</span>
                        <span style={{ color: "var(--jade)" }}>✓ revealed</span>
                      </div>
                      <button
                        className="btn btn-ghost"
                        style={{ width: "100%", justifyContent: "center", marginTop: 14, fontSize: 13, padding: 10 }}
                        onClick={resetOpen}
                      >
                        Open again
                      </button>
                    </div>
                  ) : (
                    <div
                      className={"sealed" + (phase === "opening" ? " opening" : "")}
                      onClick={() => phase === "sealed" && openPack()}
                    >
                      <div className="seal-holo" />
                      <div className="seal-mark">
                        PSA 10
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
                      The PackManager contract&apos;s <span className="mono">verifyReveal()</span> recomputes
                      the result against the commitment.
                    </p>
                    <div className="kv">
                      {rows.map((r, i) => (
                        <div className="row" key={i} style={{ opacity: r.show ? 1 : 0.18, transition: "opacity .3s" }}>
                          <span className="k">{r.k}</span>
                          <span className={"val" + (r.cls === "ok" ? " ok" : "")}>{r.v}</span>
                        </div>
                      ))}
                    </div>
                    <div className={"verify-result" + (verified ? "" : " pending")}>
                      {verified ? (
                        <>
                          <span>✓</span> This open is verified — keccak256(serverSeed, inventoryRoot) ==
                          commitment
                        </>
                      ) : (
                        <>
                          <span>◷</span> Open the pack to run verification
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ======================= AI PIPELINE ======================= */}
        <section className="section" id="pipeline" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <span className="eyebrow">AI Authentication Pipeline</span>
            <h2 className="h-sect">Four checks, one report.</h2>
            <p className="lead">
              Each agent appends its input/output hashes and score to the{" "}
              <span className="mono">AttestationLog</span> — so every step of authentication is auditable.
            </p>
            <div className="pipe">
              <article className="stage" data-rise>
                <span className="n">STAGE 01</span>
                <div className="agent">AUTHENTICATION AGENT</div>
                <h4>Label OCR</h4>
                <p>Reads the cert number, grade and card name from photos of the slab&apos;s front and back.</p>
                <div className="score">
                  <span className="v">0.98</span>
                  <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>confidence</span>
                </div>
              </article>
              <article className="stage" data-rise>
                <span className="n">STAGE 02</span>
                <div className="agent">AUTHENTICATION AGENT</div>
                <h4>PSA registry match</h4>
                <p>Reconciles the cert with the PSA public registry. PSA is authoritative — a mismatch fails.</p>
                <div className="score">
                  <span className="v">MATCH</span>
                  <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>registry</span>
                </div>
              </article>
              <article className="stage" data-rise>
                <span className="n">STAGE 03</span>
                <div className="agent">COMPLIANCE AGENT</div>
                <h4>Counterfeit detection</h4>
                <p>Image matching checks for swapped or altered slabs. Borderline cases route to manual review.</p>
                <div className="score">
                  <span className="v">PASS</span>
                  <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>integrity</span>
                </div>
              </article>
              <article className="stage" data-rise>
                <span className="n">STAGE 04</span>
                <div className="agent">PRICING AGENT</div>
                <h4>Value-range estimate</h4>
                <p>Derives an estimated price range from comps and stamps the valuation snapshot on-chain.</p>
                <div className="score">
                  <span className="v">$</span>
                  <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>range est.</span>
                </div>
              </article>
            </div>
            <p className="disclaimer">
              ＋ a <strong style={{ color: "var(--ink-dim)" }}>Fairness Monitor</strong> watches pack-open
              fairness, and all four agents&apos; outputs are appended to the{" "}
              <span className="mono">AttestationLog</span> as{" "}
              <span className="mono">agentId + kind + subjectId + inputHash + outputHash + score</span>.
            </p>
          </div>
        </section>

        {/* ======================= MARKETPLACE ======================= */}
        <section className="section" id="market" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <span className="eyebrow">Marketplace</span>
            <h2 className="h-sect">Only custodial, redeemable cards get listed.</h2>
            <p className="lead">
              The market shows <em style={{ color: "var(--ink)", fontStyle: "normal" }}>Custodial</em> cards
              only. Listing eligibility is enforced by the contract via{" "}
              <span className="mono">isListingEligible</span>.
            </p>
            <div className="market">
              {market.map((c) => (
                <article className="mcard" key={c.tokenId}>
                  <div
                    className="art"
                    style={{
                      position: "relative",
                      aspectRatio: "63/80",
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
                    <div className="ce">CERT {c.cert ?? c.tokenId}</div>
                    <div className="pr">
                      <span className="p">{c.priceUsd != null ? money(c.priceUsd) : `${c.priceMnt} MNT`}</span>
                      <span className="c">✓ on-chain</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <div className="hero-cta" style={{ marginTop: 30 }}>
              <Link className="btn btn-ghost" href="/app#marketplace">
                Browse the marketplace →
              </Link>
            </div>
          </div>
        </section>

        {/* ======================= HOW IT WORKS ======================= */}
        <section className="section" id="how" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <span className="eyebrow">How it works</span>
            <h2 className="h-sect">Shoot it. Verify it. Stamp it.</h2>
            <div className="steps">
              <article className="stp" data-rise>
                <div className="no">1</div>
                <h4>Shoot &amp; register</h4>
                <p>
                  Photograph the slab front and back, enter the cert number, and mint a{" "}
                  <strong style={{ color: "var(--ink)" }}>non-custodial</strong> provenance NFT — ship to the
                  vault later to upgrade to <strong style={{ color: "var(--ink)" }}>Custodial</strong>.
                </p>
              </article>
              <article className="stp" data-rise>
                <div className="no">2</div>
                <h4>AI verifies</h4>
                <p>
                  A four-stage pipeline runs OCR → PSA match → counterfeit detection → valuation, with each
                  step shown in plain language.
                </p>
              </article>
              <article className="stp" data-rise>
                <div className="no">3</div>
                <h4>Mint the NFT</h4>
                <p>
                  On a pass, the relayer mints the NFT and records all four agent attestations on-chain. No
                  wallet pop-up.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* ======================= ON-CHAIN PROOF ======================= */}
        <section className="section proof" id="proof">
          <div className="wrap proof-grid">
            <div>
              <span className="eyebrow">On-chain Proof</span>
              <h2 className="h-sect" style={{ fontSize: "clamp(28px,3.6vw,46px)" }}>
                Live on
                <br />
                Mantle Sepolia.
              </h2>
              <p className="lead">
                Four contracts deployed on chainId{" "}
                <span className="mono" style={{ color: "var(--ink)" }}>
                  5003
                </span>
                . A real end-to-end flow — card mint, pack commit-reveal, on-chain{" "}
                <span className="mono">verifyReveal</span> — has been executed.
              </p>
              <div className="hero-cta" style={{ marginTop: 28 }}>
                <a className="btn btn-ghost mono" href={MANTLESCAN} target="_blank" rel="noopener">
                  mantlescan.xyz ↗
                </a>
                <Link className="btn btn-primary" href="/app#verify">
                  Verify by cert / tokenId
                </Link>
              </div>
            </div>
            <div className="addr-list">
              {ADDRS.map((d) => {
                const { label, href } = addrDisplay(d.env, d.ph);
                return (
                  <a className="addr" key={d.nm} href={href} target="_blank" rel="noopener">
                    <span className="nm">
                      {d.nm}
                      <small>{d.sub}</small>
                    </span>
                    <span className="a">
                      {label} <span className="ext">↗</span>
                    </span>
                  </a>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      {/* ======================= FOOTER ======================= */}
      <footer className="foot" id="verify">
        <div className="wrap foot-in">
          <div>
            <a className="brand" href="#top" style={{ marginBottom: 10 }}>
              <span className="mark">P</span>PackProof
            </a>
            <p className="note">
              AI × RWA platform for PSA-graded collectible cards on Mantle. Mantle Turing Test 2026 — AI ×
              RWA track.
            </p>
          </div>
          <div style={{ display: "flex", gap: 26, fontSize: 13, color: "var(--ink-dim)", flexWrap: "wrap" }}>
            <a href="#packs">Packs</a>
            <a href="#pipeline">AI Verify</a>
            <a href="#market">Market</a>
            <a href="#proof">On-chain</a>
          </div>
        </div>
        <div className="wrap">
          <p className="disclaimer">
            ⚠ <strong style={{ color: "var(--ink-dim)" }}>Honesty notes:</strong> this demo runs on the
            Mantle Sepolia <strong>testnet</strong> (chainId 5003). &quot;No wallet / sponsored signing&quot;
            is a server-side relayer pattern — a <strong>custodial-signer approximation</strong>, not
            ERC-4337. The &quot;Custodial&quot; state is an <strong>attested flag</strong>, not a physical
            vault. Out of the box the app runs on deterministic mock adapters; real PSA / OCR / valuation
            data requires credentials.
          </p>
        </div>
      </footer>
    </>
  );
}

"use client";

import { useState } from "react";
import { RegisterCard } from "@/components/RegisterCard";
import { Marketplace } from "@/components/Marketplace";
import { PackOpen } from "@/components/PackOpen";
import { VerifyPanel } from "@/components/VerifyPanel";

type Tab = "register" | "marketplace" | "packs" | "verify";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "register", label: "Register a card" },
  { id: "marketplace", label: "Marketplace" },
  { id: "packs", label: "Open a pack" },
  { id: "verify", label: "Verify" },
];

/**
 * Tab shell for PackProof. The "Connect wallet" button is intentionally GONE:
 * the consumer happy path is wallet-free (sponsored signing via the relayer).
 * Each tab calls the API; nothing is hardcoded demo state anymore.
 */
export function PackProofApp() {
  const [tab, setTab] = useState<Tab>("register");

  return (
    <main className="shell">
      <nav className="topbar" aria-label="Main navigation">
        <div className="brand-mark" aria-hidden="true">
          PP
        </div>
        <div>
          <p className="eyebrow">Mantle Turing Test Hackathon 2026 · AI × RWA</p>
          <h1>PackProof</h1>
        </div>
        <span className="no-wallet-pill">No wallet needed</span>
      </nav>

      <section className="hero hero-compact">
        <div className="hero-copy">
          <p className="eyebrow">AI-authenticated RWA tokenization on Mantle</p>
          <h2>Snap your PSA card. AI authenticates, prices, and mints it on-chain.</h2>
          <p className="lede">
            PackProof reads the slab, cross-checks PSA&apos;s registry, scores counterfeit risk, and prices
            from comparables — then mints a redeemable external NFT whose authentication report is hashed
            on-chain for anyone to verify.
          </p>
        </div>
      </section>

      <nav className="tab-bar" aria-label="Sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tab ${tab === t.id ? "tab-active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="tab-panel">
        {tab === "register" && <RegisterCard />}
        {tab === "marketplace" && <Marketplace />}
        {tab === "packs" && <PackOpen />}
        {tab === "verify" && <VerifyPanel />}
      </div>
    </main>
  );
}

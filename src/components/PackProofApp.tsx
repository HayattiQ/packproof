"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RegisterCard } from "@/components/RegisterCard";
import { Marketplace } from "@/components/Marketplace";
import { PackOpen } from "@/components/PackOpen";
import { VerifyPanel } from "@/components/VerifyPanel";

type Tab = "register" | "marketplace" | "open" | "verify";

const TABS: Array<{ k: Tab; l: string }> = [
  { k: "register", l: "Register a card" },
  { k: "marketplace", l: "Marketplace" },
  { k: "open", l: "Open a pack" },
  { k: "verify", l: "Verify" },
];

function readHash(): Tab {
  if (typeof window === "undefined") return "register";
  const h = (window.location.hash || "").replace("#", "");
  return TABS.some((t) => t.k === h) ? (h as Tab) : "register";
}

/**
 * PackProof app shell — obsidian + grade-gold + holo design. Sticky nav with
 * deep-linkable tabs, a collector-points balance, and the no-wallet chip. Each
 * tab reads/writes the live API; signing is sponsored by the relayer.
 */
export function PackProofApp() {
  const [tab, setTab] = useState<Tab>("register");
  const [points, setPoints] = useState(5000);

  // Sync the active tab with the URL hash so tabs are deep-linkable.
  useEffect(() => {
    setTab(readHash());
    const onHash = () => setTab(readHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const go = useCallback((k: Tab) => {
    if (typeof window !== "undefined") window.location.hash = k;
    setTab(k);
  }, []);

  const spend = useCallback((n: number) => setPoints((p) => Math.max(0, p - n)), []);

  return (
    <div className="app">
      <header className="appnav">
        <div className="wrap appnav-in">
          <Link className="brand" href="/">
            <span className="mark">P</span>PackProof
          </Link>
          <nav className="apptabs">
            {TABS.map((t) => (
              <button
                key={t.k}
                type="button"
                className={"apptab" + (tab === t.k ? " active" : "")}
                onClick={() => go(t.k)}
              >
                {t.l}
              </button>
            ))}
          </nav>
          <div className="right">
            <span className="pts">
              {points.toLocaleString()} <small>pt</small>
            </span>
            <span className="chip">
              <span className="dot" />
              Sponsored signing · no wallet
            </span>
          </div>
        </div>
      </header>

      <main className="screen">
        {tab === "register" && <RegisterCard />}
        {tab === "marketplace" && <Marketplace />}
        {tab === "open" && <PackOpen points={points} onSpend={spend} />}
        {tab === "verify" && <VerifyPanel />}
      </main>
    </div>
  );
}

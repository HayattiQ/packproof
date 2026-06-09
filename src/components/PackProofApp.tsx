"use client";

import { type MouseEvent, useMemo, useState } from "react";
import { featuredPack, type Reward } from "@/lib/packproof-data";

const rankOrder: Reward["rank"][] = ["S", "A", "B", "C"];

function pickReward(openCount: number): Reward {
  const index = openCount % rankOrder.length;
  return featuredPack.rewards.find((reward) => reward.rank === rankOrder[index]) ?? featuredPack.rewards[0];
}

export function PackProofApp() {
  const [openCount, setOpenCount] = useState(0);
  const [reward, setReward] = useState<Reward | null>(null);

  const soldPercent = useMemo(() => {
    const sold = featuredPack.total - featuredPack.remaining;
    return Math.round((sold / featuredPack.total) * 100);
  }, []);

  function handleOpenPack(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    setOpenCount((currentCount) => {
      const nextCount = currentCount + 1;
      setReward(pickReward(nextCount));
      return nextCount;
    });
  }

  return (
    <main className="shell">
      <nav className="topbar" aria-label="Main navigation">
        <div className="brand-mark" aria-hidden="true">
          PP
        </div>
        <div>
          <p className="eyebrow">Mantle Turing Test Hackathon 2026</p>
          <h1>PackProof</h1>
        </div>
        <button className="wallet-button" type="button">
          Connect wallet
        </button>
      </nav>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Provably fair NFT mystery packs</p>
          <h2>Open collectible packs with AI-monitored fairness on Mantle.</h2>
          <p className="lede">
            PackProof turns physical trading-card mystery packs into verifiable NFTs. Inventory
            commitments, reveal events, reward rights, and AI-agent decision logs are designed to be
            auditable on Mantle.
          </p>
          <div className="hero-actions">
            <button className="primary-button" type="button" onClick={handleOpenPack}>
              Mint & reveal
            </button>
            <a className="secondary-button" href="#verification">
              View proof
            </a>
          </div>
        </div>

        <div className="pack-stage" aria-label="Featured mystery pack">
          <div className="pack-card">
            <div className="pack-shine" />
            <span className="pack-label">SEALED</span>
            <strong>{featuredPack.name}</strong>
            <small>{featuredPack.chain} / {featuredPack.price}</small>
          </div>
        </div>
      </section>

      <section className="grid">
        <article className="panel pack-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Live pack</p>
              <h3>{featuredPack.name}</h3>
            </div>
            <span className="score">{featuredPack.healthScore}</span>
          </div>
          <div className="meter" aria-label={`${soldPercent}% sold`}>
            <span style={{ width: `${soldPercent}%` }} />
          </div>
          <div className="stats">
            <span>{featuredPack.price}</span>
            <span>{featuredPack.remaining}/{featuredPack.total} left</span>
            <span>AI score {featuredPack.healthScore}</span>
          </div>
        </article>

        <article className="panel result-panel">
          <p className="eyebrow">Latest reveal</p>
          {reward ? (
            <>
              <div className="revealed-card">
                <img src={reward.imageUrl} alt={`${reward.label} reward card image`} />
                <span className={`rank rank-${reward.rank.toLowerCase()}`}>{reward.rank}</span>
              </div>
              <h3>{reward.label}</h3>
              <p>{reward.estimatedValue}</p>
              <small className="mint-status">Reward NFT minted / Redemption right issued</small>
            </>
          ) : (
            <>
              <div className="rank">?</div>
              <h3>Ready to mint</h3>
              <p>Mint a sample pack to reveal the reward NFT flow.</p>
            </>
          )}
        </article>
      </section>

      <section className="section">
        <div className="section-title">
          <p className="eyebrow">Reward table</p>
          <h3>Published odds before sale</h3>
        </div>
        <div className="reward-list">
          {featuredPack.rewards.map((item) => (
            <article className="reward-row" key={item.id}>
              <img className="reward-thumb" src={item.imageUrl} alt={`${item.label} prize preview`} />
              <span className={`rank-chip rank-${item.rank.toLowerCase()}`}>{item.rank}</span>
              <strong>{item.label}</strong>
              <span>{item.odds}</span>
              <span>{item.estimatedValue}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="section proof-section" id="verification">
        <div className="section-title">
          <p className="eyebrow">Verification</p>
          <h3>On-chain proof surfaces</h3>
        </div>
        <div className="proof-grid">
          <div>
            <span>Inventory root</span>
            <strong>{featuredPack.inventoryRoot}</strong>
          </div>
          <div>
            <span>Probability hash</span>
            <strong>{featuredPack.probabilityHash}</strong>
          </div>
          <div>
            <span>Reveal contract</span>
            <strong>PackRevealManager</strong>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-title">
          <p className="eyebrow">AI agents</p>
          <h3>Decision logs committed to Mantle</h3>
        </div>
        <div className="agent-list">
          {featuredPack.agents.map((agent) => (
            <article className="agent-card" key={agent.agent}>
              <div className="agent-card-header">
                <strong>{agent.agent}</strong>
                <span className={agent.status}>{agent.score}</span>
              </div>
              <p>{agent.summary}</p>
              <code>{agent.hash}</code>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

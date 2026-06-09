import { featuredPack } from "@/lib/packproof-data";

export default function AgentGuidePage() {
  return (
    <main className="shell guide-shell">
      <a className="secondary-button back-link" href="/">
        Back to app
      </a>

      <section className="guide-hero">
        <p className="eyebrow">/agent-guide</p>
        <h1>PackProof Fairness Auditor</h1>
        <p className="lede">
          A Minds Bazaar capability for auditing collectible mystery packs before a user buys,
          opens, or redeems a PackProof pack.
        </p>
      </section>

      <section className="section">
        <div className="guide-grid">
          <article className="proof-card">
            <span>Capability name</span>
            <strong>{featuredPack.capability.name}</strong>
          </article>
          <article className="proof-card">
            <span>Capability ID</span>
            <strong>{featuredPack.capability.publicId}</strong>
          </article>
          <article className="proof-card">
            <span>Activation message</span>
            <p>{featuredPack.capability.activationMessage}</p>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="section-title">
          <p className="eyebrow">Supported prompts</p>
          <h2>What another Mind can ask</h2>
        </div>
        <div className="agent-list">
          {featuredPack.capability.supportedPrompts.map((prompt) => (
            <article className="agent-card" key={prompt}>
              <strong>{prompt}</strong>
              <p>
                The capability should answer with odds, inventory commitment, AI health, and
                Mantle proof context in a short Telegram- or email-native response.
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-title">
          <p className="eyebrow">Demo script</p>
          <h2>Independent Mind walkthrough</h2>
        </div>
        <div className="evidence-list">
          <article className="evidence-row">
            <strong>1. Equip</strong>
            <span>Find PackProof Fairness Auditor in Minds Bazaar and equip it to another user's Mind.</span>
            <em className="ready">ready</em>
          </article>
          <article className="evidence-row">
            <strong>2. Invoke</strong>
            <span>Ask: Audit pack mantle-genesis-001 before I buy it.</span>
            <em className="ready">ready</em>
          </article>
          <article className="evidence-row">
            <strong>3. Verify</strong>
            <span>The Mind summarizes odds, inventory root, probability hash, AI logs, and MVP risks.</span>
            <em className="ready">ready</em>
          </article>
          <article className="evidence-row">
            <strong>4. Decide</strong>
            <span>The user opens the web app, reviews the proof panel, and opens a sample pack.</span>
            <em className="ready">ready</em>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="section-title">
          <p className="eyebrow">Failure cases</p>
          <h2>How the capability should respond</h2>
        </div>
        <div className="rwa-grid">
          <article className="proof-card">
            <span>Unknown pack</span>
            <p>Ask for a valid pack ID and do not invent odds, inventory, or transaction data.</p>
          </article>
          <article className="proof-card">
            <span>Missing contract address</span>
            <p>State that deployment evidence is pending and mark the proof as demo-only.</p>
          </article>
          <article className="proof-card">
            <span>Unhealthy AI score</span>
            <p>Warn the user and explain which valuation, balance, or fairness signal failed.</p>
          </article>
          <article className="proof-card">
            <span>Redemption uncertainty</span>
            <p>Separate on-chain reward ownership from off-chain fulfillment and legal review.</p>
          </article>
        </div>
      </section>
    </main>
  );
}

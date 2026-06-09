# PackProof Design Requirements

## Purpose

Create a high-impact product demo design for PackProof that can be handed to Claude Design or another design agent. The design should make the product understandable within seconds: PackProof is a Mantle-based, provably fair NFT mystery-pack platform for physical trading-card collectibles, with on-chain reveal proof and AI-agent monitoring.

This is not a marketing-only landing page. The first screen should feel like a usable demo product where a judge, collector, or partner can inspect a live pack, understand the odds, open a sample pack, and verify the proof surfaces.

## Current Deployment

- Live demo: https://46442f90.packproof-b80.pages.dev
- Cloudflare Pages project: `packproof`
- Framework: Next.js, React, TypeScript
- Styling today: plain CSS
- Static export output: `out/`
- Wrangler config: `wrangler.toml`

## Visual Reference

Use the following page as the primary visual/content reference for the mystery-pack/gacha presentation:

- Reference: https://dopa-game.jp/pokemon/gacha/248138

The desired structure is similar to an online oripa/gacha product page: a prominent pack visual, price per pull, remaining quantity, minimum guarantee, strong CTA, and a prize lineup where the highest-value cards appear first and feel clearly desirable.

The user has confirmed that permission has been obtained to use images from this referenced site for this project. It is acceptable to use those site images directly in the design/prototype. Preserve a clear internal note of the source and avoid implying any broader official partnership beyond the permitted asset use.

## Product Summary

PackProof turns mystery-pack sales into verifiable on-chain experiences.

Users buy sealed pack NFTs, reveal rewards, and receive reward NFTs representing redemption rights or digital rewards. Inventory commitments, probability hashes, reveal events, and AI-agent log hashes are designed to be auditable on Mantle.

## Target Audience

- Hackathon judges who need to understand Mantle usage quickly.
- Collectors who want a fun pack-opening experience without blind trust.
- Auditors or power users who want to inspect commitments, hashes, reveal events, and AI-agent logs.
- Potential marketplace or collectible partners evaluating whether the flow feels credible.

## Design Goals

1. Make the demo instantly legible.
   The viewer should understand "sealed pack -> reveal -> reward NFT -> proof" in the first viewport.

2. Balance excitement and trust.
   The pack-opening moment should feel collectible and rewarding, while the proof panels should feel precise, calm, and credible.

3. Show Mantle and AI clearly.
   Mantle should appear as the verification layer, not just a footer mention. AI agents should look like operational monitors that produce auditable logs.

4. Avoid legal and brand risk.
   Do not use unapproved Pokemon names, official card art, official logos, real trading-card trademarks, or imagery that implies affiliation with an existing IP owner. Exception: the user has confirmed permission to use images from the referenced DOPA/oripa page for this project.

5. Feel like a working dApp demo.
   Avoid a generic SaaS landing page. The primary screen should be the product experience itself.

## Primary User Flow

1. User lands on the app.
2. User sees the current featured mystery pack with price, remaining supply, odds summary, AI health score, and Mantle proof status.
3. User sees the top prize lineup, ordered from highest-value cards to lower-tier rewards.
4. User clicks or taps `Open pack`.
5. The sealed pack reveal animation plays.
6. User sees the revealed reward with rank, estimated value, ownership/redemption status, and transaction/proof context.
7. User can inspect the verification panel:
   - inventory commitment
   - probability hash
   - reveal contract
   - AI-agent logs
   - fairness/health score

## Required Screens or Sections

### 1. Product Demo Home

This should be the first screen. It must include:

- PackProof brand signal.
- Featured pack panel.
- Sealed pack visual.
- Pack price in MNT.
- Remaining supply.
- Minimum guarantee.
- Published odds summary.
- AI health or fairness score.
- Top prize/high-value card preview area.
- Primary action to open a sample pack.
- Secondary action to inspect proof.

### 2. Reveal Result State

The reveal state must make the reward feel tangible and inspectable.

Include:

- Reward rank, such as S/A/B/C.
- Reward name using generic collectible language.
- Estimated value or value range.
- Reward NFT / redemption-right status.
- A clear path back to proof details.

### 3. Reward Odds Table

Show published odds before sale.

Include:

- Rank.
- Reward label.
- Odds.
- Estimated value.
- Visual hierarchy that makes rare rewards obvious without making lower ranks feel broken.

The lineup must be ordered by desirability and estimated value. High-value Pokemon card prizes should appear at the top of the reward area, with the most expensive or rarest cards visually emphasized first. The top rewards should feel like the headline reason to pull the pack.

Recommended hierarchy:

- Top prize / jackpot card: largest image, strongest framing, highest estimated value.
- S-rank cards: large image tiles immediately after the top prize.
- A/B/C-rank rewards: progressively smaller or denser list/card treatment.
- Minimum guarantee: clearly shown near price/CTA and repeated in the odds/reward area if helpful.

If using images from the referenced DOPA page, keep the card images recognizable and inspectable. Do not crop them so aggressively that card identity or value signal is lost.

### 4. Verification Panel

This is the trust core of the demo.

Include:

- Inventory root.
- Probability hash.
- Reveal contract label.
- Mantle transaction/proof language.
- Clear copy explaining that these values are commitments, not decorative metadata.

### 5. AI-Agent Log Panel

Show three AI agents:

- Valuation Agent.
- Pack Balancer Agent.
- Fairness Monitor Agent.

Each agent should show:

- Score or status.
- One-line summary.
- Hash or log reference.
- Timestamp-like or block-like proof cue if useful.

## Interaction Requirements

- `Open pack` must visibly change the UI state.
- The reveal should have a satisfying but fast transition.
- Proof and AI panels should remain accessible after reveal.
- The design may be mostly static, but all visible controls should feel intentional and have clear states.
- Mobile layout must preserve the core flow without hiding proof entirely.

## Visual Direction

Preferred feel:

- Premium collectible marketplace.
- Trustworthy dApp.
- Energetic reveal moment.
- Operational proof dashboard.

Avoid:

- Generic crypto neon dashboard.
- One-note purple/blue gradient UI.
- Overly dark, unreadable layouts.
- Cartoonish toy-store visuals.
- Bland enterprise SaaS cards everywhere.
- Unapproved official trading-card franchise assets outside the user-approved reference source.

Good visual cues:

- Physical sealed pack texture or rendered pack object.
- Subtle holographic foil effects.
- High-value card prize lineup ordered from most desirable to least desirable.
- Large top-prize card imagery near the first viewport.
- Oripa-style price, remaining quantity, minimum guarantee, and pull CTA treatment.
- Clear Mantle/proof data blocks.
- Rank badges with restrained color.
- Audit-log typography for hashes.
- Strong contrast between "fun reveal" and "serious verification."

## Content Requirements

Use concise product copy. Suggested core messages:

- "Provably fair NFT mystery packs on Mantle."
- "Open sealed packs, reveal reward NFTs, and inspect the proof."
- "Inventory commitments, probability hashes, reveal events, and AI-agent logs are designed for auditability."
- "Top prizes are published before sale and ordered by estimated value."

Do not over-explain basic UI interactions on screen. Let the interface communicate through hierarchy, labels, and state changes.

## Data To Preserve

The current demo data can remain generic. Preserve or redesign around:

- Pack name.
- Chain: Mantle.
- Price in MNT.
- Remaining and total supply.
- Minimum guarantee.
- Health score.
- Inventory root.
- Probability hash.
- Reward ranks and odds.
- High-value card image assets from the approved reference page.
- Agent names, scores, summaries, and hashes.

## Technical Constraints

- Must be implementable in the current Next.js app.
- Prefer plain CSS or minimal dependency additions.
- Must work with static export for Cloudflare Pages.
- No server-only behavior.
- No required private API keys.
- No unapproved copyrighted card images or trademarks. User-approved images from the referenced DOPA/oripa page may be used directly.
- Keep performance lightweight enough for a hackathon demo.

## Responsive Requirements

Desktop:

- First viewport should show the featured pack, top prize/high-value card cue, primary action, and at least a visible proof/score cue.
- Proof and AI sections should be scannable without feeling buried.

Mobile:

- Pack action must remain prominent.
- Top prize should remain visible before or immediately after the CTA.
- Reveal result must fit cleanly without text overlap.
- Hashes must wrap or truncate elegantly.
- Tables may become stacked rows.

## Acceptance Criteria

- A first-time visitor understands the product in under 10 seconds.
- The app feels like a usable PackProof demo, not a static pitch deck.
- The pack-opening interaction is visually satisfying.
- High-value Pokemon card prizes appear first and are clearly emphasized.
- Verification and AI-agent proof surfaces are easy to find.
- The design uses only user-approved Pokemon/card imagery and avoids implying an unapproved official partnership.
- The result can be implemented in the existing Next.js static-export app and deployed to Cloudflare Pages.

## Handoff Request For Claude Design

Redesign the existing PackProof demo using the requirements above. Use the referenced DOPA/oripa page as the visual model for the gacha/product layout, including prominent pack imagery, price, remaining quantity, minimum guarantee, CTA, and a high-value card prize lineup ordered from most valuable to least valuable. The user has confirmed permission to use images from that reference site directly. Produce a polished, responsive product-demo UI for a Mantle NFT mystery-pack platform. Prioritize first-viewport clarity, a satisfying reveal experience, top-prize desirability, and credible proof/AI-agent inspection. Keep the demo static-export compatible.

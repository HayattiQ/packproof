# PackProof Requirements

## Objective

Build a hackathon MVP for a Mantle-based collectible mystery-pack product that wins primarily in the Animoca Consumer & Viral DApps track.

PackProof should present two connected experiences:

1. A consumer web app where users inspect, buy, open, and verify physical collectible mystery packs.
2. A Mind-compatible PackProof capability that another user's Mind can equip and use to audit pack fairness, inventory commitments, reward odds, and redemption rights.

The secondary positioning is AI-assisted physical collectible RWA verification on Mantle. Physical trading-card inventory is represented through inventory commitments, sealed pack NFTs, reward/redemption NFTs, and auditable AI-agent logs.

## Target Judging Strategy

### Primary Track: Animoca / Consumer & Viral DApps

PackProof must be easy for judges to evaluate as a consumer-facing viral DApp and as a Minds Bazaar capability.

Required judge evidence:

- Public capability name for Bazaar submission.
- Public capability ID or placeholder field to fill after publishing.
- Activation message that explains what the user's Mind can ask PackProof to do.
- `/agent-guide` documentation that lets an unrelated Mind equip and operate the capability without builder context.
- Demo flow showing a different user's Mind invoking the capability end-to-end.
- Web app flow showing pack discovery, pack opening, proof inspection, and AI audit logs.

### Secondary Track: Mantle RWA

PackProof should also be understandable as an RWA-style product for physical collectibles.

Required judge evidence:

- Physical inventory commitment before sale.
- Reward NFT or redemption-right NFT model for off-chain collectible claims.
- Mantle transaction or contract evidence for ownership, reveal, reward, and agent-log proof.
- Compliance awareness for trademark, copyright, random-sale rules, consumer protection, KYC/AML where applicable, custody, fulfillment, and redemption disputes.
- Clear distinction between demo assets and production collectible inventory.

## Users

- Collector: buys sealed packs, opens packs, views reward NFTs, and requests redemption.
- Mind user: asks their Mind to inspect a PackProof pack, explain odds, summarize risk, or verify fairness before interacting with the DApp.
- Admin: creates packs, registers inventory, pauses sales, records agent logs, and publishes Bazaar metadata.
- AI agent: evaluates valuation, pack health, inventory consistency, reveal distribution, and fairness.
- Auditor: checks commitments, hashes, contract events, reward records, and redemption status.
- Judge: evaluates the web app, the Mind capability, the `/agent-guide`, and the Mantle proof trail.

## Functional Requirements

### Wallet and Chain

- Connect an EVM wallet.
- Detect the Mantle network.
- Display account, balance, and chain status.
- Show a clear warning when the user is not connected to Mantle.

### Pack Listing

- Show pack name, price, remaining supply, health score, odds summary, and status.
- Show inventory commitment and probability hash before purchase.
- Disable purchase for sold-out or paused packs.
- Explain odds, fees, redemption limits, and key risks before purchase.

### Pack Purchase

- User purchases a sealed pack with MNT.
- Contract records ownership of the sealed pack token.
- Per-wallet limit is enforced.
- The UI links the purchase to verifiable Mantle transaction evidence.

### Reveal

- User opens a sealed pack.
- Sealed pack is marked opened.
- Reward token is issued.
- Reveal event is emitted for verification.
- The UI explains how the reveal can be audited and what randomness limitations remain in the MVP.

### Reward and Redemption

- Reward NFT stores pack ID, reward ID, rank, owner, and redemption state.
- User can request redemption.
- Redeemed rewards cannot be redeemed again.
- The product clearly separates digital reward ownership from off-chain fulfillment.
- The requirements and demo copy must avoid official trading-card names, logos, and artwork.

### AI-Agent Logs

- Admin records agent ID, pack ID, input hash, output hash, score, and timestamp.
- Frontend displays agent score, summary, and hash.
- Agent output content can be stored in IPFS or external storage.
- Agent logs must cover at least valuation, pack balance, and fairness monitoring.
- Agent logs must be readable as evidence for both the web app and the Mind capability.

### Animoca Minds Capability

- Define a PackProof capability that a Mind can equip from Bazaar.
- Provide an activation message such as: `Use PackProof to audit a collectible mystery pack before I buy or open it.`
- Support at least these user intents:
  - inspect a pack's published odds and inventory commitment;
  - explain whether the AI health score is acceptable;
  - summarize fairness risks and reveal history;
  - verify reward/redemption status from a pack or reward ID;
  - produce a judge-friendly proof summary.
- The capability must return concise, channel-native responses suitable for Telegram or email.
- The capability must not require terminal commands or builder-only context for normal use.

### `/agent-guide`

- Provide a public guide that explains how another Mind can equip and invoke the PackProof capability.
- Include capability name, public ID, activation message, supported commands, required inputs, example prompts, expected outputs, and failure cases.
- Include a demo script for a different user's Mind using PackProof end-to-end.
- State what data is live, mocked, or demo-only.

### Demo Evidence

- Web demo must show pack listing, open-pack flow, latest reveal, verification panel, and AI-agent logs.
- Mind demo must show a non-builder user asking their Mind to inspect PackProof and receiving a useful proof summary.
- Submission materials must include links or placeholders for:
  - live app URL;
  - repository URL;
  - deployed Mantle contract address;
  - Bazaar capability URL or public ID;
  - `/agent-guide`;
  - demo video.

## Non-functional Requirements

- No hardcoded secrets.
- Admin-only functions must be protected.
- Reveal manipulation risk must be reduced before production with VRF or a stronger commit-reveal scheme.
- User-facing copy must be clear enough for non-technical collectors.
- Mind responses must be short, actionable, and understandable in chat or email.
- The system must disclose MVP limitations instead of implying production-grade randomness, custody, legal compliance, or fulfillment.
- Demo assets must avoid copyrighted card images and official trademarks.

## Acceptance Criteria

- A judge can understand PackProof as a consumer collectible mystery-pack DApp within 60 seconds of opening the app.
- A judge can understand how Mantle stores ownership, reveal, reward, and agent-log proof.
- A judge can follow the `/agent-guide` and see how another user's Mind equips and invokes PackProof.
- The repo includes frontend code, contract skeleton, proposal, requirements, and Animoca capability documentation.
- The submission clearly identifies Animoca as the primary target and Mantle RWA as secondary positioning.
- README includes local development, demo flow, and submission evidence links or placeholders.
- The product copy and docs are legally cautious about physical collectibles, trademarks, random-sale mechanics, and redemption fulfillment.

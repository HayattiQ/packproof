# PackProof

PackProof is a provably fair NFT mystery-pack platform for physical trading-card collectibles on Mantle.

It combines a viral pack-opening consumer experience with on-chain pack ownership, reveal records, reward NFTs, inventory commitments, and AI-agent decision logs.

> Note: This project intentionally avoids official Pokemon names, logos, and card artwork in code and demo assets. Production launch requires trademark, copyright, marketplace, random-sale, and physical-redemption legal review.

## Why

Online mystery-pack services are fun, but users cannot easily verify whether the advertised inventory exists, whether the odds are followed, or whether the operator can manipulate results after sales begin.

PackProof uses Mantle as the verification layer:

- sealed pack NFTs represent unopened mystery packs
- reveal events are recorded on-chain
- reward NFTs represent physical-card redemption rights or digital rewards
- inventory and probability data are committed before sale
- AI agents monitor valuation, pack health, and fairness

## Hackathon Fit

Mantle Turing Test Hackathon 2026:

- Primary: Animoca / Consumer & Viral DApps
- Secondary: Mantle RWA
- Supporting narrative: Agentic Wallets & Economy and AI Alpha & Data

## MVP Scope

- Next.js product demo UI
- Pack listing, pack detail, reveal simulation, verification panel
- AI-agent log dashboard
- Minds Bazaar capability concept: PackProof Fairness Auditor
- Public `/agent-guide` for another user's Mind to equip and operate the capability
- Solidity contract skeleton for pack sale, reveal, reward NFT, and agent logs
- Proposal and requirements documents

## Tech Stack

- Frontend: Next.js, React, TypeScript
- Styling: plain CSS
- Contracts: Solidity, OpenZeppelin-compatible architecture
- Chain target: Mantle Network
- Native token: MNT

## Local Development

```bash
bun i
bun dev
```

## Suggested Demo Flow

1. Open the homepage.
2. Review the live pack card, odds, inventory commitment, and AI health score.
3. Click `Open pack` to reveal a sample reward.
4. Check the verification panel and AI-agent log.
5. Open `/agent-guide` and review the PackProof Fairness Auditor capability.
6. Demo a different user's Mind asking the capability to audit `mantle-genesis-001`.
7. Use the README, docs, and contract skeleton as DoraHacks submission evidence.

## Animoca Submission Strategy

PackProof is positioned as a consumer mystery-pack DApp plus a Minds Bazaar capability.

- Capability name: PackProof Fairness Auditor
- Capability ID: `packproof-fairness-auditor.demo`
- Activation message: `Use PackProof to audit a collectible mystery pack before I buy or open it.`
- Guide: `/agent-guide` and `docs/agent-guide.md`

The web app delivers the consumer pack-opening experience. The capability lets another user's Mind inspect odds, inventory commitments, AI health, reveal history, and redemption status without needing builder context.

## Mantle RWA Positioning

PackProof treats physical collectible inventory as a verifiable off-chain asset set.

- Sealed pack NFTs represent unopened claims.
- Reward NFTs represent physical-card redemption rights or digital rewards.
- Inventory and probability commitments are published before sale.
- AI-agent logs are hashed and committed to Mantle for auditability.
- Production use requires legal review for trademark, copyright, random-sale rules, consumer protection, KYC/AML where applicable, custody, fulfillment, and redemption disputes.

## Submission evidence

| Item | Status |
| --- | --- |
| Live app URL | Add after deployment |
| Repository URL | `https://github.com/HayattiQ/packproof` |
| Mantle contract address | Add after testnet deployment |
| Minds Bazaar capability URL/public ID | Add after publish |
| `/agent-guide` | Included |
| Demo video | Add after recording |

## Repository Structure

```text
src/app              Next.js app
src/components       Product UI
src/lib              Demo data and domain types
contracts            Solidity contract skeleton
docs                 Proposal and requirements
```

## DoraHacks Short Description

PackProof is a Mantle-based NFT mystery-pack platform for physical trading-card collectibles. Users buy sealed pack NFTs, open them on-chain, and receive reward NFTs that represent redeemable physical cards or digital rewards. AI agents monitor card valuation, pack health, and fairness, then publish decision-log hashes to Mantle for auditability.

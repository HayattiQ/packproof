# PackProof Proposal

## Project Name

PackProof

## One-liner

A provably fair NFT mystery-pack platform for physical trading-card collectibles on Mantle, powered by AI agents and on-chain verification.

## Track Strategy

PackProof is designed for Animoca / Consumer & Viral DApps as the primary track.

The core submission is a consumer web DApp plus a Minds Bazaar capability named PackProof Fairness Auditor. The capability lets another user's Mind audit pack odds, inventory commitments, AI health logs, and redemption status before the user buys or opens a pack.

The secondary positioning is physical collectible RWA verification on Mantle. PackProof represents off-chain collectible inventory through inventory commitments, sealed pack NFTs, reward/redemption NFTs, and auditable AI-agent logs.

## Problem

Online mystery-pack services are opaque. Users must trust that the operator has the advertised inventory, follows the stated odds, and does not manipulate results.

## Solution

PackProof makes mystery packs verifiable. Inventory commitments, reveal events, reward NFTs, and AI-agent evaluation logs are recorded on Mantle. Users can enjoy the pack-opening experience while still being able to verify fairness and redemption rights.

For Animoca, PackProof also exposes this verification flow as a Mind-compatible capability. A non-builder user can equip PackProof Fairness Auditor from Minds Bazaar and ask their Mind to produce a short proof summary before interacting with the DApp.

## Mantle Usage

PackProof deploys core contracts on Mantle:

- pack sale
- sealed pack NFT
- reveal manager
- reward NFT
- AI-agent log registry

Users pay with MNT, receive NFTs on Mantle, and verify reveal events through Mantle transactions.

## AI Agents

PackProof uses three AI agents:

1. Valuation Agent: estimates physical card value ranges and confidence scores.
2. Pack Balancer Agent: checks pack expected value, inventory consistency, and risk before publication.
3. Fairness Monitor Agent: analyzes reveal history to detect suspicious patterns or abnormal reward distribution.

Each agent output is stored off-chain with a content hash. The hash, score, agent ID, pack ID, and timestamp are logged on Mantle.

## Minds Bazaar Capability

PackProof Fairness Auditor is the agent-facing entrypoint.

- Capability name: PackProof Fairness Auditor
- Capability ID: `packproof-fairness-auditor.demo`
- Activation message: `Use PackProof to audit a collectible mystery pack before I buy or open it.`
- Guide: `/agent-guide`

Supported prompts include pack audits, odds explanation, AI health summaries, reward/redemption checks, and judge-friendly proof summaries.

## MVP

- Next.js product demo
- `/agent-guide` page and docs for Minds Bazaar publish evidence
- Mantle-oriented smart contract skeleton
- pack purchase and reveal flow design
- reward NFT and redemption-right model
- AI-agent log panel
- proposal and requirements documents

## Legal Note

The demo uses generic trading-card collectible language and no official card artwork. Production launch requires legal review for trademark, copyright, random-sale rules, consumer protection, payment, KYC, and redemption operations.

# PackProof Fairness Auditor /agent-guide

## Capability Summary

- Capability name: PackProof Fairness Auditor
- Capability ID: `packproof-fairness-auditor.demo`
- Primary track: Animoca / Consumer & Viral DApps
- Secondary positioning: Mantle RWA for physical collectible redemption rights
- Activation message: `Use PackProof to audit a collectible mystery pack before I buy or open it.`

PackProof Fairness Auditor is a Minds Bazaar capability that lets another user's Mind inspect a PackProof pack before the user interacts with the web DApp. It summarizes published odds, inventory commitments, probability hashes, AI-agent health logs, reward/redemption status, and Mantle proof evidence.

## Supported prompts

Use these prompts in Telegram or email after equipping the capability:

1. `Audit pack mantle-genesis-001 before I buy it.`
2. `Explain the inventory root, odds hash, and AI health score.`
3. `Is this PackProof pack fair enough to open?`
4. `Verify reward status for reward-s from pack mantle-genesis-001.`
5. `Create a judge-friendly proof summary for PackProof.`

## Required Inputs

- Pack ID, for example `mantle-genesis-001`.
- Optional reward ID when checking redemption status.
- Optional transaction hash or contract address after deployment.

If the user does not provide a pack ID, ask for one. Do not invent pack, reward, contract, or transaction data.

## Expected Outputs

The Mind should return a concise response with:

- pack name and current status;
- published odds and remaining supply;
- inventory root and probability hash;
- latest AI-agent score and short interpretation;
- Mantle proof status for ownership, reveal, reward, and agent logs;
- redemption and legal/custody caveats for physical collectibles;
- a short recommendation such as `safe to inspect`, `wait for deployment evidence`, or `do not proceed`.

## Failure cases

- Unknown pack ID: ask for a valid pack ID and do not continue.
- Missing contract address: mark on-chain proof as pending and explain that the current data is demo-only.
- Low AI score: identify which signal failed, such as valuation, pack balance, or fairness monitoring.
- Redemption uncertainty: separate on-chain reward ownership from off-chain fulfillment, custody, and legal review.
- Unsupported request: explain the supported prompts and ask the user to rephrase.

## Demo script

1. A non-builder user equips `PackProof Fairness Auditor` from Minds Bazaar.
2. The user asks: `Audit pack mantle-genesis-001 before I buy it.`
3. The Mind summarizes the inventory root, probability hash, published odds, AI health score, and MVP limitations.
4. The user opens the PackProof web app and reviews the same proof panel.
5. The user opens a sample pack and receives a reward NFT preview.
6. The Mind produces a judge-friendly summary connecting the consumer flow to Mantle proof and physical collectible RWA redemption.

## Live vs Demo Data

- The current UI uses demo pack, reward, and AI-agent data.
- The contract in `contracts/PackProof.sol` is a hackathon skeleton.
- Bazaar public ID, live app URL, Mantle contract address, and demo video URL must be filled after deployment and publishing.
- Production launch requires legal review for trademark, copyright, random-sale rules, consumer protection, KYC/AML where applicable, custody, fulfillment, and redemption disputes.

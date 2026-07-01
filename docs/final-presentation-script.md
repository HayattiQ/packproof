# PackProof Final Presentation Script

Use this as the canonical five-minute English talk. It is written to sound clear, direct, and judge-friendly rather than over-polished.

## One-Sentence Pitch

PackProof makes physical collectibles verifiable: a collector snaps a PSA-graded card, our AI authenticates it, and Mantle records the proof so authenticity, custody, provenance, and pack fairness can be independently checked.

## Canonical Five-Minute Script

### 0:00-0:30 - Opening

Good afternoon. I am presenting PackProof.

In one sentence: PackProof makes physical collectibles verifiable.

Today, if you buy a PSA-graded trading card online, you are still relying on trust. You can see a slab, a label, and a certification number, but at the point of trade you cannot cryptographically verify that the physical card in front of you is the same asset that was certified, authenticated, and sold before.

PackProof solves that by combining AI authentication, RWA tokenization, and Mantle settlement.

### 0:30-1:20 - Problem

The collectible-card market has three trust problems.

First, authenticity. Counterfeit slabs and altered labels are a real concern, and buyers often need to rely on screenshots, seller reputation, or manual expert review.

Second, provenance. Ownership history is fragmented across marketplaces and messages. There is no portable record that follows the asset.

Third, fairness. Mystery packs and live-break mechanics are popular, but buyers usually cannot verify that the odds they were shown are the odds they actually received.

So the market needs more than another marketplace. It needs a proof layer for physical collectibles.

### 1:20-2:20 - Solution

PackProof is that proof layer.

The user flow is simple. A collector uploads a photo of a PSA slab and enters the cert number. Our AI pipeline reads the label, checks the cert against PSA's public registry, inspects the slab for counterfeit or alteration risk, and estimates a confidence-banded market value.

If the card passes, PackProof mints an external NFT on Mantle. That token carries the cert number, grade, owner, valuation snapshot, custody state, and the hash of the authentication report.

The important part is that the AI output is not just text on a screen. The structured report is linked to an on-chain hash, and the agents' outputs can be audited later.

PackProof also has two honest custody tiers. A custodial card is vaulted, redeemable, and marketplace-tradable. A non-custodial card stays with the owner and is treated as provenance only. The platform does not pretend it can sell what it cannot deliver.

### 2:20-3:15 - Why Mantle And AI

Mantle is not just a deployment target here. It is the system of record.

Each card registration can write an authentication proof. Each transfer extends the provenance chain. Each pack reveal can be checked through a public `verifyReveal` view. This only makes sense if the cost is low enough to verify every asset and every action, which is why Mantle is a good fit.

AI also plays a real role. It is not a chatbot wrapper. We use four agents: authentication, pricing, compliance, and fairness monitoring. The authentication agent gates minting. The pricing agent supports marketplace logic. The compliance agent flags AML, jurisdiction, and fraud signals. The fairness monitor checks pack-reveal distributions.

And because the PSA registry remains the source of truth, AI optimism cannot override a failed registry match.

### 3:15-4:20 - Demo Talk Track

Let me show the live flow.

This is the PackProof app. Notice that the user does not need to connect a wallet. The happy path is photo-first and collector-friendly.

On the registration flow, the user provides the slab image and cert number. PackProof runs the AI checks, then mints the external card NFT and records the agent attestations.

Here is the verification surface. With token `1`, we can see the PSA registry match, the authentication-report hash check, the custody state, and the provenance chain.

Now for packs. PackProof uses a commit-reveal design. The result can be recomputed with `verifyReveal`, so the buyer can verify that the revealed reward matches the prior commitment.

The live deployment is on Mantle Sepolia, chainId `5003`. The four contracts are deployed, and the README records the contract addresses and real transaction hashes for card mint, pack purchase, and reveal.

### 4:20-5:00 - Business And Close

The business model is direct: tokenization fees, marketplace take-rate, custody and redemption service fees, pack-open fees, and premium verifier tools for dealers and breakers.

We start with PSA-graded cards because the asset class is concrete, valuable, and already depends on authentication. But the same schema can extend to other graded physical assets.

PackProof is not just an NFT marketplace. It is a way to make physical collectibles machine-verifiable.

The core idea is simple: AI checks the asset, Mantle records the proof, and anyone can verify it later.

PackProof turns "trust me" into "check it."

Thank you.

## Words To Avoid

- Do not say "mainnet" unless the deployment is actually on Mantle mainnet.
- Do not say "ERC-4337" unless the flow has been upgraded from the current relayer pattern.
- Do not say "published Bazaar Skill" until the Skill is actually published and the real ID is recorded.
- Do not say "physical vault is live" unless real custody operations exist.
- Do not say "PSA partner" or imply PSA affiliation.

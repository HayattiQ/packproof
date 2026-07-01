---
marp: true
title: PackProof Final Presentation
description: Final-judge presentation deck source for PackProof
paginate: true
---

# PackProof

## Verifiable trust for physical collectibles

AI-authenticated RWA tokenization for PSA-graded cards on Mantle.

**Core claim:** PackProof turns authenticity, custody, provenance, and pack fairness into checks that anyone can verify.

---

# The Problem

Graded collectibles still trade on trust.

- Buyers see a slab, a label, and a cert number, but cannot cryptographically verify that the physical card matches the certified asset.
- Provenance is fragmented across screenshots, marketplace listings, and memory.
- Mystery-pack and live-break mechanics create another trust gap: buyers cannot independently verify the odds or the reveal.

**High-value physical collectibles need portable proof, not just reputation.**

---

# The Product

PackProof is a photo-first marketplace and tokenization flow.

1. A collector uploads a PSA slab photo and cert number.
2. AI checks the label, PSA registry match, counterfeit risk, and value range.
3. If the card passes, PackProof mints an external NFT on Mantle.
4. The NFT carries the cert, grade, custody state, valuation snapshot, and authentication-report hash.
5. Users can trade custodial assets, open provably-fair packs, and verify the result.

**No wallet pop-up is required in the happy path.**

---

# Why AI Matters

AI is not a chatbot wrapper. It is the gatekeeper for the RWA workflow.

- **Authentication Agent:** OCR, PSA cross-check, image-match, counterfeit risk.
- **Pricing Agent:** confidence-banded valuation.
- **Compliance Agent:** AML, sanctions, jurisdiction, fraud signals.
- **Fairness Monitor:** pack-reveal distribution checks.

Every structured output can be hashed and recorded on-chain, so the judge does not have to trust the model blindly.

---

# Why Mantle Matters

Mantle is the settlement and attestation layer.

- Each card registration can write a proof hash on-chain.
- Each ownership transfer becomes part of the provenance chain.
- Pack reveals use a commitment and public `verifyReveal` check.
- Low gas makes per-card and per-attestation settlement practical.

PackProof uses Mantle because the product only works if verification is cheap enough to happen every time.

---

# Live Evidence

The demo is not only a mockup.

- Live app: `https://packproof.yourbright.workers.dev`
- Network: Mantle Sepolia, chainId `5003`
- Deployed contracts: `ExternalCardNFT`, `PackManager`, `RewardNFT`, `AttestationLog`
- Real recorded txs: card mint, pack purchase, pack reveal
- Verify API currently returns `revealVerified: true` for token `1`

Important honesty notes: Sepolia testnet, sponsored signing is a relayer approximation, and custody is attested in the demo rather than a production vault.

---

# Business

PackProof starts with PSA-graded cards because the asset class is concrete, valuable, and already depends on authentication.

- Tokenization fee per card.
- Marketplace take-rate.
- Custody and redemption service fees.
- Pack-open fee.
- Premium verifier and authenticity-attestation tier for dealers and breakers.

The wedge is collectors and small dealers who already feel counterfeit, provenance, and liquidity pain.

---

# Closing

PackProof is not just another NFT marketplace.

It is a proof layer for physical collectibles:

- AI checks the asset.
- Mantle records the proof.
- Custody rules prevent false sale claims.
- Pack fairness can be independently recomputed.
- Humans and agents can verify the same evidence.

**PackProof turns "trust me" into "check it."**

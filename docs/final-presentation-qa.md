# PackProof Final Presentation Q&A

Use short answers first. If the judge wants more depth, then expand.

## What exactly is PackProof?

PackProof is an AI-powered RWA platform for PSA-graded collectible cards. It authenticates a physical card, mints an external NFT on Mantle, and makes authenticity, custody, provenance, and pack fairness independently verifiable.

## Why does this need blockchain?

Because the core problem is shared verification between parties that do not fully trust each other. A normal database can store the operator's claim, but Mantle lets anyone check the asset record, ownership history, custody state, report hash, and pack reveal result independently.

## Why Mantle specifically?

PackProof needs cheap verification at high frequency. Each card registration, proof hash, transfer, attestation, and pack reveal should be economical. Mantle's low gas and fast settlement make per-card and per-attestation verification practical.

## What is the AI doing?

The AI reads the slab, checks the PSA registry, evaluates counterfeit or altered-label risk, estimates a value range, assists compliance checks, and monitors pack-reveal fairness. It is part of the RWA workflow, not a cosmetic assistant.

## How do you prevent AI hallucination?

AI does not override the source of truth. A failed PSA registry match blocks minting. The system uses confidence bands, threshold-based review, and structured report hashes so later verification can compare the stored claim against the report.

## Is the PSA integration live?

The architecture has pluggable adapters. The demo can run deterministically with mock adapters, and real PSA/OCR/valuation adapters require credentials and API access. The important design point is that the AI pipeline and on-chain proof path are separated, so real data sources can replace mocks without changing the verification model.

## Are you affiliated with PSA?

No. PackProof uses PSA cert data as a verification input and does not claim affiliation, endorsement, or partnership with PSA.

## What is the NFT actually representing?

It represents a real PSA-graded collectible card record. The token stores the cert hash, grade, valuation snapshot, report hash, custody state, and redemption state. It is an external NFT because it references a physical off-chain asset.

## How do you avoid selling a card you do not physically control?

PackProof has two custody tiers. Custodial cards are vaulted, redeemable, and marketplace-tradable. Non-custodial cards are provenance attestations only and are not marketplace-tradable. Listing eligibility is enforced by the contract.

## Is custody live in production?

No. In the hackathon demo, custody is represented as an attested on-chain state and labeled clearly. Production would require real vault operations, insurance, legal process, and redemption fulfillment.

## Why not just use a marketplace escrow?

Escrow solves one transaction. PackProof creates a persistent proof layer: authentication report, ownership history, custody state, and pack fairness follow the asset and can be checked later by buyers, marketplaces, or agents.

## How does pack fairness work?

The pack system publishes a commitment before reveal. After reveal, `verifyReveal` recomputes the result and checks that it matches the stored result. This gives buyers an independent way to verify the reveal rather than trusting a screenshot.

## Is the pack system fully tamper-proof?

It is a commit-reveal design with public verification. It is not yet VRF-hardened, so the production roadmap would add stronger randomness. The current design is honest about that boundary and is still much more verifiable than opaque random sales.

## What is live today?

The app is publicly reachable at `https://packproof.yourbright.workers.dev`. The contracts are deployed on Mantle Sepolia, and the README records live contract addresses and real transaction hashes for a card mint, pack purchase, and reveal. The verify endpoint currently works for token `1`.

## Why start with PSA-graded cards?

They are a well-bounded asset class with unique cert numbers, known value, real collector demand, and a strong authenticity problem. That makes them a good first vertical for RWA tokenization.

## Can the system support other physical assets?

Yes. The external NFT schema includes an `assetClass`, so PSA cards are the first use case. The same pattern could extend to other graded collectibles with reliable identifiers and verification sources.

## What is the business model?

Tokenization fee per card, marketplace take-rate, custody and redemption service fees, pack-open fees, and premium verifier/authenticity tools for dealers and breakers.

## Who is the first customer?

Collectors and small dealers who already feel counterfeit, provenance, and liquidity pain. They need portable proof that helps them sell trusted inventory and reassure buyers.

## What makes this different from an NFT marketplace?

A normal NFT marketplace usually starts with a token. PackProof starts with the physical asset and only mints after AI authentication. The token is not the product by itself; it is the verifiable record of authenticity, custody, and provenance.

## What makes this different from a grading company?

PackProof does not replace PSA. It uses PSA as an authoritative verification input and adds an on-chain proof layer around ownership, custody, report hashing, and pack fairness.

## What is the biggest risk?

Operational trust around real custody is the biggest production risk. That is why PackProof separates custodial assets from non-custodial provenance and only allows marketplace sale for custodial cards.

## What would you build next?

First, publish the verifier Skill with a real public ID. Second, connect production PSA/OCR/valuation credentials. Third, harden pack randomness with VRF. Fourth, build real custody operations with clear redemption and insurance processes.

## Give us the one-line closing again.

PackProof turns "trust me" into "check it": AI checks the asset, Mantle records the proof, and anyone can verify the result.

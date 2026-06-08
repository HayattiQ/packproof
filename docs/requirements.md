# PackProof Requirements

## Objective

PackProof is an **AI-powered RWA platform for graded collectible trading cards, settled on Mantle**. Its own sales/collectibles platform is the core product. The headline RWA workflow: a collector submits a photo of a **PSA-graded card** plus its cert number, an **AI authentication pipeline** verifies it against PSA's public registry and the physical slab, estimates value, and mints an **external NFT** on Mantle that represents — and is redeemable for — the real card. On top of this tokenized inventory, the platform also sells **provably-fair mystery packs** and runs a **marketplace** for the resulting NFTs. Anyone (human or another AI agent) can independently verify authenticity, fairness, and provenance — including via a **verify Skill published to the Minds Bazaar**.

Built for the Mantle Turing Test Hackathon 2026, targeting the **AI × RWA track** (scored Part A Mantle-general 50 + Part B RWA-specific 50). Track path = **Path B (RWA Application)**: a defined asset class (PSA-graded cards), defined users (collectors/buyers), and a complete asset-discovery → on-chain-position UX with no deep Web3 knowledge required. Path-A infrastructure properties (a reusable, multi-asset tokenization flow) are also satisfied and called out, but the project is declared and scored as an Application.

> **Evidence-first rule.** A skeptical judge scores **artifacts, not aspirations.** Every "MUST" here is a gate on a shippable artifact (deployed address, txhash, a real PSA cert tokenized end-to-end, live URL, passing test). A requirement is **not met** until its artifact is recorded in the **Submission Evidence** table at the end of this doc. Prose earns nothing on the execution-weighted dimensions; only the artifact does.

> **Current repo gap (must close before judging).** The repo is a static Next.js demo: hardcoded data in `src/lib/packproof-data.ts`, a deterministic `pickReward(openCount % 4)` in `src/components/PackProofApp.tsx`, a literal **"Connect wallet"** button, and `contracts/PackProof.sol` is a **skeleton** with no tests, no deploy script, no toolchain config, no recorded addresses, block-derived reveal entropy, no commitment check, and **no verify view function**. There is **zero** PSA-authentication / external-NFT / AI-pricing / compliance / custody / Minds-Bazaar code. The requirements below define what MUST exist; the Submission Evidence table tracks closure of each gap.

---

## Target Asset Class & Users (Path B — RWA Application)

### Asset class
**PSA-graded collectible trading cards** (sports + TCG). Legally coherent and well-bounded: these are consumer collectibles authenticated by an established third-party authority (PSA), each carrying a unique cert number resolvable in PSA's public cert-verification registry. The asset class is *not* a security; the regulatory surface is authenticity/anti-counterfeit, AML on high-value items, consumer protection on the random-pack mechanic, and custody — all addressed below.

### The real-world problem
- **Authenticity is unverifiable at the point of trade.** Counterfeit slabs and label tampering are a known, growing problem; a buyer cannot cryptographically confirm a card is the PSA-certified card it claims to be.
- **Provenance and ownership history are off-chain and lossy.** Cards change hands with no portable, tamper-proof record.
- **Liquidity and trust are manual and expensive** (live "breaks," escrow services, on-camera reveals) because there is no shared, verifiable settlement layer.

### Users
- **Collector / seller (PRIMARY):** registers PSA-graded cards as external NFTs, sells or holds them, opens packs. Genuine, large demand — the graded-card market is multi-billion-dollar with millions of certs issued.
- **Buyer:** buys external NFTs on the marketplace or opens provably-fair packs; receives a card whose authenticity, value basis, and provenance are on-chain and independently verifiable.
- **Verifying agent / auditor:** any human or Mind that wants to confirm a card's authenticity/fairness/provenance — served by the public verify view and the Bazaar verify Skill.
- **Operator (us):** runs the platform, the AI pipeline, and the custody/escrow relationship.

---

## Product Surfaces

1. **PackProof platform (PRIMARY, self-owned):** the web/app product where collectors register cards, buy/sell, and open packs. The judged hero and the business.
2. **PSA External-NFT registration (the RWA tokenization core):** the AI-driven asset-identification → on-chain-representation flow. See its own section.
3. **Provably-fair mystery packs (secondary product line):** commit-reveal pack sales over the tokenized inventory.
4. **Mantle settlement layer:** smart contracts that are the system of record for tokenization, ownership, transfer, packs, and AI-output attestations.
5. **Verify Skill on the Minds Bazaar (feature, distribution + auditability):** a reusable Capability any Mind can equip to independently verify a PackProof NFT or PSA cert. Demoted from "the product" to "an auditability/ distribution channel" — it makes the platform's claims externally checkable by agents.

---

## Functional Requirements — PSA External-NFT Registration (RWA core)

The AI plays a **substantive, non-cosmetic role**: it gatekeeps tokenization, drives pricing, and assists compliance. Every AI decision produces a structured **authentication report** whose hash is written on-chain, so the output is **verifiable and auditable**, not a black box.

### Submission & AI authentication pipeline
- User submits one or more **photos of the PSA slab** (front/back) and the **cert number** (typed, or read from the photo).
- **AI pipeline (full depth — all four stages MUST run):**
  1. **OCR / extraction.** Read the cert number, declared grade, card label, and PSA flatlabel fields from the slab image.
  2. **PSA cross-check.** Resolve the cert number against **PSA's public cert-verification registry**; confirm the card identity and grade match the registry record. A cert that does not resolve, or whose registry record contradicts the photo, is **rejected** (not minted).
  3. **Image matching.** Compare the submitted photo against the registry's reference image(s) and check slab/label consistency (font, layout, holo, label position) to flag likely **counterfeit or altered slabs**. Produce a confidence score.
  4. **Valuation.** Estimate a market-value range with a confidence band from comparable recent sales for that card+grade.
- Output: a structured **authentication report** (cert number, identity match, grade match, counterfeit-risk score, value range, model/version, timestamp). The report is stored off-chain; **its content hash is written on-chain** with the mint.
- **Eligibility gate:** mint only if PSA cross-check passes AND counterfeit-risk is below threshold. Borderline cases route to manual review. The gate logic MUST be explicit and testable.

### External NFT representation
- On success, mint an **external NFT** on Mantle representing the physical card, carrying: cert number, card identity, grade, owner, **authentication-report hash**, valuation snapshot, custody state, and redemption state.
- "External" = represents a real, off-platform physical asset (vs. internal pack-reward NFTs). The standard MUST support **multiple asset classes later** (the schema is asset-class-parameterized), satisfying the Path-A infrastructure-scalability criterion.
- The same cert number MUST NOT be tokenized twice (uniqueness enforced on-chain).

### Custody & physical–digital binding (RWA honesty — required)
PackProof supports **two tiers, both first-class**, distinguished by an on-chain custody state:
- **Custodial / vaulted (tradable).** The physical card is held in a defined custody arrangement; the external NFT is redeemable for it 1:1, and redemption burns/locks the NFT. **Only custodial NFTs are listable/sellable on the marketplace** — because only here can the platform guarantee that transferring the token transfers the asset.
- **Non-custodial provenance (not tradable).** The card stays with the owner; the NFT is an authenticity + provenance attestation, explicitly **NOT** a custodial or delivery claim. It is **not marketplace-tradable** — it serves verification, display, and history only. A holder can later **upgrade to custodial** by vaulting the card.
- The custody state is on-chain, and the platform **MUST** reject any attempt to list a non-custodial token for sale, so the digital ⇄ physical binding is never misrepresented. The doc MUST state which tier(s) the demo exercises.

---

## Functional Requirements — Provably-Fair Packs (secondary)

- **Commit:** operator publishes an on-chain commitment (hash of pack inventory + seed) before sale; odds/contents locked first.
- **Purchase/settle:** buyer purchases in MNT on Mantle; ownership of the sealed pack recorded.
- **Reveal:** result is cryptographically bound to the prior commitment (production design: two-phase commit-reveal, optionally VRF-hardened; block-entropy alone is interim and MUST NOT be claimed as tamper-proof).
- **Reward:** reward NFT minted; may grant or reference an external (graded) card NFT from the tokenized inventory.
- **Redeem:** idempotent on-chain redemption; no double-redeem.
- **Verify:** a public `verifyReveal(packTokenId)` view recomputes the result from the committed seed+inventory and returns a match boolean. This same primitive underlies the verify Skill.

---

## Functional Requirements — Marketplace & Mantle Contracts

- List / buy / transfer external NFTs and reward NFTs; settlement in MNT on Mantle; ownership and transfer history are the on-chain record of provenance.
- **Listing eligibility is enforced on-chain: only NFTs in the custodial/vaulted state may be listed or sold. Non-custodial provenance NFTs cannot be listed** (transfer of provenance ownership is allowed, but not platform sale).
- Contracts (system of record): external-NFT registry (with cert uniqueness + custody/redemption state), reward NFT, commit-reveal pack manager, **AI-attestation log** (`recordAgentLog`: agent ID, asset/pack ID, input hash, output hash, score, timestamp), and the **public verify views**.
- Admin/operator functions access-controlled; no hardcoded secrets.

---

## Functional Requirements — Verify Skill (Minds Bazaar feature)

- A Capability published to the Minds Bazaar that any Mind can equip with zero builder context to: given a PackProof NFT id or a PSA cert number, return (a) does the on-chain record match PSA's registry, (b) does the authentication-report hash verify, (c) for pack rewards, does `verifyReveal` pass, (d) the provenance/transfer chain.
- This is the project's **auditability + distribution** play, not its core. It demonstrates that the platform's AI/fairness outputs are externally checkable by other agents.
- Self-documenting via an `/agent-guide` (inputs, what to ask the user, where proofs live, success criteria) and a recorded public Skill name + ID.

---

## AI System (substantive AI × RWA depth)

Four agents; every output is hashed on-chain (verifiable/auditable):

1. **Authentication Agent** — OCR + PSA cross-check + counterfeit/image-match. **Drives tokenization eligibility** (decides what may be minted).
2. **Pricing Agent** — value-range estimation from comparables; **feeds marketplace pricing and collateral logic.**
3. **Compliance Agent** — screens for AML/sanctions and restricted jurisdictions, flags value thresholds that trigger enhanced KYC, and surfaces counterfeit/fraud signals. **AI assists the compliance workflow** (a scored bonus in the rubric).
4. **Fairness Monitor** — analyzes pack reveal history for abnormal distributions.

AI is **non-cosmetic**: it gatekeeps minting, sets prices, and assists compliance — not a chatbot wrapper. Accuracy guardrails: AI authentication is decision-support with an explicit confidence band; a failed PSA cross-check is authoritative and overrides AI optimism; counterfeit calls above threshold require human confirmation before mint.

---

## Compliance & Custody Requirements (rubric dimension, 10 pts)

- **Asset-class posture:** graded collectibles are consumer goods, not securities; the doc states this and scopes the regulatory surface accordingly.
- **KYC/AML:** platform-level KYC; AI-assisted AML/sanctions screening on registration and on high-value trades; configurable value thresholds for enhanced diligence.
- **Anti-counterfeit:** AI image-match + PSA cross-check as the authenticity control; rejected/again-flagged items are logged.
- **Custody:** two honest tiers (above) — custodial/vaulted (redeemable, tradable) and non-custodial provenance (attestation only, non-tradable). Marketplace sale is gated to custodial state on-chain, so a token can never be sold without a guaranteed physical claim behind it; the NFT never misrepresents the binding.
- **Random-sale consumer protection:** packs disclose odds; the commit-reveal makes disclosed odds verifiable — framed as proactive consumer-protection compliance.
- **Jurisdiction:** restricted-jurisdiction screening; production legal review noted.

---

## Why Mantle Is Strategic (Ecosystem Fit + Mantle Integration)

Mantle is the **settlement/execution layer**, not just a deploy target:
- **Low gas + fast finality** make it economically viable to (a) write an **AI-attestation hash on-chain for every registration**, (b) settle **per-card** tokenization and high-frequency micro-trades individually, and (c) run cheap pack-opens. The model only works because per-action on-chain cost is negligible — a property that meaningfully differs from deploying on a high-fee chain.
- **Asset/DeFi-CeFi complementarity:** authenticated, valued external NFTs are composable collateral/liquidity primitives other Mantle protocols can consume; the external-NFT standard is exposed as a reusable building block.

---

## Business / GTM / Tokenomics

- **Market / PMF:** the graded-card market is multi-billion-dollar with millions of certs and acute, unmet needs for portable authenticity, provenance, and liquidity. Demand for the provably-fair pack mechanic is already proven by existing (unregulated) provably-fair sites.
- **Revenue:** registration/tokenization fee per card; marketplace take-rate (1–3%); custody/escrow fee; per-open pack fee; a premium **authenticity-attestation / verifier** tier sold to dealers and breakers. Marginal cost per action ≈ Mantle gas + AI inference — small — so margins scale with volume, not headcount. No speculative token in v1.
- **GTM:** land with collectors and small dealers who feel counterfeit/provenance pain; distribute auditability through the **Minds Bazaar verify Skill** (agents bring their users); expand to breakers and grading-adjacent partners; a public **authenticity badge + verifier page** creates a network effect.

---

## Non-functional Requirements

### Security & code quality
- No hardcoded secrets; admin/operator functions access-controlled; reentrancy/double-spend/double-redeem guarded; cert-uniqueness enforced on-chain; tests for the tokenization, pack, and verify paths.

### UX / accessibility (Path-B end-to-end, low Web3 friction)
- Asset-discovery → on-chain-position with no deep Web3 knowledge: photo upload, plain-language status, **account-abstraction / sponsored signing so the happy path has no wallet pop-up**. The **"Connect wallet" button MUST be removed** from the consumer happy path. Onboarding works for a Web2 collector.

### Legal / IP hygiene
- Demo uses original/placeholder card art or properly-cleared images; no official trademarks/artwork misuse. PSA data is used for verification only and attributed; the platform does not claim affiliation with or endorsement by PSA.

### Accuracy guardrails
- AI authentication is decision-support with confidence bands; PSA registry cross-check is authoritative; valuations are ranges, never guaranteed prices; the docs do not claim AI alone proves authenticity.

---

## Demo & Submission Requirements

- **Working MVP deployed on Mantle**; demo shows a **real PSA cert tokenized end-to-end on-chain**: photo+cert in → AI report → external NFT minted → visible on a live explorer with the matching txhash, then a marketplace transfer and/or a provably-fair pack open + `verifyReveal`.
- **Open-source repo** with clear setup instructions and the **deployed contract address**.
- Live, public **URL** for the platform; the verify Skill published to the Bazaar (name + ID).
- No-wallet happy path demonstrated.

### Submission Evidence (MUST be complete before judging)

| Artifact | Status | Evidence at submission |
| --- | --- | --- |
| Contracts deployed on Mantle | Skeleton only; not deployed | Explorer address + txhashes for mint/transfer/pack/verify |
| PSA AI pipeline (OCR→cross-check→image-match→valuation) | Not implemented | A real cert tokenized end-to-end; authentication report + on-chain hash |
| External-NFT registry + cert uniqueness | Not implemented | Source + a mint blocked on duplicate cert |
| Custody/redemption model | Not implemented | Documented model + a working redeem (burn/lock) |
| `verifyReveal` + recompute | Not implemented | Source + a live reveal verified |
| Compliance screening (AI-assisted) | Not implemented | KYC/AML/jurisdiction + counterfeit flag in the flow |
| Sponsored-signing (no wallet step) | Not implemented; wallet button present | Relayer + wallet-free happy-path recording |
| Live platform URL + deployed address | Not deployed | Public URL + address in README |
| Bazaar verify Skill | Not published | Public Skill name + ID, publish-form screenshot |
| Demo video | Not recorded | Real asset live on-chain, end-to-end |

Until an artifact exists, its execution-weighted dimension does not score; state this plainly rather than asserting completion.

---

## Acceptance Criteria (mapped to the AI × RWA rubric)

### Part A — Mantle general (50)
- **Technical (15):** tokenization + pack + verify run end-to-end on Mantle; tested; deployed address recorded.
- **Ecosystem fit (10):** Mantle used as settlement layer; external-NFT standard composable by other protocols.
- **Business potential (10):** clear PMF, revenue, GTM via Bazaar distribution.
- **Innovation (10):** AI-authenticated, agent-verifiable RWA tokenization of graded cards + provable-fairness packs — not a fork.
- **UX (5):** no-wallet, photo-first onboarding for Web2 collectors.

### Part B — AI × RWA (50)
- **AI × RWA integration depth (15):** AI gatekeeps tokenization, drives pricing, assists compliance; every output hashed on-chain (verifiable).
- **Mantle integration (10):** settlement/execution layer; per-card + per-attestation economics only viable on low-gas Mantle.
- **Compliance awareness (10):** asset-class posture, KYC/AML, anti-counterfeit, custody honesty, random-sale consumer protection, jurisdiction; AI-assisted compliance for bonus.
- **Path B — RWA Application (10):** PSA-graded cards as a defined, legally-coherent asset class; collectors/buyers with genuine demand; complete asset-discovery → on-chain-position UX without deep Web3 knowledge. (Path-A scalability — multi-asset-class schema, reusable tokenization flow — also satisfied.)
- **Execution & demo (5):** MVP deployed on Mantle; live demo shows a real PSA card represented and managed on-chain; open-source repo + deployed address.

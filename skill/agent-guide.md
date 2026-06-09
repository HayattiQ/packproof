# /agent-guide — PackProof Verifier (Minds Bazaar Skill)

> **Status: scaffold.** A human finishes the `PLACEHOLDER_*` fields in
> `skill.json` and flips the handler from the mock reader to the live viem
> reader before publishing. The behaviour, inputs, and recompute algorithms
> below are final.

---

## Intent

Let any Mind — with zero context from PackProof's builders — **independently
verify** a PackProof collectible. Given a token id or a PSA cert number, the
Skill answers four questions a skeptical buyer or auditor would ask:

1. **PSA match** — does PackProof's on-chain record match PSA's public
   cert-verification registry (identity + grade)?
2. **Authentication-report-hash check** — does the AI authentication report's
   hash re-derive from the report content and equal the hash written on-chain at
   mint?
3. **verifyReveal** (pack rewards only) — does the reveal recompute from its
   pre-sale commitment, proving the odds you were told are the odds you got?
4. **Provenance** — the on-chain transfer chain for the token.

The Skill is **read-only**. It never sends a transaction, never mutates state,
and never custodies anything. It reads the Mantle chain and the PSA registry.

PackProof claims **no affiliation with or endorsement by PSA**; the registry is
used for verification and attribution only.

---

## Required inputs

Exactly one of:

| Input        | Type   | Notes |
| ------------ | ------ | ----- |
| `tokenId`    | string | A PackProof external-NFT or reward-NFT token id. |
| `certNumber` | string | A PSA cert number; resolved to a token via `tokenIdForCert`. |

If both are supplied, `tokenId` wins. If neither, the Skill returns an error
asking for one.

---

## What the Mind asks the user

Keep it to one question, in plain language:

> "Send me either a **PackProof token id** or a **PSA cert number** (the number
> printed on the slab label) and I'll verify the card's authenticity, fairness,
> and provenance against the Mantle chain and PSA's registry."

Follow-ups only if needed:
- If the user pastes a marketplace URL or an explorer link, extract the token id
  from it.
- If a cert number does not resolve, tell the user the card is **not tokenized
  on PackProof** (not that it is fake) and stop.

---

## Where the proofs live

| Proof | Source of truth |
| ----- | --------------- |
| Token record (cert#, identity, grade, owner, custody state, `authReportHash`) | PackProof external-NFT registry on Mantle (`externalNft(tokenId)` view). |
| Reward record (packId, rank, rewardId) | PackProof reward registry + the `PackRevealed` event. |
| Commitment + revealed seed/inventory | On-chain commit-reveal data for the pack token; `verifyReveal(packTokenId)` view. |
| Authentication report (full content) | **Off-chain** report store / IPFS. Only its **hash** is on-chain. |
| PSA identity + grade | PSA public cert-verification registry (`PSA_REGISTRY_BASE_URL`). |
| Provenance | `Transfer` event logs for the token id. |

Network + addresses are configured in `skill.json` (`network.*`) and via env
vars (`PACKPROOF_RPC_URL`, `PACKPROOF_CONTRACT_ADDRESS`,
`PACKPROOF_CHAIN_ID`, `PSA_REGISTRY_BASE_URL`).

---

## Recompute algorithms (verbatim — must match the minting/reveal pipeline)

These are the load-bearing parts. The on-chain hashes are reproducible **only**
if the serialization below is byte-identical to what PackProof used when it
minted/revealed. The handler implements exactly this; do not paraphrase.

### Authentication-report hash

Canonical serialization (`serializeAuthReport`): fields joined by `|`, in this
fixed order, then `keccak256` of the UTF-8 bytes.

```
PACKPROOF_AUTH_REPORT_V1
| certNumber
| cardIdentity
| grade
| identityMatch        ("true" | "false")
| gradeMatch           ("true" | "false")
| counterfeitRiskScore (decimal integer, 0..100)
| valueRangeUsd        ("<lo>-<hi>", decimal integers)
| model
| modelVersion
| timestamp            (Unix seconds, decimal)
```

```
authReportHash = keccak256( utf8( fields.join("|") ) )
```

**reportHashMatch passes** iff `authReportHash == on-chain authReportHash`.
Any change to field order, separators, or number formatting breaks the match.

### Pack reveal (mirrors `PackProof.sol` `revealPack` / `_rankFromEntropy`)

```
# 1. Commitment binding (odds locked before sale)
commitment = keccak256( utf8( revealedInventoryRoot | revealedSeed ) )
commitmentOk = (commitment == on-chain commitmentHash)

# 2. Reveal entropy
entropy = keccak256( utf8(
    blockPrevrandao | blockTimestamp | owner | packTokenId | userSalt
) )

# 3. Rank from entropy (basis points out of 10000)
roll = uint256(entropy) % 10000
rank = 1   if roll <  100      # ~1.0%   (S)
       2   if roll <  700      # ~6.0%   (A)
       3   if roll < 3000      # ~23.0%  (B)
       4   otherwise           # ~70.0%  (C)

# 4. Reward id
rewardId = keccak256( utf8( packId | packTokenId | rank | entropy ) )
```

**revealMatch passes** iff `commitmentOk` AND recomputed `rank` equals the
on-chain rank AND recomputed `rewardId` equals the on-chain `rewardId`.

> Note: block-derived entropy is the **interim** scheme in the skeleton
> contract and is **not** claimed tamper-proof; production hardens this with
> two-phase commit-reveal / VRF. The recompute is identical regardless.

---

## Success criteria

The Skill returns a `VerifyResult` (see `handler.ts`). Report to the user:

- **`verified: true`** only when every *applicable* check passed. A reward token
  has no PSA/report checks; an external NFT has no reveal check — non-applicable
  checks are `passed: null` and do not block the verdict.
- Surface each check individually so the user sees *what* passed:
  - `psaMatch` — registry confirms identity + grade.
  - `reportHashMatch` — recomputed hash equals on-chain hash.
  - `revealMatch` — reveal recomputes to the observed result.
- Report **custody state** for external NFTs and whether it is
  **marketplace-tradable** (custodial = tradable; non-custodial provenance =
  attestation only, not for sale).
- Report the **provenance** chain length and entries.
- A failed PSA cross-check is **authoritative** — never soften it with AI
  optimism. If a cert does not resolve, say "not tokenized / not found", not
  "counterfeit".

---

## Example invocation

### Over email

> **User:** "Can you check that this PackProof card is real? Cert PSA-58912043."
>
> **Mind (equips this Skill, calls `verify({ certNumber: "PSA-58912043" })`):**
> "Verified. PackProof token **1001** maps to PSA cert **PSA-58912043** — 2003
> SP Authentic #115, PSA 9 MINT. PSA registry match: **yes**. AI
> authentication-report hash: **valid** (recomputed = on-chain). Custody:
> **custodial** (redeemable 1:1, tradable on the marketplace). Provenance: 1
> transfer on record. This card's authenticity, valuation basis, and ownership
> history are all independently checkable on Mantle."

### Over Telegram

> **User:** `/verify 2002`
>
> **Mind (`verify({ tokenId: "2002" })`):**
> "Token **2002** is a pack-reward NFT. **verifyReveal: pass** — the reveal
> recomputes from the pre-sale commitment (rank matches, rewardId matches), so
> the odds you were quoted are the odds you got. Provenance: 1 transfer. Fully
> verified."

### Failure case

> **User:** "Verify cert 00000000."
>
> **Mind:** "I couldn't find a PackProof NFT for PSA cert **00000000** — this
> card isn't tokenized on PackProof, so there's nothing on-chain for me to
> verify. (That's not a statement about the physical card's authenticity.)"

---

## Implementation pointers (for the human finishing this)

- Entry point: `handler.ts` → `verify(input, reader?)`. `skill.json` references
  it via `handlerEntry: "verify"`.
- All chain access is behind the `OnChainReader` interface. `MockReader` runs
  today with deterministic fixtures; `ViemReader` is the live wiring with
  `TODO(human, pre-publish)` markers for the off-chain report fetch, the reward
  registry read, the provenance log scan, and the PSA registry call.
- Flip `USE_MOCK = false` in `handler.ts` and set the env vars to go live.
- The fallback `keccak256` in the mock path is **non-cryptographic** (labelled
  `__MOCK`); the live `ViemReader` path uses viem's real `keccak256`. Confirm the
  ABIs in `PACKPROOF_VERIFY_ABI` match the deployed contract's verify views.

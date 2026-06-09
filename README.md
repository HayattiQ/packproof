# PackProof

PackProof is an **AI × RWA platform for PSA-graded collectible cards on Mantle**. A collector photographs a PSA slab and enters its cert number; an AI pipeline authenticates the card against the PSA public registry, checks for counterfeit/altered slabs, and estimates value; if the card passes, PackProof mints an **external NFT on Mantle** carrying the cert number, grade, owner, a valuation snapshot, an on-chain hash of the authentication report, and the card's custody and redemption state. The whole happy path runs **without a wallet pop-up** (a backend relayer signs and sponsors transactions).

Hackathon target: **Mantle Turing Test 2026 — AI × RWA track, Path B (RWA Application)**. PSA-graded cards are a defined asset class with real collectors/buyers and a complete photo-first asset-discovery → on-chain-position UX. The reusable, parameterized tokenization schema (`assetClass`) also satisfies Path-A infrastructure properties.

> **Honesty notes (read these).** Several capabilities in this repo are real code but require human handoffs before they are "live", and a few are deliberate hackathon approximations:
> - **Contracts are LIVE on Mantle Sepolia (chainId 5003)** — the four addresses + deploy txhashes are recorded below and a real end-to-end flow (card mint, pack commit-reveal, on-chain `verifyReveal`) has been executed. The public **live web URL** is still a pending handoff.
> - **The verify Skill is not published.** `skill/skill.json` ships placeholder name/ID. The real Bazaar name + ID are filled in after publishing (a human handoff).
> - **"Sponsored signing / no wallet" is a relayer pattern, not ERC-4337.** A server-side key (`RELAYER_PRIVATE_KEY`) signs transactions on the user's behalf. This is a custodial-signer approximation of account abstraction, suitable for the demo only.
> - **"Custodial / vaulted" custody is an attested flag, not a physical vault.** There is no real bonded vaulting in a hackathon; the on-chain `Custodial` state is simulated/attested and labeled as such in code and UI.
> - **Out of the box the app runs on deterministic mock adapters** (`PACKPROOF_ADAPTERS=mock`) with no secrets and no network. Swapping in real PSA/OCR/valuation/LLM data requires credentials (human handoffs below).
> - **We never fake passing builds or tests.** See the "Build & test status" section for honest reporting guidance.

---

## Architecture overview

PackProof has three independently-owned parts:

### 1. Contracts — Foundry project under `contracts/` (Solidity ^0.8.24, Mantle Sepolia)

A multi-contract set (replacing the old single skeleton), all co-deployed:

- **`AttestationLog.sol`** — append-only on-chain log. The four AI agents (Authentication / Pricing / Compliance / Fairness Monitor) write `agentId + kind + subjectId + inputHash + outputHash + score + timestamp` so every AI output is auditable. Authorized writers only.
- **`ExternalCardNFT.sol`** — the RWA core. ERC-721 + Burnable + Ownable + ReentrancyGuard. Enforces **cert-number uniqueness on-chain**, stores the per-card record (certHash, grade, `reportHash`, valuation snapshot, custody, redemption, `assetClass`), exposes **two-tier custody** (`NonCustodial` provenance-only vs `Custodial` vaulted/redeemable/tradable), a `redeem` that burns/locks 1:1 and is idempotent, `upgradeToCustodial`, `setValuation`, and the views the marketplace + verify Skill rely on (`isListingEligible`, `getCard`, `verifyReport`). Listing eligibility (custodial + active only) is enforced on-chain.
- **`PackManager.sol`** — provably-fair mystery packs via **two-phase commit-reveal**. A commitment is published before sale; `revealServerSeed` checks `keccak256(abi.encode(serverSeed, inventoryRoot)) == commitment` (the check the old skeleton lacked); `revealPack` derives entropy from the **committed seed**, not block randomness; and a public **`verifyReveal(packTokenId)`** view recomputes the result against the commitment. NatSpec is explicit that this is an operator-committed-seed scheme, interim and not VRF-hardened.
- **`RewardNFT.sol`** — the internal pack-reward collection, kept distinct from the external RWA cards.
- **`script/Deploy.s.sol`** — deploys and wires all four, prints the addresses.

### 2. `src/` — Next.js 15 backend + frontend (React 19, App Router, TypeScript, `@/* → src/*`)

- **Adapter layer (`src/lib/ai/`, `src/lib/psa/`)** — every external integration (PSA registry lookup, OCR, image-match, valuation, LLM agents) sits behind a pluggable interface with a **deterministic mock adapter (default)** and a **real adapter (best-effort)**, selected by env. Mocks need no secrets and no network, so build/typecheck/tests pass out of the box.
- **Agents (`src/lib/agents/`)** — orchestrate the adapters into the four attestation agents and produce the canonical `AuthenticationReport`. `report.ts` computes the on-chain **`reportHash`** (the load-bearing cross-domain value).
- **Chain client (`src/lib/chain/`)** — viem read client + a **server-only relayer** that signs writes; when no relayer key is set it returns clearly-labeled `SIMULATED` receipts.
- **API routes (`src/app/api/`)** — `register`, `verify`, `packs`, `packs/[id]/open`, `marketplace/list`. Secrets/viem stay server-side; request/response shapes are shared zod types so the frontend cannot drift.
- **Frontend (`src/components/`)** — photo-first `RegisterCard`, `VerifyPanel`, `Marketplace`, `PackOpen`, `AgentPanel`, and the tab shell. **The "Connect wallet" button is removed**; the nav shows a "Sponsored signing · no wallet needed" status chip.

### 3. `skill/` — Minds Bazaar verify Capability

A thin, independently-shippable client over the same verify contract + on-chain views. Given a tokenId or PSA cert number it returns: PSA-registry match, authentication-report-hash verification, `verifyReveal` for pack rewards, and the provenance chain. It **recomputes the `reportHash` with the exact same algorithm** as the backend (documented verbatim in `skill/agent-guide.md`), so the Skill and platform always agree.

---

## Local development setup

Prerequisites: Node.js 20+ and a package manager (examples use `npm`; `bun` also works). Foundry is only needed for the contracts (see below).

```bash
# 1. install JS dependencies
npm install

# 2. create your local env from the template
cp .env.example .env.local
```

`.env.example` defaults to **mock adapters** (`PACKPROOF_ADAPTERS=mock`) with safe public defaults, so **no secrets are required to run the app**. Leaving `RELAYER_PRIVATE_KEY` empty makes on-chain writes return `SIMULATED` receipts that the UI labels clearly.

```bash
# 3. run the dev server (mock adapters, simulated on-chain writes — works out of the box)
npm run dev
```

Open http://localhost:3000. You can register a card, see the AI report, open a pack, verify a reveal, and view agent attestations entirely against deterministic mocks — no wallet, no network, no API keys.

### Type-check / lint

```bash
npm run typecheck   # === tsc --noEmit
npm run lint        # also === tsc --noEmit
```

### Unit tests (no network, no secrets)

```bash
npm test
```

Covers seed determinism, mock-adapter determinism, the authentication eligibility gate (eligible / `FAKE`-blocked / unresolved-cert rejected), and `reportHash` canonicalization stability.

### Switching mock → real adapters

Set `PACKPROOF_ADAPTERS=real` (or the per-stage flags) and supply the matching credentials in `.env.local`. Each real adapter falls back to mock if its key is absent, so partial configuration is safe. See `.env.example` for every variable and the **Human Handoff Checklist** for what each credential unlocks.

---

## Contracts: build & test (Foundry)

The Foundry project lives entirely under `contracts/` (configured via `foundry.toml` at the repo root) so it never collides with the Next.js `src/` directory.

```bash
# install Foundry once (if not present): https://book.getfoundry.sh/getting-started/installation

# install Solidity dependencies (forge-std + OpenZeppelin) into contracts/lib/
forge install foundry-rs/forge-std OpenZeppelin/openzeppelin-contracts --no-commit

# build
forge build

# run the contract test suite
forge test -vv
```

Tests assert the load-bearing RWA behaviors: duplicate-cert mint reverts, redeem burns and is idempotent, listing eligibility is custodial-only, the commit-reveal commitment check rejects a wrong seed, `verifyReveal` returns true after a real reveal, and unauthorized agent-log writes revert.

Deploying to Mantle Sepolia (chainId **5003**) is a human handoff requiring a funded key:

```bash
# env: PRIVATE_KEY (deployer = admin/operator), optional TREASURY_ADDRESS (defaults to deployer),
#      MANTLE_SEPOLIA_RPC_URL (e.g. https://rpc.sepolia.mantle.xyz)
forge script contracts/script/Deploy.s.sol:Deploy \
  --rpc-url mantle_sepolia --broadcast --slow --legacy --with-gas-price "$(cast gas-price --rpc-url "$MANTLE_SEPOLIA_RPC_URL")"
# prints the 4 contract addresses — paste them into .env.local and the table below.
# NOTE: Mantle Sepolia charges a sizeable L1 data fee per contract creation (~0.8 MNT for a
# large contract). Fund the deployer with several MNT. If a tx is rejected mid-run for
# insufficient funds, the script is resumable; remaining contracts can also be deployed with
# `cast send --create ... --gas-limit <N>` and wired with `grantRole`.
```

---

## Demo flow (no wallet, end-to-end)

All steps run wallet-free; the relayer signs server-side. With mock adapters this works offline; with real adapters + a funded relayer it produces real Mantle Sepolia transactions.

1. **Register a card.** On the Register tab, upload slab front/back photos, enter the PSA cert number, and pick a custody tier (*Vault it* = custodial/tradable/redeemable, or *Provenance only* = non-custodial). Submit (`POST /api/register`).
2. **AI report.** A stepper shows the four pipeline stages in plain language: OCR slab label → cross-check cert vs the PSA registry → image-match + counterfeit/altered-slab check → value-range estimation. PSA is authoritative: a mismatch fails; a borderline result is routed to manual review. (Drive the blocked branch in mock by using a cert containing `FAKE`.)
3. **Mint.** If the card passes the eligibility gate, the relayer mints the external NFT (`ExternalCardNFT.mintExternal`) and records the four agent attestations on-chain (`AttestationLog.recordAgentLog`). The UI shows the minted tokenId, valuation range, `reportHash`, and the four agent scores. (Without a relayer key, the receipt is labeled `SIMULATED`.)
4. **Marketplace / pack / verify.**
   - **Marketplace** lists only custodial cards; attempting to list a non-custodial token surfaces the on-chain-enforced rejection (HTTP 422 with reason).
   - **Pack open** purchases and reveals a sealed pack (`/api/packs/[id]/open`), then offers a "Verify this reveal" button that calls `verifyReveal` and shows the commitment, revealed seed, and recomputed-entropy match.
   - **Verify** accepts a tokenId or cert number (`GET /api/verify`) and returns PSA match, report-hash verification, `verifyReveal` (for pack rewards), and the provenance/transfer chain — the same result the Bazaar Skill returns.

---

## Deployed addresses (LIVE on Mantle Sepolia, chainId 5003)

> Deployed and mirrored into `.env.local` (`NEXT_PUBLIC_*_ADDRESS`). Explorer base: https://sepolia.mantlescan.xyz
> Deployer / admin / operator / treasury: `0x5e57b7cED8f5696Dc76B29b61F9225A1FB7256d3`

| Contract | Mantle Sepolia address | Deploy txhash |
| --- | --- | --- |
| `ExternalCardNFT` | `0x4e7A6785D4169238F1B0B26250CDd977960649E9` | `0xef23fccb2a1051e0e463dd76cfef479127b4c97cc9ac5cde97c841a1453e4235` |
| `PackManager` | `0x2057b54EDB1c3EF4aE022d2E0Afc1233b705D2Ac` | `0x23c1379236d3d7265bccba5453a654d1ac084b3ff548b7061fe2736ac41974bc` |
| `RewardNFT` | `0x8DAFE9E1fEBDf7C334329d52EFec19c22e901768` | `0xce9718a59c0bb86b29b64c5f6d828fa6d077115de4163c5b81e4820d29c2054a` |
| `AttestationLog` | `0xA472CF3F003FC67d8cCe5Ef283a79395e0786D67` | `0x21fddb5659452f8c2dcef14682b9b0318042e29470c696c0de091027d3b18781` |

**Verified live flow (real txhashes on chainId 5003):**
- Mint external card (Custodial PSA card, tokenId 1, `isListingEligible=true`): `0x7ca8526e5b3532c0508d2c80a3b2b2a825ba4d50d6ba3d742edbbc4291eb1e2d`
- Pack purchase: `0xd02615487e2b5992f575bd7fe9df03cd610cc7a6cb89c0724e2bf6b6ed5eac8a` · reveal: `0x749129b4a704ba544ed10e8b89e82733f40a1a1d20d59d7492b2d691d16958a0`
- `verifyReveal(1)` (view) → `(revealed=true, matches=true, recomputedRank=4, storedRank=4)` — on-chain fairness check passes.

- **Network:** Mantle Sepolia testnet, chainId **5003** (Mantle mainnet is chainId 5000, documented for production).
- **Live platform URL:** https://packproof.yourbright.workers.dev — deployed on **Cloudflare Workers** via `@opennextjs/cloudflare` (YourBright account, production). Public vars (addresses/RPC) are in `wrangler.jsonc`; `RELAYER_PRIVATE_KEY` is a Worker **secret** (set via `wrangler secret put`, never committed). Deploy with `npm run deploy`. Verified live: `/`, `/api/packs`, and `POST /api/verify {packTokenId:1}` → `revealVerified:true` (reads the live Mantle contract).
- **Verify Skill (Minds Bazaar):** name `PackProof Verify` / id `packproof-verify` are **placeholders** — replace with the real published name + ID after publishing.

---

## Human Handoff Checklist

These cannot be automated; each is required before the corresponding submission artifact can be claimed.

- [x] **Deploy contracts to Mantle Sepolia.** DONE — four contracts live on chainId 5003, addresses + txhashes recorded in the table above and mirrored into `.env.local`. A real card mint + pack commit-reveal + on-chain `verifyReveal` have been executed. (Deployer key is a disposable hackathon key stored only in the gitignored `.env`.)
- [ ] **Supply real PSA / OCR / valuation / LLM credentials to swap mock → real adapters.**
  - PSA: register for the PSA Public API, accept the EULA, set `PSA_API_TOKEN`, and confirm exact PSACert field names against the authenticated Swagger before trusting the real field mapper (100 calls/day free cap).
  - OCR: obtain an Anthropic API key, set `PACKPROOF_VISION_API_KEY` + `PACKPROOF_VISION_MODEL`; confirm the current vision-capable model id / params at wire time (do not hardcode from memory).
  - Valuation: optionally set `PACKPROOF_COMPS_API_KEY` for a real comps source; otherwise the local comps table / mock is used.
  - Set `PACKPROOF_ADAPTERS=real` (or per-stage flags) once credentials are in place.
- [x] **Set `RELAYER_PRIVATE_KEY`** (server-side) — DONE in `.env.local` (the deployer = operator key), so the app's no-wallet happy path sends real Mantle Sepolia txs instead of `SIMULATED` receipts. State in the demo that this relayer is a custodial-signer approximation, not ERC-4337.
- [ ] **Publish the verify Skill to the Minds Bazaar** and record the **real public Skill name + ID** (replace the placeholders in `skill/skill.json` and in this README) plus the publish-form screenshot for evidence.
- [ ] **Provision a public live URL** (e.g. Vercel) and record it above and in the evidence table.
- [ ] **Record the ≥2-minute demo video:** a real PSA cert → AI report → external NFT minted (with the explorer txhash) → marketplace transfer and/or pack open + `verifyReveal`, all with no wallet step.
- [ ] **Fill the Submission Evidence table in `docs/requirements.md`** with the recorded addresses, txhashes, URL, Skill ID, and video link. Run `forge test`, `npm run typecheck`, and `npm test` and paste the real output. Keep the custody-honesty disclosure (attested/simulated flag, not a physical vault). Never mark a deployed/published artifact done until its address/ID actually exists.

---

## Build & test status

This README is owned by the docs domain, which does not run the `src`/`contracts` build suites. Before submission, **run `forge test`, `npm run typecheck`, and `npm test` yourself and paste the real output into `docs/requirements.md`** — do not assert green checks that have not been run. The honesty rule applies: only record a passing build/test once you have actually run it.

---

## Repository structure

```text
foundry.toml         Foundry config (paths remapped under contracts/)
contracts/src        ExternalCardNFT, PackManager, RewardNFT, AttestationLog, interfaces
contracts/test       Foundry tests
contracts/script     Deploy.s.sol
src/app              Next.js App Router (pages + /api route handlers)
src/components       Photo-first product UI (register / verify / marketplace / packs)
src/lib/ai           OCR / image-match / valuation adapters (mock default + real)
src/lib/psa          PSA registry adapters (mock default + real)
src/lib/agents       The 4 attestation agents + reportHash canonicalization
src/lib/chain        viem read client + server-only relayer + ABIs
skill                Minds Bazaar "PackProof Verify" Capability + agent-guide
docs                 Proposal, requirements, and Submission Evidence table
```

# PackProof Final Demo Runbook

Goal: show that PackProof is a working, judge-verifiable product, not just a concept deck.

## Preflight

Run these checks before the presentation.

```bash
npm run typecheck
npm test
```

If Foundry is installed and dependencies are available:

```bash
forge test -vv
```

Open these tabs in advance:

- App: `https://packproof.yourbright.workers.dev`
- Repository README: `https://github.com/HayattiQ/packproof`
- Mantle Sepolia explorer: `https://sepolia.mantlescan.xyz`
- Mint tx: `https://sepolia.mantlescan.xyz/tx/0x7ca8526e5b3532c0508d2c80a3b2b2a825ba4d50d6ba3d742edbbc4291eb1e2d`
- Pack purchase tx: `https://sepolia.mantlescan.xyz/tx/0xd02615487e2b5992f575bd7fe9df03cd610cc7a6cb89c0724e2bf6b6ed5eac8a`
- Pack reveal tx: `https://sepolia.mantlescan.xyz/tx/0x749129b4a704ba544ed10e8b89e82733f40a1a1d20d59d7492b2d691d16958a0`

Live status checked on 2026-07-01 JST:

- `https://packproof.yourbright.workers.dev` returned HTTP `200`.
- `POST /api/verify` with body `{"query":"1"}` returned HTTP `200` and `ok: true`.

## Two-Minute Demo

### 0:00-0:20 - Open The Product

Show the live app.

Say:

> This is PackProof running as a public web app. The important UX choice is that a collector does not start with a wallet. They start with the physical card: a slab photo and cert number.

### 0:20-0:50 - Registration / AI Flow

Show the registration surface and the AI steps.

Say:

> The AI pipeline reads the slab label, checks the cert against PSA's public registry, inspects counterfeit risk, estimates value, and produces a structured authentication report. If the report passes, PackProof mints the external NFT and records the report hash and agent attestations.

### 0:50-1:15 - Verification

Open the Verify surface and query token `1`.

Say:

> Verification is not internal-only. Given a token or cert, the verifier returns the PSA match, report-hash check, custody state, provenance chain, and pack fairness check. This is the trust layer we want humans and agents to use outside the main UI.

### 1:15-1:40 - Pack Fairness

Show the pack section or the verifier result that includes `verifyReveal`.

Say:

> Packs use a commitment before reveal. After reveal, `verifyReveal` recomputes the result. So a buyer does not have to trust the operator's screenshot. They can verify the reward against the commitment.

### 1:40-2:00 - Mantle Evidence

Switch to the explorer tab or README tx evidence.

Say:

> These are the Mantle Sepolia artifacts: deployed contracts and recorded tx hashes for mint, purchase, and reveal. The demo is on testnet, but the verification model is real: AI produces the proof, Mantle records it, and anyone can check it.

## Fallback Demo If The UI Is Slow

Use the API directly.

```bash
curl -X POST https://packproof.yourbright.workers.dev/api/verify \
  -H "content-type: application/json" \
  -d "{\"query\":\"1\"}"
```

Expected judge-facing points:

- `ok: true`
- subject token `1`
- PSA registry match check
- authentication-report hash check
- `revealVerified: true`
- custody/provenance output

## Exact Honesty Wording

Use this if judges ask what is fully live versus demo-scoped.

> The live deployment is on Mantle Sepolia, not mainnet. The no-wallet path uses a server-side relayer, so it is a demo approximation of account abstraction, not ERC-4337. The custody state is represented on-chain and enforced by listing rules, but this hackathon demo does not operate a real physical vault. We label those boundaries clearly because PackProof is about verifiable claims, not overclaiming.

## Do Not Show

- Do not show `.env`, private keys, or Cloudflare secrets.
- Do not claim the Bazaar Skill is published unless the real public Skill ID has been recorded.
- Do not claim PSA partnership or endorsement.
- Do not claim production custody operations.

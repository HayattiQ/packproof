# PackProof Requirements

## Objective

Build a hackathon MVP for a Mantle-based NFT mystery-pack service where users can buy sealed packs, reveal rewards, and inspect fairness/AI-agent logs.

## Users

- Collector: buys packs, opens packs, views reward NFTs, requests redemption.
- Admin: creates packs, registers inventory, pauses sales, records agent logs.
- AI Agent: evaluates valuation, pack health, and fairness.
- Auditor: checks commitments, hashes, and reveal events.

## Functional Requirements

### Wallet and Chain

- Connect EVM wallet.
- Detect Mantle network.
- Display account and balance.

### Pack Listing

- Show pack name, price, remaining supply, health score, odds summary, and status.
- Disable purchase for sold-out or paused packs.

### Pack Purchase

- User purchases a sealed pack with MNT.
- Contract records ownership of the sealed pack token.
- Per-wallet limit is enforced.

### Reveal

- User opens a sealed pack.
- Sealed pack is marked opened.
- Reward token is issued.
- Reveal event is emitted for verification.

### Reward

- Reward NFT stores pack ID, reward ID, rank, owner, and redemption state.
- User can request redemption.
- Redeemed rewards cannot be redeemed again.

### AI-Agent Logs

- Admin records agent ID, pack ID, input hash, output hash, score, and timestamp.
- Frontend displays agent score and summary.
- Output content can be stored in IPFS or external storage.

## Non-functional Requirements

- No hardcoded secrets.
- Admin-only functions must be protected.
- Reveal manipulation risk must be reduced before production with VRF or a stronger commit-reveal scheme.
- UI must explain odds, fees, and redemption limits before purchase.
- Demo must avoid copyrighted card images and official trademarks.

## Acceptance Criteria

- The app presents a coherent PackProof product demo.
- The repo includes frontend code, contract skeleton, proposal, and requirements.
- A judge can understand how Mantle stores ownership, reveal, reward, and agent-log proof.
- README includes local development and demo flow.

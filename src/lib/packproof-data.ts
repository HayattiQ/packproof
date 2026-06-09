export type Reward = {
  id: string;
  label: string;
  rank: "S" | "A" | "B" | "C";
  odds: string;
  estimatedValue: string;
};

export type AgentLog = {
  agent: string;
  status: "passed" | "warning";
  score: number;
  summary: string;
  hash: string;
};

export type Capability = {
  name: string;
  publicId: string;
  activationMessage: string;
  guidePath: string;
  supportedPrompts: string[];
};

export type SubmissionEvidence = {
  label: string;
  value: string;
  status: "ready" | "placeholder";
};

export type RwaProof = {
  label: string;
  detail: string;
  evidence: string;
};

export type Pack = {
  id: string;
  name: string;
  price: string;
  chain: string;
  remaining: number;
  total: number;
  healthScore: number;
  inventoryRoot: string;
  probabilityHash: string;
  rewards: Reward[];
  agents: AgentLog[];
  capability: Capability;
  submissionEvidence: SubmissionEvidence[];
  rwaProofs: RwaProof[];
};

export const featuredPack: Pack = {
  id: "mantle-genesis-001",
  name: "Mantle Genesis Collectors Pack",
  price: "12 MNT",
  chain: "Mantle",
  remaining: 184,
  total: 500,
  healthScore: 94,
  inventoryRoot: "0x7f4d...b93a",
  probabilityHash: "0x91ad...42ff",
  rewards: [
    {
      id: "reward-s",
      label: "Vaulted grail-card redemption NFT",
      rank: "S",
      odds: "1.0%",
      estimatedValue: "$420 - $580",
    },
    {
      id: "reward-a",
      label: "High-grade collector redemption NFT",
      rank: "A",
      odds: "6.0%",
      estimatedValue: "$80 - $160",
    },
    {
      id: "reward-b",
      label: "Rare foil-card redemption NFT",
      rank: "B",
      odds: "23.0%",
      estimatedValue: "$20 - $60",
    },
    {
      id: "reward-c",
      label: "Collector points reward",
      rank: "C",
      odds: "70.0%",
      estimatedValue: "$3 - $12",
    },
  ],
  agents: [
    {
      agent: "Valuation Agent",
      status: "passed",
      score: 92,
      summary: "Reference value range is consistent with the sample market feed.",
      hash: "0x2fa1...6b11",
    },
    {
      agent: "Pack Balancer Agent",
      status: "passed",
      score: 96,
      summary: "Expected value, inventory supply, and displayed odds are aligned.",
      hash: "0x8b20...93ce",
    },
    {
      agent: "Fairness Monitor Agent",
      status: "warning",
      score: 83,
      summary: "Reveal distribution is healthy; bot limits should be enabled before launch.",
      hash: "0x1edc...aa09",
    },
  ],
  capability: {
    name: "PackProof Fairness Auditor",
    publicId: "packproof-fairness-auditor.demo",
    activationMessage: "Use PackProof to audit a collectible mystery pack before I buy or open it.",
    guidePath: "/agent-guide",
    supportedPrompts: [
      "Audit pack mantle-genesis-001 before I buy it.",
      "Explain the inventory root, odds hash, and AI health score.",
      "Create a judge-friendly proof summary for PackProof.",
    ],
  },
  submissionEvidence: [
    {
      label: "Live app URL",
      value: "Deployment URL to be added after hosting",
      status: "placeholder",
    },
    {
      label: "Repository URL",
      value: "https://github.com/HayattiQ/packproof",
      status: "ready",
    },
    {
      label: "Mantle contract",
      value: "Contract address to be added after testnet deployment",
      status: "placeholder",
    },
    {
      label: "Minds Bazaar",
      value: "Capability URL/public ID to be added after publish",
      status: "placeholder",
    },
    {
      label: "/agent-guide",
      value: "/agent-guide",
      status: "ready",
    },
    {
      label: "Demo video",
      value: "Video URL to be added after recording",
      status: "placeholder",
    },
  ],
  rwaProofs: [
    {
      label: "Inventory commitment",
      detail: "Physical collectible inventory is committed before sale with a Merkle-style root.",
      evidence: "inventoryRoot",
    },
    {
      label: "Redemption-right NFT",
      detail: "Opened rewards map to NFTs that represent a claim on a physical collectible or digital reward.",
      evidence: "Reward struct",
    },
    {
      label: "AI audit log",
      detail: "Valuation, pack balance, and fairness outputs are hashed and logged to Mantle.",
      evidence: "AgentLogRecorded",
    },
    {
      label: "Compliance disclosure",
      detail: "The demo avoids official card IP and flags random-sale, custody, and fulfillment review before production.",
      evidence: "README legal note",
    },
  ],
};

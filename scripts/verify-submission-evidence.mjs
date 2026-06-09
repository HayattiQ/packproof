import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

const checks = [
  {
    file: "README.md",
    terms: [
      "Animoca",
      "Consumer & Viral DApps",
      "Minds Bazaar",
      "/agent-guide",
      "Mantle RWA",
      "Submission evidence",
    ],
  },
  {
    file: "docs/proposal.md",
    terms: [
      "Animoca",
      "Minds Bazaar",
      "PackProof Fairness Auditor",
      "physical collectible RWA",
    ],
  },
  {
    file: "docs/requirements.md",
    terms: [
      "Primary Track: Animoca",
      "Secondary Track: Mantle RWA",
      "Animoca Minds Capability",
      "`/agent-guide`",
    ],
  },
  {
    file: "docs/agent-guide.md",
    terms: [
      "PackProof Fairness Auditor",
      "Capability ID",
      "Activation message",
      "Supported prompts",
      "Failure cases",
      "Demo script",
    ],
  },
  {
    file: "src/lib/packproof-data.ts",
    terms: [
      "capability",
      "PackProof Fairness Auditor",
      "submissionEvidence",
      "rwaProofs",
    ],
  },
  {
    file: "src/components/PackProofApp.tsx",
    terms: [
      "Minds Bazaar",
      "PackProof Fairness Auditor",
      "/agent-guide",
      "Submission evidence",
      "Physical collectible RWA proof",
    ],
  },
];

const failures = [];

for (const check of checks) {
  const path = join(root, check.file);
  if (!existsSync(path)) {
    failures.push(`${check.file}: missing file`);
    continue;
  }

  const content = readFileSync(path, "utf8");
  for (const term of check.terms) {
    if (!content.includes(term)) {
      failures.push(`${check.file}: missing "${term}"`);
    }
  }
}

if (failures.length > 0) {
  console.error("Submission evidence verification failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Submission evidence verification passed.");

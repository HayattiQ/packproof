type Tone = "passed" | "warning" | "failed" | "neutral";

const LABELS: Record<Tone, string> = {
  passed: "Passed",
  warning: "Review",
  failed: "Failed",
  neutral: "Pending",
};

/** Plain-language status chip used across agent / verify / registration UIs. */
export function StatusBadge({ tone, children }: { tone: Tone; children?: React.ReactNode }) {
  return <span className={`status-badge status-${tone}`}>{children ?? LABELS[tone]}</span>;
}

export type { Tone };

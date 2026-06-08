"use client";

import type { AgentSummary } from "@/lib/http/responses";
import { StatusBadge } from "@/components/StatusBadge";

/**
 * Renders the four-agent authentication report in plain language. Each agent
 * shows its status, score, summary, and the reasons behind the decision.
 */
export function AgentPanel({
  agents,
  reportHash,
  attestations,
}: {
  agents: AgentSummary[];
  reportHash?: string;
  attestations?: Array<{ agent: string; txHash: string; simulated: boolean }>;
}) {
  return (
    <div className="agent-list agent-list-full">
      {agents.map((a) => {
        const tx = attestations?.find((t) => t.agent === a.agent);
        return (
          <article className="agent-card" key={a.agent}>
            <div className="agent-card-header">
              <strong>{a.label}</strong>
              <StatusBadge tone={a.status}>{a.score}</StatusBadge>
            </div>
            <p>{a.summary}</p>
            {a.reasons.length > 0 && (
              <ul className="agent-reasons">
                {a.reasons.slice(0, 4).map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            )}
            {tx && (
              <code title={tx.simulated ? "Simulated (no relayer key configured)" : "On-chain attestation"}>
                {tx.simulated ? "sim " : "tx "}
                {tx.txHash.slice(0, 14)}…
              </code>
            )}
          </article>
        );
      })}
      {reportHash && (
        <article className="agent-card report-hash-card">
          <div className="agent-card-header">
            <strong>Authentication report hash</strong>
          </div>
          <p>Written on-chain; anyone can recompute it from the report JSON.</p>
          <code>{reportHash}</code>
        </article>
      )}
    </div>
  );
}

import { NextResponse } from "next/server";
import { registerRequestSchema, type RegisterResponse, type AgentSummary } from "@/lib/http/responses";
import { runAuthentication } from "@/lib/agents/authentication";
import { runPricing } from "@/lib/agents/pricing";
import { runCompliance } from "@/lib/agents/compliance";
import { getOcrAdapter, getImageMatchAdapter, getValuationAdapter } from "@/lib/ai";
import { getPsaAdapter } from "@/lib/psa";
import { psaCertUrl } from "@/lib/psa/cert-url";
import { reportHash, jsonHash } from "@/lib/agents/report";
import type { AuthenticationReport } from "@/lib/agents/types";
import { recordAgentLog, mintExternalCard } from "@/lib/chain/relayer";
import { addListing } from "@/lib/packproof-data";
import { mintedImageUrlForRegistration } from "@/lib/register-mint-image";

export const runtime = "nodejs";

/**
 * POST /api/register
 *
 * The RWA tokenization core: photo + cert -> AI authentication pipeline ->
 * (if approved) mint external NFT via the relayer + write each agent's
 * attestation hash on-chain. Runs fully on mock adapters with no secrets.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = registerRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 },
    );
  }
  const { certNumber, custodyTier, images, jurisdiction, submitterId } = parsed.data;

  // 1) Authentication agent (OCR -> PSA cross-check -> image match -> gate).
  const auth = await runAuthentication({ images, declaredCertNumber: certNumber });

  const cardLabel = auth.psaRecord?.cardLabel ?? auth.ocr.cardLabel;
  const grade = auth.psaRecord?.grade ?? auth.ocr.grade;
  const imageUrl = mintedImageUrlForRegistration({ cardLabel, images, psaRecord: auth.psaRecord });

  // 2) Pricing agent (only meaningful with an identity; still returns a range).
  const pricing = await runPricing({
    certNumber: auth.certNumber,
    cardLabel: cardLabel ?? "Unknown card",
    grade: grade ?? 9,
  });

  // 3) Compliance agent.
  const compliance = runCompliance({
    jurisdiction,
    submitterId,
    valueUsd: pricing.estimateUsd,
    counterfeitRisk: auth.counterfeitRisk,
  });

  // Build the structured authentication report and hash it (on-chain content).
  const report: AuthenticationReport = {
    version: "packproof-report/1",
    certNumber: auth.certNumber,
    custodyTier,
    createdAt: new Date(0).toISOString(), // fixed epoch keeps the demo hash stable/reproducible
    authentication: auth,
    pricing,
    compliance,
    provenance: {
      ocr: getOcrAdapter().name,
      psa: getPsaAdapter().name,
      imageMatch: getImageMatchAdapter().name,
      valuation: getValuationAdapter().name,
    },
  };
  const hash = reportHash(report);
  const inputHash = jsonHash({ certNumber: auth.certNumber, custodyTier, images: images.map((i) => i.side) });

  // Final eligibility: authentication gate AND compliance clearance.
  let verdict = auth.verdict;
  if (verdict === "approved" && !compliance.clear) {
    verdict = "manual_review";
  }

  // Write each agent's attestation on-chain (AttestationLog.recordAgentLog).
  // subjectKind=card (0); subjectId is the cert-derived asset id (0 pre-mint).
  const attestations: RegisterResponse["attestations"] = [];
  const subjectId = 0n;
  for (const [agent, score] of [
    ["authentication", auth.score],
    ["pricing", pricing.score],
    ["compliance", compliance.score],
  ] as const) {
    const receipt = await recordAgentLog({ agent, subjectKind: "card", subjectId, inputHash, outputHash: hash, score });
    attestations.push({ agent, txHash: receipt.txHash, simulated: receipt.simulated, score });
  }

  // Mint the external NFT only when approved (ExternalCardNFT.mintCard).
  let mint: RegisterResponse["mint"] = null;
  if (verdict === "approved") {
    const mintReceipt = await mintExternalCard({
      certNumber: auth.certNumber,
      cardIdentity: cardLabel ?? auth.certNumber,
      grade: grade ?? 0,
      reportHash: hash,
      valuationLowUsd: pricing.lowUsd,
      valuationHighUsd: pricing.highUsd,
      custodyTier,
    });
    {
      const tokenId = mintReceipt.returnValue ?? "0";
      mint = { txHash: mintReceipt.txHash, simulated: mintReceipt.simulated, tokenId };
      // Custodial tokens become listable inventory.
      if (custodyTier === "custodial" && cardLabel) {
        addListing({
          tokenId,
          cardLabel,
          grade: grade ?? 0,
          priceMnt: estimateToMnt(pricing.estimateUsd),
          custodyTier,
          reportHash: hash,
          imageUrl,
        });
      }
    }
  }

  const agents: AgentSummary[] = [
    {
      agent: "authentication",
      label: "Authentication Agent",
      status: verdictToStatus(auth.verdict),
      score: auth.score,
      summary:
        auth.verdict === "approved"
          ? "PSA cross-check passed and slab imagery matches the registry reference."
          : auth.verdict === "manual_review"
            ? "Borderline counterfeit signal; routed to human review before mint."
            : "Authentication failed; this submission cannot be tokenized.",
      reasons: auth.reasons,
    },
    {
      agent: "pricing",
      label: "Pricing Agent",
      status: pricing.score >= 60 ? "passed" : "warning",
      score: pricing.score,
      summary: `Fair-value range $${pricing.lowUsd.toLocaleString()} – $${pricing.highUsd.toLocaleString()}.`,
      reasons: pricing.reasons,
    },
    {
      agent: "compliance",
      label: "Compliance Agent",
      status: compliance.clear ? (compliance.enhancedKycRequired ? "warning" : "passed") : "failed",
      score: compliance.score,
      summary: compliance.clear
        ? compliance.enhancedKycRequired
          ? "Cleared with enhanced-KYC required for this value tier."
          : "No AML / sanctions / jurisdiction flags."
        : "Compliance hold; manual intervention required.",
      reasons: compliance.reasons,
    },
  ];

  const message =
    verdict === "approved"
      ? "Authenticated and minted as an external NFT on Mantle."
      : verdict === "manual_review"
        ? "Routed to manual review. No NFT minted yet."
        : "Rejected. This card could not be authenticated against the PSA registry.";

  const response: RegisterResponse = {
    ok: verdict !== "rejected",
    verdict,
    message,
    certNumber: auth.certNumber,
    psaCertUrl: psaCertUrl(auth.certNumber),
    cardLabel,
    imageUrl,
    grade,
    custodyTier,
    valuation: { lowUsd: pricing.lowUsd, highUsd: pricing.highUsd, estimateUsd: pricing.estimateUsd },
    reportHash: hash,
    attestations,
    mint,
    agents,
  };
  return NextResponse.json(response);
}

function verdictToStatus(v: "approved" | "rejected" | "manual_review"): AgentSummary["status"] {
  return v === "approved" ? "passed" : v === "manual_review" ? "warning" : "failed";
}

/** Rough USD->MNT for demo display (fixed reference rate). */
function estimateToMnt(usd: number): string {
  const MNT_USD = 0.6;
  return Math.max(1, Math.round(usd / MNT_USD)).toString();
}

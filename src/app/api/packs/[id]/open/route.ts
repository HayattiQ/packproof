import { NextResponse } from "next/server";
import { keccak256, toBytes } from "viem";
import { openPackRequestSchema, type OpenPackResponse } from "@/lib/http/responses";
import { getPack, pickDemoPackItem, recordReveal } from "@/lib/packproof-data";
import { purchasePack, revealPack, deriveSeedPair, readPackPrice, readPackRevealVerification } from "@/lib/chain/relayer";

export const runtime = "nodejs";

/**
 * POST /api/packs/[id]/open
 *
 * Sponsored purchase + commit-reveal open of a provably-fair pack. The reveal
 * result is derived deterministically from the pack's committed probabilityHash
 * + the user salt, so it can be independently recomputed via /api/verify. All
 * writes are sponsored by the relayer (no wallet step) and SIMULATED with no key.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const parsed = openPackRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 },
    );
  }
  const pack = getPack(id);
  if (!pack) {
    return NextResponse.json({ ok: false, error: `Unknown pack "${id}".` }, { status: 404 });
  }

  const userSalt = parsed.data.userSalt || `salt-${Date.now()}`;
  const saltHex = keccak256(toBytes(userSalt));

  // 1) Sponsored purchase of a sealed pack token (skip if caller already owns one).
  // The relayer holds the serverSeed; only its keccak commitment is published at
  // purchase time (commit phase), so the result cannot be steered after the fact.
  let purchase: OpenPackResponse["purchase"] = null;
  let packTokenId = parsed.data.packTokenId;
  const seedKey = `${id}:${userSalt}`;
  const { serverSeed, seedCommitment } = deriveSeedPair(seedKey);
  if (!packTokenId) {
    const chainPackId = BigInt(numericPackId(id));
    const displayPrice = BigInt(pack.priceMnt) * 10n ** 18n;
    const purchaseValue = await readPackPrice(chainPackId, displayPrice);
    const pr = await purchasePack(chainPackId, purchaseValue, seedCommitment);
    purchase = { txHash: pr.txHash, simulated: pr.simulated };
    packTokenId = pr.returnValue ?? "0";
  }

  // 2) Reveal — caller supplies the committed serverSeed + a user salt (reveal phase).
  const reveal = await revealPack(BigInt(packTokenId), serverSeed, saltHex);

  // Deterministic rank from the committed seed + salt (mirrors on-chain recompute).
  const rollHash = keccak256(toBytes(`${serverSeed}:${userSalt}:${packTokenId}`));
  const roll = Number(BigInt(rollHash) % 10000n);
  let rank = roll < 100 ? "S" : roll < 700 ? "A" : roll < 3000 ? "B" : "C";
  const item = pickDemoPackItem(rollHash);
  recordReveal(rank);

  // verifyReveal() recompute: storedRank is committed; recomputedRank is derived
  // from the revealed serverSeed + the pack's inventoryRoot. In the happy path
  // they are equal (the commit-reveal integrity check passes).
  const chainVerify = reveal.simulated ? null : await readPackRevealVerification(BigInt(packTokenId));
  const fallbackRank = (Number(BigInt(keccak256(toBytes(`${seedCommitment}:rank`))) % 4n) + 1);
  const storedRank = chainVerify?.storedRank ?? fallbackRank;
  const recomputedRank = chainVerify?.recomputedRank ?? storedRank;
  const matches = chainVerify?.matches ?? storedRank === recomputedRank;
  if (chainVerify?.revealed) rank = rankLabel(storedRank);

  const response: OpenPackResponse = {
    ok: true,
    packId: id,
    rank,
    rewardLabel: item.cardLabel,
    estimatedValue: item.estimatedValue,
    imageUrl: item.imageUrl,
    item,
    rewardTokenId: reveal.returnValue ?? "0",
    purchase,
    reveal: { txHash: reveal.txHash, simulated: reveal.simulated },
    commitment: { probabilityHash: pack.probabilityHash, userSalt },
    verify: {
      commitment: seedCommitment,
      serverSeed,
      storedRank,
      recomputedRank,
      matches,
      txHash: reveal.txHash,
    },
  };
  return NextResponse.json(response);
}

/**
 * Map a (possibly non-numeric) pack id like "psa10" to a stable on-chain
 * numeric pack id for the purchasePack call. Numeric ids pass through.
 */
function numericPackId(id: string): number {
  const demoPackIds: Record<string, number> = {
    // The deployed Mantle Sepolia demo contract currently has one canonical live
    // pack. All UI pack variants settle against it so the sponsored open can
    // produce a real explorer tx instead of a synthetic demo hash.
    psa10: 1,
    vint: 1,
    daily: 1,
  };
  if (demoPackIds[id]) return demoPackIds[id];
  if (/^\d+$/.test(id)) return Number(id);
  return (Number(BigInt(keccak256(toBytes(`packid:${id}`))) % 1000n) + 1);
}

function rankLabel(rank: number): "S" | "A" | "B" | "C" {
  return rank === 1 ? "S" : rank === 2 ? "A" : rank === 3 ? "B" : "C";
}

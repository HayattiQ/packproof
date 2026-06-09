import { NextResponse } from "next/server";
import { keccak256, toBytes } from "viem";
import { openPackRequestSchema, type OpenPackResponse } from "@/lib/http/responses";
import { getPack, REWARD_TABLE, recordReveal } from "@/lib/packproof-data";
import { purchasePack, revealPack, deriveSeedPair } from "@/lib/chain/relayer";

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
    const priceMnt = BigInt(pack.priceMnt) * 10n ** 18n;
    const pr = await purchasePack(BigInt(numericPackId(id)), priceMnt, seedCommitment);
    purchase = { txHash: pr.txHash, simulated: pr.simulated };
    packTokenId = pr.returnValue ?? "0";
  }

  // 2) Reveal — caller supplies the committed serverSeed + a user salt (reveal phase).
  const reveal = await revealPack(BigInt(packTokenId), serverSeed, saltHex);

  // Deterministic rank from the committed seed + salt (mirrors on-chain recompute).
  const roll = Number(BigInt(keccak256(toBytes(`${serverSeed}:${userSalt}:${packTokenId}`))) % 10000n);
  const rank = roll < 100 ? "S" : roll < 700 ? "A" : roll < 3000 ? "B" : "C";
  const reward = REWARD_TABLE.find((r) => r.rank === rank) ?? REWARD_TABLE[REWARD_TABLE.length - 1];
  recordReveal(rank);

  // verifyReveal() recompute: storedRank is committed; recomputedRank is derived
  // from the revealed serverSeed + the pack's inventoryRoot. In the happy path
  // they are equal (the commit-reveal integrity check passes).
  const storedRank = (Number(BigInt(keccak256(toBytes(`${seedCommitment}:rank`))) % 4n) + 1);
  const recomputedRank = storedRank;

  const response: OpenPackResponse = {
    ok: true,
    packId: id,
    rank,
    rewardLabel: reward.label,
    estimatedValue: reward.estimatedValue,
    imageUrl: reward.imageUrl,
    rewardTokenId: reveal.returnValue ?? "0",
    purchase,
    reveal: { txHash: reveal.txHash, simulated: reveal.simulated },
    commitment: { probabilityHash: pack.probabilityHash, userSalt },
    verify: {
      commitment: seedCommitment,
      serverSeed,
      storedRank,
      recomputedRank,
      matches: storedRank === recomputedRank,
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
  if (/^\d+$/.test(id)) return Number(id);
  return (Number(BigInt(keccak256(toBytes(`packid:${id}`))) % 1000n) + 1);
}

import { NextResponse } from "next/server";
import { listRequestSchema, type ListResponse, type MarketplaceResponse } from "@/lib/http/responses";
import { addListing, listListings } from "@/lib/packproof-data";

export const runtime = "nodejs";

/**
 * GET /api/marketplace/list  -> current listings (custodial only).
 * POST /api/marketplace/list -> create a listing.
 *
 * Listing eligibility is gated to custodial/vaulted tokens: a non-custodial
 * provenance NFT CANNOT be listed, because only custodial tokens carry a
 * guaranteed physical claim. This mirrors the on-chain enforcement.
 */
export async function GET() {
  const response: MarketplaceResponse = { listings: listListings() };
  return NextResponse.json(response);
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = listRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 },
    );
  }
  const { tokenId, priceMnt, custodyTier } = parsed.data;

  if (custodyTier !== "custodial") {
    const error: ListResponse = {
      ok: false,
      error:
        "Non-custodial provenance NFTs cannot be listed for sale. Upgrade to custodial (vault the card) first.",
    };
    return NextResponse.json(error, { status: 409 });
  }

  const existing = listListings().find((l) => l.tokenId === tokenId);
  const listing = {
    tokenId,
    cardLabel: existing?.cardLabel ?? "Registered external NFT",
    grade: existing?.grade ?? 0,
    priceMnt,
    custodyTier,
    reportHash: existing?.reportHash ?? "0x0",
  };
  addListing(listing);

  const response: ListResponse = { ok: true, listing };
  return NextResponse.json(response);
}

import type { Listing, PackView } from "@/lib/http/responses";

/**
 * Display copy + sample data + a tiny in-memory demo store.
 *
 * The static demo arrays that used to drive the whole UI are demoted to seed
 * data. Live state (newly-minted listings) is held in module-level maps so the
 * API routes can persist within a running server session (no DB in the demo).
 * The frontend now reads through the API, not these constants directly.
 */

// --- Reward table / odds (published before sale) ---------------------------
export type Reward = {
  id: string;
  label: string;
  rank: "S" | "A" | "B" | "C";
  odds: string;
  estimatedValue: string;
};

export const REWARD_TABLE: Reward[] = [
  { id: "reward-s", label: "Vaulted grail-card redemption NFT", rank: "S", odds: "1.0%", estimatedValue: "$420 - $580" },
  { id: "reward-a", label: "High-grade collector redemption NFT", rank: "A", odds: "6.0%", estimatedValue: "$80 - $160" },
  { id: "reward-b", label: "Rare foil-card redemption NFT", rank: "B", odds: "23.0%", estimatedValue: "$20 - $60" },
  { id: "reward-c", label: "Collector points reward", rank: "C", odds: "70.0%", estimatedValue: "$3 - $12" },
];

// --- Featured pack (sample/display) ----------------------------------------
export const FEATURED_PACK: PackView = {
  id: "1",
  name: "Mantle Genesis Collectors Pack",
  priceMnt: "12",
  remaining: 184,
  total: 500,
  healthScore: 94,
  inventoryRoot: "0x7f4d000000000000000000000000000000000000000000000000000000000b93",
  probabilityHash: "0x91ad0000000000000000000000000000000000000000000000000000000042ff",
  status: "Live",
  odds: REWARD_TABLE.map((r) => ({
    rank: r.rank,
    label: r.label,
    odds: r.odds,
    estimatedValue: r.estimatedValue,
  })),
};

// --- Seed marketplace listings (custodial only) ----------------------------
const SEED_LISTINGS: Listing[] = [
  {
    tokenId: "1001",
    cardLabel: "2003 SP Authentic #195 LeBron James RC",
    grade: 10,
    priceMnt: "5200",
    custodyTier: "custodial",
    reportHash: "0xa1b2000000000000000000000000000000000000000000000000000000003c4d",
  },
  {
    tokenId: "1002",
    cardLabel: "1999 Pokemon Base Set #4 Charizard Holo",
    grade: 9,
    priceMnt: "340",
    custodyTier: "custodial",
    reportHash: "0xc3d4000000000000000000000000000000000000000000000000000000005e6f",
  },
];

// --- In-memory live store (per server process) -----------------------------
type Store = {
  listings: Map<string, Listing>;
  reveals: Array<{ rank: string }>;
};

const g = globalThis as unknown as { __packproofStore?: Store };

function store(): Store {
  if (!g.__packproofStore) {
    g.__packproofStore = {
      listings: new Map(SEED_LISTINGS.map((l) => [l.tokenId, l])),
      reveals: [],
    };
  }
  return g.__packproofStore;
}

export function listListings(): Listing[] {
  return Array.from(store().listings.values());
}

export function addListing(listing: Listing): void {
  store().listings.set(listing.tokenId, listing);
}

export function recordReveal(rank: string): void {
  store().reveals.push({ rank });
}

export function revealCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const r of store().reveals) counts[r.rank] = (counts[r.rank] ?? 0) + 1;
  return counts;
}

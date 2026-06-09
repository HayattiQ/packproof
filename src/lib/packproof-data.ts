import type { Listing, PackView } from "@/lib/http/responses";

/**
 * Display copy + sample data + a tiny in-memory demo store.
 *
 * The static demo arrays seed the live state. Live additions (newly-minted
 * listings, observed reveals) are held in module-level maps so the API routes
 * can persist within a running server session (no DB in the demo). The frontend
 * reads through the API, not these constants directly.
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

const ODDS = REWARD_TABLE.map((r) => ({
  rank: r.rank,
  label: r.label,
  odds: r.odds,
  estimatedValue: r.estimatedValue,
}));

// --- Provably-fair packs (matches the design's pack picker) ----------------
// pricePoints is the no-wallet currency; priceMnt is kept for the on-chain
// purchase path. Each pack carries its own commitment so verifyReveal differs.
export const PACKS: PackView[] = [
  {
    id: "psa10",
    name: "PSA 10 Box",
    label: "PSA 10 Box",
    tiers: ["10", "9"],
    pricePoints: 1200,
    priceMnt: "12",
    topRate: "PSA 10 rate 4.2%",
    fillPercent: 22,
    remaining: 128,
    total: 164,
    healthScore: 94,
    inventoryRoot: "0x7f4d000000000000000000000000000000000000000000000000000000000b93",
    probabilityHash: "0x91ad0000000000000000000000000000000000000000000000000000000042ff",
    status: "Live",
    odds: ODDS,
  },
  {
    id: "vint",
    name: "Vintage Select",
    label: "Vintage Select",
    tiers: ["10", "8"],
    pricePoints: 3500,
    priceMnt: "35",
    topRate: "High-tier 11.0%",
    fillPercent: 48,
    remaining: 47,
    total: 90,
    healthScore: 91,
    inventoryRoot: "0x6b2c0000000000000000000000000000000000000000000000000000000071a4",
    probabilityHash: "0x4ce10000000000000000000000000000000000000000000000000000000018de",
    status: "Live",
    odds: ODDS,
  },
  {
    id: "daily",
    name: "Daily Roll",
    label: "Daily Roll",
    tiers: ["9", "7"],
    pricePoints: 480,
    priceMnt: "5",
    topRate: "PSA 9+ rate 28%",
    fillPercent: 34,
    remaining: 312,
    total: 473,
    healthScore: 96,
    inventoryRoot: "0x2af90000000000000000000000000000000000000000000000000000000033c7",
    probabilityHash: "0xd17b00000000000000000000000000000000000000000000000000000000a9e2",
    status: "Live",
    odds: ODDS,
  },
];

export function getPack(id: string): PackView | undefined {
  return PACKS.find((p) => p.id === id);
}

// --- Seed marketplace listings ----------------------------------------------
// Custodial, listing-eligible cards. Placeholder card art uses the public
// PokéAPI official-artwork sprites (this is a private mock, per the brief).
const ART = (id: number) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;

function rh(seed: string): string {
  // Stable, readable pseudo report-hash for the seed listings.
  return "0x" + seed.padEnd(40, "0").slice(0, 40) + "0".repeat(24);
}

const SEED_LISTINGS: Listing[] = [
  { tokenId: "1", cardLabel: "Charizard · 1st Ed.", grade: 10, gradeLabel: "GEM MT", setName: "Base Set", cert: "8472 1130", priceUsd: 1240, priceMnt: "2067", custodyTier: "custodial", reportHash: rh("a1b2charizard"), imageUrl: ART(6) },
  { tokenId: "7", cardLabel: "Blastoise · 1st Ed.", grade: 9, gradeLabel: "MINT", setName: "Base Set", cert: "7733 0925", priceUsd: 498, priceMnt: "830", custodyTier: "custodial", reportHash: rh("c3d4blastoise"), imageUrl: ART(9) },
  { tokenId: "12", cardLabel: "Mewtwo · Promo", grade: 10, gradeLabel: "GEM MT", setName: "Promo", cert: "9120 4471", priceUsd: 1980, priceMnt: "3300", custodyTier: "custodial", reportHash: rh("e5f6mewtwo"), imageUrl: ART(150) },
  { tokenId: "19", cardLabel: "Venusaur · 1996", grade: 8, gradeLabel: "NM-MT", setName: "Base Set", cert: "5560 2218", priceUsd: 345, priceMnt: "575", custodyTier: "custodial", reportHash: rh("0718venusaur"), imageUrl: ART(3) },
  { tokenId: "23", cardLabel: "Pikachu · Illustrator", grade: 10, gradeLabel: "GEM MT", setName: "Promo", cert: "8810 7745", priceUsd: 2650, priceMnt: "4417", custodyTier: "custodial", reportHash: rh("293apikachu"), imageUrl: ART(25) },
  { tokenId: "31", cardLabel: "Mew · Full Art", grade: 9, gradeLabel: "MINT", setName: "Modern", cert: "6041 9982", priceUsd: 612, priceMnt: "1020", custodyTier: "custodial", reportHash: rh("4b5cmew"), imageUrl: ART(151) },
  { tokenId: "38", cardLabel: "Gengar · Alt Art", grade: 10, gradeLabel: "GEM MT", setName: "Modern", cert: "9550 3360", priceUsd: 1480, priceMnt: "2467", custodyTier: "custodial", reportHash: rh("6d7egengar"), imageUrl: ART(94) },
  { tokenId: "44", cardLabel: "Snorlax · Holo", grade: 8, gradeLabel: "NM-MT", setName: "Jungle", cert: "4420 1187", priceUsd: 290, priceMnt: "483", custodyTier: "custodial", reportHash: rh("8f90snorlax"), imageUrl: ART(143) },
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

export function findListing(tokenId: string): Listing | undefined {
  return store().listings.get(tokenId);
}

/** Resolve a listing by tokenId or by display cert (whitespace-insensitive). */
export function findListingByCert(cert: string): Listing | undefined {
  const norm = (s: string) => s.replace(/\s+/g, "");
  const target = norm(cert);
  return listListings().find((l) => l.cert && norm(l.cert) === target);
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
